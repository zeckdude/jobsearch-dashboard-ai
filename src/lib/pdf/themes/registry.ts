import type { PdfPreset, ThemeDefinition } from "@/lib/pdf/types";
import {
  ACCENT_RAIL_TOKENS,
  ATELIER_TOKENS,
  BANNER_TOKENS,
  BOLD_TOKENS,
  CLASSIC_TOKENS,
  COMPACT_TOKENS,
  GRID_SKILLS_TOKENS,
  METRO_TOKENS,
  SIDEBAR_TOKENS,
  SPLIT_TOKENS,
} from "@/lib/pdf/themes/tokens";

export const THEME_REGISTRY: ThemeDefinition[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Centered header with restrained black-and-white hierarchy.",
    vibe: "professional",
    archetype: "single-column",
    atsTier: 100,
    tokens: CLASSIC_TOKENS,
  },
  {
    id: "atelier",
    name: "Atelier",
    description: "Serif editorial style with warm accents and brass rules.",
    vibe: "professional",
    archetype: "single-column",
    atsTier: 100,
    tokens: ATELIER_TOKENS,
  },
  {
    id: "metro",
    name: "Metro",
    description: "Modern split header with teal accents on section titles.",
    vibe: "modern",
    archetype: "split-header",
    atsTier: 100,
    tokens: METRO_TOKENS,
  },
  {
    id: "banner",
    name: "Banner",
    description: "Bold full-width header band with confident color blocking.",
    vibe: "creative",
    archetype: "header-band",
    atsTier: 88,
    tokens: BANNER_TOKENS,
  },
  {
    id: "accent-rail",
    name: "Accent Rail",
    description: "Creative violet accent bars with expressive hierarchy.",
    vibe: "creative",
    archetype: "accent-rail",
    atsTier: 88,
    tokens: ACCENT_RAIL_TOKENS,
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description: "Structured left rail for contact and skills; narrative on the right.",
    vibe: "modern",
    archetype: "sidebar",
    atsTier: 88,
    tokens: SIDEBAR_TOKENS,
  },
  {
    id: "split",
    name: "Split",
    description: "Contemporary two-tone header block with crisp section accents.",
    vibe: "modern",
    archetype: "split-block",
    atsTier: 88,
    tokens: SPLIT_TOKENS,
  },
  {
    id: "bold",
    name: "Bold",
    description: "Oversized name and heavy typographic hierarchy with minimal rules.",
    vibe: "creative",
    archetype: "single-column",
    atsTier: 100,
    tokens: BOLD_TOKENS,
  },
  {
    id: "grid-skills",
    name: "Grid Skills",
    description: "Data-oriented layout with skills organized in clean columns.",
    vibe: "modern",
    archetype: "grid-skills",
    atsTier: 100,
    tokens: GRID_SKILLS_TOKENS,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter spacing for senior profiles with extensive experience.",
    vibe: "compact",
    archetype: "single-column",
    atsTier: 100,
    tokens: COMPACT_TOKENS,
  },
];

export const THEME_BY_ID = Object.fromEntries(
  THEME_REGISTRY.map((theme) => [theme.id, theme]),
) as Record<PdfPreset, ThemeDefinition>;

export const RESUME_THEME_OPTIONS = THEME_REGISTRY.map(({ id, name, description, vibe, atsTier }) => ({
  id,
  name,
  description,
  vibe,
  atsTier,
}));

export const THEME_VIBE_LABELS: Record<string, string> = {
  professional: "Professional",
  modern: "Modern",
  creative: "Creative",
  compact: "Compact",
};

const LEGACY_PRESET_MAP: Record<string, PdfPreset> = {
  tschichold: "classic",
  swiss: "metro",
  modern: "metro",
};

export function normalizePdfPreset(value: string): PdfPreset {
  if (value in THEME_BY_ID) return value as PdfPreset;
  if (value in LEGACY_PRESET_MAP) return LEGACY_PRESET_MAP[value];
  return "atelier";
}

export function getTheme(preset: PdfPreset): ThemeDefinition {
  return THEME_BY_ID[preset] ?? THEME_BY_ID.atelier;
}

export function getThemeAtsTier(preset: PdfPreset): number {
  return getTheme(preset).atsTier;
}
