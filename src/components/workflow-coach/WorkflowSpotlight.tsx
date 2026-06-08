"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import type { SpotlightHint } from "@/lib/workflow-coach/steps";

type ViewportRect = { top: number; left: number; width: number; height: number };

const PAD = 10;
const OVERLAY_COLOR = "rgba(0,0,0,0.68)";

/** Evaluate which hints are currently visible based on DOM selectors. */
function getVisibleHints(hints: SpotlightHint[]): SpotlightHint[] {
  return hints.filter((h) => {
    if (h.showIfSelector && !document.querySelector(h.showIfSelector)) return false;
    if (h.hideIfSelector && document.querySelector(h.hideIfSelector)) return false;
    return true;
  });
}

type Props = {
  hints: SpotlightHint[];
  stepLabel: string;
  onClose: () => void;
  onComplete: () => void;
};

export function WorkflowSpotlight({ hints, stepLabel, onClose, onComplete }: Props) {
  const [hintIndex, setHintIndex] = useState(0);
  const [visibleHints, setVisibleHints] = useState<SpotlightHint[]>(() => getVisibleHints(hints));
  const [targetRect, setTargetRect] = useState<ViewportRect | null>(null);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  // Whether the user has satisfied the confirmation requirement for the current hint
  const [confirmed, setConfirmed] = useState(false);

  const currentHint = visibleHints[hintIndex];
  const isFirst = hintIndex === 0;
  const isLast = hintIndex === visibleHints.length - 1;

  /** Re-evaluate which hints are visible (called after each user action so conditional hints update). */
  const refreshVisibleHints = useCallback(() => {
    setVisibleHints(getVisibleHints(hints));
  }, [hints]);
  // Keep refreshVisibleHints available for use in effects
  void refreshVisibleHints;

  // --- Measure target in viewport coords ---
  const measureTarget = useCallback(() => {
    if (!currentHint) return;
    const el = document.querySelector(`[data-workflow-target="${currentHint.target}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Re-measure after scroll settles
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 450);
  }, [currentHint]);

  useLayoutEffect(() => {
    setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    setConfirmed(false);
    measureTarget();
  }, [measureTarget]);

  useEffect(() => {
    const onResize = () => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
      measureTarget();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", measureTarget, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget]);

  // --- "click" confirmation: listen for a click on the target element ---
  const clickListenerRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    // Clean up any previous listener
    if (clickListenerRef.current) {
      clickListenerRef.current();
      clickListenerRef.current = null;
    }
    if (currentHint?.confirmType !== "click") return;

    const el = document.querySelector(`[data-workflow-target="${currentHint.target}"]`);
    if (!el) return;

    const handler = () => {
      setConfirmed(true);
      // Re-evaluate conditional hints (e.g. plan was just generated), then auto-advance
      setTimeout(() => {
        const fresh = getVisibleHints(hints);
        setVisibleHints(fresh);
        if (hintIndex < fresh.length - 1) {
          setHintIndex((i) => i + 1);
        } else {
          onComplete();
        }
      }, 600);
    };

    el.addEventListener("click", handler);
    clickListenerRef.current = () => el.removeEventListener("click", handler);
    return () => {
      el.removeEventListener("click", handler);
      clickListenerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintIndex, currentHint]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handlePrev = () => {
    setHintIndex((i) => i - 1);
    setConfirmed(false);
  };

  const handleConfirmObserve = () => {
    setConfirmed(true);
    setTimeout(() => {
      const fresh = getVisibleHints(hints);
      setVisibleHints(fresh);
      const nextIndex = hintIndex + 1;
      if (nextIndex < fresh.length) {
        setHintIndex(nextIndex);
      } else {
        onComplete();
      }
    }, 300);
  };

  // --- Overlay panels (4 rects surrounding target) ---
  const vw = viewportSize.w;
  const vh = viewportSize.h;

  const panels: React.CSSProperties[] = targetRect
    ? [
        // Top
        { position: "fixed", top: 0, left: 0, width: vw, height: Math.max(0, targetRect.top - PAD) },
        // Bottom
        { position: "fixed", top: targetRect.top + targetRect.height + PAD, left: 0, width: vw, height: Math.max(0, vh - (targetRect.top + targetRect.height + PAD)) },
        // Left
        { position: "fixed", top: targetRect.top - PAD, left: 0, width: Math.max(0, targetRect.left - PAD), height: targetRect.height + PAD * 2 },
        // Right
        { position: "fixed", top: targetRect.top - PAD, left: targetRect.left + targetRect.width + PAD, width: Math.max(0, vw - (targetRect.left + targetRect.width + PAD)), height: targetRect.height + PAD * 2 },
      ]
    : [{ position: "fixed", top: 0, left: 0, width: vw, height: vh }];

  // --- Card position: prefer below target, fall back to above ---
  const getCardStyle = (): React.CSSProperties => {
    const cardW = Math.min(340, vw - 32);
    if (!targetRect) {
      return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: cardW };
    }
    const below = targetRect.top + targetRect.height + PAD + 12;
    const spaceBelow = vh - below;
    const cardH = 220;
    const leftPos = Math.max(16, Math.min(targetRect.left, vw - cardW - 16));
    if (spaceBelow >= cardH + 16) {
      return { position: "fixed", top: Math.min(below, vh - cardH - 16), left: leftPos, width: cardW };
    }
    return { position: "fixed", top: Math.max(16, targetRect.top - PAD - cardH - 12), left: leftPos, width: cardW };
  };

  const isClickType = currentHint?.confirmType === "click";

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 2000, pointerEvents: "none" }}>
      {/* 4-panel overlay — blocks interaction outside the target, but NOT the target itself */}
      {panels.map((style, i) => (
        <Box
          key={i}
          sx={{ ...style, bgcolor: OVERLAY_COLOR, pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        />
      ))}

      {/* Glowing border around target */}
      {targetRect && (
        <Box
          sx={{
            position: "fixed",
            top: targetRect.top - PAD,
            left: targetRect.left - PAD,
            width: targetRect.width + PAD * 2,
            height: targetRect.height + PAD * 2,
            borderRadius: "8px",
            boxShadow: confirmed
              ? "0 0 0 3px #66bb6a, 0 0 24px 6px rgba(102,187,106,0.45)"
              : "0 0 0 3px #90caf9, 0 0 24px 6px rgba(144,202,249,0.45)",
            transition: "box-shadow 0.3s",
            pointerEvents: "none",
            zIndex: 2001,
          }}
        />
      )}

      {/* Instruction card */}
      <Paper
        elevation={10}
        sx={{
          ...getCardStyle(),
          p: 2.5,
          pointerEvents: "auto",
          borderRadius: 2.5,
          zIndex: 2002,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, lineHeight: 1, fontSize: "0.65rem", letterSpacing: 1 }}>
                {stepLabel}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                Step {hintIndex + 1} of {visibleHints.length}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close guidance" sx={{ mt: -0.5, mr: -0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Instruction */}
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
            {currentHint?.instruction}
          </Typography>

          {/* Element not found warning */}
          {!targetRect && currentHint && (
            <Typography variant="caption" sx={{ color: "warning.main", display: "block" }}>
              The highlighted element wasn&apos;t found on the page — it may still be loading. Scroll around or check that you&apos;re on the right page.
            </Typography>
          )}

          {/* Waiting for click indicator */}
          {isClickType && !confirmed && (
            <Stack direction="row" sx={{ alignItems: "center", gap: 1, bgcolor: "action.hover", borderRadius: 1.5, px: 1.5, py: 1 }}>
              <TouchAppIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              <Typography variant="caption" color="text.secondary">
                Click the highlighted element above to continue
              </Typography>
            </Stack>
          )}

          {/* Confirmed state */}
          {confirmed && (
            <Stack direction="row" sx={{ alignItems: "center", gap: 1, bgcolor: "success.light", borderRadius: 1.5, px: 1.5, py: 1 }}>
              <CheckIcon sx={{ color: "success.dark", fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 600 }}>
                {isLast ? "All done!" : "Got it — moving to the next step…"}
              </Typography>
            </Stack>
          )}

          {/* Action buttons — only render when there's something to show */}
          {!confirmed && (!isClickType || !isFirst) && (
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", pt: 0.5 }}>
              {/* Back */}
              <Button
                size="small"
                variant="text"
                startIcon={<ArrowBackIcon />}
                onClick={handlePrev}
                disabled={isFirst}
                sx={{ opacity: isFirst ? 0 : 1, pointerEvents: isFirst ? "none" : "auto" }}
              >
                Back
              </Button>

              {/* Confirm / advance */}
              {!isClickType && (
                <Button
                  size="small"
                  variant="contained"
                  fullWidth={isFirst}
                  endIcon={isLast ? <CheckIcon /> : <ArrowForwardIcon />}
                  onClick={handleConfirmObserve}
                >
                  {isLast
                    ? (currentHint?.confirmLabel ?? "All done")
                    : (currentHint?.confirmLabel ?? "Done, next step")}
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
