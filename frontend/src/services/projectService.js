import { apiRequest } from './apiClient.js'

export const getProjects = () => apiRequest('/api/projects/')
export const deleteProject = projectId => apiRequest(`/api/projects/drafts/${encodeURIComponent(projectId)}/`, { method: 'DELETE' })
