const REQUEST_TIMEOUT_MS = 100_000

export async function requestGlimpse(action, prompt, conversation, website) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    let response
    try {
      response = await fetch('/api/glimpse/generate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, prompt, conversation, website }),
        signal: controller.signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The AI request timed out. Your current website is unchanged; retry when ready.')
      throw new Error('Could not reach the AI service. Check that the Udaan backend is running and try again.')
    }

    let body
    try {
      body = await response.json()
    } catch {
      throw new Error(`The AI service returned an unreadable response (HTTP ${response.status}).`)
    }
    if (!response.ok) {
      const message = body.error || body.detail || body.message || `The AI request failed (HTTP ${response.status}).`
      if (response.status === 503 || body.code === 'ai_not_configured') {
        const setup = 'Add GEMINI_API_KEY or GROQ_API_KEY to backend/.env and restart Django.'
        throw new Error(message.includes('GEMINI_API_KEY') || message.includes('GROQ_API_KEY')
          ? message
          : `${message} ${setup}`)
      }
      throw new Error(message)
    }
    return body
  } finally {
    window.clearTimeout(timeout)
  }
}
