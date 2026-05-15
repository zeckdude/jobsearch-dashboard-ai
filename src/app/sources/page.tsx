import SourceOutlinedIcon from "@mui/icons-material/SourceOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/app/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { configToPrismaJson, defaultCompanySourceConfig, normalizeCompanySourceConfig } from "@/lib/job-search/company-source-config";
import { prisma } from "@/lib/prisma";
import { CompanySourceSettings } from "./company-source-settings";

export const dynamic = "force-dynamic";

export default async function SourcesPage({ searchParams }: { searchParams?: { q?: string; category?: string; priority?: string } }) {
  const source = await prisma.jobSource.upsert({
    where: { type_name: { type: "company_site", name: "Company Source List" } },
    update: {},
    create: {
      name: "Company Source List",
      type: "company_site",
      enabled: true,
      config: configToPrismaJson(defaultCompanySourceConfig()),
    },
  });
  const config = normalizeCompanySourceConfig(source.config);
  const query = searchParams?.q?.trim().toLowerCase() ?? "";
  const category = searchParams?.category?.trim() ?? "";
  const priority = Number(searchParams?.priority ?? 0);
  const categories = Array.from(new Set(config.companies.flatMap((company) => company.categories))).sort();
  const visibleCompanies = config.companies.filter((company) => {
    const haystack = `${company.name} ${company.categories.join(" ")} ${company.searchTerms.join(" ")}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesCategory = !category || company.categories.includes(category);
    const matchesPriority = !priority || company.priority === priority;
    return matchesQuery && matchesCategory && matchesPriority;
  });
  const priorityCounts = [1, 2, 3].map((item) => ({
    priority: item,
    count: config.companies.filter((company) => company.priority === item).length,
  }));

  return (
    <AppShell>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Source management"
          title="Company Sources"
          description="Manage the curated company source list used to probe direct careers pages and ATS feeds. This is a source list, not a claim that each company is currently hiring."
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
          <Metric label="Status" value={<StatusChip status={source.enabled ? "configured" : "provider_missing"} />} helper={source.enabled ? "Included in search runs" : "Paused"} />
          <Metric label="Companies" value={config.companies.length.toString()} helper={`${visibleCompanies.length} visible with current filters`} />
          <Metric label="Priority ceiling" value={config.priorityMax.toString()} helper="Lower is more targeted" />
          <Metric label="Max fetched" value={config.maxFetch.toString()} helper={`${config.maxCompanies} companies per run`} />
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <SourceOutlinedIcon color="primary" />
                <Typography variant="h3">Run settings</Typography>
              </Stack>
              <CompanySourceSettings
                enabled={source.enabled}
                priorityMax={config.priorityMax}
                maxCompanies={config.maxCompanies}
                maxJobsPerCompany={config.maxJobsPerCompany}
                maxFetch={config.maxFetch}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
                <Box>
                  <Typography variant="h3">Company list</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Priority 1 companies are searched first. Categories and search terms guide role filtering after ATS feeds return jobs.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {priorityCounts.map((item) => <Chip key={item.priority} variant="outlined" label={`P${item.priority}: ${item.count}`} />)}
                </Stack>
              </Stack>

              <Box component="form" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" }, gap: 1.5 }}>
                <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Search companies, categories, or terms" style={inputStyle} />
                <select name="category" defaultValue={category} style={inputStyle}>
                  <option value="">All categories</option>
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select name="priority" defaultValue={priority ? String(priority) : ""} style={inputStyle}>
                  <option value="">All priorities</option>
                  <option value="1">Priority 1</option>
                  <option value="2">Priority 2</option>
                  <option value="3">Priority 3</option>
                </select>
              </Box>

              {visibleCompanies.length === 0 ? (
                <EmptyState title="No companies match those filters" body="Clear the search, category, or priority filter to see the source list." />
              ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 1.5 }}>
                  {visibleCompanies.slice(0, 120).map((company) => (
                    <Box key={company.name} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5, bgcolor: "background.paper" }}>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Box>
                            <Typography sx={{ fontWeight: 900 }}>{company.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{company.careersQuery}</Typography>
                          </Box>
                          <Chip size="small" color={company.priority === 1 ? "success" : company.priority === 2 ? "primary" : "default"} label={`P${company.priority}`} />
                        </Stack>
                        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                          {company.categories.slice(0, 6).map((item) => <Chip key={`${company.name}-${item}`} size="small" variant="outlined" label={item} />)}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {company.searchTerms.slice(0, 5).join(", ")}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}

function Metric({ label, value, helper }: { label: string; value: React.ReactNode; helper: string }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Box sx={{ mt: 0.75, fontWeight: 900 }}>{value}</Box>
        <Typography variant="caption" color="text.secondary">{helper}</Typography>
      </CardContent>
    </Card>
  );
}

const inputStyle = {
  border: "1px solid #d7d1c3",
  borderRadius: 8,
  font: "inherit",
  padding: "10px 12px",
  minHeight: 42,
  background: "#fff",
};
