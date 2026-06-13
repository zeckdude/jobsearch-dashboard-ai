import {
  makeStyles,
  paginate,
  partitionForSidebar,
  preprocess,
  reorderForSidebarStream,
  toPdfLines,
} from "@/lib/pdf/parse-resume";
import {
  renderBannerHeader,
  renderBodyPage,
  renderPageBackground,
  renderSidebarBackground,
  renderSidebarColumn,
  renderSplitBlockHeader,
  renderSplitHeader,
  renderStandardHeader,
} from "@/lib/pdf/render-pdf";
import type { HeaderRenderResult, PdfLine, Preprocessed, ThemeDefinition } from "@/lib/pdf/types";

export type LayoutContext = {
  theme: ThemeDefinition;
  preprocessed: Preprocessed;
  pages: PdfLine[][];
  sidebarPages: PdfLine[][];
  mainPages: PdfLine[][];
};

export function buildLayoutContext(text: string, theme: ThemeDefinition): LayoutContext {
  const preprocessed = preprocess(text);
  const styles = makeStyles(theme.tokens);
  const bodyLines = toPdfLines(preprocessed.bodyText, styles);

  if (theme.archetype === "sidebar") {
    const streamLines = reorderForSidebarStream(bodyLines);
    const { sidebarLines, mainLines } = partitionForSidebar(bodyLines);
    return {
      theme,
      preprocessed,
      pages: paginate(streamLines, theme.tokens),
      sidebarPages: sidebarLines.length ? paginate(sidebarLines, theme.tokens) : [[]],
      mainPages: paginate(mainLines, theme.tokens),
    };
  }

  const pages = paginate(bodyLines, theme.tokens);
  return { theme, preprocessed, pages, sidebarPages: [[]], mainPages: pages };
}

export function renderFirstPageHeader(ctx: LayoutContext): HeaderRenderResult {
  const { name, contactLine } = ctx.preprocessed;
  const p = ctx.theme.tokens;

  switch (ctx.theme.archetype) {
    case "split-header":
      return renderSplitHeader(name, contactLine, p);
    case "header-band":
      return renderBannerHeader(name, contactLine, p);
    case "split-block":
      return renderSplitBlockHeader(name, contactLine, p);
    default:
      return renderStandardHeader(name, contactLine, p);
  }
}

export function renderPageBody(ctx: LayoutContext, pageIndex: number): string {
  const p = ctx.theme.tokens;

  if (ctx.theme.archetype === "sidebar") {
    const parts: string[] = [];
    if (pageIndex === 0) {
      parts.push(renderSidebarBackground(p));
    }
    const mainPage = ctx.mainPages[pageIndex] ?? [];
    const startY = pageIndex === 0 ? p.bodyTopP1 : p.bodyTopPN;
    const mainLeft = pageIndex === 0 ? p.left + p.sidebarWidth + 16 : p.left;
    parts.push(
      renderBodyPage(mainPage, startY, p, {
        accentSections: true,
        mainLeft,
        mainRight: p.right,
      }),
    );
    if (pageIndex === 0) {
      const sidebarLines = ctx.sidebarPages[0] ?? [];
      if (sidebarLines.length) {
        parts.push(renderSidebarColumn(sidebarLines, p.bodyTopP1, p));
      }
    }
    return parts.join("\n");
  }

  const pageLines = ctx.pages[pageIndex];
  const startY = pageIndex === 0 ? p.bodyTopP1 : p.bodyTopPN;
  const bodyOptions = {
    accentRail: ctx.theme.archetype === "accent-rail",
    gridSkills: ctx.theme.archetype === "grid-skills",
    accentSections: ctx.theme.archetype === "metro" || ctx.theme.archetype === "grid-skills",
  };

  return renderBodyPage(pageLines, startY, p, bodyOptions);
}

/** Background → optional header → body (correct PDF paint order). */
export function renderFullPage(ctx: LayoutContext, pageIndex: number, headerContent = ""): string {
  const p = ctx.theme.tokens;
  const parts: string[] = [renderPageBackground(p)];
  if (pageIndex === 0 && headerContent) parts.push(headerContent);
  parts.push(renderPageBody(ctx, pageIndex));
  return parts.join("\n");
}

export function renderPageContent(ctx: LayoutContext, pageIndex: number): string {
  return renderFullPage(ctx, pageIndex);
}

export function pageCount(ctx: LayoutContext): number {
  if (ctx.theme.archetype === "sidebar") {
    return Math.max(ctx.mainPages.length, 1);
  }
  return ctx.pages.length;
}
