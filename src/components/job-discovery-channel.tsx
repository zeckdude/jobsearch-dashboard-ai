"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ProfileLink } from "@/components/profile-link";
import { ScoreChip } from "@/components/ui/score-chip";
import { StatusChip } from "@/components/ui/status-chip";
import {
  describeDiscoveryChannel,
  discoveryDescriptionForMatch,
  type DiscoveryMetadata,
  isSearchQueryDiscoverySource,
  listSearchQueryCatalogCoverage,
  postingLinkLabel,
  postingSiteLabel,
  resolveMatchedPlatform,
  searchQueryCoverageCount,
} from "@/lib/jobs/discovery-channel";

export type MatchingProfileSummary = {
  id: string;
  name: string;
  score: number;
  matchTier: string;
  status: string;
};

export function JobDiscoveryChannel({
  source,
  applicationUrl,
  discoveryMetadata,
  profileId,
  profileName,
  allMatchingProfiles,
  compact = false,
}: {
  source: { name: string; type: string } | null | undefined;
  applicationUrl?: string | null;
  discoveryMetadata?: DiscoveryMetadata | null;
  profileId?: string | null;
  profileName?: string | null;
  allMatchingProfiles?: MatchingProfileSummary[];
  compact?: boolean;
}) {
  const [coverageExpanded, setCoverageExpanded] = useState(false);
  const [queryExpanded, setQueryExpanded] = useState(false);
  const [profilesExpanded, setProfilesExpanded] = useState(false);

  const info = describeDiscoveryChannel(source);
  if (!info) return null;

  const matched = resolveMatchedPlatform({ applicationUrl, discoveryMetadata });
  const description = discoveryDescriptionForMatch(source, matched);
  const postingLabel = postingLinkLabel(applicationUrl);
  const postingSite = postingSiteLabel(applicationUrl);
  const showSearchCoverage = isSearchQueryDiscoverySource(source);
  const coverageGroups = showSearchCoverage ? listSearchQueryCatalogCoverage() : [];
  const coverageCount = showSearchCoverage ? searchQueryCoverageCount() : 0;
  const resolvedProfileId = profileId ?? discoveryMetadata?.profileId ?? null;
  const resolvedProfileName = profileName ?? discoveryMetadata?.profileName ?? null;
  const multiProfiles = (allMatchingProfiles ?? []).filter((entry, index, list) => list.findIndex((item) => item.id === entry.id) === index);
  const showAllProfiles = multiProfiles.length > 1;

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.default",
        px: compact ? 1.5 : 2,
        py: compact ? 1.25 : 1.5,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 800, textTransform: "uppercase", display: "block", mb: 0.75 }}
      >
        How we found this job
      </Typography>
      <Stack spacing={1}>
        <Box>
          <Typography variant={compact ? "body2" : "subtitle1"} sx={{ fontWeight: 800 }}>
            {info.headline}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, mt: 0.25 }}>
            {description}
          </Typography>
        </Box>

        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Discovery channel: <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{info.channelName}</Box>
          </Typography>
          {resolvedProfileName ? (
            <Typography variant="caption" color="text.secondary">
              Matched search profile:{" "}
              <ProfileLink profileId={resolvedProfileId} name={resolvedProfileName} fontWeight={700} />
            </Typography>
          ) : null}
          {matched.platform ? (
            <Typography variant="caption" color="text.secondary">
              {matched.confidence === "exact" ? "Matched platform: " : "Posting host: "}
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{matched.platform}</Box>
            </Typography>
          ) : null}
        </Stack>

        {matched.query ? (
          <Box>
            <Button
              size="small"
              variant="text"
              onClick={() => setQueryExpanded((value) => !value)}
              endIcon={
                <ExpandMoreIcon
                  sx={{
                    fontSize: "18px !important",
                    transform: queryExpanded ? "rotate(180deg)" : "none",
                    transition: "transform 160ms ease",
                  }}
                />
              }
              sx={{ px: 0, minWidth: 0, fontSize: "0.75rem" }}
            >
              {queryExpanded ? "Hide matched Brave search query" : "Show matched Brave search query"}
            </Button>
            <Collapse in={queryExpanded}>
              <Box
                sx={{
                  mt: 0.5,
                  p: 1,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.paper",
                }}
              >
                <Typography variant="caption" component="pre" sx={{ m: 0, fontFamily: "monospace", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {matched.query}
                </Typography>
              </Box>
            </Collapse>
          </Box>
        ) : null}

        {showAllProfiles ? (
          <Box>
            <Button
              size="small"
              variant="text"
              onClick={() => setProfilesExpanded((value) => !value)}
              endIcon={
                <ExpandMoreIcon
                  sx={{
                    fontSize: "18px !important",
                    transform: profilesExpanded ? "rotate(180deg)" : "none",
                    transition: "transform 160ms ease",
                  }}
                />
              }
              sx={{ px: 0, minWidth: 0, fontSize: "0.75rem" }}
            >
              {profilesExpanded ? "Hide all matching profiles" : `Show all ${multiProfiles.length} matching profiles`}
            </Button>
            <Collapse in={profilesExpanded}>
              <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                {multiProfiles.map((entry) => (
                  <Stack key={entry.id} direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                    <ProfileLink profileId={entry.id} name={entry.name} variant="chip" />
                    <ScoreChip score={entry.score} />
                    <Chip
                      size="small"
                      variant="outlined"
                      color={entry.matchTier === "partial" ? "warning" : "success"}
                      label={entry.matchTier === "partial" ? "Partial" : "Full"}
                    />
                    <StatusChip status={entry.status} />
                  </Stack>
                ))}
              </Stack>
            </Collapse>
          </Box>
        ) : null}

        {showSearchCoverage ? (
          <Box>
            <Button
              size="small"
              variant="text"
              onClick={() => setCoverageExpanded((value) => !value)}
              endIcon={
                <ExpandMoreIcon
                  sx={{
                    fontSize: "18px !important",
                    transform: coverageExpanded ? "rotate(180deg)" : "none",
                    transition: "transform 160ms ease",
                  }}
                />
              }
              sx={{ px: 0, minWidth: 0, fontSize: "0.75rem" }}
            >
              {coverageExpanded
                ? "Hide platforms covered by Web search"
                : `Show all ${coverageCount} platforms covered by Web search`}
            </Button>
            <Collapse in={coverageExpanded}>
              <Stack spacing={1.25} sx={{ mt: 0.75 }}>
                {coverageGroups.map((group) => (
                  <Box key={group.category}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: "block", mb: 0.5 }}>
                      {group.label} ({group.platforms.length})
                    </Typography>
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                      {group.platforms.map((platform) => (
                        <Chip
                          key={platform}
                          size="small"
                          variant="outlined"
                          color={matched.platform === platform ? "primary" : "default"}
                          label={platform}
                        />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Collapse>
          </Box>
        ) : null}

        {applicationUrl ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, pt: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              {postingSite
                ? `The listing link opens the employer's posting on ${postingSite}.`
                : "The listing link opens the employer's live job posting in a new tab."}
            </Typography>
            <Button
              component="a"
              href={applicationUrl}
              target="_blank"
              rel="noreferrer"
              size="small"
              variant="outlined"
              endIcon={<OpenInNewIcon sx={{ fontSize: "14px !important" }} />}
              sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
            >
              {postingLabel}
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
