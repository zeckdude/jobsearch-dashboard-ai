"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultSearchRunOptionsFormValue,
  preferencesToFormValue,
  type CompanySourceRunCatalog,
  type SearchRunOptionsFormValue,
  type SearchRunProfileOption,
  type SearchRunSourceOption,
} from "@/components/search-run-options-fields";

export function useSearchRunOptions() {
  const [sources, setSources] = useState<SearchRunSourceOption[]>([]);
  const [profiles, setProfiles] = useState<SearchRunProfileOption[]>([]);
  const [companySourceCatalog, setCompanySourceCatalog] = useState<CompanySourceRunCatalog | null>(null);
  const [options, setOptions] = useState<SearchRunOptionsFormValue>(defaultSearchRunOptionsFormValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prefsResponse, catalogResponse] = await Promise.all([
        fetch("/api/settings/search-preferences"),
        fetch("/api/settings/job-sources"),
      ]);
      const prefsBody = await prefsResponse.json().catch(() => ({}));
      const catalogBody = await catalogResponse.json().catch(() => ({}));
      if (!prefsResponse.ok) throw new Error(prefsBody.error ?? "Unable to load search preferences.");
      if (!catalogResponse.ok) throw new Error(catalogBody.error ?? "Unable to load job sources.");

      setSources(catalogBody.sources ?? []);
      setProfiles(catalogBody.profiles ?? []);
      setCompanySourceCatalog(catalogBody.companySourceRun ?? null);
      setOptions(preferencesToFormValue(
        prefsBody.preferences ?? defaultSearchRunOptionsFormValue,
        catalogBody.companySourceRun?.defaults,
      ));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load search options.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { sources, profiles, companySourceCatalog, options, setOptions, loading, error, reload };
}
