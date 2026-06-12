"use client";

import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { MarketIntelligenceOutput } from "@/lib/agents/market-intelligence";
import { ProfileOptimizerPanel } from "./profile-optimizer-panel";
import type { OptimizerOutput } from "./profile-optimizer-panel";
import { SearchExpansionPanel } from "./search-expansion-panel";
import type { SearchExpansionPanelOutput } from "./search-expansion-panel";
import { MarketIntelligencePanel } from "./market-intelligence-panel";
import { ProfileSuggestionPanel } from "./profile-suggestion-panel";
import { ProfileRebuildPanel } from "./profile-rebuild-panel";

type Props = {
  latestOptimizer: OptimizerOutput | null;
  latestExpansion: SearchExpansionPanelOutput | null;
  latestMarket: MarketIntelligenceOutput | null;
};

export function ProfileToolsSection({ latestOptimizer, latestExpansion, latestMarket }: Props) {
  return (
    <Stack id="strategy-tools" spacing={2} data-workflow-target="market-intelligence-section">
      <Stack spacing={0.5}>
        <Typography variant="h3">Strategy tools</Typography>
        <Typography variant="body2" color="text.secondary">
          Run these occasionally to sharpen your search strategy, spot gaps, and get market signals.
          Expand any tool to learn what it does and run it — results appear inline.
        </Typography>
      </Stack>

      <Box>
        <ToolAccordion
          icon={<PsychologyOutlinedIcon />}
          title="Profile Optimizer"
          benefit="Grade every profile's targeting quality and find what's hurting your results"
          description="Scores each profile for match volume, approval rate, average job fit, and outcomes. Flags overlap between campaigns, catches profiles that are too broad or too narrow, and recommends specific actions — like merging similar profiles or tightening noisy keyword lists."
          when="Run this before each batch of job runs, or any time the Health scores in the table look low."
        >
          <ProfileOptimizerPanel latest={latestOptimizer} />
        </ToolAccordion>

        <Divider />

        <ToolAccordion
          icon={<ExploreOutlinedIcon />}
          title="Search Expansion"
          benefit="Find companies and roles you're missing in your current search coverage"
          description="Compares your active profile targets against the full curated company list to spot gaps. Surfaces focused campaign ideas for companies or sectors you haven't explicitly targeted — so you don't accidentally ignore a whole category of relevant employers."
          when="Run this after your first few search runs, or whenever your job queue feels thin."
        >
          <SearchExpansionPanel latest={latestExpansion} />
        </ToolAccordion>

        <Divider />

        <ToolAccordion
          icon={<TrendingUpOutlinedIcon />}
          title="Weekly Market Brief"
          benefit="See which skills and role types are actually in demand right now"
          description="Combines your recent job pipeline with external market signals to show trending skills, hot role categories, and where demand is shifting. Helps you decide whether to add keywords, broaden a profile, or pivot to a new lane entirely."
          when="Run this weekly after a search run to get fresh market signals."
        >
          <MarketIntelligencePanel latest={latestMarket} />
        </ToolAccordion>

        <Divider />

        <ToolAccordion
          icon={<AutoAwesomeOutlinedIcon />}
          title="AI Opportunity Scan"
          benefit="Let AI suggest profiles you may have overlooked based on your background"
          description="Analyzes your approved resume profile and synced GitHub projects to spot positioning angles or role categories that fit your experience but aren't currently in your search strategy. Good for catching blind spots."
          when="Run this once during setup, then again whenever you want fresh positioning ideas."
        >
          <ProfileSuggestionPanel />
        </ToolAccordion>

        <Divider />

        <ToolAccordion
          icon={<WarningAmberOutlinedIcon color="warning" />}
          title="Full Strategy Rebuild"
          benefit="Reset all profiles and let AI build a new strategy from your resume evidence"
          description="Wipes every current search profile and replaces them with a fully AI-generated strategy built from your verified resume, GitHub work, application history, and outcomes. Use this only if your current profiles are fundamentally broken and you want a completely clean slate."
          when="Last resort only — this permanently deletes all existing search profiles."
          warning
        >
          <ProfileRebuildPanel />
        </ToolAccordion>
      </Box>
    </Stack>
  );
}

function ToolAccordion({
  icon,
  title,
  benefit,
  description,
  when,
  warning,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  benefit: string;
  description: string;
  when: string;
  warning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      square
      sx={{
        bgcolor: "transparent",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ px: 0, py: 1.5, alignItems: "flex-start", "& .MuiAccordionSummary-content": { my: 0 } }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", flexGrow: 1, mr: 2 }}>
          <Box sx={{ mt: 0.25, color: warning ? "warning.main" : "text.secondary", flexShrink: 0 }}>
            {icon}
          </Box>
          <Stack spacing={0.25}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
              {warning && <Chip size="small" color="warning" variant="outlined" label="Destructive" />}
            </Stack>
            <Typography variant="body2" color="text.secondary">{benefit}</Typography>
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0, pb: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={1} sx={{ pl: 4.5 }}>
            <Typography variant="body2">{description}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
              When to use: {when}
            </Typography>
          </Stack>
          {children}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
