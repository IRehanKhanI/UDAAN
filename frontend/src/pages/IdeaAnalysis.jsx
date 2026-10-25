import { useEffect, useRef, useState } from 'react'
import UdaanLoader, { MiniLoader } from '../components/UdaanLoader.jsx'
import {
  AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2,
  Code2, Copy, ExternalLink, Github, Globe, Lightbulb, Plus, RefreshCw,
  Rocket, Save, Search, ShieldCheck, Sparkles, Target, Trash2, Users,
  X, Zap, Play, Star, Clock, ChevronDown, ChevronRight,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { analyzeIdeaDraft } from '../services/ideaAnalysisService.js'
import { generateIdeaStage, saveProjectDraft } from '../services/ideaWorkflowService.js'
import { saveIdeaProject } from '../services/projectStorage.js'
import { parseRepositoryUrl, syncAndAnalyzeRepository, associateProjectRepository } from '../services/projectRepositoryService.js'
import { initializeTeamWorkspace } from '../services/teamService.js'
import { createGitHubRepo, getTechHistory, saveTechHistory, getYouTubeVideos } from '../services/githubService.js'
import { startGitHubLogin } from '../services/authService.js'
import InteractiveMascot from '../components/mascot/InteractiveMascot.jsx'

function getYouTubeThumb(url) {
  if (!url) return null
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11)
    ? `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`
    : null
}

const draftKey = 'udaan:idea-draft'
function newUuid() {
  return globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 3) | 8).toString(16)
  })
}

const stages = [
  { key: 'understanding', title: 'Pillars', icon: Target },
  { key: 'research', title: 'Research', icon: Search },
  { key: 'feasibility', title: 'Architecture', icon: Code2 },
  { key: 'launch_timing', title: 'Team', icon: Users },
  { key: 'flight_plan', title: 'Roadmap', icon: Rocket },
]

const roleOptions = ['Full-Stack Lead', 'Frontend / UI', 'Backend & API', 'QA & Testing', 'DevOps & Cloud', 'Product Lead']
const focusPresets = ['Architecture & Core Build', 'User Interface', 'API Endpoints', 'Testing & QA', 'Deployment', 'Growth & Launch']

// ─── Pre-defined tech stack cards for visual recommendation ───────────────────
const TECH_STACKS = [
  {
    id: 'nextjs-fullstack',
    name: 'Next.js + Supabase',
    tags: ['Full-Stack', 'Beginner-friendly'],
    color: '#1D1B18',
    accent: '#F0F0F0',
    icon: '▲',
    desc: 'Ship fast. Built-in auth, DB, storage.',
    best_for: ['SaaS', 'Startup', 'Solo'],
    skills: ['React', 'TypeScript', 'SQL'],
    learn: ['Next.js', 'Supabase', 'TypeScript'],
  },
  {
    id: 'react-node',
    name: 'React + Node.js + PostgreSQL',
    tags: ['Full-Stack', 'Scalable'],
    color: '#3B82F6',
    accent: '#EFF6FF',
    icon: '⚛',
    desc: 'Industry standard. Flexible & proven.',
    best_for: ['Startup', 'Team project', 'API-heavy'],
    skills: ['JavaScript', 'SQL', 'REST API'],
    learn: ['React', 'Node.js', 'PostgreSQL'],
  },
  {
    id: 'react-django',
    name: 'React + Django + PostgreSQL',
    tags: ['Full-Stack', 'Robust'],
    color: '#16A34A',
    accent: '#F0FDF4',
    icon: '🐍',
    desc: 'Python power. Best for data-heavy apps.',
    best_for: ['Data apps', 'AI projects', 'Fintech'],
    skills: ['Python', 'JavaScript', 'SQL'],
    learn: ['React', 'Django', 'PostgreSQL'],
  },
  {
    id: 'react-firebase',
    name: 'React + Firebase',
    tags: ['No-Backend', 'Fastest'],
    color: '#F59E0B',
    accent: '#FFFBEB',
    icon: '🔥',
    desc: 'Zero backend setup. Real-time out of the box.',
    best_for: ['MVP', 'Hackathon', 'Solo dev'],
    skills: ['React', 'JavaScript'],
    learn: ['React', 'Firebase'],
  },
  {
    id: 'flutter-mobile',
    name: 'Flutter + Firebase',
    tags: ['Mobile', 'Cross-platform'],
    color: '#06B6D4',
    accent: '#ECFEFF',
    icon: '📱',
    desc: 'One codebase for iOS & Android.',
    best_for: ['Mobile app', 'Consumer app'],
    skills: ['Dart', 'Mobile UI'],
    learn: ['Flutter', 'Firebase'],
  },
  {
    id: 'static-site',
    name: 'Astro + Netlify',
    tags: ['Static', 'Ultra-fast'],
    color: '#8B5CF6',
    accent: '#F5F3FF',
    icon: '✦',
    desc: 'For content, blogs, landing pages.',
    best_for: ['Content site', 'Portfolio', 'Landing page'],
    skills: ['HTML/CSS', 'JavaScript'],
    learn: ['Astro', 'Tailwind'],
  },
]

const ALL_POPULAR_TECH = [
  'React', 'JavaScript', 'TypeScript', 'Next.js', 'Python', 'Django',
  'Node.js', 'PostgreSQL', 'Supabase', 'Firebase', 'Tailwind CSS',
  'Flutter', 'HTML/CSS', 'SQL', 'FastAPI', 'Docker', 'REST API'
]

function getBestTechStackRecommendation(idea = '', understanding = {}, knownSkills = []) {
  const combined = `${idea} ${understanding.problem_statement || ''} ${understanding.expected_outcome || ''}`.toLowerCase()
  if (knownSkills.includes('Python') && !knownSkills.includes('React') && !knownSkills.includes('Next.js')) {
    return {
      stackId: 'react-django',
      badge: 'Matches your Python expertise',
      reason: 'Since you already know Python, Django delivers high productivity with built-in admin, ORM, and enterprise-grade security.'
    }
  }
  if (combined.includes('mobile app') || combined.includes('ios') || combined.includes('android')) {
    return {
      stackId: 'flutter-mobile',
      badge: 'Best for Mobile Apps',
      reason: 'Flutter allows you to deploy to both iOS & Android from one codebase with smooth native performance.'
    }
  }
  if (combined.includes('static blog') || combined.includes('landing page only') || combined.includes('portfolio')) {
    return {
      stackId: 'static-site',
      badge: 'Best for Static Publishing',
      reason: 'Astro outputs zero JavaScript by default for maximum speed and instant search engine indexing.'
    }
  }
  if (combined.includes('hackathon') || combined.includes('fast mvp')) {
    return {
      stackId: 'react-firebase',
      badge: 'Fastest 0-to-1 Launch',
      reason: 'React + Firebase gives you zero-backend serverless setup with real-time sync and built-in Google auth.'
    }
  }
  return {
    stackId: 'nextjs-fullstack',
    badge: '★ Best Choice for Your Project',
    reason: 'Next.js + Supabase is the top-tier stack for your app. It provides built-in user authentication for creators, instant PostgreSQL database to save stories and jokes, and 1-click deployment on Vercel.'
  }
}

function readDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(draftKey) || localStorage.getItem(draftKey) || 'null')
    if (d && !d.projectId) { d.projectId = newUuid(); sessionStorage.setItem(draftKey, JSON.stringify(d)); localStorage.setItem(draftKey, JSON.stringify(d)) }
    return d
  } catch { return null }
}
function hasStageContent(r) {
  if (!r) return false
  if (typeof r === 'string') return Boolean(r.trim())
  if (Array.isArray(r)) return r.length > 0
  return Object.values(r).some(v => Boolean(v))
}

// Grows with content, never scrolls
function AutoResizeTextarea({ value, onChange, placeholder, minRows = 2, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref} rows={minRows} value={value}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ resize: 'none', overflow: 'hidden' }}
      className={`w-full p-3 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-sm text-[#1D1B18] placeholder-[#AAA29B] focus:bg-white focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/10 outline-none transition-all leading-relaxed ${className}`}
    />
  )
}

// ─── Numbered insight card ─────────────────────────────────────────────────────
function InsightCard({ number, label, color = '#8E4B49', bg = '#FFF1ED', border = '#FFAAA6', children }) {
  return (
    <div className={`rounded-2xl border p-4 space-y-2`} style={{ background: bg, borderColor: border }}>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shrink-0" style={{ background: color }}>
          {number}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Pill list ────────────────────────────────────────────────────────────────
function PillList({ items = [], color = '#534342', bg = '#F7F4F0' }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {items.map((item, i) => (
        <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium border" style={{ color, background: bg, borderColor: bg }}>
          {item}
        </span>
      ))}
    </div>
  )
}

export default function IdeaAnalysis() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(readDraft)
  const [step, setStep] = useState(draft?.currentStage ?? 0)
  const [loading, setLoading] = useState(false)
  const [stageLoading, setStageLoading] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  // Step 0: Understanding
  const [understanding, setUnderstanding] = useState(
    draft?.understanding || { project_name: '', problem_statement: '', target_users: '', expected_outcome: '' }
  )
  const [projectType, setProjectType] = useState(draft?.projectType || 'Startup')

  // Steps 1-4: Workflow data
  const [workflow, setWorkflow] = useState(draft?.workflow || {})

  // Step 2: Repository
  const [repoRequired, setRepoRequired] = useState(draft?.repoRequired ?? true)
  const [repoUrlInput, setRepoUrlInput] = useState(draft?.repository?.url || '')
  const [connectedRepo, setConnectedRepo] = useState(draft?.repository || null)
  const [repoChecking, setRepoChecking] = useState(false)
  const [repoError, setRepoError] = useState('')
  const [repoTab, setRepoTab] = useState('connect')
  const [copiedCmd, setCopiedCmd] = useState(false)
  // GitHub repo creation
  const [createRepoName, setCreateRepoName] = useState('')
  const [createRepoPrivate, setCreateRepoPrivate] = useState(false)
  const [createRepoLoading, setCreateRepoLoading] = useState(false)
  const [createRepoError, setCreateRepoError] = useState('')
  const [createRepoToken, setCreateRepoToken] = useState('')
  // Tech stack selection
  const [selectedStack, setSelectedStack] = useState(draft?.selectedStack || null)
  const [techKnownInputs, setTechKnownInputs] = useState([]) // which stacks they know
  // Custom tech stack
  const [customStacks, setCustomStacks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('udaan:custom-stacks') || '[]') } catch { return [] }
  })
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customForm, setCustomForm] = useState({ name: '', frontend: '', backend: '', database: '', cloud: '' })
  // YouTube videos
  const [ytVideos, setYtVideos] = useState({})
  const [ytLoading, setYtLoading] = useState(false)

  // Step 3: Team
  const defaultDeadline = () => { const d = new Date(); d.setDate(d.getDate() + 80); return d.toISOString().split('T')[0] }
  const [startDate] = useState(draft?.startDate || new Date().toISOString().split('T')[0])
  const [deadline, setDeadline] = useState(draft?.deadline || defaultDeadline())
  const [teamSize, setTeamSize] = useState(draft?.teamSize || 2)
  const [weeklyHours, setWeeklyHours] = useState(draft?.weeklyHours || 20)
  const [teamMembers, setTeamMembers] = useState(() => {
    if (draft?.teamMembers?.length) return draft.teamMembers
    return [
      { id: 1, name: 'You (Project Lead)', role: 'Full-Stack Lead', hours: 25, focus: 'Architecture & Core Build' },
      { id: 2, name: 'Collaborator 2', role: 'Frontend / UI', hours: 20, focus: 'User Interface' },
    ]
  })

  const research = workflow?.research || {}
  const feasibility = workflow?.feasibility || {}
  const flightPlan = workflow?.flight_plan || {}

  function persist(updates = {}) {
    setDraft(cur => {
      const next = { ...cur, understanding, workflow, startDate, deadline, teamSize, weeklyHours, projectType, repoRequired, repository: connectedRepo, teamMembers, selectedStack, ...updates }
      try { sessionStorage.setItem(draftKey, JSON.stringify(next)); localStorage.setItem(draftKey, JSON.stringify(next)) } catch { }
      return next
    })
  }

  // Load tech history from DB on mount
  useEffect(() => {
    getTechHistory().then(data => {
      if (data?.known_stacks?.length) setTechKnownInputs(data.known_stacks.map(s => s.name || s))
    }).catch(() => { })
  }, [])

  // Auto-clarify Step 0
  useEffect(() => {
    if (draft?.idea?.trim() && !understanding.project_name?.trim() && !loading) void analyzeUnderstanding()
  }, [])

  // Auto-generate stage on entering unpopulated step
  useEffect(() => {
    if (step === 1 && !hasStageContent(research) && !stageLoading) void generateStageDirectly('research')
    else if (step === 2 && !hasStageContent(feasibility) && !stageLoading) void generateStageDirectly('feasibility')
    else if (step === 4 && !(flightPlan?.milestones?.length) && !stageLoading) void generateStageDirectly('flight_plan')
  }, [step])

  // Load YouTube videos when a stack is selected
  useEffect(() => {
    if (!selectedStack) return
    const stack = TECH_STACKS.find(s => s.id === selectedStack)
    if (!stack?.learn?.length) return
    setYtLoading(true)
    getYouTubeVideos(stack.learn).then(data => setYtVideos(data?.videos || {})).catch(() => { }).finally(() => setYtLoading(false))
  }, [selectedStack])

  async function analyzeUnderstanding() {
    if (!draft?.idea?.trim()) { setError('Please describe your idea first.'); return }
    setLoading(true); setError('')
    try {
      const res = await analyzeIdeaDraft(draft.idea, draft.attachment?.text)
      if (res) {
        const updated = {
          project_name: res.project_name || understanding.project_name || 'My Project',
          problem_statement: res.problem_statement || understanding.problem_statement,
          target_users: res.target_users || understanding.target_users,
          expected_outcome: res.expected_outcome || understanding.expected_outcome,
        }
        setUnderstanding(updated); persist({ understanding: updated })
        setNotice('Synthesized by AI ✓'); setTimeout(() => setNotice(''), 3000)
      }
    } catch (err) { setError(err.message || 'Could not synthesize.') }
    finally { setLoading(false) }
  }

  async function generateStageDirectly(stage) {
    setStageLoading(stage); setError('')
    try {
      const res = await generateIdeaStage({
        stage, draft: { idea: draft.idea, projectType, projectId: draft.projectId },
        projectDetails: { understanding, start_date: startDate, deadline, team_size: teamSize, weekly_hours: weeklyHours, ...workflow },
      })
      if (res) setWorkflow(prev => { const next = { ...prev, [stage]: res }; persist({ workflow: next }); return next })
    } catch (err) { setError(`Failed to generate ${stage.replace('_', ' ')}: ${err.message}`) }
    finally { setStageLoading('') }
  }

  function goToStage(idx) { setStep(idx); persist({ currentStage: idx }) }

  // Repo connect
  async function handleInspectRepo() {
    if (!repoUrlInput.trim()) { setRepoError('Enter a GitHub repository URL.'); return }
    setRepoChecking(true); setRepoError('')
    try {
      const { owner, name } = parseRepositoryUrl(repoUrlInput)
      const result = await syncAndAnalyzeRepository(owner, name)
      const repoData = { owner, name, fullName: `${owner}/${name}`, url: `https://github.com/${owner}/${name}`, branch: result.repository?.branch || 'main', isEmpty: result.repository?.isEmpty, fileCount: result.entries?.length || 0 }
      setConnectedRepo(repoData); persist({ repository: repoData })
      setNotice(`Connected: ${owner}/${name} ✓`); setTimeout(() => setNotice(''), 4000)
    } catch (err) { setRepoError(err.message || 'Could not verify repository.') }
    finally { setRepoChecking(false) }
  }

  const allStacks = [...TECH_STACKS, ...customStacks]

  // GitHub OAuth or Direct Token repo creation
  async function handleCreateGitHubRepo() {
    if (!createRepoName.trim()) { setCreateRepoError('Enter a repository name.'); return }
    setCreateRepoLoading(true); setCreateRepoError('')
    try {
      const result = await createGitHubRepo({
        name: createRepoName.trim(),
        description: understanding.project_name || draft.idea?.slice(0, 80),
        private: createRepoPrivate,
        token: createRepoToken.trim() || undefined,
      })
      const repoData = { owner: result.full_name?.split('/')[0] || '', name: result.full_name?.split('/')[1] || createRepoName, fullName: result.full_name, url: result.repo_url, branch: result.default_branch || 'main', isEmpty: true, fileCount: 0 }
      setConnectedRepo(repoData); persist({ repository: repoData })
      setNotice(`Repository created: ${result.full_name} ✓`); setTimeout(() => setNotice(''), 5000)
    } catch (err) {
      if (!createRepoToken.trim() && (err?.status === 401 || err?.message?.includes('requires_auth') || err?.message?.includes('GitHub not connected'))) {
        // Redirect to GitHub OAuth with repo scope
        try {
          const url = await startGitHubLogin({ returnTo: '/projects/new/analysis' })
          window.location.href = url
        } catch { setCreateRepoError('Connect GitHub first or enter a Personal Access Token below.') }
      } else {
        setCreateRepoError(err.message || 'Failed to create repository.')
      }
    }
    finally { setCreateRepoLoading(false) }
  }

  function handleSaveCustomStack(e) {
    e?.preventDefault?.()
    if (!customForm.name.trim()) return
    const id = `custom-${Date.now()}`
    const skills = [customForm.frontend, customForm.backend, customForm.database, customForm.cloud].filter(Boolean)
    const newStack = {
      id,
      name: customForm.name.trim(),
      tags: ['Custom', 'User-defined'],
      color: '#1D1B18',
      accent: '#F5F5F4',
      icon: '⚙',
      desc: `${customForm.frontend || 'Frontend'} + ${customForm.backend || 'Backend'} + ${customForm.database || 'DB'}`,
      best_for: ['Custom project', 'Tailored solution'],
      skills: skills.length ? skills : ['Full-Stack', 'APIs'],
      learn: skills.length ? skills : ['Frontend', 'Backend'],
    }
    const updated = [...customStacks, newStack]
    setCustomStacks(updated)
    try { localStorage.setItem('udaan:custom-stacks', JSON.stringify(updated)) } catch {}
    setSelectedStack(id)
    persist({ selectedStack: id })
    setShowCustomModal(false)
    setCustomForm({ name: '', frontend: '', backend: '', database: '', cloud: '' })
    if (skills.length) {
      saveTechHistory({ learning_stacks: skills.map(n => ({ name: n, project_context: understanding.project_name || 'custom project' })) }).catch(() => {})
    }
    setNotice(`Custom stack "${newStack.name}" added & selected! ✓`)
    setTimeout(() => setNotice(''), 4000)
  }

  // Save chosen stack to tech history
  async function handleSelectStack(stackId) {
    setSelectedStack(stackId); persist({ selectedStack: stackId })
    const stack = allStacks.find(s => s.id === stackId)
    if (stack?.learn) {
      const newLearning = stack.learn.map(name => ({ name, project_context: understanding.project_name || 'new project' }))
      saveTechHistory({ learning_stacks: newLearning }).catch(() => { })
    }
  }

  // Save known tech to history
  function toggleKnownTech(name) {
    setTechKnownInputs(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
      saveTechHistory({ known_stacks: next.map(n => ({ name: n, confidence: 'comfortable', source: 'self' })) }).catch(() => { })
      return next
    })
  }

  // Final creation
  async function createProject() {
    const name = understanding.project_name.trim()
    if (!name) { setError('Give your project a name in Step 1.'); setStep(0); return }
    setLoading(true); setError('')
    try {
      const project = saveIdeaProject({ draft: { ...draft, projectId: draft.projectId, idea: draft.idea, projectType, startDate, deadline, teamSize, weeklyHours, teamMembers, repository: connectedRepo, selectedStack }, understanding, workflow })
      try { await saveProjectDraft(draft, understanding, workflow, 'flight_plan') } catch { }
      if (connectedRepo) {
        try { await associateProjectRepository(project.id, { repo_owner: connectedRepo.owner, repo_name: connectedRepo.name, repo_url: connectedRepo.url, selected_branch: connectedRepo.branch, connection_status: connectedRepo.isEmpty ? 'empty' : 'connected', is_empty: connectedRepo.isEmpty }) } catch { }
      }
      try { await initializeTeamWorkspace(project.id) } catch { }
      localStorage.setItem('udaan:selected-project', project.id)
      sessionStorage.removeItem(draftKey); localStorage.removeItem(draftKey)
      navigate(`/?project=${encodeURIComponent(project.id)}&launched=1`, { state: { createdProject: name, newlyLaunched: true } })
    } catch (err) { setError(err.message || 'Could not launch project.') }
    finally { setLoading(false) }
  }

  // Schedule metrics
  const todayIso = new Date().toISOString().split('T')[0]
  let daysRemaining = 0
  if (deadline) { const ms = new Date(deadline) - new Date(startDate || todayIso); daysRemaining = Math.max(0, Math.ceil(ms / 86400000)) }
  const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7))
  const totalWeeklyHrs = teamMembers.reduce((s, m) => s + (parseInt(m.hours, 10) || weeklyHours), 0)

  function updateTeamSizeCount(n) {
    const val = Math.max(1, Math.min(10, parseInt(n, 10) || 1))
    setTeamSize(val)
    setTeamMembers(prev => {
      if (prev.length === val) return prev
      if (prev.length > val) return prev.slice(0, val)
      const adds = []
      for (let i = prev.length; i < val; i++) adds.push({ id: i + 1, name: `Member ${i + 1}`, role: roleOptions[i % roleOptions.length], hours: weeklyHours, focus: focusPresets[i % focusPresets.length] })
      return [...prev, ...adds]
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans']">

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#EFEAE4] flex items-center justify-between px-4 sm:px-6 py-3 shrink-0">
        <Link to="/" className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#534342] hover:text-[#1D1B18] transition-colors no-underline">
          <ArrowLeft size={15} /> <span>Back</span>
        </Link>

        {draft && (
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[65vw] sm:max-w-none">
            {stages.map((s, i) => {
              const Icon = s.icon
              const done = i < step; const active = i === step
              return (
                <button key={s.key} type="button" onClick={() => goToStage(i)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#FFAAA6]/30 text-[#7A3C3A] border border-[#FFAAA6]'
                      : done
                      ? 'bg-[#F0FAF8] text-[#2A9D8F] border border-[#9FD8CB]'
                      : 'text-[#7C766F] hover:text-[#1D1B18] border border-transparent'
                  }`}
                >
                  {done ? <CheckCircle2 size={13} className="text-[#2A9D8F]" /> : <Icon size={13} />}
                  <span className="hidden sm:inline">{s.title}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#E76F51] ml-0.5" />}
                </button>
              )
            })}
          </nav>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {draft && <span className="text-[11px] sm:text-xs font-bold text-[#9B9590]">{step + 1} / {stages.length}</span>}
          <span className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#1D1B18]">
            <span className="w-6 h-6 rounded-lg bg-[#FFAAA6] flex items-center justify-center shadow-xs">
              <Sparkles size={13} className="text-[#7A3C3A]" />
            </span>
            <span className="hidden sm:inline">Launchpad</span>
          </span>
        </div>
      </header>

      {!draft ? (
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-sm bg-white rounded-3xl border border-[#EFEAE4] p-10 shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF1ED] flex items-center justify-center mx-auto"><Sparkles size={24} className="text-[#8E4B49]" /></div>
            <h1 className="text-xl font-black">No idea draft found</h1>
            <p className="text-sm text-[#534342]">Start from the home screen to begin your launch journey.</p>
            <Link to="/launch" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors no-underline">
              Launch New Idea <Zap size={14} />
            </Link>
          </div>
        </main>
      ) : (
        /* ── Main Body: Left Big Mascot (Bird) + Right Stage Content (Rest things) ──── */
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative">

          {/* LEFT: Big Mascot Companion Stage ("Bird") */}
          <div className="w-full lg:w-[40%] xl:w-[36%] shrink-0 flex flex-col items-center justify-center p-5 sm:p-7 lg:p-10 bg-gradient-to-br from-[#FFF8F3] via-[#FFF2EE]/70 to-[#FFE9E4]/40 border-b lg:border-b-0 lg:border-r border-[#EFEAE4] relative overflow-hidden select-none">
            {/* Subtle Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-80 h-72 sm:h-80 bg-[#FFAAA6]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-44 sm:w-52 h-44 sm:h-52 bg-[#FDE68A]/25 rounded-full blur-2xl pointer-events-none" />

            {/* Big Interactive Mascot */}
            <div className="relative z-10 flex flex-col items-center justify-center transform scale-95 sm:scale-105 lg:scale-120 xl:scale-130 py-2 sm:py-4 transition-transform duration-300">
              <InteractiveMascot phase={step} />
            </div>

            {/* Companion Stage Pill */}
            <div className="mt-4 sm:mt-6 relative z-10 text-center max-w-xs space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#EFEAE4] shadow-xs text-xs font-bold text-[#1D1B18]">
                <span className="w-2 h-2 rounded-full bg-[#8E4B49]" />
                <span>Step {step + 1} of {stages.length} · {stages[step]?.title}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Active Stage Content & Actions ("Rest things") */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-10 xl:px-12 py-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">

          {/* Progress bar */}
          <div className="h-1.5 bg-[#EFEAE4] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#E76F51] rounded-full transition-all duration-500" style={{ width: `${((step + 1) / stages.length) * 100}%` }} />
          </div>

          {/* Page title */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-black text-[#7A3C3A] uppercase tracking-widest px-2 py-0.5 rounded-lg bg-[#FFAAA6]/30">
                  Step {step + 1} of {stages.length}
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#1D1B18] leading-tight">
                {['Your Project Vision', 'Market Research', 'Tech Stack & Repo', 'Team & Timeline', 'Launch Roadmap'][step]}
              </h1>
              <p className="text-sm text-[#7C766F] mt-0.5">
                {['AI fills this in from your idea — just review & tweak.', 'Real competitor data from the live web.', 'Pick your tech stack and set up your repo.', 'Who builds it and when does it ship?', 'Your milestone roadmap, ready to execute.'][step]}
              </p>
            </div>
            {/* Idea chip */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-[#EFEAE4] max-w-[200px] shrink-0">
              <Lightbulb size={13} className="text-[#8E4B49] shrink-0" />
              <span className="text-[11px] font-semibold text-[#534342] truncate">{draft.idea?.slice(0, 50)}</span>
            </div>
          </div>

          {/* ─── STEP 0: PROJECT VISION ─────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1D1B18] uppercase tracking-wider">Project Details</span>
                  <button type="button" onClick={analyzeUnderstanding} disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF1ED] border border-[#FFAAA6] text-[#8E4B49] text-xs font-bold hover:bg-[#FFAAA6]/20 transition-colors">
                    {loading ? <MiniLoader color="#8E4B49" /> : <RefreshCw size={12} />}
                    {loading ? 'Thinking…' : 'Re-generate'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'project_name', label: '🏷 Project Name', placeholder: 'e.g. WorkCraft Marketplace', rows: 1 },
                    { key: 'target_users', label: '👥 Who is it for?', placeholder: 'Who feels this pain most?', rows: 2 },
                    { key: 'problem_statement', label: '🎯 What problem does it solve?', placeholder: 'The exact friction users face today…', rows: 3 },
                    { key: 'expected_outcome', label: '✅ What does success look like?', placeholder: 'What can users do after you build it?', rows: 2 },
                  ].map(f => (
                    <div key={f.key} className={`space-y-1 ${f.key === 'problem_statement' || f.key === 'expected_outcome' ? 'sm:col-span-1' : ''}`}>
                      <label className="text-xs font-bold text-[#534342] block">{f.label}</label>
                      <AutoResizeTextarea value={understanding[f.key] || ''} onChange={val => { setUnderstanding(prev => ({ ...prev, [f.key]: val })); persist({ understanding: { ...understanding, [f.key]: val } }) }} placeholder={f.placeholder} minRows={f.rows} />
                    </div>
                  ))}
                </div>

                {/* Category pills */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs font-bold text-[#534342]">Category:</span>
                  {['Startup', 'Hackathon', 'College Project', 'Personal Project'].map(cat => (
                    <button key={cat} type="button" onClick={() => { setProjectType(cat); persist({ projectType: cat }) }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${projectType === cat ? 'bg-[#1D1B18] text-white' : 'bg-[#FFF8F3] border border-[#EFEAE4] text-[#534342] hover:bg-[#EDE7E2]'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 1: MARKET RESEARCH ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              {stageLoading === 'research' ? (
                <div className="bg-white rounded-2xl border border-[#EFEAE4] p-8 flex flex-col items-center">
                  <UdaanLoader character="researcher" size="md"
                    message={['Scanning the web…', 'Finding competitors…', 'Checking pricing models…', 'Mapping market gaps…']}
                    sub="" />
                </div>
              ) : !hasStageContent(research) ? (
                <div className="bg-white rounded-2xl border border-[#EFEAE4] p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF1ED] flex items-center justify-center mx-auto"><Globe size={22} className="text-[#8E4B49]" /></div>
                  <p className="text-sm font-bold">Ready to scan the web</p>
                  <p className="text-xs text-[#7C766F]">UDAAN will find real competitors, pricing & pain points for your idea.</p>
                  <button type="button" onClick={() => generateStageDirectly('research')} className="px-5 py-2.5 rounded-xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors">
                    Start Live Research
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#7C766F]">
                      <ShieldCheck size={14} className="text-[#2A9D8F]" />
                      <span>Verified from live web sources via Tavily</span>
                    </div>
                    <button type="button" onClick={() => generateStageDirectly('research')} disabled={Boolean(stageLoading)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EFEAE4] text-[#534342] text-xs font-bold hover:bg-[#F7F4F0] transition-colors">
                      {stageLoading === 'research' ? <MiniLoader color="#534342" /> : <RefreshCw size={12} />}
                      Refresh
                    </button>
                  </div>

                  {/* Competitor overview — simplified */}
                  <InsightCard number="1" label="What exists today" color="#7A3C3A" bg="#FFF1ED" border="#FFAAA6">
                    <p className="text-sm text-[#1D1B18] leading-relaxed">
                      {research.existing_solutions_competitors || 'No competitor data found.'}
                    </p>
                  </InsightCard>

                  {/* Gaps */}
                  <InsightCard number="2" label="Gaps in the market — your opportunity" color="#766320" bg="#FFFBEB" border="#FDE68A">
                    <ul className="space-y-2">
                      {(research.gaps_opportunities || []).map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#1D1B18]">
                          <span className="w-5 h-5 rounded-full bg-[#FDE68A] text-[#766320] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </InsightCard>

                  {/* Features grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InsightCard number="3" label="Standard features expected" color="#2A5D54" bg="#F0FAF8" border="#9FD8CB">
                      <PillList items={research.commonly_available_features || []} color="#2A5D54" bg="#E0F5F1" />
                    </InsightCard>

                    <InsightCard number="4" label="Your first experiments to validate" color="#4B3B8C" bg="#F5F3FF" border="#C4B5FD">
                      <ul className="space-y-1.5">
                        {(research.recommended_validation_actions || []).slice(0, 3).map((a, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-[#1D1B18]">
                            <Check size={12} className="text-[#4B3B8C] shrink-0 mt-0.5" /> {a}
                          </li>
                        ))}
                      </ul>
                    </InsightCard>
                  </div>

                  {/* Sources */}
                  {Boolean(research.sources?.length) && (
                    <div className="bg-white rounded-2xl border border-[#EFEAE4] p-4 space-y-2">
                      <span className="text-xs font-bold text-[#534342]">Sources ({research.sources.length})</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {research.sources.map((src, i) => (
                          <a key={i} href={src.url} target="_blank" rel="noreferrer"
                            className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] hover:border-[#8E4B49] transition-colors no-underline">
                            <ExternalLink size={12} className="text-[#8E4B49] shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-bold text-[#8E4B49] truncate">{src.title || 'Source'}</div>
                              <div className="text-[11px] text-[#7C766F] truncate">{src.explanation || src.url}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── STEP 2: TECH STACK & REPO ──────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">

              {/* 2a — Tech stack cards */}
              <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 space-y-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#1D1B18]">Pick your tech stack</h2>
                    <p className="text-xs text-[#7C766F] mt-0.5">UDAAN picked the best options for your idea type. Choose one or create your custom stack.</p>
                  </div>
                  {hasStageContent(feasibility) && (
                    <span className="text-[11px] px-2 py-1 rounded-xl bg-[#F0FAF8] border border-[#9FD8CB] text-[#2A5D54] font-bold shrink-0">
                      AI: {(feasibility.technical_feasibility || '').slice(0, 40)}…
                    </span>
                  )}
                </div>

                {/* Plain-English Recommendation Card */}
                {(() => {
                  const rec = getBestTechStackRecommendation(draft?.idea, understanding, techKnownInputs)
                  if (!rec) return null
                  return (
                    <div className="rounded-2xl bg-gradient-to-r from-[#FFF8F3] to-[#FEF3C7]/40 border border-[#FFAAA6]/40 p-4 space-y-1.5 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#8E4B49] text-white flex items-center justify-center text-xs font-bold">★</span>
                        <span className="text-xs font-black text-[#8E4B49] uppercase tracking-wider">{rec.badge}</span>
                      </div>
                      <p className="text-xs text-[#534342] leading-relaxed">
                        {rec.reason}
                      </p>
                    </div>
                  )
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allStacks.map(stack => {
                    const isSelected = selectedStack === stack.id
                    return (
                      <button key={stack.id} type="button" onClick={() => handleSelectStack(stack.id)}
                        className={`relative text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md ${isSelected ? 'border-[#1D1B18] bg-white shadow-md' : 'border-[#EFEAE4] bg-[#FAFAF9] hover:border-[#D4CFC9]'}`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1D1B18] flex items-center justify-center">
                            <Check size={11} className="text-white" />
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{stack.icon}</span>
                          <span className="text-sm font-bold text-[#1D1B18]">{stack.name}</span>
                        </div>
                        <p className="text-xs text-[#534342] mb-2">{stack.desc}</p>
                        <div className="flex flex-wrap gap-1">
                          {stack.tags.map(t => (
                            <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${isSelected ? 'bg-[#1D1B18] text-white border-[#1D1B18]' : 'bg-white text-[#534342] border-[#E5E0DA]'}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </button>
                    )
                  })}

                  {/* + Custom Tech Stack Button */}
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(true)}
                    className="p-4 rounded-2xl border-2 border-dashed border-[#D5CFC7] bg-[#FAF8F5] hover:border-[#1D1B18] hover:bg-white text-left transition-all flex flex-col justify-between group min-h-[140px] cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xl">⚙️</span>
                        <span className="text-sm font-bold text-[#1D1B18] group-hover:text-[#8E4B49] transition-colors">+ Custom Stack</span>
                      </div>
                      <p className="text-xs text-[#7C766F] leading-relaxed">
                        Configure your own frontend, backend, database and cloud provider.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-[#8E4B49] underline pt-2">Build custom architecture →</span>
                  </button>
                </div>

                {/* "What do you already know?" */}
                {selectedStack && (() => {
                  const stack = allStacks.find(s => s.id === selectedStack)
                  if (!stack) return null
                  return (
                    <div className="pt-2 space-y-2 border-t border-[#EFEAE4]">
                      <p className="text-xs font-bold text-[#534342]">Which of these do you already know?</p>
                      <div className="flex flex-wrap gap-2">
                        {stack.skills.map(tech => (
                          <button key={tech} type="button" onClick={() => toggleKnownTech(tech)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${techKnownInputs.includes(tech) ? 'bg-[#2A9D8F] border-[#2A9D8F] text-white' : 'bg-white border-[#EFEAE4] text-[#534342] hover:border-[#2A9D8F]'}`}>
                            {techKnownInputs.includes(tech) ? <><Check size={11} className="inline mr-1" /></> : ''}
                            {tech}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-[#9B9590]">We'll suggest learning resources for the ones you don't know yet. Saved to your profile.</p>
                    </div>
                  )
                })()}
              </div>

              {/* Custom Tech Stack Modal */}
              {showCustomModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 max-w-md w-full shadow-xl space-y-4 font-['Plus_Jakarta_Sans']">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#FFF1ED] text-[#8E4B49] flex items-center justify-center font-bold text-sm">⚡</span>
                        <h3 className="text-sm font-black text-[#1D1B18]">Configure Custom Tech Stack</h3>
                      </div>
                      <button type="button" onClick={() => setShowCustomModal(false)} className="text-[#8C847E] hover:text-[#1D1B18] p-1">
                        <X size={16} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveCustomStack} className="space-y-3">
                      <label className="block space-y-1">
                        <span className="text-[11px] font-bold text-[#534342]">Stack Name *</span>
                        <input
                          type="text"
                          required
                          value={customForm.name}
                          onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. SvelteKit + FastAPI + SQLite"
                          className="w-full px-3 py-2 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs font-semibold focus:border-[#8E4B49] outline-none"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="block space-y-1">
                          <span className="text-[11px] font-bold text-[#534342]">Frontend</span>
                          <input
                            type="text"
                            value={customForm.frontend}
                            onChange={e => setCustomForm(f => ({ ...f, frontend: e.target.value }))}
                            placeholder="e.g. SvelteKit, React, Vue"
                            className="w-full px-3 py-2 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs font-semibold focus:border-[#8E4B49] outline-none"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[11px] font-bold text-[#534342]">Backend</span>
                          <input
                            type="text"
                            value={customForm.backend}
                            onChange={e => setCustomForm(f => ({ ...f, backend: e.target.value }))}
                            placeholder="e.g. FastAPI, Go, Express"
                            className="w-full px-3 py-2 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs font-semibold focus:border-[#8E4B49] outline-none"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="block space-y-1">
                          <span className="text-[11px] font-bold text-[#534342]">Database</span>
                          <input
                            type="text"
                            value={customForm.database}
                            onChange={e => setCustomForm(f => ({ ...f, database: e.target.value }))}
                            placeholder="e.g. PostgreSQL, Redis"
                            className="w-full px-3 py-2 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs font-semibold focus:border-[#8E4B49] outline-none"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[11px] font-bold text-[#534342]">Cloud / Hosting</span>
                          <input
                            type="text"
                            value={customForm.cloud}
                            onChange={e => setCustomForm(f => ({ ...f, cloud: e.target.value }))}
                            placeholder="e.g. Render, Fly.io, AWS"
                            className="w-full px-3 py-2 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs font-semibold focus:border-[#8E4B49] outline-none"
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCustomModal(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-[#8C847E] hover:text-[#1D1B18]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black shadow-xs cursor-pointer"
                        >
                          Save & Select Stack
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 2b — YouTube learning videos with REAL Thumbnails */}
              {selectedStack && (() => {
                const stack = allStacks.find(s => s.id === selectedStack)
                const unknownTech = stack?.learn?.filter(t => !techKnownInputs.includes(t)) || []
                if (!unknownTech.length) return null
                return (
                  <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Play size={16} className="text-[#FF0000]" />
                      <h2 className="text-sm font-bold text-[#1D1B18]">Learn the stack</h2>
                      <span className="text-xs text-[#7C766F]">Best verified courses to get started, curated for you</span>
                    </div>
                    {ytLoading ? (
                      <div className="flex items-center gap-2 text-xs text-[#7C766F] py-2">
                        <MiniLoader color="#7C766F" /> Loading verified courses…
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {unknownTech.map(tech => {
                          const vids = ytVideos[tech] || []
                          return (
                            <div key={tech} className="space-y-2">
                              <span className="text-xs font-bold text-[#534342] uppercase tracking-wider">{tech}</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {vids.length ? vids.map((v, i) => {
                                  const thumb = getYouTubeThumb(v.url)
                                  return (
                                    <a key={i} href={v.url} target="_blank" rel="noreferrer"
                                      className="flex flex-col sm:flex-row items-start gap-3 p-2.5 rounded-2xl bg-[#FFF8F3] border border-[#EFEAE4] hover:border-[#FF6B6B] hover:shadow-md transition-all no-underline group">
                                      <div className="relative w-full sm:w-36 h-20 rounded-xl overflow-hidden bg-black shrink-0">
                                        {thumb ? (
                                          <img src={thumb} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                          <div className="w-full h-full bg-[#1D1B18] flex items-center justify-center">
                                            <Play size={20} className="text-white" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                                          <div className="w-7 h-7 rounded-full bg-[#FF0000] text-white flex items-center justify-center shadow-md">
                                            <Play size={11} fill="white" className="ml-0.5" />
                                          </div>
                                        </div>
                                        {v.duration && v.duration !== '—' && (
                                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white tracking-wide">
                                            {v.duration}
                                          </span>
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1 py-0.5">
                                        <div className="text-xs font-bold text-[#1D1B18] line-clamp-2 group-hover:text-[#FF6B6B] transition-colors leading-snug">
                                          {v.title}
                                        </div>
                                        <div className="text-[11px] text-[#7C766F] flex items-center gap-1.5 mt-1.5">
                                          <span className="font-semibold">{v.channel}</span>
                                          <span className="text-[10px] text-[#2A9D8F]">✓</span>
                                        </div>
                                      </div>
                                    </a>
                                  )
                                }) : (
                                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(tech + ' tutorial for beginners')}`} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-2 p-3 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] hover:border-[#FF6B6B] transition-colors no-underline text-xs text-[#8E4B49] font-bold">
                                    <Play size={13} className="text-[#FF0000]" />
                                    Search {tech} tutorials on YouTube
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* 2c — Repository setup */}
              <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#1D1B18]">Set up your repository</h2>
                    <p className="text-xs text-[#7C766F] mt-0.5">UDAAN uses your repo to track code, verify tests and measure progress.</p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#F7F4F0] p-1 rounded-xl">
                    <button type="button" onClick={() => { setRepoRequired(true); persist({ repoRequired: true }) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${repoRequired ? 'bg-white text-[#1D1B18] shadow-sm' : 'text-[#7C766F]'}`}>
                      Yes
                    </button>
                    <button type="button" onClick={() => { setRepoRequired(false); persist({ repoRequired: false }) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!repoRequired ? 'bg-white text-[#1D1B18] shadow-sm' : 'text-[#7C766F]'}`}>
                      Skip for now
                    </button>
                  </div>
                </div>

                {repoRequired && (
                  connectedRepo ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F0FAF8] border border-[#9FD8CB]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-[#2A9D8F]" />
                        <div>
                          <span className="text-xs font-bold text-[#1D1B18] block">{connectedRepo.fullName}</span>
                          <span className="text-[11px] text-[#534342]">{connectedRepo.branch} branch · {connectedRepo.isEmpty ? 'Empty' : `${connectedRepo.fileCount} files`}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setConnectedRepo(null); setRepoUrlInput(''); persist({ repository: null }) }}
                        className="text-xs text-[#8E4B49] font-bold hover:underline px-2 py-1 rounded-lg">
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Tabs */}
                      <div className="flex gap-3 border-b border-[#EFEAE4] pb-2">
                        {[['connect', 'Connect existing'], ['create', 'Create new with GitHub']].map(([key, label]) => (
                          <button key={key} type="button" onClick={() => setRepoTab(key)}
                            className={`text-xs font-bold pb-1.5 border-b-2 transition-colors ${repoTab === key ? 'text-[#8E4B49] border-[#8E4B49]' : 'text-[#7C766F] border-transparent hover:text-[#1D1B18]'}`}>
                            {label}
                          </button>
                        ))}
                      </div>

                      {repoTab === 'connect' && (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Github size={14} className="absolute left-3 top-3 text-[#7C766F]" />
                            <input type="text" value={repoUrlInput} onChange={e => setRepoUrlInput(e.target.value)}
                              placeholder="https://github.com/username/repo"
                              className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs font-medium focus:border-[#8E4B49] focus:outline-none" />
                          </div>
                          <button type="button" onClick={handleInspectRepo} disabled={repoChecking}
                            className="px-4 py-2.5 rounded-xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors flex items-center gap-1.5 shrink-0">
                            {repoChecking ? <MiniLoader color="#fff" /> : <Github size={13} />}
                            Connect
                          </button>
                        </div>
                      )}

                      {repoTab === 'create' && (
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-[#FFF8F3] border border-[#FFAAA6]/40 text-xs text-[#534342] flex items-start gap-2">
                            <Github size={14} className="text-[#1D1B18] shrink-0 mt-0.5" />
                            <span>Create a GitHub repository directly using your connected account or enter a Personal Access Token below for instant creation.</span>
                          </div>

                          <div className="space-y-2">
                            <input
                              type="password"
                              value={createRepoToken}
                              onChange={e => setCreateRepoToken(e.target.value)}
                              placeholder="GitHub Personal Access Token / Secret Key (Optional - skips OAuth)"
                              className="w-full px-3 py-2 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs font-mono focus:border-[#8E4B49] focus:outline-none"
                            />
                            <span className="text-[10px] text-[#9B9590] block">
                              Paste a classic token with <code>repo</code> scope to create directly, or leave blank to authenticate via OAuth.
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <input type="text" value={createRepoName} onChange={e => setCreateRepoName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                              placeholder={understanding.project_name?.toLowerCase().replace(/\s+/g, '-') || 'my-project'}
                              className="flex-1 px-3 py-2.5 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs font-mono focus:border-[#8E4B49] focus:outline-none" />
                            <button type="button" onClick={() => setCreateRepoPrivate(p => !p)}
                              className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${createRepoPrivate ? 'bg-[#1D1B18] text-white border-[#1D1B18]' : 'bg-white border-[#EFEAE4] text-[#534342]'}`}>
                              {createRepoPrivate ? '🔒 Private' : '🌐 Public'}
                            </button>
                            <button type="button" onClick={handleCreateGitHubRepo} disabled={createRepoLoading}
                              className="px-4 py-2.5 rounded-xl bg-[#8E4B49] text-white text-xs font-bold hover:bg-[#7A3C3A] transition-colors flex items-center gap-1.5 shrink-0">
                              {createRepoLoading ? <MiniLoader color="#fff" /> : <Github size={13} />}
                              Create Repo
                            </button>
                          </div>

                          {createRepoError && (
                            <p className="text-xs text-[#8E4B49] font-medium">{createRepoError}</p>
                          )}
                        </div>
                      )}

                      {repoError && <p className="text-xs text-[#8E4B49] font-medium">{repoError}</p>}
                    </div>
                  )
                )}
              </div>

              {/* 2d — Feasibility summary pills */}
              {hasStageContent(feasibility) && feasibility.mvp_scope && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-[#EFEAE4] p-4 space-y-2">
                    <span className="text-xs font-bold text-[#7A3C3A] flex items-center gap-1.5">
                      <Rocket size={13} /> Build for MVP
                    </span>
                    <PillList items={feasibility.mvp_scope.essential_features || []} color="#7A3C3A" bg="#FFF1ED" />
                  </div>
                  <div className="bg-white rounded-2xl border border-[#EFEAE4] p-4 space-y-2">
                    <span className="text-xs font-bold text-[#766320] flex items-center gap-1.5">
                      <Clock size={13} /> Save for later
                    </span>
                    <PillList items={feasibility.mvp_scope.postpone || []} color="#766320" bg="#FFFBEB" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 3: TEAM & TIMELINE ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Timeline inputs */}
              <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 space-y-4 shadow-xs">
                <h2 className="text-sm font-bold text-[#1D1B18]">When do you want to ship?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: '🗓 Launch deadline', type: 'date', val: deadline, min: todayIso, set: v => { setDeadline(v); persist({ deadline: v }) } },
                    { label: '👥 Team size', type: 'number', val: teamSize, min: 1, max: 10, set: v => updateTeamSizeCount(v) },
                    { label: '⏱ Hours/week per person', type: 'number', val: weeklyHours, min: 5, max: 80, set: v => { setWeeklyHours(parseInt(v, 10) || 20); persist({ weeklyHours: parseInt(v, 10) || 20 }) } },
                  ].map(({ label, type, val, min, max, set }) => (
                    <div key={label} className="space-y-1.5">
                      <label className="text-xs font-bold text-[#534342] block">{label}</label>
                      <input type={type} value={val} min={min} max={max} onChange={e => set(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-sm font-bold focus:border-[#8E4B49] focus:outline-none" />
                    </div>
                  ))}
                </div>

                {/* Stats banner */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: 'Days remaining', val: daysRemaining },
                    { label: 'Weekly team hours', val: `${totalWeeklyHrs}h` },
                    { label: 'Sprint pace', val: daysRemaining > 60 ? 'Sustainable' : daysRemaining > 30 ? 'Moderate' : 'Intense' },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center p-3 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4]">
                      <div className="text-lg font-black text-[#8E4B49]">{val}</div>
                      <div className="text-[11px] text-[#7C766F] mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team members */}
              <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#1D1B18]">Team members ({teamMembers.length})</h2>
                  <button type="button" onClick={() => updateTeamSizeCount(teamSize + 1)} className="flex items-center gap-1 text-xs font-bold text-[#8E4B49] hover:underline">
                    <Plus size={13} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {teamMembers.map((m, i) => (
                    <div key={m.id || i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] items-center">
                      <input type="text" value={m.name} onChange={e => setTeamMembers(prev => { const c = [...prev]; c[i] = { ...c[i], name: e.target.value }; return c })}
                        placeholder={`Member ${i + 1}`} className="px-2.5 py-1.5 rounded-xl bg-white border border-[#EFEAE4] text-xs font-bold" />
                      <select value={m.role} onChange={e => setTeamMembers(prev => { const c = [...prev]; c[i] = { ...c[i], role: e.target.value }; return c })}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#EFEAE4] text-xs">
                        {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input type="text" value={m.focus || ''} onChange={e => setTeamMembers(prev => { const c = [...prev]; c[i] = { ...c[i], focus: e.target.value }; return c })}
                        placeholder="Primary focus" className="px-2.5 py-1.5 rounded-xl bg-white border border-[#EFEAE4] text-xs" />
                      <div className="flex items-center gap-1">
                        <input type="number" min="1" max="80" value={m.hours} onChange={e => setTeamMembers(prev => { const c = [...prev]; c[i] = { ...c[i], hours: parseInt(e.target.value, 10) || weeklyHours }; return c })}
                          className="w-16 px-2 py-1.5 rounded-xl bg-white border border-[#EFEAE4] text-xs font-bold text-center" />
                        <span className="text-[10px] text-[#7C766F]">h/wk</span>
                        {teamMembers.length > 1 && (
                          <button type="button" onClick={() => updateTeamSizeCount(teamSize - 1)} className="ml-auto text-[#8E4B49] p-1 rounded-lg hover:bg-[#FFF1ED]">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 4: FLIGHT PLAN ROADMAP ────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              {stageLoading === 'flight_plan' ? (
                <div className="bg-white rounded-2xl border border-[#EFEAE4] p-8 flex flex-col items-center">
                  <UdaanLoader character="rocket" size="md"
                    message={['Planning sprints…', 'Sequencing milestones…', 'Mapping your team…', 'Building roadmap…']}
                    sub="Gemini AI · roadmap synthesis" />
                </div>
              ) : !(flightPlan.milestones || []).length ? (
                <div className="bg-white rounded-2xl border border-[#EFEAE4] p-10 text-center space-y-3">
                  <Rocket size={28} className="text-[#8E4B49] mx-auto opacity-70" />
                  <p className="text-sm font-bold">Ready to generate your roadmap</p>
                  <button type="button" onClick={() => generateStageDirectly('flight_plan')} className="px-5 py-2.5 rounded-xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors">
                    Generate Roadmap
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    {flightPlan.summary && <p className="text-sm text-[#534342] leading-relaxed max-w-xl">{flightPlan.summary}</p>}
                    <button type="button" onClick={() => generateStageDirectly('flight_plan')} disabled={Boolean(stageLoading)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EFEAE4] text-xs font-bold text-[#534342] hover:bg-[#F7F4F0] transition-colors shrink-0">
                      {stageLoading === 'flight_plan' ? <MiniLoader color="#534342" /> : <RefreshCw size={12} />}
                      Regenerate
                    </button>
                  </div>

                  {(flightPlan.milestones || []).map((ms, idx) => {
                    const accents = [['#FFAAA6', '#7A3C3A'], ['#FDE68A', '#766320'], ['#9FD8CB', '#2A5D54'], ['#C4B5FD', '#4B3B8C']]
                    const [border, text] = accents[idx % accents.length]
                    return (
                      <div key={idx} className="bg-white rounded-2xl border p-5 space-y-3 shadow-xs" style={{ borderColor: border }}>
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0" style={{ background: text }}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-[#1D1B18]">{ms.title}</h3>
                            <span className="text-[11px] font-semibold" style={{ color: text }}>{ms.category} · {ms.target_date}</span>
                          </div>
                          <span className="ml-auto text-[11px] text-[#7C766F]">{ms.tasks?.length || 0} tasks</span>
                        </div>

                        {ms.purpose && <p className="text-xs text-[#534342] italic">{ms.purpose}</p>}

                        <div className="space-y-2">
                          {(ms.tasks || []).map((t, ti) => (
                            <div key={ti} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronRight size={12} className="text-[#9B9590] shrink-0" />
                                <span className="font-bold text-[#1D1B18] truncate">{t.title}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${t.priority === 'high' ? 'bg-[#FFAAA6]/40 text-[#7A3C3A]' : 'bg-[#FBE191]/40 text-[#766320]'}`}>
                                  {t.priority || 'medium'}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#7C766F] shrink-0">{t.effort_estimate || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          {notice && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2A5D54]/10 border border-[#2A5D54]/30 text-[#2A5D54] text-xs font-semibold">
              <Check size={15} /> {notice}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFAAA6]/20 border border-[#FFAAA6] text-[#8E4B49] text-xs font-semibold">
              <AlertCircle size={15} /> {error}
            </div>
          )}

            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3 pt-4 pb-3 border-t border-[#EFEAE4]">
              <button type="button" onClick={() => { persist(); navigate('/') }}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white border border-[#EFEAE4] text-xs font-bold text-[#534342] hover:bg-[#F7F4F0] transition-colors cursor-pointer">
                <Save size={13} /> <span className="hidden xs:inline">Save &</span> Exit
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button type="button" onClick={() => goToStage(step - 1)}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white border border-[#EFEAE4] text-xs font-bold hover:bg-[#F7F4F0] transition-colors cursor-pointer">
                    <ArrowLeft size={13} /> Back
                  </button>
                )}
                {step < 4 ? (
                  <button type="button" onClick={() => goToStage(step + 1)}
                    className="flex items-center gap-1.5 px-5 sm:px-6 py-2.5 rounded-xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-all shadow hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                    Continue <ArrowRight size={13} />
                  </button>
                ) : (
                  <button type="button" onClick={createProject} disabled={loading}
                    className="flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#8E4B49] text-white text-xs font-black hover:bg-[#7A3C3A] transition-all shadow-md disabled:opacity-60 cursor-pointer">
                    {loading ? <MiniLoader color="#fff" /> : <Rocket size={14} />}
                    Launch Project
                  </button>
                )}
              </div>
            </div>

          </main>
        </div>
      )}
    </div>
  )
}
