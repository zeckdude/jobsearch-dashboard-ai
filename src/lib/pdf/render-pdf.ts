import {
  displayTextToUri,
  escapePdfText,
  fontResource,
  isWebUrl,
  splitSkillsIntoColumns,
  textWidth,
} from "@/lib/pdf/pdf-utils";
import type { HeaderRenderResult, PdfLine, ThemeTokens, UrlAnnotation } from "@/lib/pdf/types";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/types";

export function renderPageBackground(p: ThemeTokens): string {
  return `q ${p.pageColorCmd} 0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f Q`;
}

function renderContactGroup(
  cmds: string[],
  annotations: UrlAnnotation[],
  parts: string[],
  startX: number,
  contactY: number,
  p: ThemeTokens,
  colorCmd: string,
): void {
  if (!parts.length) return;
  const sep = "  |  ";
  cmds.push("BT");
  cmds.push(colorCmd);
  cmds.push(`/F1 ${p.contactSize} Tf`);
  cmds.push("0 Tc");
  let x = startX;
  for (let i = 0; i < parts.length; i += 1) {
    if (i > 0) {
      cmds.push(`1 0 0 1 ${x.toFixed(2)} ${contactY} Tm`);
      cmds.push(`(${escapePdfText(sep)}) Tj`);
      x += textWidth(sep, p.contactSize);
    }
    const part = parts[i];
    const pw = textWidth(part, p.contactSize);
    const uri = displayTextToUri(part);
    if (uri) cmds.push(p.urlColorCmd);
    cmds.push(`1 0 0 1 ${x.toFixed(2)} ${contactY} Tm`);
    cmds.push(`(${escapePdfText(part)}) Tj`);
    if (uri) {
      cmds.push(colorCmd);
      annotations.push({ uri, rect: [x, contactY - 2, x + pw, contactY + p.contactSize] });
    }
    x += pw;
  }
  cmds.push("ET");
}

function underlineAnnotations(_cmds: string[], _annotations: UrlAnnotation[]): void {
  // Links stay active via PDF annotations; no visible underline styling.
}

function nameX(p: ThemeTokens, name: string): number {
  if (!p.nameCentered || !name) return p.left;
  const w = textWidth(name, p.nameSize);
  return Math.max(p.left, (p.left + p.right) / 2 - w / 2);
}

export function renderStandardHeader(name: string, contactLine: string, p: ThemeTokens): HeaderRenderResult {
  const cmds: string[] = [];
  const annotations: UrlAnnotation[] = [];

  cmds.push("BT");
  if (name) {
    cmds.push(p.nameColorCmd);
    cmds.push(`/${fontResource(p.nameFont)} ${p.nameSize} Tf`);
    cmds.push(`${p.nameTracking} Tc`);
    cmds.push(`1 0 0 1 ${nameX(p, name)} ${p.nameY} Tm`);
    cmds.push(`(${escapePdfText(name)}) Tj`);
  }
  cmds.push("ET");

  const contactParts = contactLine ? contactLine.split("  |  ") : [];

  if (p.nameCentered && contactParts.length > 0) {
    const sep = "  |  ";
    let totalW = 0;
    for (let i = 0; i < contactParts.length; i += 1) {
      if (i > 0) totalW += textWidth(sep, p.contactSize);
      totalW += textWidth(contactParts[i], p.contactSize);
    }
    const startX = Math.max(p.left, (p.left + p.right) / 2 - totalW / 2);
    renderContactGroup(cmds, annotations, contactParts, startX, p.contactY, p, p.contactColorCmd);
  } else {
    const leftParts = contactParts.filter((pt) => !isWebUrl(pt));
    const rightParts = contactParts.filter((pt) => isWebUrl(pt));

    renderContactGroup(cmds, annotations, leftParts, p.left, p.contactY, p, p.contactColorCmd);

    if (rightParts.length > 0) {
      let totalW = 0;
      for (let i = 0; i < rightParts.length; i += 1) {
        if (i > 0) totalW += textWidth("  |  ", p.contactSize);
        totalW += textWidth(rightParts[i], p.contactSize);
      }
      renderContactGroup(cmds, annotations, rightParts, p.right - totalW, p.contactY, p, p.contactColorCmd);
    }
  }

  underlineAnnotations(cmds, annotations);

  if (p.showSectionRules && p.dividerWeight > 0) {
    cmds.push(
      `q ${p.dividerColorCmd} ${p.dividerWeight} w ${p.left} ${p.dividerY} m ${p.right} ${p.dividerY} l S Q`,
    );
  }

  return { content: cmds.join("\n"), annotations };
}

