import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ py: 5, px: 2, textAlign: "center" }}>
      <Stack spacing={1.5} sx={{ alignItems: "center", maxWidth: 460, mx: "auto" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: "primary.light",
            color: "primary.dark",
          }}
        >
          <InboxOutlinedIcon fontSize="small" />
        </Box>
        <Typography variant="h3">{title}</Typography>
        <Typography color="text.secondary">{body}</Typography>
        {action}
      </Stack>
    </Box>
  );
}
