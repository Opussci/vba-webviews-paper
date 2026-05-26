/// <reference types="bun" />
import { marked } from "marked";

const sourcePath = new URL("../README.MD", import.meta.url);
const outputPath = new URL("../docs/index.html", import.meta.url);
const outputPathLabel = "docs/index.html";
const repoRootPath = new URL("../", import.meta.url);
const docsRootPath = new URL("../docs/", import.meta.url);

function extractTitle(markdown: string): string {
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].replace(/`/g, "").trim();
  }
  return "Project Documentation";
}

function escapeHtml(text: string | null | undefined): string {
  return (text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isVideoAsset(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  const cleanUrl = url.split(/[?#]/, 1)[0].toLowerCase();
  return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".ogg");
}

const VB_KEYWORDS = [
  "And",
  "As",
  "ByRef",
  "ByVal",
  "Call",
  "Case",
  "Const",
  "Dim",
  "Do",
  "Each",
  "Else",
  "ElseIf",
  "End",
  "Enum",
  "Error",
  "Exit",
  "False",
  "For",
  "Friend",
  "Function",
  "Get",
  "GoTo",
  "If",
  "In",
  "Is",
  "Let",
  "Loop",
  "Me",
  "Mod",
  "Next",
  "Not",
  "Nothing",
  "On",
  "Option",
  "Or",
  "Preserve",
  "Private",
  "Property",
  "Public",
  "ReDim",
  "Resume",
  "Select",
  "Set",
  "Static",
  "Sub",
  "Then",
  "To",
  "True",
  "Type",
  "Wend",
  "While",
  "With",
  "Xor"
];

const VB_TOKEN_PATTERN = new RegExp(
  `"(?:""|[^"])*"|'[^\\n]*|\\b\\d+(?:\\.\\d+)?\\b|\\b(?:${VB_KEYWORDS.join("|")})\\b`,
  "gi"
);

function highlightVbCode(source: string): string {
  let output = "";
  let lastIndex = 0;

  for (const match of source.matchAll(VB_TOKEN_PATTERN)) {
    const token = match[0];
    const tokenIndex = match.index ?? 0;
    output += escapeHtml(source.slice(lastIndex, tokenIndex));

    if (token.startsWith('"')) {
      output += `<span class="tok-str">${escapeHtml(token)}</span>`;
    } else if (token.startsWith("'")) {
      output += `<span class="tok-comment">${escapeHtml(token)}</span>`;
    } else if (/^\d/.test(token)) {
      output += `<span class="tok-num">${escapeHtml(token)}</span>`;
    } else {
      output += `<span class="tok-kw">${escapeHtml(token)}</span>`;
    }

    lastIndex = tokenIndex + token.length;
  }

  output += escapeHtml(source.slice(lastIndex));
  return output;
}

