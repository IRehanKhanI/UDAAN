import { apiRequest } from './apiClient.js'

// ─── GitHub Repository Creation ───────────────────────────────────────────────
export function createGitHubRepo({ name, description = '', private: isPrivate = false }) {
  return apiRequest('/api/auth/github/create-repo/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, private: isPrivate }),
  })
}

// ─── User Tech History ────────────────────────────────────────────────────────
export function getTechHistory() {
  return apiRequest('/api/profile/tech-history/')
}

export function saveTechHistory({ known_stacks, learning_stacks, recommendation_history } = {}) {
  const body = {}
  if (known_stacks !== undefined) body.known_stacks = known_stacks
  if (learning_stacks !== undefined) body.learning_stacks = learning_stacks
  if (recommendation_history !== undefined) body.recommendation_history = recommendation_history
  return apiRequest('/api/profile/tech-history/', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── YouTube Learning Videos ──────────────────────────────────────────────────
export function getYouTubeVideos(stacks = []) {
  if (!stacks.length) return Promise.resolve({ videos: {} })
  const params = new URLSearchParams()
  stacks.forEach(s => params.append('stack', s))
  return apiRequest(`/api/learning/youtube/?${params}`)
}
