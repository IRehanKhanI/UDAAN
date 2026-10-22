const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  'connect-src ' + "'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
  "object-src 'none'",
].join('; ')

export function validateWebsite(result) {
  if (!result || typeof result !== 'object') throw new Error('The AI returned an invalid website response.')
  for (const key of ['title', 'explanation', 'html']) {
    if (typeof result[key] !== 'string' || !result[key].trim()) {
      throw new Error(`The generated ${key} was missing. The current preview is unchanged; please retry.`)
    }
  }
  for (const key of ['css', 'js']) {
    if (typeof result[key] !== 'string') {
      throw new Error(`The generated ${key} was malformed. The current preview is unchanged; please retry.`)
    }
  }
  if (result.html.length > 30_000 || result.css.length > 30_000 || result.js.length > 30_000) {
    throw new Error('The generated website is too large to preview safely. Please narrow your request.')
  }
  const parsed = new DOMParser().parseFromString(result.html, 'text/html')
  if (parsed.querySelector('script[src], link[rel="stylesheet"][href]')) {
    throw new Error('This prototype uses external scripts or stylesheets, which Glimpse blocks in its isolated preview. Ask for a vanilla HTML/CSS/JavaScript version without external dependencies.')
  }
  const inlineStyles = [...parsed.querySelectorAll('style')].map((node) => node.textContent).filter(Boolean)
  const inlineScripts = [...parsed.querySelectorAll('script:not([src])')].map((node) => node.textContent).filter(Boolean)
  return {
    ...result,
    css: [result.css, ...inlineStyles].filter(Boolean).join('\n\n'),
    js: [result.js, ...inlineScripts].filter(Boolean).join('\n\n'),
  }
}

function extractHtmlMarkup(source) {
  const parsed = new DOMParser().parseFromString(source, 'text/html')
  parsed.querySelectorAll('script, style, base, meta[http-equiv="refresh"], meta[http-equiv="Content-Security-Policy"]').forEach((node) => node.remove())
  return {
    markup: parsed.body.innerHTML || source,
    title: parsed.title || '',
  }
}

export function buildPreviewDocument(website) {
  const { markup, title } = extractHtmlMarkup(website.html)
  const pageTitle = escapeHtml(website.title || title || 'Glimpse preview')
  const css = website.css.replace(/<\/style/gi, '<\\/style')
  const js = website.js.replace(/<\/script/gi, '<\\/script')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${pageTitle}</title>
<style>${css}</style>
</head>
<body>
${markup}
<script>${js}<\/script>
</body>
</html>`
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}
