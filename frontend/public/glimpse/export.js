const encoder = new TextEncoder()

export function buildExportFiles(website) {
  const parsed = new DOMParser().parseFromString(website.html, 'text/html')
  parsed.querySelectorAll('script, style, base, meta[http-equiv="refresh"]').forEach((node) => node.remove())
  const title = escapeHtml(website.title || parsed.title || 'Generated website')
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Prototype website generated with Glimpse.">
  <title>${title}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
${parsed.body.innerHTML || website.html}
<script src="script.js" defer></script>
</body>
</html>`
  const readme = `# ${website.title || 'Glimpse website'}

This is a static HTML, CSS, and vanilla JavaScript prototype exported from Glimpse.

## Run locally

Open index.html in a modern browser, or serve this folder with a local static web server (recommended for browser APIs).

## Included files

- index.html — page structure
- styles.css — website styling
- script.js — client-side interactions

## Prototype limitations

This export does not include a backend, database, authentication, payments, or hosted external APIs unless those were separately implemented and configured by you. Sample data is local prototype data. Review and test the source before using it in production.

${website.assumptions?.length ? `## Generation assumptions\n\n${website.assumptions.map((item) => `- ${item}`).join('\n')}\n` : ''}
## Preview isolation

Glimpse blocks external network requests inside the live preview. The exported site does not include Glimpse's preview sandbox policy, so review third-party asset or API dependencies before deployment.
`
  return {
    'index.html': html,
    'styles.css': website.css,
    'script.js': website.js,
    'README.md': readme,
  }
}

export async function downloadWebsiteZip(website) {
  const archive = createZip(buildExportFiles(website))
  const url = URL.createObjectURL(archive)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFilename(website.title || 'glimpse-website')}.zip`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function createZip(files) {
  const localParts = []
  const centralParts = []
  let offset = 0
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const date = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const crc = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, time, true)
    localView.setUint16(12, date, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    localParts.push(local, data)

    const central = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, time, true)
    centralView.setUint16(14, date, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, data.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centralParts.push(central)
    offset += local.length + data.length
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, centralParts.length, true)
  endView.setUint16(10, centralParts.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' })
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function safeFilename(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'glimpse-website'
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}
