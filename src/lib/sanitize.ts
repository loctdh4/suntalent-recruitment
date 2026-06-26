import sanitizeHtmlLib from "sanitize-html";

/** Làm sạch HTML do người dùng nhập trước khi render.
 *  Dùng sanitize-html (thuần JS, không cần jsdom) để chạy được trên serverless. */
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "a", "code", "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}
