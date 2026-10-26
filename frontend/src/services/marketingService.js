import { apiRequest } from './apiClient.js'

const workspaceKey = 'udaan:marketing-workspace'
function getMarketingWorkspaceKey() {
  if (typeof localStorage === 'undefined') return '00000000-0000-4000-8000-000000000000'
  let key = localStorage.getItem(workspaceKey)
  if (!key) {
    key = globalThis.crypto?.randomUUID?.() || `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, char => {
      const random = Math.random() * 16 | 0
      return (char === 'x' ? random : (random & 3 | 8)).toString(16)
    })
    localStorage.setItem(workspaceKey, key)
  }
  return key
}

const request = (path, options = {}) => apiRequest(path, {
  ...options,
  headers: { 'X-Marketing-Workspace': getMarketingWorkspaceKey(), ...options.headers },
})

export const generateMarketingContent = payload => request('/api/marketing/generate/', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
})

export function listMarketingContent(filters = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null))
  return request(`/api/marketing/content/${query.size ? `?${query}` : ''}`)
}

export const saveMarketingContent = payload => request('/api/marketing/content/', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
})

export const updateMarketingContent = (id, payload) => request(`/api/marketing/content/${encodeURIComponent(id)}/`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
})

export const deleteMarketingContent = id => request(`/api/marketing/content/${encodeURIComponent(id)}/`, { method: 'DELETE' })

export const generateMarketingCampaign = payload => request('/api/marketing/campaigns/generate/', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
})

export const listMarketingCampaigns = (filters = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null))
  return request(`/api/marketing/campaigns/${query.size ? `?${query}` : ''}`)
}

export const updateMarketingCampaign = (id, payload) => request(`/api/marketing/campaigns/${encodeURIComponent(id)}/`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
})

export const deleteMarketingCampaign = id => request(`/api/marketing/campaigns/${encodeURIComponent(id)}/`, { method: 'DELETE' })

export const regenerateMarketingCampaignAsset = (campaignId, assetIndex) => request(`/api/marketing/campaigns/${encodeURIComponent(campaignId)}/assets/${assetIndex}/regenerate/`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
})

export const getMarketIntelligence = (projectId = '') => request(`/api/marketing/market-intelligence/${projectId ? `?project=${encodeURIComponent(projectId)}` : ''}`)

export const importMarketIntelligence = (file, projectId = '') => {
  const body = new FormData()
  body.append('file', file)
  if (projectId) body.append('project_id', projectId)
  return request('/api/marketing/market-intelligence/', { method: 'POST', body })
}

export const searchMarketPlaces = query => request(`/api/marketing/market-intelligence/places/?q=${encodeURIComponent(query)}`)
