"use client";

import StarIcon from "@mui/icons-material/Star";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function JobFavoriteButton({
  jobId,
  initialFavorited = false,
  size = "small",
}: {
  jobId: string;
  initialFavorited?: boolean;
  size?: "small" | "medium";
}) {
  const { refresh } = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited, jobId]);

  async function toggleFavorite() {
    setLoading(true);
    const nextFavorited = !favorited;
    setFavorited(nextFavorited);
    try {
      const response = await fetch(`/api/jobs/${jobId}/favorite`, {
        method: nextFavorited ? "POST" : "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to update favorite.");
      refresh();
    } catch {
      setFavorited(!nextFavorited);
    } finally {
      setLoading(false);
    }
  }

  const label = favorited ? "Remove from favorites" : "Add to favorites";

  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size={size}
          aria-label={label}
          disabled={loading}
          onClick={(event) => {
            event.stopPropagation();
            void toggleFavorite();
          }}
          sx={{ color: favorited ? "warning.main" : "text.secondary" }}
        >
          {favorited ? <StarIcon fontSize="small" /> : <StarBorderOutlinedIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
