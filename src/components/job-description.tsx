import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const allowedTags = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h1", "h2", "h3", "h4", "a"]);

export function JobDescription({ description }: { description: string }) {
  const html = formatJobDescription(description);

  return (
    <Box
      sx={{
        color: "text.secondary",
        fontSize: 15,
        lineHeight: 1.7,
        maxWidth: 900,
        "& h1, & h2, & h3, & h4": {
          color: "text.primary",
          fontWeight: 850,
          lineHeight: 1.25,
          mt: 2.5,
          mb: 1,
        },
        "& h1": { fontSize: 24 },
        "& h2": { fontSize: 21 },
        "& h3": { fontSize: 18 },
        "& p": { my: 1.2 },
        "& ul, & ol": { pl: 3, my: 1.25 },
        "& li": { mb: 0.75 },
        "& strong, & b": { color: "text.primary", fontWeight: 800 },
        "& a": { color: "primary.main", overflowWrap: "anywhere" },
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function formatJobDescription(description: string) {
  const decoded = decodeHtmlEntities(description);
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(decoded);
  const html = looksLikeHtml ? decoded : textToHtml(decoded);
  const sanitized = sanitizeHtml(html);
  return sanitized.trim() || "<p>No description available.</p>";
}

function textToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function sanitizeHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\s*([a-z0-9-]+)([^>]*)>/gi, (_match, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!allowedTags.has(tag)) return "";
      if (tag === "a") {
        const href = String(rawAttrs).match(/\shref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const url = sanitizeHref(href?.[1] ?? href?.[2] ?? href?.[3] ?? "");
        return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">` : "<a>";
      }
      return `<${tag}>`;
    })
    .replace(/<\s*\/\s*([a-z0-9-]+)\s*>/gi, (_match, rawTag: string) => {
      const tag = rawTag.toLowerCase();
      return allowedTags.has(tag) ? `</${tag}>` : "";
    });
}

function sanitizeHref(value: string) {
  const trimmed = decodeHtmlEntities(value).trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return "";
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    rsquo: "'",
    lsquo: "'",
    rdquo: '"',
    ldquo: '"',
    ndash: "-",
    mdash: "-",
    bull: "•",
  };

  return value
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      return named[code.toLowerCase()] ?? entity;
    })
    .replace(/\u00a0/g, " ");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });
}
