const SECTION_HEADERS = new Set([
  "CONTACT INFO",
  "TECHNOLOGIES",
  "EXPERIENCE",
  "EDUCATION",
  "AI ENGINEERING & MODERN DEVELOPMENT",
  "PROJECTS",
  "SUMMARY",
  "SKILLS",
  "CERTIFICATIONS",
]);

const EMBEDDED_SECTION_PATTERN =
  /^(TECHNOLOGIES|EXPERIENCE|EDUCATION|PROJECTS|SUMMARY|SKILLS|CERTIFICATIONS|CONTACT INFO)\s{2,}(.+)$/i;

/**
 * Targeted cleanup for known resume text issues after PDF/DOCX extraction.
 */
export function cleanupExtractedResumeText(text: string): string {
  const normalized = dedupeAdjacentLines(
    text
      .replace(/\r/g, "")
      .replace(/\bRFC['\u2019]s\b/g, "RFCs")
      .replace(/\btools in that enabled\b/gi, "tools that enabled")
      .replace(/\bscripts to customer tickets\b/gi, "scripts for customer tickets"),
  );

  return formatExtractedResumeLayout(normalized);
}

export function formatExtractedResumeLayout(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .map(normalizeContactSpacing);

  const formatted = ensureBlankLinesBeforeSectionEntries(
    ensureBlankLinesBeforeSections(
      joinPageBreakFragments(splitEmbeddedSectionHeaders(mergeAiEngineeringHeader(lines))),
    ),
  );

  return formatted.replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeContactSpacing(line: string) {
  return line.replace(/^((?:Phone|Email|Location|LinkedIn|GitHub|Portfolio):)\s+/i, "$1 ");
}

function mergeAiEngineeringHeader(lines: string[]) {
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const next = lines[index + 1]?.trim() ?? "";
    const following = lines[index + 2]?.trim() ?? "";

    if (/^AI ENGINEERING\s*&\s*$/i.test(line) && next.toUpperCase() === "MODERN" && following.toUpperCase() === "DEVELOPMENT") {
      output.push("AI ENGINEERING & MODERN DEVELOPMENT");
      index += 2;
      continue;
    }

    output.push(lines[index] ?? "");
  }

  return output;
}

function splitEmbeddedSectionHeaders(lines: string[]) {
  return lines.flatMap((line) => {
    if (/^technologies\s+used:/i.test(line)) return [line];

    const match = line.match(EMBEDDED_SECTION_PATTERN);
    if (!match) return [line];

    const header = match[1].toUpperCase() === "CONTACT" ? "CONTACT INFO" : match[1].toUpperCase();
    return [header, match[2].trim()];
  });
}

function joinPageBreakFragments(lines: string[]) {
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line === "") {
      if (output[output.length - 1] !== "") output.push("");
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < lines.length && (lines[nextIndex] ?? "") === "") nextIndex += 1;
    const nextLine = lines[nextIndex];

    if (nextLine && shouldJoinPageBreak(line, nextLine)) {
      output.push(`${line.trim()} ${nextLine.trim()}`);
      index = nextIndex;
      continue;
    }

    output.push(line);
  }

  return output;
}

