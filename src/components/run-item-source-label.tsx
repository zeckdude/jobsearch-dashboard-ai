import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { splitSourceLabel } from "@/lib/job-search/source-display";

export function RunItemSourceLabel({
  label,
  align = "left",
}: {
  label: string | null | undefined;
  align?: "left" | "right";
}) {
  const { parent, resource } = splitSourceLabel(label);
  return (
    <Box sx={{ minWidth: 0, textAlign: align }}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, color: "text.secondary", lineHeight: 1.35 }}
      >
        {parent}
      </Typography>
      {resource ? (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "text.disabled",
            lineHeight: 1.35,
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
        >
          {resource}
        </Typography>
      ) : null}
    </Box>
  );
}
