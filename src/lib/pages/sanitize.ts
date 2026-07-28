import DOMPurify from "isomorphic-dompurify";

// Whitelist-based sanitiser for the htmlEmbed block. Runs on both the server
// (published runtime) and client (editor preview) via isomorphic-dompurify.
// Scripts, event handlers, and dangerous URLs are stripped — no unsanitised
// innerHTML ever reaches the DOM.
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty ?? "", {
    ALLOWED_TAGS: [
      "a", "b", "i", "em", "strong", "u", "s", "p", "br", "hr", "span", "div",
      "ul", "ol", "li", "blockquote", "code", "pre",
      "h1", "h2", "h3", "h4", "h5", "h6", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class", "style", "colspan", "rowspan"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}
