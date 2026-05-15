"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import MicOffOutlinedIcon from "@mui/icons-material/MicOffOutlined";
import MicOutlinedIcon from "@mui/icons-material/MicOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

type JoleneMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
};

type JoleneContext = {
  routeType: string;
  summary: string;
  suggestedActions: Array<{
    label: string;
    href?: string;
    method?: string;
    description: string;
  }>;
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function JoleneAgentButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<JoleneMessage[]>([]);
  const [context, setContext] = useState<JoleneContext | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return Boolean(browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoadingHistory(true);
    setError(null);

    fetch(`/api/jolene?contextPath=${encodeURIComponent(pathname)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error ?? "Could not load Jolene.");
        return response.json() as Promise<{ messages: JoleneMessage[]; context: JoleneContext }>;
      })
      .then((payload) => {
        setMessages(payload.messages);
        setContext(payload.context);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load Jolene.");
      })
      .finally(() => setLoadingHistory(false));

    return () => controller.abort();
  }, [open, pathname]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/jolene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, contextPath: pathname }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Jolene could not answer.");

      const newMessages = payload.messages as JoleneMessage[];
      setMessages((current) => [...current, ...newMessages]);
      setContext(payload.context);

      const assistantReply = newMessages.find((item) => item.role === "ASSISTANT");
      if (voiceEnabled && assistantReply) speak(assistantReply.content);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Jolene could not answer.");
      setInput(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (!speechSupported || typeof window === "undefined") return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? "";
      }
      setInput(transcript.trim());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError("Voice input stopped. You can still type your question.");
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next && typeof window !== "undefined") window.speechSynthesis.cancel();
  };

  return (
    <>
      <Tooltip title="Ask Jolene">
        <Fab
          color="primary"
          aria-label="Ask Jolene"
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            right: { xs: 18, sm: 28 },
            bottom: { xs: 18, sm: 28 },
            zIndex: 1300,
            boxShadow: "0 18px 42px rgba(15, 118, 110, 0.32)",
          }}
        >
          <AutoAwesomeOutlinedIcon />
        </Fab>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 460 },
              maxWidth: "100vw",
              bgcolor: "#fffdf8",
              backgroundImage: "linear-gradient(180deg, #fffdf8 0%, #f5f0e6 100%)",
            },
          },
        }}
      >
        <Stack sx={{ height: "100%" }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                >
                  <AutoAwesomeOutlinedIcon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h3" sx={{ lineHeight: 1.1 }}>Jolene</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Context-aware job search agent
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title={voiceEnabled ? "Spoken replies on" : "Spoken replies off"}>
                  <IconButton onClick={toggleVoice} color={voiceEnabled ? "primary" : "default"} aria-label="Toggle spoken replies">
                    {voiceEnabled ? <VolumeUpOutlinedIcon /> : <VolumeOffOutlinedIcon />}
                  </IconButton>
                </Tooltip>
                <IconButton onClick={() => setOpen(false)} aria-label="Close Jolene">
                  <CloseOutlinedIcon />
                </IconButton>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 1 }}>
              <Chip size="small" label={context?.routeType ? labelForRoute(context.routeType) : "Loading context"} color="primary" variant="outlined" />
              <Chip size="small" label={pathname} variant="outlined" />
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>
            {context?.summary ? (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "rgba(255, 255, 255, 0.68)" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  Current context
                </Typography>
                <Typography variant="body2">{context.summary}</Typography>
              </Paper>
            ) : null}

            {loadingHistory ? (
              <Stack spacing={1.5} sx={{ alignItems: "center", py: 6 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">Loading Jolene history...</Typography>
              </Stack>
            ) : null}

            {!loadingHistory && messages.length === 0 ? (
              <Stack spacing={1.25} sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Ask why something is shown, what to do next, how to tune searches, or which data point is driving a recommendation.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                  {["Why is this shown?", "What should I do next?", "What should we tune?"].map((prompt) => (
                    <Button key={prompt} variant="outlined" size="small" onClick={() => setInput(prompt)}>
                      {prompt}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            ) : null}

            <Stack spacing={1.5}>
              {messages.map((message) => {
                const isUser = message.role === "USER";
                return (
                  <Box key={message.id} sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                    <Paper
                      elevation={0}
                      sx={{
                        maxWidth: "86%",
                        px: 1.5,
                        py: 1.25,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: isUser ? "primary.main" : "divider",
                        bgcolor: isUser ? "primary.main" : "background.paper",
                        color: isUser ? "primary.contrastText" : "text.primary",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <Typography variant="body2">{message.content}</Typography>
                    </Paper>
                  </Box>
                );
              })}
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                  <Paper variant="outlined" sx={{ px: 1.5, py: 1.25, borderRadius: 2 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">Jolene is checking this page...</Typography>
                    </Stack>
                  </Paper>
                </Box>
              ) : null}
              <div ref={scrollRef} />
            </Stack>

            {context?.suggestedActions?.length ? (
              <Box sx={{ mt: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Relevant actions
                </Typography>
                <Stack spacing={1}>
                  {context.suggestedActions.slice(0, 3).map((action) => (
                    <Button
                      key={`${action.label}-${action.href ?? action.description}`}
                      component={action.href && action.href.startsWith("/") && !action.href.startsWith("/api") ? Link : "button"}
                      href={action.href && action.href.startsWith("/") && !action.href.startsWith("/api") ? action.href : undefined}
                      variant="outlined"
                      size="small"
                      sx={{ justifyContent: "flex-start", textAlign: "left" }}
                      disabled={Boolean(action.href?.startsWith("/api"))}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Box>

          <Box sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: "divider", bgcolor: "rgba(255, 253, 248, 0.94)" }}>
            {error ? (
              <Typography variant="caption" color="error" sx={{ display: "block", mb: 1 }}>
                {error}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
              <Tooltip title={speechSupported ? "Speak to Jolene" : "Voice input is not supported in this browser"}>
                <span>
                  <IconButton
                    onClick={toggleListening}
                    disabled={!speechSupported || loading}
                    color={listening ? "primary" : "default"}
                    aria-label={listening ? "Stop listening" : "Speak to Jolene"}
                    sx={{ mb: 0.5 }}
                  >
                    {listening ? <MicOffOutlinedIcon /> : <MicOutlinedIcon />}
                  </IconButton>
                </span>
              </Tooltip>
              <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={4}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Jolene about this page..."
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <IconButton
                color="primary"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading}
                aria-label="Send message to Jolene"
                sx={{ mb: 0.5 }}
              >
                <SendOutlinedIcon />
              </IconButton>
            </Stack>
          </Box>
        </Stack>
      </Drawer>
    </>
  );
}

function speak(content: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function labelForRoute(routeType: string) {
  return routeType
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
