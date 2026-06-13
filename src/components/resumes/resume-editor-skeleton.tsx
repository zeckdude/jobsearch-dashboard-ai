"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export function ResumeEditorSkeleton() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 420px" },
        gap: 3,
        alignItems: "start",
      }}
    >
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
              <Skeleton width={120} height={36} />
              <Skeleton width={140} height={36} />
            </Stack>
            <Divider />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={`field-${index}`} variant="rounded" height={56} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={96} />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={180} />
            <Divider />
            <Skeleton variant="rounded" height={72} />
            <Divider />
            <Skeleton variant="rounded" height={72} />
            <Divider />
            <Skeleton variant="rounded" height={120} />
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Skeleton width="50%" height={28} />
              <Skeleton width="70%" height={20} />
              <Skeleton variant="rounded" width={140} height={36} />
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Skeleton width="45%" height={28} />
              <Skeleton width="80%" height={20} />
              <Skeleton variant="rounded" sx={{ width: "100%", aspectRatio: "8.5 / 11", maxHeight: 520 }} />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
