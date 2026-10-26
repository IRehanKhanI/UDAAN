const projectsKey = 'udaan:projects'

export function readSavedProjects() {
  try {
    const projects = JSON.parse(localStorage.getItem(projectsKey) || '[]')
    return Array.isArray(projects) ? projects : []
  } catch {
    return []
  }
}

export function saveIdeaProject({ draft, understanding, workflow }) {
  const projects = readSavedProjects()
  const id = draft.projectId || (globalThis.crypto?.randomUUID?.() ?? `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, char => { const random = Math.random() * 16 | 0; return (char === 'x' ? random : (random & 3 | 8)).toString(16) }))
  const project = {
    id, name: understanding.project_name.trim(),
    description: understanding.problem_statement.trim() || draft.idea,
    category: draft.projectType, status: 'planning', statusLabel: 'Planning',
    level: 'Level 1: Idea Shaped', xp: '0 / 1,200 XP', progress: 8,
    milestone: workflow.flight_plan?.milestones?.[0]?.title || 'Ready to begin',
    stack: [], team: ['TS'], updated: 'Created just now', tone: 'forest',
    domain: draft.domain || 'software',
    hardwareBom: draft.hardwareBom || null,
    businessModel: draft.businessModel || null,
    idea: draft.idea, attachment: draft.attachment || null, understanding, workflow,
    startDate: draft.startDate || draft.start_date || new Date().toISOString().split('T')[0],
    deadline: draft.deadline || null,
    teamSize: draft.teamSize || draft.team_size || 1,
    weeklyHours: draft.weeklyHours || draft.weekly_hours || 20,
    scheduleMetadata: draft.scheduleMetadata || draft.schedule_metadata || workflow.flight_plan?.schedule_assessment || {},
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(projectsKey, JSON.stringify([project, ...projects.filter(item => item.id !== id)]))
  return project
}

export function updateSavedProject(projectId, update) {
  const projects = readSavedProjects()
  let updatedProject = null
  const nextProjects = projects.map(project => {
    if (project.id !== projectId) return project
    updatedProject = typeof update === 'function' ? update(project) : { ...project, ...update }
    return updatedProject
  })
  if (updatedProject) localStorage.setItem(projectsKey, JSON.stringify(nextProjects))
  return updatedProject
}

export function removeSavedProject(projectId) {
  const projects = readSavedProjects()
  const nextProjects = projects.filter(project => project.id !== projectId)
  if (nextProjects.length === projects.length) return false

  localStorage.setItem(projectsKey, JSON.stringify(nextProjects))
  if (localStorage.getItem('udaan:selected-project') === projectId) {
    localStorage.removeItem('udaan:selected-project')
  }
  return true
}

export function normalizeBackendProject(bp) {
  if (!bp) return null
  const xp = bp.xp_points || 0
  const progress = Math.min(100, Math.round((xp / 1200) * 100))
  const tones = ['coral', 'butter', 'lavender', 'honey']
  const toneIndex = typeof bp.id === 'string' ? Math.abs(bp.id.charCodeAt(0) || 0) % tones.length : 0

  return {
    id: bp.id,
    name: bp.understanding?.project_name?.trim() || bp.idea?.slice(0, 32) || 'Untitled Launch',
    description: bp.understanding?.problem_statement?.trim() || bp.idea || 'Creative launchpad project',
    category: bp.project_type || 'Startup',
    status: bp.current_stage || 'flight_plan',
    statusLabel: bp.current_stage === 'flight_plan' ? 'Active' : 'Planning',
    level: bp.xp_level || 'Level 1: Idea Shaped',
    domain: bp.domain || 'software',
    hardwareBom: bp.hardware_bom || null,
    businessModel: bp.business_model || null,
    xp: `${xp} / 1,200 XP`,
    xpPoints: xp,
    progress: Math.max(progress, 15),
    milestone: bp.workflow?.flight_plan?.milestones?.[0]?.title || 'Milestone 1: Market & Risk Validation',
    stack: bp.repository?.detected_technologies?.length ? bp.repository.detected_technologies : ['Web Search', 'Gemini AI', 'FastAPI/Django'],
    team: ['TS', 'AI'],
    updated: 'Recently synced',
    tone: tones[toneIndex],
    idea: bp.idea,
    attachment: bp.attachment || null,
    understanding: bp.understanding || {},
    workflow: bp.workflow || {},
    marketRadar: bp.market_radar || bp.workflow?.market_radar || null,
    mindmapGraph: bp.mindmap_graph || bp.workflow?.mindmap_graph || null,
    startDate: bp.start_date || new Date().toISOString().split('T')[0],
    deadline: bp.deadline || null,
    teamSize: bp.team_size || 1,
    weeklyHours: bp.weekly_hours || 20,
    scheduleMetadata: bp.schedule_metadata || bp.workflow?.flight_plan?.schedule_assessment || {},
    createdAt: bp.created_at || new Date().toISOString(),
  }
}

export function syncBackendProjects(backendProjects = []) {
  const current = readSavedProjects()
  const map = new Map(current.map(p => [p.id, p]))

  for (const bp of backendProjects) {
    const normalized = normalizeBackendProject(bp)
    if (normalized) {
      map.set(normalized.id, {
        ...(map.get(normalized.id) || {}),
        ...normalized,
      })
    }
  }

  const merged = Array.from(map.values())
  localStorage.setItem(projectsKey, JSON.stringify(merged))
  return merged
}
