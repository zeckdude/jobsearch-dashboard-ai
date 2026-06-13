export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;

export type BulletMarker = "dash" | "square" | "none";
export type FontFace = "regular" | "bold" | "serif" | "serifBold";

export type PdfPreset =
  | "classic"
  | "atelier"
  | "metro"
  | "banner"
  | "accent-rail"
  | "sidebar"
  | "split"
  | "bold"
  | "grid-skills"
  | "compact";

/** @deprecated Legacy preset IDs — mapped via normalizePdfPreset */
export type LegacyPdfPreset = "tschichold" | "swiss" | "modern";

export const PDF_PRESET_VALUES = [
  "classic",
  "atelier",
  "metro",
  "banner",
  "accent-rail",
  "sidebar",
  "split",
  "bold",
  "grid-skills",
  "compact",
] as const satisfies readonly PdfPreset[];

export type LayoutArchetype =
  | "single-column"
  | "split-header"
  | "header-band"
  | "accent-rail"
  | "sidebar"
  | "split-block"
  | "grid-skills";

export type ThemeVibe = "professional" | "modern" | "creative" | "compact";

export type AtsTier = 100 | 88 | 76;

export type ThemeTokens = {
  left: number;
  right: number;
  bodyTopP1: number;
  bodyTopPN: number;
  bottom: number;

  pageColorCmd: string;

  nameY: number;
  nameSize: number;
  nameTracking: number;
  nameFont: FontFace;
  nameColorCmd: string;
  nameCentered: boolean;

  contactY: number;
  contactSize: number;
  contactColorCmd: string;
  dividerY: number;
  dividerWeight: number;
  dividerColorCmd: string;
  urlColorCmd: string;

  sectionSize: number;
  sectionTracking: number;
  sectionFont: FontFace;
  sectionGapBefore: number;
  sectionLeading: number;
  sectionRuleWeight: number;
  sectionRuleColorCmd: string;
  sectionRuleOffset: number;
  sectionTextColorCmd: string;

  roleSize: number;
  roleFont: FontFace;
  roleGapBefore: number;
  roleLeading: number;
  roleTextColorCmd: string;
  dateSize: number;
  dateColorCmd: string;

  bulletSize: number;
  bulletLeading: number;
  bulletGapBefore: number;
  bulletIndent: number;
  bulletMarker: BulletMarker;

  bodySize: number;
  bodyFont: FontFace;
  bodyLeading: number;
  bodyGapBefore: number;

  spaceLeading: number;

  wrapSection: number;
  wrapRole: number;
  wrapBullet: number;
  wrapBody: number;

  accentColorCmd: string;
  headerBandHeight: number;
  headerFillColorCmd: string;
  headerBlockWidth: number;
  accentRailWidth: number;
  sidebarWidth: number;
  sidebarFillColorCmd: string;
  gridSkillsColumns: number;
  showSectionRules: boolean;
};

export type ThemeDefinition = {
  id: PdfPreset;
  name: string;
  description: string;
  vibe: ThemeVibe;
  archetype: LayoutArchetype;
  atsTier: AtsTier;
  tokens: ThemeTokens;
};

export type LineKind = "section" | "role" | "project" | "bullet" | "body" | "space";

export type PdfLine = {
  text: string;
  rightText?: string;
  kind: LineKind;
  size: number;
  font: FontFace;
  leading: number;
  gapBefore: number;
  xOffset: number;
  continuation?: boolean;
  sectionName?: string;
};

export type UrlAnnotation = {
  uri: string;
  rect: [number, number, number, number];
};

export type StyleDef = {
  size: number;
  font: FontFace;
  leading: number;
  gapBefore: number;
  xOffset: number;
  width: number;
};

export type Preprocessed = {
  name: string;
  contactLine: string;
  bodyText: string;
};

export type HeaderRenderResult = {
  content: string;
  annotations: UrlAnnotation[];
};
