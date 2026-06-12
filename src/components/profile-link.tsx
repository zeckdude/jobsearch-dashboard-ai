import Link from "next/link";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";

type ProfileLinkProps = {
  profileId?: string | null;
  name: string;
  variant?: "plain" | "chip";
  fontWeight?: number;
};

export function ProfileLink({ profileId, name, variant = "plain", fontWeight = 800 }: ProfileLinkProps) {
  if (!profileId) {
    if (variant === "chip") {
      return <Chip size="small" variant="outlined" label={name} />;
    }
    return <Typography component="span" sx={{ fontWeight }}>{name}</Typography>;
  }

  if (variant === "chip") {
    return (
      <Chip
        size="small"
        variant="outlined"
        label={name}
        component={Link}
        href={`/profiles/${profileId}`}
        clickable
      />
    );
  }

  return (
    <Typography
      component={Link}
      href={`/profiles/${profileId}`}
      sx={{
        fontWeight,
        color: "primary.main",
        textDecoration: "none",
        "&:hover": { textDecoration: "underline" },
      }}
    >
      {name}
    </Typography>
  );
}