function shouldJoinPageBreak(previous: string, next: string) {
  const left = previous.trim();
  const right = next.trim();
  if (!left || !right) return false;
  if (isSectionHeaderLine(left) || isSectionHeaderLine(right)) return false;
  if (looksLikeDateLine(right)) return false;
  if (/^[A-Z0-9][A-Za-z0-9 .&'/-]{0,55}$/.test(right) && !/^[a-z]/.test(right) && right.split(" ").length <= 6) return false;
  if (left.length < 16 || right.length > 80) return false;
  if (/[.!?:"]$/.test(left)) return false;
  if (!/^[a-z(]/.test(right)) return false;

  return /\b(find|and|or|to|the|a|an|in|on|with|for|of)$/.test(left) || /[a-z,]$/.test(left);
}

function looksLikeDateLine(line: string) {
  return /^(?:\d{1,2}\/\d{4}|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})\s*[-–]/i.test(
    line.trim(),
  );
}

function isSectionHeaderLine(line: string) {
  const upper = line.trim().toUpperCase();
  if (SECTION_HEADERS.has(upper)) return true;
  return upper.startsWith("AI ENGINEERING");
}

function ensureBlankLinesBeforeSections(lines: string[]) {
  const output: string[] = [];

  for (const line of lines) {
    if (line === "") {
      if (output[output.length - 1] !== "") output.push("");
      continue;
    }

    if (isSectionHeaderLine(line) && output.length > 0 && output[output.length - 1] !== "") {
      output.push("");
    }

    output.push(line);
  }

  return output;
}

type ResumeLayoutSection = "none" | "experience" | "projects";

function ensureBlankLinesBeforeSectionEntries(lines: string[]) {
  const output: string[] = [];
  let section: ResumeLayoutSection = "none";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (line === "") {
      if (output[output.length - 1] !== "") output.push("");
      continue;
    }

    if (line.toUpperCase() === "EXPERIENCE") {
      section = "experience";
    } else if (line.toUpperCase() === "PROJECTS") {
      section = "projects";
    } else if (isSectionHeaderLine(line)) {
      section = "none";
    }

    const next = lines[index + 1];
    const following = lines[index + 2];
    const isEntryStart =
      (section === "experience" && isExperienceEntryStart(line, next, following)) ||
      (section === "projects" && isProjectEntryStart(line, next));

    if (isEntryStart && output.length > 0 && output[output.length - 1] !== "") {
      output.push("");
    }

    output.push(line);
  }

  return output.join("\n");
}

function isExperienceEntryStart(line: string, next?: string, following?: string) {
  if (!next || /^technologies\s+used:/i.test(line) || /^key achievements$/i.test(line.trim())) return false;
  if (!looksLikeCompanyName(line) || !looksLikeRoleTitle(next)) return false;
  return Boolean(following && looksLikeDateLine(following));
}

function isProjectEntryStart(line: string, next?: string) {
  if (!next || /^stack:/i.test(line) || /^stack:/i.test(next)) return false;
  if (!looksLikeProjectName(line)) return false;
  return looksLikeProjectUrl(next) || looksLikeProjectDescription(next);
}

function looksLikeCompanyName(line: string) {
  if (isSectionHeaderLine(line) || looksLikeDateLine(line) || /^technologies\s+used:/i.test(line)) return false;
  if (line.length > 60 || line.length < 2) return false;
  if (/^(phone|email|senior|lead|software|front-end|full-stack|typescript|javascript|react|delivered|proven|currently|at)\b/i.test(line)) {
    return false;
  }
  if (/^(at|in|on|with|for|to)\s/i.test(line)) return false;
  if (/[.!?]$/.test(line) && line.length > 40) return false;
  if (/\b(I|my|our|the|and|including|while|with)\b/i.test(line) && line.split(" ").length > 4) return false;
  if (line.includes(",") && line.split(" ").length > 6) return false;
  return /^[A-Z0-9]/.test(line);
}

function looksLikeRoleTitle(line: string) {
  const trimmed = line.trim();
  if (trimmed.length > 90) return false;
  return (
    /^(senior|lead|staff|principal|software|front[- ]?end|full[- ]?stack|web|manager|director|developer|engineer|architect|team leader)/i.test(
      trimmed,
    ) || /^team leader\b/i.test(trimmed)
  );
}

function looksLikeProjectName(line: string) {
  const trimmed = line.trim();
  if (trimmed.length < 2 || trimmed.length > 55) return false;
  if (!/^[A-Z0-9]/.test(trimmed)) return false;
  if (looksLikeProjectUrl(trimmed)) return false;
  if (/^stack:/i.test(trimmed)) return false;
  if (/[.!?]$/.test(trimmed) && trimmed.split(" ").length > 4) return false;
  if (
    /^(built|claude|three|incomplete|still in|tag and|recurring|all data|22 |12 |quizzes|connects|add custom|displays profile)/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  return trimmed.split(" ").length <= 6;
}

function looksLikeProjectUrl(line: string) {
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(line.trim());
}

function looksLikeProjectDescription(line: string) {
  const trimmed = line.trim();
  if (/^stack:/i.test(trimmed)) return false;
  return trimmed.length >= 30 && /^[A-Z("(]/.test(trimmed);
}

function dedupeAdjacentLines(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const deduped: string[] = [];
      for (const line of lines) {
        const normalized = normalizeForDedupe(line);
        const previous = deduped[deduped.length - 1];
        if (previous && normalizeForDedupe(previous) === normalized) continue;
        deduped.push(line);
      }
      return deduped.join("\n");
    })
    .join("\n\n");
}

function normalizeForDedupe(line: string) {
  return line
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Remove near-duplicate achievement bullets within each parsed role.
 */
export function dedupeWorkAchievements(achievements: string[]): string[] {
  const kept: string[] = [];
  const seen = new Set<string>();

  for (const achievement of achievements) {
    const normalized = normalizeForDedupe(achievement);
    if (!normalized || seen.has(normalized)) continue;

    const duplicate = kept.some((existing) => achievementsAreSimilar(existing, achievement));
    if (duplicate) continue;

    seen.add(normalized);
    kept.push(achievement);
  }

  return kept;
}

function achievementsAreSimilar(left: string, right: string) {
  const a = normalizeForDedupe(left);
  const b = normalizeForDedupe(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const aTokens = new Set(a.split(" ").filter((token) => token.length > 3));
  const bTokens = new Set(b.split(" ").filter((token) => token.length > 3));
  if (!aTokens.size || !bTokens.size) return false;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }

  const ratio = overlap / Math.min(aTokens.size, bTokens.size);
  return ratio >= 0.72;
}
