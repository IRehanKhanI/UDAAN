// ─── Google Calendar & iCal Export Service ────────────────────────────────────

/**
 * Generate a direct "Add to Google Calendar" web link
 */
export function createGoogleCalendarUrl({ title, description = '', startDate, endDate, location = 'UDAAN Launchpad' }) {
  const toUtcFormat = (dateStr, isEnd = false) => {
    try {
      const d = dateStr ? new Date(dateStr) : new Date()
      if (isEnd && !dateStr) d.setDate(d.getDate() + 1)
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 15) + 'Z'
    } catch {
      const now = new Date()
      return now.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 15) + 'Z'
    }
  }

  const start = toUtcFormat(startDate)
  const end = toUtcFormat(endDate || startDate, true)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location,
    dates: `${start}/${end}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Download standard iCalendar (.ics) file compatible with Google Calendar, Apple Calendar, Outlook
 */
export function downloadIcsFile(filename = 'udaan-roadmap.ics', events = []) {
  const toUtcFormat = (dateStr, isEnd = false) => {
    try {
      const d = dateStr ? new Date(dateStr) : new Date()
      if (isEnd && !dateStr) d.setDate(d.getDate() + 1)
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 15) + 'Z'
    } catch {
      const now = new Date()
      return now.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 15) + 'Z'
    }
  }

  const nowStamp = toUtcFormat(new Date().toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UDAAN Studio//Project Roadmap//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:UDAAN Roadmap',
  ]

  events.forEach((ev, idx) => {
    const start = toUtcFormat(ev.startDate)
    const end = toUtcFormat(ev.endDate || ev.startDate, true)
    lines.push(
      'BEGIN:VEVENT',
      `UID:udaan-${idx}-${Date.now()}@udaan.local`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${(ev.title || 'UDAAN Milestone').replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    )
  })

  lines.push('END:VCALENDAR')
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