export function renderSplitHeader(name: string, contactLine: string, p: ThemeTokens): HeaderRenderResult {
  const cmds: string[] = [];
  const annotations: UrlAnnotation[] = [];
  const contactParts = contactLine ? contactLine.split("  |  ") : [];

  cmds.push("BT");
  if (name) {
    cmds.push(p.nameColorCmd);
    cmds.push(`/${fontResource(p.nameFont)} ${p.nameSize} Tf`);
    cmds.push(`${p.nameTracking} Tc`);
    cmds.push(`1 0 0 1 ${p.left} ${p.nameY} Tm`);
    cmds.push(`(${escapePdfText(name)}) Tj`);
  }
  cmds.push("ET");

  let y = p.contactY;
  for (const part of contactParts) {
    const uri = displayTextToUri(part);
    const pw = textWidth(part, p.contactSize);
    cmds.push("BT");
    cmds.push(uri ? p.urlColorCmd : p.contactColorCmd);
    cmds.push(`/F1 ${p.contactSize} Tf`);
    cmds.push(`1 0 0 1 ${p.right - pw} ${y} Tm`);
    cmds.push(`(${escapePdfText(part)}) Tj`);
    cmds.push("ET");
    if (uri) annotations.push({ uri, rect: [p.right - pw, y - 2, p.right, y + p.contactSize] });
    y -= p.contactSize + 3;
  }

  underlineAnnotations(cmds, annotations);

  if (p.showSectionRules && p.dividerWeight > 0) {
    cmds.push(
      `q ${p.dividerColorCmd} ${p.dividerWeight} w ${p.left} ${p.dividerY} m ${p.right} ${p.dividerY} l S Q`,
    );
  }

  return { content: cmds.join("\n"), annotations };
}

export function renderBannerHeader(name: string, contactLine: string, p: ThemeTokens): HeaderRenderResult {
  const cmds: string[] = [];
  const annotations: UrlAnnotation[] = [];
  const bandTop = PAGE_HEIGHT - p.headerBandHeight;

  cmds.push(`q ${p.headerFillColorCmd} 0 ${bandTop} ${PAGE_WIDTH} ${p.headerBandHeight} re f Q`);

  const nameColor = p.nameColorCmd;
  const contactColor = p.contactColorCmd.includes("1 1 1") ? p.contactColorCmd : "1 1 1 rg";

  cmds.push("BT");
  if (name) {
    cmds.push(nameColor);
    cmds.push(`/${fontResource(p.nameFont)} ${p.nameSize} Tf`);
    cmds.push(`${p.nameTracking} Tc`);
    cmds.push(`1 0 0 1 ${p.left} ${p.nameY} Tm`);
    cmds.push(`(${escapePdfText(name)}) Tj`);
  }
  cmds.push("ET");

  const contactParts = contactLine ? contactLine.split("  |  ") : [];
  renderContactGroup(cmds, annotations, contactParts, p.left, p.contactY, p, contactColor);
  underlineAnnotations(cmds, annotations);

  return { content: cmds.join("\n"), annotations };
}

export function renderSplitBlockHeader(name: string, contactLine: string, p: ThemeTokens): HeaderRenderResult {
  const cmds: string[] = [];
  const annotations: UrlAnnotation[] = [];
  const blockH = p.headerBandHeight;
  const blockTop = p.nameY - 12;

  cmds.push(`q ${p.headerFillColorCmd} ${p.left} ${blockTop} ${p.headerBlockWidth} ${blockH} re f Q`);

  cmds.push("BT");
  if (name) {
    cmds.push(p.nameColorCmd);
    cmds.push(`/${fontResource(p.nameFont)} ${p.nameSize} Tf`);
    cmds.push(`${p.nameTracking} Tc`);
    cmds.push(`1 0 0 1 ${p.left + 14} ${p.nameY} Tm`);
    cmds.push(`(${escapePdfText(name)}) Tj`);
  }
  cmds.push("ET");

  const contactParts = contactLine ? contactLine.split("  |  ") : [];
  const mainX = p.left + p.headerBlockWidth + 16;
  renderContactGroup(cmds, annotations, contactParts, mainX, p.contactY, p, p.contactColorCmd);
  underlineAnnotations(cmds, annotations);

  if (p.showSectionRules && p.dividerWeight > 0) {
    cmds.push(
      `q ${p.dividerColorCmd} ${p.dividerWeight} w ${p.left} ${p.dividerY} m ${p.right} ${p.dividerY} l S Q`,
    );
  }

  return { content: cmds.join("\n"), annotations };
}

export function renderSidebarBackground(p: ThemeTokens): string {
  if (!p.sidebarFillColorCmd) return "";
  const top = p.bodyTopP1 + 40;
  return `q ${p.sidebarFillColorCmd} ${p.left} 0 ${p.sidebarWidth} ${top} re f Q`;
}

type BodyRenderOptions = {
  accentRail?: boolean;
  gridSkills?: boolean;
  accentSections?: boolean;
  mainLeft?: number;
  mainRight?: number;
};

