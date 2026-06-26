import DOMPurify from "isomorphic-dompurify";

/** Làm sạch HTML do người dùng nhập trước khi render. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "a", "code", "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}
