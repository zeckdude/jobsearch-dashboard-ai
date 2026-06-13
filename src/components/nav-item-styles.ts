export const navItemSx = {
  minHeight: 40,
  color: "text.secondary",
  border: "1px solid transparent",
  borderRadius: 1.5,
  "&:hover": {
    bgcolor: "#eef7f6",
    color: "primary.dark",
  },
  "&.Mui-selected": {
    bgcolor: "#e6f5f3",
    color: "primary.dark",
    borderColor: "#b7ded8",
    "&:hover": { bgcolor: "#d9efec" },
    "& .MuiListItemIcon-root": { color: "primary.dark" },
  },
} as const;
