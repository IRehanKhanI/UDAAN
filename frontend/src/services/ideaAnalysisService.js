import { apiRequest } from './apiClient.js'

export function analyzeIdeaDraft(arg1, arg2, arg3) {
  let idea = ''
  let projectType = 'Startup'
  let attachmentName = ''
  let attachmentText = ''

  if (typeof arg1 === 'object' && arg1 !== null) {
    idea = arg1.idea || ''
    projectType = arg1.projectType || arg1.project_type || 'Startup'
    attachmentName = arg1.attachment?.name || ''
    attachmentText = arg1.attachment?.text || ''
  } else {
    idea = typeof arg1 === 'string' ? arg1 : ''
    attachmentText = typeof arg2 === 'string' ? arg2 : ''
    projectType = typeof arg3 === 'string' ? arg3 : 'Startup'
  }

  return apiRequest('/api/ideas/analyze/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idea,
      project_type: projectType,
      attachment_name: attachmentName,
      attachment_text: attachmentText,
    }),
  }).then(res => res?.analysis || res)
}
