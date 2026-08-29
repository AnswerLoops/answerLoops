/**
 * Serializes a JSON-LD object for injection into a `<script type="application/ld+json">`
 * tag. Escapes `<` so a string value (e.g. a page description) can never contain a
 * literal `</script>` and break out of the tag into the surrounding HTML.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