export function renderBodyPage(
  lines: PdfLine[],
  startY: number,
  p: ThemeTokens,
  options: BodyRenderOptions = {},
): string {
  const left = options.mainLeft ?? p.left;
  const right = options.mainRight ?? p.right;
  let y = startY;
  const cmds: string[] = [];
  let inText = false;
  let skillsBodyLines: PdfLine[] = [];
  let capturingSkills = false;

  const endText = () => {
    if (inText) {
      cmds.push("ET");
      inText = false;
    }
  };
  const beginText = () => {
    if (!inText) {
      cmds.push("BT");
      inText = true;
    }
  };

  const flushSkillsGrid = () => {
    if (!skillsBodyLines.length) {
      capturingSkills = false;
      return;
    }
    const joined = skillsBodyLines.map((l) => l.text).join(" ");
    const cols = splitSkillsIntoColumns(joined, p.gridSkillsColumns);
    const colWidth = (right - left) / p.gridSkillsColumns;
    endText();
    for (let ci = 0; ci < cols.length; ci += 1) {
      beginText();
      cmds.push("0 Tc");
      cmds.push("0 0 0 rg");
      cmds.push(`/F1 ${p.bodySize} Tf`);
      cmds.push(`1 0 0 1 ${left + ci * colWidth} ${y} Tm`);
      cmds.push(`(${escapePdfText(cols[ci])}) Tj`);
      endText();
    }
    y -= p.bodyLeading + 4;
    skillsBodyLines = [];
    capturingSkills = false;
  };

  for (const line of lines) {
    if (capturingSkills) {
      if (line.kind === "section" || line.kind === "role" || line.kind === "bullet") {
        flushSkillsGrid();
      } else if (line.kind === "body") {
        skillsBodyLines.push(line);
        continue;
      } else if (line.kind === "space") {
        continue;
      }
    }

    y -= line.gapBefore;
    if (line.kind === "space") {
      y -= line.leading;
      continue;
    }

    if (line.kind === "section") {
      if (options.gridSkills && line.text.toLowerCase() === "skills") {
        capturingSkills = true;
      }
      if (options.accentRail && p.accentRailWidth > 0) {
        endText();
        cmds.push(`q ${p.accentColorCmd} ${left - p.accentRailWidth - 4} ${y - 2} ${p.accentRailWidth} ${line.size + 4} re f Q`);
      }
      beginText();
      cmds.push(`${p.sectionTracking} Tc`);
      cmds.push(options.accentSections ? p.sectionTextColorCmd : "0.08 0.075 0.065 rg");
      cmds.push(`/${fontResource(line.font)} ${line.size} Tf`);
      cmds.push(`1 0 0 1 ${left} ${y} Tm`);
      cmds.push(`(${escapePdfText(line.text.toUpperCase())}) Tj`);
      endText();
      if (p.showSectionRules && p.sectionRuleWeight > 0) {
        const ry = y - p.sectionRuleOffset;
        cmds.push(`q ${p.sectionRuleColorCmd} ${p.sectionRuleWeight} w ${left} ${ry} m ${right} ${ry} l S Q`);
      }
      y -= line.leading;
      continue;
    }

    if (line.kind === "bullet") {
      if (p.bulletMarker === "square" && !line.continuation) {
        endText();
        cmds.push(`q 0 0 0 rg ${left} ${y + 2.5} 3 3 re f Q`);
      }
      beginText();
      cmds.push("0 Tc");
      cmds.push("0 0 0 rg");
      cmds.push(`/F1 ${line.size} Tf`);
      if (p.bulletMarker === "dash" && !line.continuation) {
        cmds.push(`1 0 0 1 ${left} ${y} Tm`);
        cmds.push(`(-) Tj`);
      }
      cmds.push(`1 0 0 1 ${left + line.xOffset} ${y} Tm`);
      cmds.push(`(${escapePdfText(line.text)}) Tj`);
      y -= line.leading;
      continue;
    }

    beginText();
    cmds.push("0 Tc");

    if (line.rightText) {
      cmds.push(p.roleTextColorCmd);
      cmds.push(`/${fontResource(line.font)} ${line.size} Tf`);
      cmds.push(`1 0 0 1 ${left} ${y} Tm`);
      cmds.push(`(${escapePdfText(line.text)}) Tj`);
      const dateW = textWidth(line.rightText, p.dateSize);
      cmds.push(p.dateColorCmd);
      cmds.push(`/F1 ${p.dateSize} Tf`);
      cmds.push(`1 0 0 1 ${right - dateW} ${y} Tm`);
      cmds.push(`(${escapePdfText(line.rightText)}) Tj`);
    } else {
      cmds.push("0 0 0 rg");
      cmds.push(`/${fontResource(line.font)} ${line.size} Tf`);
      cmds.push(`1 0 0 1 ${left + line.xOffset} ${y} Tm`);
      cmds.push(`(${escapePdfText(line.text)}) Tj`);
    }

    y -= line.leading;
  }

  if (capturingSkills) flushSkillsGrid();
  endText();
  return cmds.join("\n");
}

export function renderSidebarColumn(
  lines: PdfLine[],
  startY: number,
  p: ThemeTokens,
): string {
  const sidebarLeft = p.left + 8;
  const sidebarRight = p.left + p.sidebarWidth - 8;
  return renderBodyPage(lines, startY, p, {
    accentSections: true,
    mainLeft: sidebarLeft,
    mainRight: sidebarRight,
  });
}