async function buildDocs(): Promise<void> {
  const markdown = await Bun.file(sourcePath).text();
  const title = extractTitle(markdown);
  let hasMermaidBlocks = false;
  const assetsToCopy = new Map<string, { source: URL; destination: URL }>();

  const rewriteLocalUrl = (rawUrl: string | null | undefined): string | null | undefined => {
    if (!rawUrl || rawUrl.startsWith("#") || /^[a-z]+:/i.test(rawUrl) || rawUrl.startsWith("//")) {
      return rawUrl;
    }

    const [pathPart, suffix = ""] = rawUrl.split(/([?#].*)/, 2);
    const sourceAssetUrl = new URL(pathPart, sourcePath);
    if (!sourceAssetUrl.href.startsWith(repoRootPath.href)) {
      return rawUrl;
    }

    const repoRelativePath = decodeURIComponent(sourceAssetUrl.href.slice(repoRootPath.href.length));
    const outputAssetUrl = new URL(repoRelativePath, docsRootPath);
    assetsToCopy.set(outputAssetUrl.href, {
      source: sourceAssetUrl,
      destination: outputAssetUrl
    });

    return `./${repoRelativePath}${suffix}`;
  };

  marked.setOptions({
    gfm: true,
    breaks: false
  });

  const renderer = new marked.Renderer();
  const baseImageRenderer = renderer.image.bind(renderer);
  const baseLinkRenderer = renderer.link.bind(renderer);
  const baseCodeRenderer = renderer.code.bind(renderer);

  renderer.image = ({ href, title: imageTitle, text }) => {
    const rewrittenHref = rewriteLocalUrl(href);

    if (!isVideoAsset(rewrittenHref)) {
      return baseImageRenderer({
        href: rewrittenHref,
        title: imageTitle,
        text
      });
    }

    const safeHref = escapeHtml(rewrittenHref);
    const safeTitle = escapeHtml(imageTitle || text || "Embedded video");
    const safeText = escapeHtml(text || "Video");
    return `<figure><video controls preload="metadata" title="${safeTitle}"><source src="${safeHref}">Your browser does not support embedded videos. <a href="${safeHref}">Open video</a>.</video><figcaption>${safeText}</figcaption></figure>`;
  };

  renderer.link = ({ href, title: linkTitle, text, tokens }) =>
    baseLinkRenderer({
      href: rewriteLocalUrl(href),
      title: linkTitle,
      text,
      tokens
    });

  renderer.code = ({ text, lang, escaped }) => {
    const normalizedLang = lang?.toLowerCase();

    if (normalizedLang === "mermaid") {
      hasMermaidBlocks = true;
      return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
    }

    if (normalizedLang === "vb" || normalizedLang === "vba" || normalizedLang === "vbscript") {
      return `<pre><code class="language-vb">${highlightVbCode(text)}</code></pre>`;
    }

    return baseCodeRenderer({ text, lang, escaped });
  };

  const htmlBody = await marked.parse(markdown, { renderer });
  const mermaidScript = hasMermaidBlocks
    ? `
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    mermaid.initialize({ startOnLoad: true, theme: isDark ? "dark" : "default" });
  </script>`
    : "";
  const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
    }

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      padding: 2rem 1rem;
      background:rgb(25, 29, 34);
      color: #e6edf3;
    }

    a {
      color: #7cc7ff;
    }

    main {
      max-width: 980px;
      margin: 0 auto;
    }

    img,
    video {
      max-width: 100%;
      height: auto;
    }

    pre {
      overflow-x: auto;
      padding: 1rem;
      border-radius: 8px;
      background: rgba(127, 127, 127, 0.12);
    }

    pre.mermaid {
      padding: 0;
      background: transparent;
      border-radius: 0;
      overflow: visible;
    }

    code {
      font-family: Consolas, "Courier New", monospace;
    }

    :not(pre) > code {
      padding: 0.14rem 0.36rem;
      border-radius: 6px;
      border: 1px solid rgba(127, 127, 127, 0.35);
      background: rgba(127, 127, 127, 0.18);
      font-size: 0.95em;
    }

    pre code {
      display: block;
    }

    .tok-kw {
      color: #6d28d9;
      font-weight: 600;
    }

    .tok-str {
      color: #0f766e;
    }

    .tok-num {
      color: #b45309;
    }

    .tok-comment {
      color: #6b7280;
      font-style: italic;
    }

    @media (prefers-color-scheme: dark) {
      .tok-kw {
        color: #c4b5fd;
      }

      .tok-str {
        color: #5eead4;
      }

      .tok-num {
        color: #fbbf24;
      }

      .tok-comment {
        color: #9ca3af;
      }
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    th,
    td {
      border: 1px solid rgba(127, 127, 127, 0.3);
      padding: 0.4rem 0.6rem;
      text-align: left;
    }

    a[href^="#ref-"] {
      text-decoration: none;
      border-bottom: 1px dotted currentColor;
    }

    .reference-popup {
      position: fixed;
      z-index: 999;
      display: none;
      max-width: min(560px, calc(100vw - 2rem));
      max-height: min(300px, calc(100vh - 2rem));
      overflow: auto;
      padding: 0.75rem 0.9rem;
      border-radius: 8px;
      border: 1px solid rgba(127, 127, 127, 0.35);
      background: color-mix(in srgb, canvas 92%, rgb(127 127 127 / 18%));
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
      font-size: 0.94rem;
      line-height: 1.45;
    }

    .reference-popup p,
    .reference-popup li {
      margin: 0;
    }

    .reference-popup a {
      overflow-wrap: anywhere;
    }
  </style>
</head>
<body>
  <main>
${htmlBody}
  </main>
${mermaidScript}
  <script>
    (() => {
      const citations = Array.from(document.querySelectorAll('a[href^="#ref-"]'));
      if (citations.length === 0) {
        return;
      }

      const popup = document.createElement("aside");
      popup.className = "reference-popup";
      popup.setAttribute("role", "dialog");
      popup.setAttribute("aria-live", "polite");
      document.body.appendChild(popup);

      let activeAnchor = null;
      let hideTimer = null;

      const cancelHide = () => {
        if (hideTimer !== null) {
          window.clearTimeout(hideTimer);
          hideTimer = null;
        }
      };

      const hidePopup = () => {
        cancelHide();
        popup.style.display = "none";
        activeAnchor = null;
      };

      const scheduleHide = () => {
        cancelHide();
        hideTimer = window.setTimeout(() => {
          hidePopup();
        }, 100);
      };

      const positionPopup = (anchor) => {
        const gap = 8;
        const margin = 12;
        const anchorRect = anchor.getBoundingClientRect();
        const popupRect = popup.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = anchorRect.left;
        if (left + popupRect.width > viewportWidth - margin) {
          left = viewportWidth - popupRect.width - margin;
        }
        left = Math.max(margin, left);

        let top = anchorRect.bottom + gap;
        if (top + popupRect.height > viewportHeight - margin) {
          top = anchorRect.top - popupRect.height - gap;
        }
        top = Math.max(margin, top);

        popup.style.left = left + "px";
        popup.style.top = top + "px";
      };

      const getReferenceHtml = (anchor) => {
        const rawHref = anchor.getAttribute("href");
        if (!rawHref || !rawHref.startsWith("#")) {
          return null;
        }

        const target = document.getElementById(rawHref.slice(1));
        if (!target) {
          return null;
        }

        const container = target.closest("li") ?? target.parentElement;
        if (!container) {
          return null;
        }

        const clone = container.cloneNode(true);
        for (const idAnchor of clone.querySelectorAll('a[id^="ref-"]')) {
          idAnchor.remove();
        }
        return clone.innerHTML.trim();
      };

      const showPopup = (anchor) => {
        const html = getReferenceHtml(anchor);
        if (!html) {
          hidePopup();
          return;
        }

        cancelHide();
        activeAnchor = anchor;
        popup.innerHTML = html;
        popup.style.display = "block";
        positionPopup(anchor);
      };

      popup.addEventListener("mouseenter", cancelHide);
      popup.addEventListener("mouseleave", scheduleHide);

      for (const anchor of citations) {
        anchor.addEventListener("mouseenter", () => showPopup(anchor));
        anchor.addEventListener("mouseleave", scheduleHide);
        anchor.addEventListener("focus", () => showPopup(anchor));
        anchor.addEventListener("blur", scheduleHide);
      }

      window.addEventListener("scroll", () => {
        if (activeAnchor && popup.style.display === "block") {
          positionPopup(activeAnchor);
        }
      }, { passive: true });

      window.addEventListener("resize", () => {
        if (activeAnchor && popup.style.display === "block") {
          positionPopup(activeAnchor);
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          hidePopup();
        }
      });
    })();
  </script>
</body>
</html>
`;

  await Bun.write(outputPath, fullHtml);
  for (const { source, destination } of assetsToCopy.values()) {
    const sourceFile = Bun.file(source);
    if (await sourceFile.exists()) {
      await Bun.write(destination, sourceFile);
    }
  }
  console.log(`Built ${outputPathLabel}`);
}

buildDocs().catch((error) => {
  console.error(error);
  process.exit(1);
});
