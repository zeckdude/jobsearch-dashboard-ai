import Chip from "@mui/material/Chip";

export function ScoreChip({ score, label }: { score: number; label?: string }) {
  const color = score >= 85 ? "success" : score >= 72 ? "primary" : score >= 60 ? "warning" : "default";

  return (
    <Chip
      color={color}
      label={label ?? `${score}`}
      sx={{
        minWidth: 52,
        fontVariantNumeric: "tabular-nums",
        borderColor: "transparent",
      }}
    />
  );
}
