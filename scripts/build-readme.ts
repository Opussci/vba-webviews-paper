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

function markdownInlineToPlainText(markdown: string | null | undefined): string {
  if (!markdown) {
    return "";
  }

  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}

function isVideoAsset(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  const cleanUrl = url.split(/[?#]/, 1)[0].toLowerCase();
  return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".ogg");
}

type LinkButtonKind = "github" | "video";

const VIDEO_ICON_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="link-button__svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
  `<rect x="3" y="3" width="18" height="18" rx="2"></rect>` +
  `<path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"></path>` +
  `</svg>`;

const GITHUB_ICON_SVG =
  `<svg viewBox="0 -0.5 25 25" xmlns="http://www.w3.org/2000/svg" class="link-button__svg" fill="currentColor" aria-hidden="true">` +
  `<path d="m12.301 0h.093c2.242 0 4.34.613 6.137 1.68l-.055-.031c1.871 1.094 3.386 2.609 4.449 4.422l.031.058c1.04 1.769 1.654 3.896 1.654 6.166 0 5.406-3.483 10-8.327 11.658l-.087.026c-.063.02-.135.031-.209.031-.162 0-.312-.054-.433-.144l.002.001c-.128-.115-.208-.281-.208-.466 0-.005 0-.01 0-.014v.001q0-.048.008-1.226t.008-2.154c.007-.075.011-.161.011-.249 0-.792-.323-1.508-.844-2.025.618-.061 1.176-.163 1.718-.305l-.076.017c.573-.16 1.073-.373 1.537-.642l-.031.017c.508-.28.938-.636 1.292-1.058l.006-.007c.372-.476.663-1.036.84-1.645l.009-.035c.209-.683.329-1.468.329-2.281 0-.045 0-.091-.001-.136v.007c0-.022.001-.047.001-.072 0-1.248-.482-2.383-1.269-3.23l.003.003c.168-.44.265-.948.265-1.479 0-.649-.145-1.263-.404-1.814l.011.026c-.115-.022-.246-.035-.381-.035-.334 0-.649.078-.929.216l.012-.005c-.568.21-1.054.448-1.512.726l.038-.022-.609.384c-.922-.264-1.981-.416-3.075-.416s-2.153.152-3.157.436l.081-.02q-.256-.176-.681-.433c-.373-.214-.814-.421-1.272-.595l-.066-.022c-.293-.154-.64-.244-1.009-.244-.124 0-.246.01-.364.03l.013-.002c-.248.524-.393 1.139-.393 1.788 0 .531.097 1.04.275 1.509l-.01-.029c-.785.844-1.266 1.979-1.266 3.227 0 .025 0 .051.001.076v-.004c-.001.039-.001.084-.001.13 0 .809.12 1.591.344 2.327l-.015-.057c.189.643.476 1.202.85 1.693l-.009-.013c.354.435.782.793 1.267 1.062l.022.011c.432.252.933.465 1.46.614l.046.011c.466.125 1.024.227 1.595.284l.046.004c-.431.428-.718 1-.784 1.638l-.001.012c-.207.101-.448.183-.699.236l-.021.004c-.256.051-.549.08-.85.08-.022 0-.044 0-.066 0h.003c-.394-.008-.756-.136-1.055-.348l.006.004c-.371-.259-.671-.595-.881-.986l-.007-.015c-.198-.336-.459-.614-.768-.827l-.009-.006c-.225-.169-.49-.301-.776-.38l-.016-.004-.32-.048c-.023-.002-.05-.003-.077-.003-.14 0-.273.028-.394.077l.007-.003q-.128.072-.08.184c.039.086.087.16.145.225l-.001-.001c.061.072.13.135.205.19l.003.002.112.08c.283.148.516.354.693.603l.004.006c.191.237.359.505.494.792l.01.024.16.368c.135.402.38.738.7.981l.005.004c.3.234.662.402 1.057.478l.016.002c.33.064.714.104 1.106.112h.007c.045.002.097.002.15.002.261 0 .517-.021.767-.062l-.027.004.368-.064q0 .609.008 1.418t.008.873v.014c0 .185-.08.351-.208.466h-.001c-.119.089-.268.143-.431.143-.075 0-.147-.011-.214-.032l.005.001c-4.929-1.689-8.409-6.283-8.409-11.69 0-2.268.612-4.393 1.681-6.219l-.032.058c1.094-1.871 2.609-3.386 4.422-4.449l.058-.031c1.739-1.034 3.835-1.645 6.073-1.645h.098-.005zm-7.64 17.666q.048-.112-.112-.192-.16-.048-.208.032-.048.112.112.192.144.096.208-.032zm.497.545q.112-.08-.032-.256-.16-.144-.256-.048-.112.08.032.256.159.157.256.047zm.48.72q.144-.112 0-.304-.128-.208-.272-.096-.144.08 0 .288t.272.112zm.672.673q.128-.128-.064-.304-.192-.192-.32-.048-.144.128.064.304.192.192.32.044zm.913.4q.048-.176-.208-.256-.24-.064-.304.112t.208.24q.24.097.304-.096zm1.009.08q0-.208-.272-.176-.256 0-.256.176 0 .208.272.176.256.001.256-.175zm.929-.16q-.032-.176-.288-.144-.256.048-.224.24t.288.128.225-.224z"></path>` +
  `</svg>`;

function parseLinkButton(text: string | null | undefined): { kind: LinkButtonKind; labelMarkdown: string } | null {
  if (!text) {
    return null;
  }

  const match = text.match(/^\s*\[(githubicon|videoicon)\]\s+(.+?)\s*$/i);
  if (!match) {
    return null;
  }

  const kind = match[1].toLowerCase().startsWith("github") ? "github" : "video";
  return {
    kind,
    labelMarkdown: match[2]
  };
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
  const baseLinkRenderer = renderer.link.bind(renderer);
  const baseCodeRenderer = renderer.code.bind(renderer);

  renderer.image = ({ href, title: imageTitle, text }) => {
    const rewrittenHref = rewriteLocalUrl(href);
    const safeHref = escapeHtml(rewrittenHref);
    const plainText = markdownInlineToPlainText(text);
    const safeText = escapeHtml(plainText);
    const safeTitle = escapeHtml(imageTitle || plainText || "Embedded media");
    const titleAttr = imageTitle ? ` title="${escapeHtml(imageTitle)}"` : "";
    const captionHtml = text ? (marked.parseInline(text, { renderer }) as string) : "";

    if (!isVideoAsset(rewrittenHref)) {
      const imageHtml = `<img src="${safeHref}" alt="${safeText}"${titleAttr}>`;
      if (!captionHtml) {
        return imageHtml;
      }
      return `<figure>${imageHtml}<figcaption>${captionHtml}</figcaption></figure>`;
    }

    const videoCaption = captionHtml || escapeHtml(plainText || "Video");
    return `<figure><video controls preload="metadata" title="${safeTitle}"><source src="${safeHref}">Your browser does not support embedded videos. <a href="${safeHref}">Open video</a>.</video><figcaption>${videoCaption}</figcaption></figure>`;
  };

  renderer.link = ({ href, title: linkTitle, text, tokens }) => {
    const rewrittenHref = rewriteLocalUrl(href);
    const explicitButton = parseLinkButton(text);
    const buttonKind = explicitButton?.kind ?? null;

    if (!buttonKind || !rewrittenHref) {
      return baseLinkRenderer({
        href: rewrittenHref,
        title: linkTitle,
        text,
        tokens
      });
    }

    const labelMarkdown = explicitButton?.labelMarkdown ?? (text || "");
    const labelHtml = escapeHtml(markdownInlineToPlainText(labelMarkdown));
    const safeHref = escapeHtml(rewrittenHref);
    const titleAttr = linkTitle ? ` title="${escapeHtml(linkTitle)}"` : "";
    const iconSvg = buttonKind === "github" ? GITHUB_ICON_SVG : VIDEO_ICON_SVG;
    return `<a class="link-button link-button--${buttonKind}" href="${safeHref}"${titleAttr}><span class="link-button__icon" aria-hidden="true">${iconSvg}</span><span class="link-button__label">${labelHtml}</span></a>`;
  };

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

    .link-button {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.62rem;
      margin: 0.18rem 0.25rem 0.18rem 0;
      border-radius: 999px;
      border: 1px solid rgba(127, 127, 127, 0.38);
      background: rgba(127, 127, 127, 0.12);
      color: inherit;
      text-decoration: none;
      font-size: 0.92rem;
      line-height: 1.2;
      vertical-align: middle;
    }

    .link-button:hover {
      background: rgba(127, 127, 127, 0.2);
      border-color: rgba(127, 127, 127, 0.58);
    }

    .link-button:focus-visible {
      outline: 2px solid #7cc7ff;
      outline-offset: 2px;
    }

    .link-button__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 auto;
    }

    .link-button__svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .link-button--github .link-button__icon,
    .link-button--video .link-button__icon {
      padding: 0;
      border-radius: 999px;
      color: currentColor;
    }

    .link-button__label {
      display: inline;
    }

    .link-button--github {
      border-color: rgba(147, 197, 253, 0.5);
    }

    .link-button--video {
      border-color: rgba(248, 113, 113, 0.5);
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

    figure {
      margin: 1.1rem 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    figcaption {
      margin-top: 0.45rem;
      font-size: 0.95rem;
      font-style: italic;
      text-align: center;
      color: color-mix(in srgb, currentColor 84%, rgb(127 127 127 / 45%));
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
