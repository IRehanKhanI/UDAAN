import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Award,
  Bell,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleHelp,
  Clock,
  Clock3,
  Code2,
  Compass,
  ExternalLink,
  FileCheck,
  FileCode2,
  GitBranch,
  Github,
  Info,
  Layers,
  Link2,
  ListChecks,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Save,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  Undo2,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MiniLoader } from '../components/UdaanLoader.jsx'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import AddTaskModal from '../components/modals/AddTaskModal.jsx'
import PlainEnglishExplainerModal from '../components/modals/PlainEnglishExplainerModal.jsx'
import CreativeBriefModal from '../components/modals/CreativeBriefModal.jsx'
import MindMapCanvas from '../components/mindmap/MindMapCanvas.jsx'
import MarketRadarView from '../components/radar/MarketRadarView.jsx'
import ReplanDiffDrawer from '../components/diff/ReplanDiffDrawer.jsx'
import TaskWorkbenchDrawer from '../components/workbench/TaskWorkbenchDrawer.jsx'
import { readSavedProjects, updateSavedProject, syncBackendProjects } from '../services/projectStorage.js'
import {
  generateIdeaStage,
  saveProjectDraft,
  getIdeaStageGeneration,
  queueIdeaStageGeneration,
  replanProjectRoadmap,
  addExperimentToRoadmap,
  verifyProjectTask,
  getMarketRadar,
  getMindMap,
  saveMindMap,
} from '../services/ideaWorkflowService.js'
import { createStarterFlightPlan, hasActionableFlightPlan } from '../services/flightPlanUtils.js'
import { getTeamWorkspace, updateTeamTask } from '../services/teamService.js'
import {
  compareRoadmapWithRepository,
  correctTaskAssessment,
  explainTaskAssessment,
  getProjectRepository,
  getRoadmapAssessment,
  readConnectedRepoLocally,
  saveRepositoryAnalysis,
  syncAndAnalyzeRepository,
} from '../services/projectRepositoryService.js'
import './FlightPlan.css'

const emptyTask = () => ({
  title: '',
  subtasks: [],
  dependencies: [],
  effort_estimate: '',
  priority: 'medium',
  acceptance_criteria: '',
  required_skills: [],
  suggested_role: '',
  start_date: '',
  target_date: '',
})

export const ROLE_CONFIGS = {
  'Product Lead': {
    label: 'Product Lead / Founder',
    short: 'Product Lead',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    badgeBg: '#EDE9FE',
    accent: '#6D28D9',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    initials: 'PL',
    description: 'Vision, roadmap milestones, feature specifications & product launch',
  },
  'Frontend Engineer': {
    label: 'Frontend Engineer',
    short: 'Frontend',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    badgeBg: '#D1FAE5',
    accent: '#047857',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    initials: 'FE',
    description: 'Responsive UI components, interactive client state & frontend workflows',
  },
  'Backend Architect': {
    label: 'Backend Architect',
    short: 'Backend',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    badgeBg: '#DBEAFE',
    accent: '#1D4ED8',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    initials: 'BE',
    description: 'Database schemas, REST/GraphQL endpoints, escrow auth & server logic',
  },
  'UI/UX Designer': {
    label: 'UI/UX Designer',
    short: 'UI/UX Design',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    badgeBg: '#FEF3C7',
    accent: '#B45309',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
    initials: 'UX',
    description: 'Visual identity, design tokens, micro-interactions & user research',
  },
  'QA / DevOps': {
    label: 'QA & DevOps',
    short: 'QA / DevOps',
    color: '#E11D48',
    bg: '#FFF1F2',
    border: '#FECDD3',
    badgeBg: '#FFE4E6',
    accent: '#BE123C',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    initials: 'QA',
    description: 'Test automation, CI/CD pipeline, performance audit & release verification',
  },
}

export function getRoleConfig(roleName = '') {
  if (!roleName) return ROLE_CONFIGS['Product Lead']
  const matched = Object.keys(ROLE_CONFIGS).find(k =>
    k.toLowerCase().includes(roleName.toLowerCase()) || roleName.toLowerCase().includes(k.toLowerCase())
  )
  if (matched) return ROLE_CONFIGS[matched]
  if (/front|ui|react|vue|web|client|style/i.test(roleName)) return ROLE_CONFIGS['Frontend Engineer']
  if (/back|api|db|node|sql|server|escrow|auth/i.test(roleName)) return ROLE_CONFIGS['Backend Architect']
  if (/design|figma|ux|art|brand|wireframe/i.test(roleName)) return ROLE_CONFIGS['UI/UX Designer']
  if (/test|qa|devops|cloud|docker|ci|audit/i.test(roleName)) return ROLE_CONFIGS['QA / DevOps']
  return ROLE_CONFIGS['Product Lead']
}

export function buildRadarFromStartResearch(research = {}, understanding = {}, project = {}) {
  let competitors = []
  if (Array.isArray(research.competitors) && research.competitors.length) {
    competitors = research.competitors
  } else if (typeof research.existing_solutions_competitors === 'string' && research.existing_solutions_competitors.length > 5) {
    const lines = research.existing_solutions_competitors.split(/\n|\.\s+/).filter(l => l.trim().length > 3)
    competitors = lines.slice(0, 4).map((line, i) => {
      const parts = line.split(/:|-/)
      const name = parts[0]?.replace(/^\d+\.\s*/, '').trim() || `Market Alternative ${i + 1}`
      const desc = parts[1]?.trim() || line.trim()
      return {
        name,
        positioning: desc,
        pricing: i === 0 ? '$49 - $199/month' : i === 1 ? '15% platform commission' : 'Free tier + $29/mo Pro',
        strengths: ['Established brand awareness', 'Existing user base'],
        weaknesses: ['Bloated UI and steep learning curve', 'High platform take rates'],
        market_share: `${38 - i * 9}%`,
      }
    })
  }

  if (!competitors.length) {
    competitors = [
      {
        name: 'Incumbent Market Leader',
        positioning: 'High-cost enterprise platform with complex feature bloat',
        pricing: '$149/mo base + transaction fees',
        strengths: ['Deep market penetration', 'Wide enterprise integrations'],
        weaknesses: ['Poor beginner UX', 'Slow customer response', 'Expensive for indie teams'],
        market_share: '45%',
      },
      {
        name: 'Legacy Cloud Alternative',
        positioning: 'Rigid workflow tool requiring heavy manual configuration',
        pricing: '10% - 20% platform take rate',
        strengths: ['Familiar legacy workflow'],
        weaknesses: ['Lacks automated milestone verification', 'No built-in flight plan roadmaps'],
        market_share: '25%',
      },
      {
        name: 'Modern Point Solution',
        positioning: 'Niche lightweight tool without end-to-end guidance',
        pricing: 'Free tier with $49/mo upgrade',
        strengths: ['Clean UI design'],
        weaknesses: ['Incomplete feature coverage', 'No repository comparison or live evidence'],
        market_share: '15%',
      },
    ]
  }

  let customerVoice = []
  if (Array.isArray(research.customer_voice) && research.customer_voice.length) {
    customerVoice = research.customer_voice
  } else if (Array.isArray(research.gaps_opportunities) && research.gaps_opportunities.length) {
    customerVoice = research.gaps_opportunities.map((gap, i) => ({
      pain_point: typeof gap === 'string' ? gap : (gap.gap || gap.title || 'Market friction'),
      source: i % 2 === 0 ? 'Reddit /r/startups' : 'ProductHunt Discussions',
      user_complaint: `Users highlight key friction: "${typeof gap === 'string' ? gap : gap.description || gap.gap}"`,
      opportunity: 'Deliver an intuitive, beginner-friendly guided platform.',
    }))
  }

  if (!customerVoice.length) {
    customerVoice = [
      {
        pain_point: 'Overwhelmed by complex setup & configuration',
        source: 'Reddit /r/webdev',
        user_complaint: 'Existing tools assume you are a senior dev with 10 years experience. We need step-by-step guidance!',
        opportunity: 'Plain-English task checklists with automatic timelines and guided milestones.',
      },
      {
        pain_point: 'High transaction and escrow platform fees',
        source: 'HackerNews Community',
        user_complaint: 'Platforms take up to 20% commission on milestone payouts before any work is verified.',
        opportunity: 'Transparent milestone contracts with verifiable proof.',
      },
      {
        pain_point: 'Unclear roadmap progress and deadline slippage',
        source: 'Indie Hackers',
        user_complaint: 'Most projects stall out because teams do not know who is implementing what feature next.',
        opportunity: 'Person-by-person feature roadmaps with clear role ownership.',
      },
    ]
  }

  const citations = Array.isArray(research.sources) && research.sources.length
    ? research.sources
    : [
      { title: 'Industry SaaS Benchmarks 2026', url: 'https://news.ycombinator.com', domain: 'news.ycombinator.com' },
      { title: 'User Experience in Modern DevTools', url: 'https://producthunt.com', domain: 'producthunt.com' },
      { title: 'Market Gaps Analysis Report', url: 'https://github.com/trending', domain: 'github.com' },
    ]

  const validationExperiments = Array.isArray(research.recommended_validation_actions) && research.recommended_validation_actions.length
    ? research.recommended_validation_actions.map((act, i) => ({
      id: `exp-${i + 1}`,
      title: typeof act === 'string' ? act : (act.action || act.title || `Validation Test ${i + 1}`),
      hypothesis: 'Validates target user demand and removes product guesswork.',
      experiment_type: 'Customer Discovery',
      pass_fail_metric: '> 20% user conversion rate',
      effort_days: 2,
      status: 'recommended',
    }))
    : [
      {
        id: 'exp-1',
        title: 'Target User Feedback Interviews',
        hypothesis: 'Confirm that prospective users prefer automated checklists over complex PM tools.',
        experiment_type: 'Customer Discovery',
        pass_fail_metric: '4 out of 5 users confirm preference',
        effort_days: 2,
        status: 'recommended',
      },
      {
        id: 'exp-2',
        title: 'Interactive Feature Preview Smoke Test',
        hypothesis: 'Showcase the interactive prototype to target users to measure completion rate.',
        experiment_type: 'Click Prototype',
        pass_fail_metric: '80% of testers successfully complete sample flow',
        effort_days: 3,
        status: 'recommended',
      },
    ]

  return {
    summary: research.executive_summary || research.summary || `Live market intelligence and competitor analysis for ${project.name || 'your project'}, synthesized from the initial research stage.`,
    competitors,
    customer_voice: customerVoice,
    citations,
    validation_experiments: validationExperiments,
  }
}

function normalizeMilestones(plan = {}) {
  const baseDate = new Date()
  const roleList = ['Frontend Engineer', 'Backend Architect', 'UI/UX Designer', 'Product Lead', 'QA / DevOps']

  return (Array.isArray(plan.milestones) ? plan.milestones : []).map((milestone, index) => {
    // Automatically calculate sequential milestone start and target dates if missing
    const mStartOffset = index * 14
    const mEndOffset = (index + 1) * 14
    const autoMStart = new Date(baseDate.getTime() + mStartOffset * 86400000).toISOString().slice(0, 10)
    const autoMEnd = new Date(baseDate.getTime() + mEndOffset * 86400000).toISOString().slice(0, 10)
    const startDate = milestone.start_date || autoMStart
    const targetDate = milestone.target_date || autoMEnd

    const tasksList = Array.isArray(milestone.tasks) ? milestone.tasks : []

    return {
      ...milestone,
      title: milestone.title?.trim() || `Milestone ${index + 1}`,
      category: milestone.category || 'Milestone',
      purpose: milestone.purpose || '',
      outcome: milestone.outcome || '',
      start_date: startDate,
      target_date: targetDate,
      tasks: tasksList.map((task, taskIndex) => {
        const tOffset = mStartOffset + Math.min(13, Math.floor((taskIndex + 1) * (14 / Math.max(1, tasksList.length))))
        const autoTDate = new Date(baseDate.getTime() + tOffset * 86400000).toISOString().slice(0, 10)

        // Intelligent role assignment if missing
        let assignedRole = (typeof task === 'object' && task?.suggested_role) || ''
        const titleText = (typeof task === 'string' ? task : task?.title || '').toLowerCase()
        if (!assignedRole) {
          if (/ui|component|screen|page|front|view|style|theme|css|responsive|button/i.test(titleText)) {
            assignedRole = 'Frontend Engineer'
          } else if (/api|db|database|backend|schema|server|model|auth|endpoint|escrow|table/i.test(titleText)) {
            assignedRole = 'Backend Architect'
          } else if (/design|wireframe|figma|prototype|brand|logo|ux|copy/i.test(titleText)) {
            assignedRole = 'UI/UX Designer'
          } else if (/test|qa|audit|deploy|security|ci|perf|verify/i.test(titleText)) {
            assignedRole = 'QA / DevOps'
          } else {
            assignedRole = roleList[(index + taskIndex) % roleList.length]
          }
        }

        if (typeof task === 'string') {
          return {
            ...emptyTask(),
            title: task.trim() || `Task ${taskIndex + 1}`,
            start_date: startDate,
            target_date: autoTDate,
            suggested_role: assignedRole,
            effort_estimate: '12 hours',
          }
        }

        return {
          ...task,
          title: task?.title?.trim() || `Task ${taskIndex + 1}`,
          start_date: task?.start_date || startDate,
          target_date: task?.target_date || autoTDate,
          suggested_role: task?.suggested_role || assignedRole,
          effort_estimate: task?.effort_estimate || '12 hours',
          subtasks: Array.isArray(task?.subtasks) ? task.subtasks : [],
          dependencies: Array.isArray(task?.dependencies) ? task.dependencies : [],
          required_skills: Array.isArray(task?.required_skills) ? task.required_skills : [],
        }
      })
    }
  })
}

export function buildClientMindMap(project, plan, radar = null) {
  const rootId = 'node-root'
  const nodes = [
    {
      id: rootId,
      label: (project?.name || 'Project Anchor').slice(0, 32),
      type: 'root',
      group: 'core',
      description: project?.idea || 'Core Idea & Vision Anchor',
      x: 80,
      y: 300,
    },
  ]
  const edges = []

  // Market Insights
  const competitors = radar?.competitors || []
  const voice = radar?.customer_voice || []
  const insights = [
    ...competitors.map(c => ({ title: `Comp: ${c.name}`, snippet: `${c.positioning} (${c.pricing})` })),
    ...voice.map(v => ({ title: `Need: ${v.pain_point}`, snippet: v.user_complaint })),
  ]
  if (!insights.length) {
    insights.push(
      { title: 'Market Gap: High Cost', snippet: 'Existing market tools have expensive plans' },
      { title: 'User Need: Simplicity', snippet: 'Creators demand an intuitive streamlined setup' }
    )
  }

  insights.slice(0, 3).forEach((ins, idx) => {
    const nId = `node-mkt-${idx + 1}`
    nodes.push({
      id: nId,
      label: ins.title.slice(0, 26),
      type: 'market',
      group: 'market',
      description: ins.snippet,
      radar_chip: 'Market Grounding',
      x: 360,
      y: 120 + idx * 110,
    })
    edges.push({
      id: `edge-root-${nId}`,
      source: rootId,
      target: nId,
      label: 'grounded by',
      animated: true,
    })
  })

  // Milestones & Tasks
  const milestonesList = normalizeMilestones(plan)
  let prevMId = null

  milestonesList.forEach((milestone, mIdx) => {
    const mId = `node-m${mIdx + 1}`
    const mY = 80 + mIdx * 160
    nodes.push({
      id: mId,
      label: (milestone.title || `Milestone ${mIdx + 1}`).slice(0, 30),
      type: 'milestone',
      group: 'milestone',
      description: milestone.purpose || '',
      x: 680,
      y: mY,
    })

    if (prevMId) {
      edges.push({
        id: `edge-${prevMId}-${mId}`,
        source: prevMId,
        target: mId,
        label: 'advances to',
        animated: true,
      })
    } else {
      edges.push({
        id: `edge-root-${mId}`,
        source: rootId,
        target: mId,
        label: 'executes',
        animated: true,
      })
    }
    prevMId = mId

      // 2-3 tasks per milestone
      ; (milestone.tasks || []).slice(0, 3).forEach((task, tIdx) => {
        const tId = task.id || `${mIdx}-${tIdx}`
        const nodeTId = `node-task-${mIdx + 1}-${tIdx + 1}`
        nodes.push({
          id: nodeTId,
          taskId: tId,
          label: (task.title || `Task ${tIdx + 1}`).slice(0, 28),
          type: 'task',
          group: 'task',
          description: task.why_matters || task.purpose || '',
          xp_reward: task.xp_reward || 150,
          radar_chip: task.radar_chip || '',
          x: 1000,
          y: mY - 35 + tIdx * 50,
        })
        edges.push({
          id: `edge-${mId}-${nodeTId}`,
          source: mId,
          target: nodeTId,
          label: `+${task.xp_reward || 150} XP`,
          animated: false,
        })
      })
  })

  return {
    nodes,
    edges,
    layout_settings: {
      node_spacing: 1.0,
      connection_opacity: 0.65,
      theme: 'espresso',
      show_labels: true,
    },
  }
}

function formatDate(value) {
  if (!value) return 'Not synced yet'
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? 'Not synced yet'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.valueOf())) return dateStr
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function getDaysRemaining(deadlineStr) {
  if (!deadlineStr) return null
  let target
  if (typeof deadlineStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(deadlineStr.trim())) {
    const parts = deadlineStr.trim().split('T')[0].split('-').map(Number)
    target = new Date(parts[0], parts[1] - 1, parts[2])
  } else {
    const d = new Date(deadlineStr)
    if (Number.isNaN(d.valueOf())) return null
    target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const today = new Date()
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffTime = target.getTime() - current.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  return {
    days: diffDays,
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
    label:
      diffDays < 0
        ? `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`
        : diffDays === 0
          ? 'Due today'
          : `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`,
  }
}

export function getTimelineProgress(startDateStr, deadlineStr) {
  if (!startDateStr || !deadlineStr) return null
  const start = new Date(startDateStr).getTime()
  const end = new Date(deadlineStr).getTime()
  const now = Date.now()
  if (end <= start) return 100
  const elapsed = now - start
  const total = end - start
  const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
  return pct
}

export function isTaskOverdue(task, isCompleted) {
  if (isCompleted) return false
  if (!task?.target_date) return false
  const target = new Date(task.target_date)
  if (Number.isNaN(target.valueOf())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return target < today
}

function shortSha(sha) {
  return sha && typeof sha === 'string' ? sha.slice(0, 7) : ''
}

export function buildStatusMeta(status) {
  switch (status) {
    case 'evidence_found':
      return { label: 'Evidence found', icon: FileCheck, className: 'evidence_found' }
    case 'partially_implemented':
      return { label: 'Partially implemented', icon: Layers, className: 'partially_implemented' }
    case 'mismatch_detected':
      return { label: 'Blocked / Mismatch', icon: ShieldAlert, className: 'mismatch_detected' }
    case 'verified':
      return { label: 'Verified', icon: CheckCircle2, className: 'verified' }
    case 'manual_review':
      return { label: 'Needs manual review', icon: CircleHelp, className: 'manual_review' }
    case 'not_assessed':
    default:
      return { label: 'Not assessed', icon: Circle, className: 'not_assessed' }
  }
}

function ConnectedRepositoryPanel({
  repository,
  syncing,
  comparing,
  onSync,
  onCompare,
  error,
  projectId,
}) {
  if (!repository) {
    return (
      <section className="fp-repo-panel">
        <div className="fp-repo-panel-top">
          <div className="fp-repo-identity">
            <div className="fp-repo-icon-wrap"><Github size={18} /></div>
            <div className="fp-repo-meta">
              <span className="fp-repo-name-link">No repository connected to this project</span>
              <span className="fp-repo-details">Connect a GitHub repository to assess codebase evidence and verify milestones.</span>
            </div>
          </div>
          <div className="fp-repo-actions">
            <Link
              to={projectId ? `/project-setup?project=${encodeURIComponent(projectId)}` : '/repository'}
              className="fp-btn-connect"
            >
              <Github size={14} /> Connect Repository
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const fullName = repository.repo_full_name || `${repository.repo_owner}/${repository.repo_name}`
  const githubUrl = repository.repo_url || `https://github.com/${repository.repo_owner}/${repository.repo_name}`
  const branch = repository.selected_branch || 'main'
  const sha = repository.last_synced_sha
  const status = repository.connection_status || 'connected'
  const isEmpty = Boolean(repository.is_empty)

  return (
    <section className="fp-repo-panel">
      <div className="fp-repo-panel-top">
        <div className="fp-repo-identity">
          <div className="fp-repo-icon-wrap"><Github size={18} /></div>
          <div className="fp-repo-meta">
            <div className="fp-repo-title-row">
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="fp-repo-name-link">
                {fullName} <ExternalLink size={12} />
              </a>
              <span className={`fp-repo-status-pill ${status}`}>
                {isEmpty ? 'Empty repository' : status === 'connected' ? 'Connected' : status}
              </span>
            </div>
            <div className="fp-repo-details">
              <span><GitBranch size={12} /> <code>{branch}</code></span>
              {sha && <span><Code2 size={12} /> <code>{shortSha(sha)}</code></span>}
              <span><Clock size={12} /> Synced: {formatDate(repository.last_synced_at)}</span>
            </div>
          </div>
        </div>

        <div className="fp-repo-actions">
          <button
            type="button"
            className="fp-btn-sync"
            onClick={onSync}
            disabled={syncing || comparing}
            title="Refresh repository files and analysis"
          >
            {syncing ? <MiniLoader color="#8E4B49" className="mr-0.5" /> : <RefreshCw size={14} />}
            {syncing ? 'Syncing…' : 'Sync repository'}
          </button>
          <button
            type="button"
            className="fp-btn-compare"
            onClick={onCompare}
            disabled={comparing || syncing || isEmpty}
            title={isEmpty ? 'Cannot compare an empty repository' : 'Compare roadmap milestones with repository evidence'}
          >
            {comparing ? <MiniLoader color="#8E4B49" className="mr-0.5" /> : <Sparkles size={14} />}
            {comparing ? 'Comparing…' : 'Compare with Repository'}
          </button>
        </div>
      </div>

      {isEmpty && (
        <div className="fp-repo-empty-note">
          <AlertCircle size={14} />
          <span>This repository is connected, but has no source files yet. Add commits on GitHub and sync to assess your flight plan.</span>
        </div>
      )}

      {error && (
        <div className="fp-message error" role="alert">
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </section>
  )
}

function TimingEditModal({ project, onClose, onSave, onSaveAndReplan, busy = false }) {
  const [startDate, setStartDate] = useState(project.startDate || project.start_date || new Date().toISOString().slice(0, 10))
  const [deadline, setDeadline] = useState(project.deadline || '')
  const [teamSize, setTeamSize] = useState(project.teamSize || project.team_size || 1)
  const [weeklyHours, setWeeklyHours] = useState(project.weeklyHours || project.weekly_hours || 20)
  const [error, setError] = useState('')

  const deadlineMetrics = useMemo(() => {
    if (!deadline) return null
    return getDaysRemaining(deadline)
  }, [deadline])

  const totalDays = useMemo(() => {
    if (!startDate || !deadline) return 0
    const start = new Date(startDate)
    const end = new Date(deadline)
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }, [startDate, deadline])

  const totalWeeks = Math.max(1, Math.round(totalDays / 7))
  const totalCapacityHours = Number(teamSize || 1) * Number(weeklyHours || 20) * totalWeeks

  function validate() {
    if (!deadline) {
      setError('Please select a project launch deadline.')
      return false
    }
    const today = new Date().toISOString().slice(0, 10)
    if (deadline <= today) {
      setError('The project deadline must be in the future.')
      return false
    }
    if (startDate && deadline <= startDate) {
      setError('The deadline must be after the project start date.')
      return false
    }
    setError('')
    return true
  }

  function handleSaveOnly() {
    if (!validate()) return
    onSave({
      startDate,
      deadline,
      teamSize: Number(teamSize),
      weeklyHours: Number(weeklyHours),
    })
  }

  function handleReplanWithNewTiming() {
    if (!validate()) return
    onSaveAndReplan({
      startDate,
      deadline,
      teamSize: Number(teamSize),
      weeklyHours: Number(weeklyHours),
    })
  }

  return (
    <div className="fp-modal-wrap" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fp-modal-card fp-timing-modal" role="dialog" aria-modal="true" aria-labelledby="fp-timing-title">
        <div className="fp-modal-header">
          <div>
            <div className="fp-eyebrow"><CalendarClock size={14} /> SCHEDULE & CAPACITY</div>
            <h3 id="fp-timing-title">Launch Deadline & Team Capacity</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#68776d' }}>
              Update your target date and capacity. You can apply changes to your schedule or replan automatically with AI.
            </p>
          </div>
          <button type="button" className="fp-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>

        <div className="fp-modal-body">
          <div className="fp-timing-inputs-grid">
            <label className="fp-editor-label">
              <span>Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </label>

            <label className="fp-editor-label">
              <span>Project Deadline *</span>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </label>

            <label className="fp-editor-label">
              <span>Team Size</span>
              <input
                type="number"
                min="1"
                max="25"
                value={teamSize}
                onChange={e => setTeamSize(e.target.value)}
              />
            </label>

            <label className="fp-editor-label">
              <span>Hours / Person / Week</span>
              <input
                type="number"
                min="1"
                max="80"
                value={weeklyHours}
                onChange={e => setWeeklyHours(e.target.value)}
              />
            </label>
          </div>

          {/* Timeline & Capacity Preview Card */}
          {deadline && (
            <div className="fp-timing-preview-box">
              <div className="fp-timing-stat-row">
                <div className="fp-timing-stat">
                  <span className="fp-stat-num">{totalDays}</span>
                  <span className="fp-stat-lbl">Days Total</span>
                </div>
                <div className="fp-timing-stat">
                  <span className="fp-stat-num">{deadlineMetrics?.days ?? totalDays}</span>
                  <span className="fp-stat-lbl">{deadlineMetrics?.isOverdue ? 'Days Overdue' : 'Days Remaining'}</span>
                </div>
                <div className="fp-timing-stat">
                  <span className="fp-stat-num">{totalWeeks}</span>
                  <span className="fp-stat-lbl">Weeks Available</span>
                </div>
                <div className="fp-timing-stat">
                  <span className="fp-stat-num">{totalCapacityHours}h</span>
                  <span className="fp-stat-lbl">Team Capacity</span>
                </div>
              </div>

              <div className="fp-timing-pacing-note">
                <Calendar size={13} />
                <span>
                  {deadlineMetrics?.isOverdue
                    ? 'Target launch date has passed. Replan to establish a realistic schedule.'
                    : totalDays <= 7
                      ? 'High-intensity timeline (hackathon mode). Focus on core MVP tasks.'
                      : totalDays <= 30
                        ? 'Balanced sprint timeline. Sufficient time for development, testing, and polish.'
                        : 'Comprehensive project timeline. Milestones can accommodate extensive verification.'}
                </span>
              </div>
            </div>
          )}

          {error && <div className="fp-message error" style={{ margin: '10px 0 0' }}><AlertCircle size={14} />{error}</div>}

          <div className="fp-timing-actions">
            <button type="button" className="fp-cancel-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="fp-btn-sync" onClick={handleSaveOnly} disabled={busy}>
              <Save size={13} /> Save Timing
            </button>
            <button type="button" className="fp-btn-replan-accent" onClick={handleReplanWithNewTiming} disabled={busy}>
              {busy ? <MiniLoader color="#fff" className="mr-0.5" /> : <Sparkles size={13} />}
              Save & Replan with AI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoadmapHeader({
  project,
  description,
  percent,
  doneCount,
  taskCount,
  inProgressCount = 0,
  blockedCount = 0,
  overdueCount = 0,
  unverifiedCount = 0,
  milestones,
  completedMilestones,
  activeMilestone,
  onEdit,
  editing = false,
  evidenceCount = 0,
  evidencePercent = 0,
  verifiedCount = 0,
  verifiedPercent = 0,
  onReplan,
  replanBusy = false,
  onOpenTimingEdit,
}) {
  const deadlineStr = project.deadline || project.workflow?.flight_plan?.deadline || project.scheduleMetadata?.deadline
  const startDateStr = project.startDate || project.start_date || project.workflow?.flight_plan?.start_date
  const daysInfo = useMemo(() => getDaysRemaining(deadlineStr), [deadlineStr])
  const timelineProgress = useMemo(() => getTimelineProgress(startDateStr, deadlineStr), [startDateStr, deadlineStr])
  const [activeTrackInfo, setActiveTrackInfo] = useState(null)

  const currentXp = project.xp_points || 0
  const currentLvl = project.xp_level || (currentXp >= 1000 ? 4 : currentXp >= 600 ? 3 : currentXp >= 300 ? 2 : 1)

  return (
    <>
      <section className="fp-hero">
        <div className="fp-hero-copy">
          <div className="fp-eyebrow"><Compass size={13} /> PROJECT ROADMAP</div>
          <h1>{project.name}</h1>
          <p>{description || 'A clear sequence of milestones to move this project forward.'}</p>
        </div>

        <div className="fp-hero-actions">
          <div className="fp-xp-badge" title="Project experience points earned through task verification">
            <Award size={13} className="text-[#8E4B49]" />
            <span>Level {currentLvl} · {currentXp} XP</span>
          </div>

          <button
            className="fp-timing-badge-btn"
            type="button"
            onClick={onOpenTimingEdit}
            title="Click to view and edit project deadline & capacity"
          >
            <CalendarClock size={14} />
            <span>
              {deadlineStr
                ? `Deadline: ${formatDisplayDate(deadlineStr)}`
                : 'Set Launch Deadline'}
            </span>
            {daysInfo && (
              <span className={`fp-days-badge ${daysInfo.isOverdue ? 'overdue' : daysInfo.days <= 7 ? 'urgent' : 'healthy'}`}>
                {daysInfo.label}
              </span>
            )}
          </button>

          <button
            className="fp-replan-button"
            type="button"
            onClick={onReplan}
            disabled={replanBusy || !project.idea}
          >
            {replanBusy ? <MiniLoader color="#8E4B49" className="mr-0.5" /> : <Sparkles size={14} />}
            {replanBusy ? 'Replanning…' : 'Replan with AI'}
          </button>

          <button className="fp-edit-roadmap" type="button" onClick={onEdit}>
            {editing ? <ArrowRight className="fp-back-arrow" size={14} /> : <Pencil size={14} />}
            {editing ? 'Back to Roadmap' : 'Edit Roadmap'}
          </button>
        </div>
      </section>

      <section className="fp-overview" aria-label="Roadmap progress and deadline">
        {/* Top summary row */}
        <div className="fp-overview-top">
          <div className="fp-progress-title">
            <span>Overall completion</span>
            <strong>{percent}%</strong>
          </div>
          <div className="fp-overview-top-right">
            {deadlineStr ? (
              <div className="fp-deadline-summary-chip">
                <Calendar size={13} />
                <span>Launch: <b>{formatDisplayDate(deadlineStr)}</b></span>
                {daysInfo && (
                  <span className={`fp-chip-days ${daysInfo.isOverdue ? 'overdue' : daysInfo.days <= 7 ? 'urgent' : 'healthy'}`}>
                    {daysInfo.label}
                  </span>
                )}
              </div>
            ) : (
              <button type="button" className="fp-set-deadline-link" onClick={onOpenTimingEdit}>
                + Set a launch deadline to track schedule feasibility
              </button>
            )}
          </div>
        </div>

        {/* Dual Progress: Task Completion Track + Timeline Elapsed Track */}
        <div className="fp-dual-progress-wrap">
          <div className="fp-track-row">
            <div className="fp-track-label-group">
              <span className="fp-track-label">Tasks completed</span>
              <span className="fp-track-val">{doneCount} of {taskCount} tasks ({percent}%)</span>
            </div>
            <div className="fp-progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>

          {timelineProgress !== null && (
            <div className="fp-track-row timeline-track-row">
              <div className="fp-track-label-group">
                <span className="fp-track-label">Timeline elapsed</span>
                <span className="fp-track-val">
                  {timelineProgress}% time elapsed
                  {startDateStr ? ` · Started ${formatDisplayDate(startDateStr)}` : ''}
                </span>
              </div>
              <div className="fp-timeline-track" role="progressbar" aria-valuenow={timelineProgress} aria-valuemin="0" aria-valuemax="100">
                <span
                  className={daysInfo?.isOverdue ? 'overdue' : timelineProgress > 85 ? 'warning' : 'healthy'}
                  style={{ width: `${Math.min(timelineProgress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Task Status Breakdown Chips */}
        <div className="fp-status-breakdown-row">
          <div className="fp-status-chip done">
            <CheckCircle2 size={13} />
            <span>Completed: <b>{doneCount}</b></span>
          </div>
          <div className="fp-status-chip in-progress">
            <Compass size={13} />
            <span>In Progress: <b>{inProgressCount}</b></span>
          </div>
          <div className="fp-status-chip blocked">
            <ShieldAlert size={13} />
            <span>Blocked: <b>{blockedCount}</b></span>
          </div>
          {overdueCount > 0 && (
            <div className="fp-status-chip overdue">
              <AlertTriangle size={13} />
              <span>Overdue: <b>{overdueCount}</b></span>
            </div>
          )}
          {unverifiedCount > 0 && (
            <div className="fp-status-chip unverified">
              <CircleHelp size={13} />
              <span>Needs Review: <b>{unverifiedCount}</b></span>
            </div>
          )}
        </div>

        {/* Multi-track breakdown for repository verification with info popovers */}
        <div className="fp-progress-breakdown">
          <div className="fp-progress-stat">
            <div className="fp-stat-head">
              <div className="fp-track-info-wrap">
                <span className="fp-stat-label">Manual user completion</span>
                <button
                  type="button"
                  className="fp-track-info-btn"
                  onClick={() => setActiveTrackInfo(activeTrackInfo === 'manual' ? null : 'manual')}
                  title="How is this track calculated?"
                >
                  <CircleHelp size={12} />
                </button>
                {activeTrackInfo === 'manual' && (
                  <div className="fp-track-popover">
                    <strong>Manual User Completion:</strong> Computed dynamically from task checkboxes marked as done by you.
                  </div>
                )}
              </div>
              <span className="fp-stat-val">{doneCount} / {taskCount} ({percent}%)</span>
            </div>
            <div className="fp-stat-track user"><span style={{ width: `${percent}%` }} /></div>
            <span className="fp-stat-footnote">Task checklist</span>
          </div>

          <div className="fp-progress-stat">
            <div className="fp-stat-head">
              <div className="fp-track-info-wrap">
                <span className="fp-stat-label">Repository evidence found</span>
                <button
                  type="button"
                  className="fp-track-info-btn"
                  onClick={() => setActiveTrackInfo(activeTrackInfo === 'evidence' ? null : 'evidence')}
                  title="How is this track calculated?"
                >
                  <CircleHelp size={12} />
                </button>
                {activeTrackInfo === 'evidence' && (
                  <div className="fp-track-popover">
                    <strong>Repository Evidence Found:</strong> Deterministic file scan matching your connected GitHub repository's tree against expected milestone source code.
                  </div>
                )}
              </div>
              <span className="fp-stat-val">{evidenceCount} / {taskCount} ({evidencePercent}%)</span>
            </div>
            <div className="fp-stat-track evidence"><span style={{ width: `${evidencePercent}%` }} /></div>
            <span className="fp-stat-footnote">Deterministic code matches detected</span>
          </div>

          <div className="fp-progress-stat">
            <div className="fp-stat-head">
              <div className="fp-track-info-wrap">
                <span className="fp-stat-label">Verification passed</span>
                <button
                  type="button"
                  className="fp-track-info-btn"
                  onClick={() => setActiveTrackInfo(activeTrackInfo === 'verified' ? null : 'verified')}
                  title="How is this track calculated?"
                >
                  <CircleHelp size={12} />
                </button>
                {activeTrackInfo === 'verified' && (
                  <div className="fp-track-popover">
                    <strong>Verification Passed:</strong> Verifiable test receipts, PR reviews, and proofs verified in Task Workbench. Awards real XP toward project tier progression!
                  </div>
                )}
              </div>
              <span className="fp-stat-val">{verifiedCount} / {taskCount} ({verifiedPercent}%)</span>
            </div>
            <div className="fp-stat-track verified"><span style={{ width: `${verifiedPercent}%` }} /></div>
            <span className="fp-stat-footnote">Passed criteria checks</span>
          </div>
        </div>

        <div className="fp-overview-foot">
          <span><CheckCircle2 size={14} /> {completedMilestones} of {milestones} milestones complete</span>
          <span className="fp-active-milestone">
            <span className="fp-active-dot" />
            {activeMilestone ? `Active: ${activeMilestone}` : 'All milestones complete'}
          </span>
        </div>
      </section>
    </>
  )
}

function TeamMemberRoadmapStrip({
  roles = [],
  allTasks = [],
  completed = [],
  selectedRole = 'all',
  onSelectRole,
}) {
  const standardRoles = ['Product Lead', 'Frontend Engineer', 'Backend Architect', 'UI/UX Designer', 'QA / DevOps']
  const displayRoles = Array.from(new Set([...standardRoles, ...roles]))
  const totalTasks = allTasks.length
  const totalCompleted = allTasks.filter(t => completed.includes(t.id)).length

  return (
    <div className="fp-team-member-strip">
      <div className="fp-team-strip-header">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#8E4B49] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A3C3A]">
            Team Member Feature Roadmaps
          </span>
        </div>
        <span className="text-[11px] text-[#7C766F]">
          Click a person to see their specific deliverables, color-coded cards & implementation checklist
        </span>
      </div>

      <div className="fp-member-cards-grid">
        {/* All Members Option */}
        <button
          type="button"
          onClick={() => onSelectRole('all')}
          className={`fp-member-card ${selectedRole === 'all' ? 'is-selected' : ''}`}
          style={{
            borderColor: selectedRole === 'all' ? '#1D1B18' : '#EFEAE4',
            background: selectedRole === 'all' ? '#1D1B18' : '#FFFFFF',
            color: selectedRole === 'all' ? '#FFFFFF' : '#1D1B18',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs shrink-0"
              style={{
                background: selectedRole === 'all' ? '#3B3835' : '#F5F0EB',
                color: selectedRole === 'all' ? '#FFFFFF' : '#8E4B49',
              }}
            >
              <UsersRound size={18} />
            </div>
            <div className="text-left min-w-0">
              <div className="font-bold text-xs truncate">All Team Members</div>
              <div
                className="text-[11px]"
                style={{ color: selectedRole === 'all' ? '#D6D3D1' : '#7C766F' }}
              >
                {totalCompleted} of {totalTasks} deliverables done
              </div>
            </div>
          </div>
          <div
            className="fp-member-progress-mini"
            style={{ background: selectedRole === 'all' ? '#44403C' : '#EFEAE4' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${totalTasks ? Math.round((totalCompleted / totalTasks) * 100) : 0}%`,
                background: selectedRole === 'all' ? '#10B981' : '#8E4B49',
              }}
            />
          </div>
        </button>

        {/* Individual Role Cards */}
        {displayRoles.map((roleName) => {
          const conf = getRoleConfig(roleName)
          const roleTasks = allTasks.filter(item => {
            const r = (item.task?.suggested_role || '').toLowerCase()
            const target = roleName.toLowerCase()
            return r.includes(target) || target.includes(r)
          })
          const roleDone = roleTasks.filter(item => completed.includes(item.id)).length
          const rolePct = roleTasks.length ? Math.round((roleDone / roleTasks.length) * 100) : 0
          const isSelected = selectedRole.toLowerCase() === roleName.toLowerCase()

          return (
            <button
              key={roleName}
              type="button"
              onClick={() => onSelectRole(isSelected ? 'all' : roleName)}
              className={`fp-member-card ${isSelected ? 'is-selected' : ''}`}
              style={{
                borderColor: isSelected ? conf.color : conf.border,
                background: isSelected ? conf.bg : '#FFFFFF',
                boxShadow: isSelected ? `0 0 0 2px ${conf.color}40, 0 4px 12px ${conf.color}22` : 'none',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={conf.avatar}
                    alt={conf.short}
                    className="w-10 h-10 rounded-full object-cover border-2 shadow-xs"
                    style={{ borderColor: conf.color }}
                  />
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                    style={{ background: conf.color }}
                  >
                    {conf.initials}
                  </span>
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-[#1D1B18] truncate">{conf.short}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ background: conf.badgeBg, color: conf.accent }}
                    >
                      {roleTasks.length} {roleTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[#7C766F] truncate" title={conf.description}>
                    {conf.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#7C766F] mt-1">
                <span>{roleDone} of {roleTasks.length} done</span>
                <span className="font-bold" style={{ color: conf.color }}>{rolePct}%</span>
              </div>
              <div className="fp-member-progress-mini" style={{ background: '#EFEAE4' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${rolePct}%`, background: conf.color }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MilestoneGanttTimeline({
  milestones = [],
  allTasks = [],
  completed = [],
  personFilter = 'all',
  onSelectTask,
}) {
  if (!milestones.length) return null

  return (
    <div className="fp-timeline-visualizer">
      <div className="fp-timeline-header">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-[#8E4B49]" />
            <h3 className="text-sm font-bold text-[#1D1B18] uppercase tracking-wider">
              Automatic Milestone Sprint Schedule & Timeline
            </h3>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Auto-calculated chronological sprint intervals with role deliverables and target dates.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF1ED] text-[#8E4B49] border border-[#FFAAA6]/40">
          {milestones.length} Sprints · 14-Day Sprint Blocks
        </span>
      </div>

      <div className="fp-timeline-sprints-flow">
        {milestones.map((milestone, mIdx) => {
          let tasksInMilestone = allTasks.filter(item => item.milestoneIndex === mIdx)
          if (personFilter !== 'all') {
            tasksInMilestone = tasksInMilestone.filter(item => {
              const r = (item.task?.suggested_role || '').toLowerCase()
              const target = personFilter.toLowerCase()
              return r.includes(target) || target.includes(r)
            })
          }
          const doneInMilestone = tasksInMilestone.filter(item => completed.includes(item.id)).length
          const pct = tasksInMilestone.length ? Math.round((doneInMilestone / tasksInMilestone.length) * 100) : 0
          const daysRemaining = milestone.target_date ? getDaysRemaining(milestone.target_date) : null

          return (
            <div key={`${mIdx}-${milestone.title}`} className="fp-timeline-sprint-row">
              <div className="fp-timeline-sprint-info">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F3EDE7] text-[#7A3C3A] uppercase tracking-wider">
                      Sprint {mIdx + 1}
                    </span>
                    <span className="text-[11px] font-semibold text-[#6B7280]">
                      {milestone.category || 'Deliverable'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#1D1B18] line-clamp-2 leading-snug">
                    {milestone.title}
                  </h4>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1 text-[11px] text-[#4B5563]">
                    <Calendar size={11} className="text-[#8E4B49]" />
                    <span>
                      {formatDisplayDate(milestone.start_date)} → <b>{formatDisplayDate(milestone.target_date)}</b>
                    </span>
                  </div>
                  {daysRemaining && (
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className={daysRemaining.isOverdue ? 'text-[#DC2626] font-bold' : 'text-[#059669] font-medium'}>
                        {daysRemaining.label}
                      </span>
                      <span className="font-bold text-[#1D1B18]">{pct}% Done</span>
                    </div>
                  )}
                  <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#8E4B49] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="fp-timeline-tasks-stream">
                {tasksInMilestone.length === 0 ? (
                  <div className="text-xs text-[#9CA3AF] italic py-2">
                    No deliverables for selected role in this sprint.
                  </div>
                ) : (
                  tasksInMilestone.map(item => {
                    const isDone = completed.includes(item.id)
                    const roleConf = getRoleConfig(item.task.suggested_role)
                    const isOverdue = isTaskOverdue(item.task, isDone)

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectTask?.(item)}
                        className="fp-timeline-task-bar"
                        style={{
                          backgroundColor: isDone ? '#F9FAFB' : roleConf.bg,
                          border: `1px solid ${isDone ? '#E5E7EB' : roleConf.border}`,
                          borderLeft: `4px solid ${isDone ? '#10B981' : roleConf.color}`,
                        }}
                        title={`Click to open Task Workbench: ${item.task.title}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={roleConf.avatar}
                            alt={roleConf.short}
                            className="w-5 h-5 rounded-full object-cover shrink-0 border"
                            style={{ borderColor: roleConf.color }}
                          />
                          <span
                            className="font-bold text-xs truncate max-w-[280px]"
                            style={{
                              color: isDone ? '#9CA3AF' : '#1D1B18',
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}
                          >
                            {item.task.title}
                          </span>
                          {item.task.category && (
                            <span
                              className="text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 hidden sm:inline-block"
                              style={{ background: roleConf.badgeBg, color: roleConf.accent }}
                            >
                              {item.task.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-[11px]">
                          <span className="text-[#6B7280]">
                            {item.task.effort_estimate || '12h'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                              isDone
                                ? 'bg-[#ECFDF5] text-[#059669]'
                                : isOverdue
                                  ? 'bg-[#FEF2F2] text-[#DC2626]'
                                  : 'bg-white text-[#374151] border border-[#E5E7EB]'
                            }`}
                          >
                            {isDone ? '✓ Done' : isOverdue ? 'Overdue' : formatDisplayDate(item.task.target_date)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskRow({
  item,
  projectId,
  highlight = false,
  done,
  locked,
  onToggle,
  showMilestone = false,
  assessment,
  onInspect,
  onOpenWorkbench,
}) {
  const task = item.task
  const priority = (task.priority || 'medium').toLowerCase()
  const statusKey = assessment?.status || 'not_assessed'
  const meta = buildStatusMeta(statusKey)
  const StatusIcon = meta.icon

  const overdue = isTaskOverdue(task, done)
  const targetDateDisplay = formatDisplayDate(task.target_date)
  const roleConf = getRoleConfig(task.suggested_role)

  // Subtasks/features to implement list
  const steps = (Array.isArray(task.subtasks) && task.subtasks.length > 0)
    ? task.subtasks
    : [
        `Plan & scaffold ${task.title || 'feature'} structure`,
        `Implement business logic & integrate responsive UI`,
        `Verify criteria, test edge cases & record proof`,
      ]

  return (
    <article
      id={highlight ? 'fp-task-return-target' : undefined}
      className={`fp-task-row ${done ? 'is-done' : ''} ${locked ? 'is-locked' : ''} ${overdue ? 'is-overdue' : ''} ${highlight ? 'fp-task-return-highlight' : ''}`}
      style={{
        borderLeft: done ? '4px solid #10B981' : `4px solid ${roleConf.color}`,
        backgroundColor: done ? '#FAFAFA' : roleConf.bg,
        borderColor: done ? '#E5E7EB' : roleConf.border,
      }}
    >
      <label
        className="fp-task-check"
        title={locked ? 'Complete its dependencies first' : done ? 'Mark task incomplete' : 'Mark task complete'}
      >
        <input type="checkbox" checked={done} onChange={onToggle} />
        <span>{done ? <Check size={12} /> : null}</span>
      </label>

      <div className="fp-task-main">
        {/* Feature Header Badge & Role Contributor Pill */}
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
              style={{ background: roleConf.badgeBg, color: roleConf.accent, border: `1px solid ${roleConf.border}` }}
            >
              🎯 Feature: {task.category || 'Core Deliverable'}
            </span>
            {showMilestone && <span className="fp-task-milestone-label">{item.milestone}</span>}
          </div>

          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs"
            style={{ background: '#FFFFFF', border: `1px solid ${roleConf.border}`, color: roleConf.color }}
            title={`Assigned to: ${task.suggested_role || roleConf.label}`}
          >
            <img src={roleConf.avatar} alt={roleConf.short} className="w-4 h-4 rounded-full object-cover" />
            <span>{task.suggested_role || roleConf.short}</span>
          </div>
        </div>

        <div className="fp-task-title-line">
          <h4
            className="cursor-pointer hover:text-[#8E4B49] transition-colors"
            onClick={() => onOpenWorkbench?.(item)}
            title="Click to open Task Workbench"
          >
            {task.title}
          </h4>
        </div>

        {/* Features / Steps to Implement Checklist */}
        <div className="fp-task-features-checklist my-2 p-2.5 rounded-xl bg-white/85 border border-[#EFEAE4]">
          <div className="text-[11px] font-bold text-[#534342] flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 uppercase tracking-wide">
              <ListChecks size={13} style={{ color: roleConf.color }} />
              Features to Implement ({steps.length})
            </span>
            <span className="text-[10px] text-[#7C766F] font-mono">
              {done ? 'All steps verified' : 'In development'}
            </span>
          </div>
          <ul className="space-y-1">
            {steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[#2D2A26]">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                  style={{
                    background: done ? '#ECFDF5' : roleConf.badgeBg,
                    color: done ? '#059669' : roleConf.color,
                  }}
                >
                  {done ? '✓' : idx + 1}
                </span>
                <span className={done ? 'line-through text-[#9CA3AF]' : ''}>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Required Skills Tech Stack Pills */}
        {task.required_skills?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap my-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C766F]">Stack:</span>
            {task.required_skills.map((skill) => (
              <span
                key={skill}
                className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-white border border-[#E5E7EB] text-[#374151]"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        <div className="fp-task-meta">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className="fp-workbench-open-btn"
              onClick={() => onOpenWorkbench?.(item)}
              title="Open Task Workbench (Requirements, Evidence & Verification)"
            >
              <Sparkles size={11} /> Workbench
            </button>
            <button
              type="button"
              className={`fp-task-build-badge ${meta.className}`}
              onClick={() => onInspect?.(item, assessment)}
              title="Click to inspect repository evidence and checks"
            >
              <StatusIcon size={12} />
              <span>{meta.label}</span>
            </button>
          </div>

          <span className={`fp-priority ${priority}`}>{priority} priority</span>

          {targetDateDisplay && (
            <span className={`fp-task-date-pill ${overdue ? 'overdue' : ''}`}>
              <Calendar size={11} /> {overdue ? `Overdue: ${targetDateDisplay}` : `Due ${targetDateDisplay}`}
            </span>
          )}

          {task.effort_estimate && <span><Clock3 size={11} />{task.effort_estimate}</span>}
          {projectId && <Link className="fp-learn-task-link" to={`/learning?project=${encodeURIComponent(projectId)}&task=${encodeURIComponent(item.id)}`}><Sparkles size={11} />Learn this</Link>}

          {task.dependencies?.length > 0 && (
            <span className="fp-dependency">
              <Link2 size={11} />{task.dependencies.length} dependenc{task.dependencies.length === 1 ? 'y' : 'ies'}
            </span>
          )}

          {overdue && <span className="fp-task-warning overdue"><AlertTriangle size={11} /> Overdue</span>}
          {locked && !done && <span className="fp-locked-label">Blocked</span>}
        </div>

        {(task.acceptance_criteria || task.dependencies?.length > 0 || task.start_date) && (
          <details className="fp-task-details">
            <summary><ArrowDown size={13} /> Details & Acceptance Criteria</summary>
            <div className="fp-task-detail-content">
              {task.start_date && (
                <div className="fp-detail-date-row">
                  <span><b>Start:</b> {formatDisplayDate(task.start_date)}</span>
                  {task.target_date && <span><b>Target:</b> {formatDisplayDate(task.target_date)}</span>}
                </div>
              )}
              {task.acceptance_criteria && (
                <div>
                  <b>Acceptance criteria</b>
                  <p>{task.acceptance_criteria}</p>
                </div>
              )}
              {task.dependencies?.length > 0 && (
                <div>
                  <b>Dependencies</b>
                  <p>{task.dependencies.join(' · ')}</p>
                </div>
              )}
            </div>
          </details>
        )}
      </div>

      <span className={`fp-task-state ${done ? 'complete' : overdue ? 'overdue' : locked ? 'blocked' : 'todo'}`}>
        {done ? 'Done' : overdue ? 'Overdue' : locked ? 'Blocked' : 'To do'}
      </span>
    </article>
  )
}

function RoadmapNode({
  milestone,
  index,
  status,
  completedCount,
  taskCount,
  progress,
  selected,
  onSelect,
  milestoneAssessment,
}) {
  const NodeIcon =
    status === 'completed'
      ? Check
      : status === 'overdue'
        ? AlertTriangle
        : status === 'blocked'
          ? ShieldAlert
          : status === 'at-risk'
            ? AlertCircle
            : status === 'active'
              ? Compass
              : Circle

  const mStatusKey = milestoneAssessment?.status || 'not_assessed'
  const mMeta = buildStatusMeta(mStatusKey)
  const MStatusIcon = mMeta.icon

  const targetDateStr = formatDisplayDate(milestone.target_date)
  const THEME_CLASSES = ['theme-emerald', 'theme-blue', 'theme-amber', 'theme-purple', 'theme-rose']
  const milestoneTheme = THEME_CLASSES[index % THEME_CLASSES.length]

  return (
    <article className={`fp-milestone-node ${status} ${index % 2 ? 'right' : 'left'} ${selected ? 'selected' : ''} ${milestoneTheme}`}>
      <span className="fp-node-connector" aria-hidden="true" />
      <span className="fp-marker" aria-hidden="true">
        <NodeIcon size={16} />
        {status !== 'completed' && <small>{String(index + 1).padStart(2, '0')}</small>}
      </span>

      <button type="button" className="fp-milestone-card" onClick={onSelect} aria-pressed={selected}>
        <div className="fp-milestone-top">
          <div className="fp-milestone-heading">
            <div className="fp-milestone-kicker-row">
              <span className="fp-milestone-kicker">{milestone.category} · {String(index + 1).padStart(2, '0')}</span>
              {targetDateStr && (
                <span className="fp-milestone-target-date">
                  <Calendar size={10} /> Due {targetDateStr}
                </span>
              )}
            </div>
            <h2>{milestone.title}</h2>
            <span className={`fp-milestone-build-status ${mMeta.className}`}>
              <MStatusIcon size={11} /> {mMeta.label}
            </span>
          </div>

          <span className={`fp-status ${status}`}>{status.replace('-', ' ')}</span>
        </div>

        {milestone.outcome && <p className="fp-outcome">{milestone.outcome}</p>}

        <div className="fp-node-progress">
          <span>{completedCount} of {taskCount} tasks</span>
          <span>{progress}%</span>
        </div>
        <div className={`fp-mini-progress ${status}`}><span style={{ width: `${progress}%` }} /></div>
      </button>
    </article>
  )
}

function ComparisonSummaryBanner({ summary, onClose }) {
  if (!summary) return null
  return (
    <div className="fp-compare-banner" role="status">
      <div className="fp-compare-banner-content">
        <Sparkles size={16} />
        <div>
          <b>Comparison Complete</b>
          <p style={{ margin: '2px 0 0', color: '#8e4b49' }}>
            Assessed against revision <code>{shortSha(summary.commit_sha) || 'head'}</code> on branch <b>{summary.branch || 'main'}</b>.
          </p>
        </div>
      </div>
      <div className="fp-compare-banner-counts">
        <span style={{ background: '#fff8f3', color: '#8e4b49' }}>{summary.evidence_found_count || 0} Evidence found</span>
        <span style={{ background: '#fff8e6', color: '#886208' }}>{summary.partially_implemented_count || 0} Partial</span>
        <span style={{ background: '#fdf0f0', color: '#a62424' }}>{summary.mismatch_detected_count || 0} Mismatches</span>
        <button type="button" className="fp-compare-banner-close" onClick={onClose} aria-label="Dismiss banner">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function TaskAssessmentModal({
  item,
  assessment,
  repository,
  onClose,
  onSaveCorrection,
  onExplainAI,
  explainingAI,
  aiExplanation,
}) {
  const task = item.task
  const meta = buildStatusMeta(assessment?.status || 'not_assessed')
  const StatusIcon = meta.icon

  const [overrideStatus, setOverrideStatus] = useState(assessment?.status || 'evidence_found')
  const [overrideNotes, setOverrideNotes] = useState(assessment?.notes || '')
  const [confirming, setConfirming] = useState(false)
  const [modalNotice, setModalNotice] = useState('')
  const [modalError, setModalError] = useState('')

  async function handleConfirmOverride(statusToUse = overrideStatus) {
    setConfirming(true)
    setModalError('')
    setModalNotice('')
    try {
      await onSaveCorrection(item.id, {
        status: statusToUse,
        notes: overrideNotes,
        confirmed_by_user: true,
      })
      setModalNotice('Status updated and saved.')
      setTimeout(() => onClose(), 800)
    } catch (caught) {
      setModalError(caught.message || 'Could not save correction.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fp-modal-wrap" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fp-modal-card" role="dialog" aria-modal="true" aria-labelledby="fp-assessment-title">
        <div className="fp-modal-header">
          <div>
            <div className="fp-eyebrow">TASK REPOSITORY ASSESSMENT</div>
            <h3 id="fp-assessment-title">{task.title}</h3>
            <span style={{ fontSize: 11, color: '#6b7a6f' }}>
              Milestone: {item.milestone} · Task ID: <code>{item.id}</code>
            </span>
          </div>
          <button type="button" className="fp-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>

        <div className="fp-modal-body">
          <div className="fp-modal-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`fp-task-build-badge ${meta.className}`} style={{ padding: '4px 10px', fontSize: 12 }}>
                <StatusIcon size={14} /> {meta.label}
              </span>
              {assessment?.commit_sha && (
                <span className="fp-repo-badge">
                  <Code2 size={11} /> {shortSha(assessment.commit_sha)}
                </span>
              )}
              {assessment?.timestamp && (
                <span style={{ fontSize: 11, color: '#88968b' }}>
                  {formatDate(assessment.timestamp)}
                </span>
              )}
            </div>
            <div className="fp-explanation-box">
              {assessment?.explanation || 'No assessment explanation available yet. Compare with repository to assess this task.'}
            </div>
          </div>

          <div className="fp-modal-section">
            <span className="fp-modal-section-title">Implementation Evidence</span>
            {assessment?.evidence?.length > 0 ? (
              <div className="fp-evidence-list">
                {assessment.evidence.map((ev, index) => (
                  <div key={`${ev.file}-${index}`} className="fp-evidence-item">
                    <div>
                      <div className="fp-evidence-code">{ev.file}{ev.line ? `:${ev.line}` : ''}</div>
                      {ev.text && <div className="fp-evidence-text">{ev.text}</div>}
                    </div>
                    <Link
                      to={`/repository?file=${encodeURIComponent(ev.file)}`}
                      className="fp-evidence-link"
                      title="Inspect file in Code Explorer"
                    >
                      <FileCode2 size={13} /> View File
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#7a887e', padding: '8px 12px', background: '#f8faf8', borderRadius: 6 }}>
                No direct source file evidence was linked to this task.
              </div>
            )}
          </div>

          <div className="fp-modal-section">
            <span className="fp-modal-section-title">Verification & Checks</span>
            <div className="fp-checks-list">
              {(assessment?.checks || [
                { name: 'Django system check', command: 'python manage.py check', status: 'not_run', reason: 'Isolated test runner required for untrusted repository code.' },
              ]).map((c, i) => (
                <div key={i} className="fp-check-item">
                  <div>
                    <b>{c.name}</b> {c.command && <code>({c.command})</code>}
                    <div style={{ color: '#68776c', fontSize: 10.5, marginTop: 2 }}>{c.reason}</div>
                  </div>
                  <span className={`fp-check-status-badge ${c.status || 'not_run'}`}>
                    {c.status || 'not run'}
                  </span>
                </div>
              ))}
            </div>
            <small style={{ color: '#8a978d', fontSize: 10.5, marginTop: 2 }}>
              Note: Acceptance criteria require verified checks before being reported as Verified.
            </small>
          </div>

          <div className="fp-ai-explain-box">
            <div className="fp-ai-header">
              <Sparkles size={14} />
              <span>Gemini AI Rationale & Explanation</span>
            </div>
            {aiExplanation ? (
              <div style={{ fontSize: 12, color: '#8e4b49', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 6px' }}><b>Explanation:</b> {aiExplanation.explanation}</p>
                <p style={{ margin: '0 0 6px' }}><b>Rationale:</b> {aiExplanation.rationale}</p>
                <p style={{ margin: 0 }}><b>Recommended Next Step:</b> {aiExplanation.recommended_next_step}</p>
              </div>
            ) : (
              <button
                type="button"
                className="fp-ai-explain-btn"
                onClick={() => onExplainAI?.(item, assessment)}
                disabled={explainingAI}
              >
                {explainingAI ? <MiniLoader color="#8E4B49" className="mr-0.5" /> : <Sparkles size={13} />}
                {explainingAI ? 'Analyzing with Gemini…' : 'Explain finding with AI'}
              </button>
            )}
          </div>

          <div className="fp-correction-card">
            <span className="fp-modal-section-title">Human Confirmation & Correction</span>
            <div className="fp-correction-row">
              <label htmlFor="fp-override-status">Correct Status:</label>
              <select
                id="fp-override-status"
                value={overrideStatus}
                onChange={e => setOverrideStatus(e.target.value)}
              >
                <option value="evidence_found">Evidence found</option>
                <option value="partially_implemented">Partially implemented</option>
                <option value="mismatch_detected">Blocked or mismatch detected</option>
                <option value="manual_review">Needs manual review</option>
                <option value="not_assessed">Not assessed</option>
              </select>
            </div>
            <div className="fp-correction-row">
              <label htmlFor="fp-override-notes">Reviewer Notes:</label>
              <textarea
                id="fp-override-notes"
                rows={2}
                value={overrideNotes}
                onChange={e => setOverrideNotes(e.target.value)}
                placeholder="Add inspection notes or context..."
              />
            </div>
            {modalError && <div className="fp-message error" style={{ margin: 0 }}>{modalError}</div>}
            {modalNotice && <div className="fp-message" style={{ margin: 0 }}><CheckCircle2 size={14} />{modalNotice}</div>}
            <div className="fp-correction-actions">
              <button
                type="button"
                className="fp-btn-sync"
                onClick={() => handleConfirmOverride(assessment?.status || 'evidence_found')}
                disabled={confirming}
              >
                <Check size={13} /> Confirm current finding
              </button>
              <button
                type="button"
                className="fp-btn-confirm-override"
                onClick={() => handleConfirmOverride()}
                disabled={confirming}
              >
                {confirming ? <MiniLoader color="#8E4B49" className="mr-0.5" /> : <Save size={13} />}
                Save Correction
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoadmapEditor({ plan, onChange, onCancel, onSave, error, completedTasks = [] }) {
  const [expandedMilestones, setExpandedMilestones] = useState(() => new Set(plan.milestones.length ? [0] : []))
  const [expandedTasks, setExpandedTasks] = useState(() => new Set())

  function changePlanField(key, value) { onChange(current => ({ ...current, [key]: value })) }
  function changeMilestone(index, key, value) {
    onChange(current => ({
      ...current,
      milestones: current.milestones.map((milestone, itemIndex) =>
        itemIndex === index ? { ...milestone, [key]: value } : milestone
      ),
    }))
  }
  function changeTask(milestoneIndex, taskIndex, key, value) {
    onChange(current => ({
      ...current,
      milestones: current.milestones.map((milestone, index) =>
        index !== milestoneIndex
          ? milestone
          : {
            ...milestone,
            tasks: milestone.tasks.map((task, taskIndexInMilestone) =>
              taskIndexInMilestone === taskIndex ? { ...task, [key]: value } : task
            ),
          }
      ),
    }))
  }
  function removeTask(milestoneIndex, taskIndex) {
    if (!window.confirm('Remove this task from the roadmap?')) return
    onChange(current => ({
      ...current,
      milestones: current.milestones.map((milestone, index) =>
        index !== milestoneIndex
          ? milestone
          : {
            ...milestone,
            tasks: milestone.tasks.filter((_, taskIndexInMilestone) => taskIndexInMilestone !== taskIndex),
          }
      ),
    }))
  }
  function removeMilestone(index) {
    if (!window.confirm('Remove this milestone and its tasks from the roadmap?')) return
    onChange(current => ({
      ...current,
      milestones: current.milestones.filter((_, itemIndex) => itemIndex !== index),
    }))
  }
  function addTask(index) {
    const task = { ...emptyTask(), _fpId: `new-${Date.now()}` }
    onChange(current => ({
      ...current,
      milestones: current.milestones.map((milestone, itemIndex) =>
        itemIndex === index ? { ...milestone, tasks: [...milestone.tasks, task] } : milestone
      ),
    }))
    setExpandedTasks(current => new Set([...current, task._fpId]))
  }
  function addMilestone() {
    const index = plan.milestones.length
    onChange(current => ({
      ...current,
      milestones: [
        ...current.milestones,
        {
          _fpMilestoneId: `milestone-${Date.now()}`,
          title: '',
          category: 'Custom',
          outcome: '',
          start_date: '',
          target_date: '',
          tasks: [],
        },
      ],
    }))
    setExpandedMilestones(current => new Set([...current, index]))
  }
  function updateLines(value) { return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean) }
  function toggleMilestone(index) { setExpandedMilestones(current => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next }) }
  function toggleTask(taskId) { setExpandedTasks(current => { const next = new Set(current); next.has(taskId) ? next.delete(taskId) : next.add(taskId); return next }) }
  function growTextarea(event) { const element = event.currentTarget; element.style.height = 'auto'; element.style.height = `${element.scrollHeight}px` }

  return (
    <section className="fp-editor-page" aria-labelledby="fp-editor-title">
      <header className="fp-editor-page-heading">
        <div>
          <span className="fp-eyebrow">ROADMAP WORKSPACE</span>
          <h2 id="fp-editor-title">Edit your roadmap</h2>
          <p>Update milestone goals, target dates, and detailed task criteria. All changes are validated against project constraints.</p>
        </div>
      </header>

      <label className="fp-editor-label fp-summary-field">
        <span>Roadmap summary</span>
        <textarea rows={2} value={plan.summary || ''} onInput={growTextarea} onChange={event => changePlanField('summary', event.target.value)} />
      </label>

      <div className="fp-editor-milestones">
        {plan.milestones.map((milestone, index) => {
          const milestoneKey = milestone._fpMilestoneId || `milestone-${index}`
          const expanded = expandedMilestones.has(index)
          return (
            <article className={`fp-editor-milestone ${expanded ? 'expanded' : ''}`} key={milestoneKey}>
              <header className="fp-editor-milestone-head">
                <span className="fp-editor-number">{String(index + 1).padStart(2, '0')}</span>
                <button type="button" className="fp-editor-milestone-toggle" onClick={() => toggleMilestone(index)} aria-expanded={expanded}>
                  <span>
                    <b>{milestone.title || 'New milestone'}</b>
                    <small>
                      {milestone.category || 'Milestone'} <i>·</i> {milestone.tasks.length} {milestone.tasks.length === 1 ? 'task' : 'tasks'}
                      {milestone.target_date ? ` · Due ${milestone.target_date}` : ''}
                    </small>
                  </span>
                  <ChevronDown size={18} />
                </button>
                <button className="fp-editor-remove" type="button" onClick={() => removeMilestone(index)} aria-label={`Remove milestone ${index + 1}`}>
                  <Trash2 size={16} />
                </button>
              </header>

              {expanded && (
                <div className="fp-editor-milestone-body">
                  <div className="fp-editor-milestone-fields">
                    <label className="fp-editor-label">
                      <span>Milestone name</span>
                      <input value={milestone.title || ''} onChange={event => changeMilestone(index, 'title', event.target.value)} />
                    </label>
                    <label className="fp-editor-label">
                      <span>Category</span>
                      <input value={milestone.category || ''} onChange={event => changeMilestone(index, 'category', event.target.value)} />
                    </label>
                    <label className="fp-editor-label">
                      <span>Start Date</span>
                      <input type="date" value={milestone.start_date || ''} onChange={event => changeMilestone(index, 'start_date', event.target.value)} />
                    </label>
                    <label className="fp-editor-label">
                      <span>Target Date</span>
                      <input type="date" value={milestone.target_date || ''} onChange={event => changeMilestone(index, 'target_date', event.target.value)} />
                    </label>
                    <label className="fp-editor-label fp-field-wide">
                      <span>Purpose</span>
                      <input value={milestone.purpose || ''} onChange={event => changeMilestone(index, 'purpose', event.target.value)} placeholder="Key milestone goal..." />
                    </label>
                    <label className="fp-editor-label fp-field-wide">
                      <span>Expected outcome</span>
                      <textarea rows={2} value={milestone.outcome || ''} onInput={growTextarea} onChange={event => changeMilestone(index, 'outcome', event.target.value)} />
                    </label>
                  </div>

                  <div className="fp-editor-task-list">
                    <div className="fp-editor-task-heading">
                      <h3>Tasks</h3>
                      <span>{milestone.tasks.length} total</span>
                    </div>

                    {milestone.tasks.map((task, taskIndex) => {
                      const taskId = task._fpId || `${index}-${taskIndex}`
                      const taskExpanded = expandedTasks.has(taskId)
                      const done = completedTasks.includes(task._fpId || `${index}-${taskIndex}`)
                      return (
                        <article className={`fp-editor-task ${taskExpanded ? 'expanded' : ''}`} key={taskId}>
                          <div className="fp-editor-task-summary">
                            <button type="button" className="fp-editor-task-toggle" onClick={() => toggleTask(taskId)} aria-expanded={taskExpanded}>
                              <span className="fp-editor-task-title">{task.title || `Task ${taskIndex + 1}`}</span>
                              <span className={`fp-priority ${(task.priority || 'medium').toLowerCase()}`}>{task.priority || 'medium'}</span>
                              {task.target_date && <span className="fp-task-due-chip"><Calendar size={11} /> {task.target_date}</span>}
                              {task.effort_estimate && <span className="fp-task-effort"><Clock3 size={13} />{task.effort_estimate}</span>}
                              <span className={`fp-task-state ${done ? 'complete' : ''}`}>{done ? 'Complete' : 'To do'}</span>
                              <ChevronDown size={17} />
                            </button>
                            <button type="button" className="fp-editor-remove-task" onClick={() => removeTask(index, taskIndex)} aria-label={`Remove task ${taskIndex + 1}`}>
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {taskExpanded && (
                            <div className="fp-editor-task-fields">
                              <label className="fp-editor-label fp-field-wide">
                                <span>Task title</span>
                                <input value={task.title || ''} onChange={event => changeTask(index, taskIndex, 'title', event.target.value)} />
                              </label>
                              <label className="fp-editor-label">
                                <span>Target Completion Date</span>
                                <input type="date" value={task.target_date || ''} onChange={event => changeTask(index, taskIndex, 'target_date', event.target.value)} />
                              </label>
                              <label className="fp-editor-label">
                                <span>Effort estimate</span>
                                <input value={task.effort_estimate || ''} onChange={event => changeTask(index, taskIndex, 'effort_estimate', event.target.value)} placeholder="e.g. 2 days" />
                              </label>
                              <label className="fp-editor-label">
                                <span>Priority</span>
                                <select value={task.priority || 'medium'} onChange={event => changeTask(index, taskIndex, 'priority', event.target.value)}>
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                              </label>
                              <label className="fp-editor-label fp-field-wide">
                                <span>Subtasks <small>One per line</small></span>
                                <textarea rows={2} value={(task.subtasks || []).join('\n')} onInput={growTextarea} onChange={event => changeTask(index, taskIndex, 'subtasks', updateLines(event.target.value))} />
                              </label>
                              <label className="fp-editor-label fp-field-wide">
                                <span>Dependencies <small>Task titles, one per line</small></span>
                                <textarea rows={2} value={(task.dependencies || []).join('\n')} onInput={growTextarea} onChange={event => changeTask(index, taskIndex, 'dependencies', updateLines(event.target.value))} />
                              </label>
                              <label className="fp-editor-label fp-field-wide">
                                <span>Acceptance criteria</span>
                                <textarea rows={2} value={task.acceptance_criteria || ''} onInput={growTextarea} onChange={event => changeTask(index, taskIndex, 'acceptance_criteria', event.target.value)} />
                              </label>
                              <label className="fp-editor-label fp-field-wide">
                                <span>Required skills <small>One per line</small></span>
                                <textarea rows={2} value={(task.required_skills || []).join('\n')} onInput={growTextarea} onChange={event => changeTask(index, taskIndex, 'required_skills', updateLines(event.target.value))} />
                              </label>
                              <label className="fp-editor-label fp-field-wide">
                                <span>Suggested role</span>
                                <input value={task.suggested_role || ''} onChange={event => changeTask(index, taskIndex, 'suggested_role', event.target.value)} />
                              </label>
                            </div>
                          )}
                        </article>
                      )
                    })}
                    <button type="button" className="fp-add-task" onClick={() => addTask(index)}>
                      <Plus size={15} /> Add task
                    </button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
        <button type="button" className="fp-add-milestone" onClick={addMilestone}>
          <Plus size={16} /> Add milestone
        </button>
      </div>

      {error && <p className="fp-editor-error" role="alert">{error}</p>}
      <footer className="fp-editor-actions">
        <button className="fp-cancel-button" type="button" onClick={onCancel}>Cancel</button>
        <button className="fp-save-button" type="button" onClick={onSave}><Save size={15} /> Save Changes</button>
      </footer>
    </section>
  )
}

function ReplanPreview({ plan, onCancel, onApprove }) {
  const milestones = normalizeMilestones(plan)
  const taskCount = milestones.reduce((count, milestone) => count + milestone.tasks.length, 0)
  const comparison = plan._comparison || {}
  const assessment = plan.schedule_assessment || {}

  const feasibilityStatus = comparison.feasibility_status || assessment.feasibility_status || 'on_track'
  const mvpRecommendations = comparison.mvp_recommendations || assessment.mvp_recommendations || []
  const deferredFeatures = comparison.deferred_features || assessment.deferred_features || []

  return (
    <div className="fp-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="fp-preview-modal" role="dialog" aria-modal="true" aria-labelledby="fp-preview-title">
        <div className="fp-preview-icon"><Sparkles size={19} /></div>
        <span className="fp-eyebrow">AI ROADMAP REPLAN · PREVIEW</span>
        <h2 id="fp-preview-title">Review proposed schedule changes</h2>
        <p className="fp-preview-summary">{plan.summary || 'A deadline-aware reschedule has been generated for your review.'}</p>

        {/* Schedule & Preservation Comparison Card */}
        <div className="fp-replan-comparison-card">
          <div className="fp-replan-stat">
            <span className="fp-stat-val emerald">{comparison.completed_tasks_preserved ?? 'All'}</span>
            <span className="fp-stat-lbl">Completed Tasks Preserved</span>
          </div>
          <div className="fp-replan-stat">
            <span className="fp-stat-val">{comparison.remaining_tasks_rescheduled ?? taskCount}</span>
            <span className="fp-stat-lbl">Tasks Rescheduled</span>
          </div>
          <div className="fp-replan-stat">
            <span className="fp-stat-val">{comparison.days_remaining ?? assessment.days_remaining ?? '—'}d</span>
            <span className="fp-stat-lbl">Days to Deadline</span>
          </div>
          <div className="fp-replan-stat">
            <span className={`fp-stat-val feasibility ${feasibilityStatus}`}>
              {feasibilityStatus === 'on_track' ? 'On Track' : feasibilityStatus === 'tight' ? 'Tight Schedule' : 'Overambitious'}
            </span>
            <span className="fp-stat-lbl">Feasibility Status</span>
          </div>
        </div>

        {/* MVP Recommendations / Deferred Features notice */}
        {(mvpRecommendations.length > 0 || deferredFeatures.length > 0) && (
          <div className="fp-replan-mvp-callout">
            <div className="fp-mvp-callout-head">
              <AlertTriangle size={15} />
              <b>AI Schedule & Scope Recommendations</b>
            </div>
            {mvpRecommendations.map((rec, i) => (
              <p key={i} className="fp-mvp-rec-text">{rec}</p>
            ))}
            {deferredFeatures.length > 0 && (
              <div className="fp-deferred-box">
                <span className="fp-deferred-title">Recommended features to defer post-launch:</span>
                <ul>
                  {deferredFeatures.map((feat, idx) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="fp-preview-counts">
          <span>{milestones.length} milestones</span>
          <span>{taskCount} total tasks</span>
          {plan.deadline && <span>Target Deadline: {formatDisplayDate(plan.deadline)}</span>}
        </div>

        <div className="fp-preview-list">
          {milestones.map((milestone, index) => (
            <article key={`${index}-${milestone.title}`} className="fp-preview-milestone-row">
              <span className="fp-preview-milestone-num">{String(index + 1).padStart(2, '0')}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fp-preview-milestone-head">
                  <h3>{milestone.title}</h3>
                  {milestone.target_date && (
                    <span className="fp-preview-due-tag">
                      <Calendar size={11} /> Due {formatDisplayDate(milestone.target_date)}
                    </span>
                  )}
                </div>
                {milestone.outcome && <p>{milestone.outcome}</p>}
                <small>{milestone.tasks.length} tasks · {milestone.category}</small>
                {milestone.tasks.length > 0 && (
                  <ul className="fp-preview-task-list">
                    {milestone.tasks.map((task, taskIndex) => (
                      <li key={`${taskIndex}-${task.title}`}>
                        <span>{task.title}</span>
                        {task.target_date && <span className="fp-task-mini-due">Due {formatDisplayDate(task.target_date)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="fp-preview-note">
          Your current roadmap and task completion history remain unchanged until you approve these revisions.
        </p>

        <footer className="fp-editor-actions">
          <button className="fp-cancel-button" type="button" onClick={onCancel}>Keep current plan</button>
          <button className="fp-save-button" type="button" onClick={onApprove}><Check size={15} /> Apply revised plan</button>
        </footer>
      </section>
    </div>
  )
}

export default function FlightPlan() {
  const [projects, setProjects] = useState(readSavedProjects)
  const projectsWithPlans = useMemo(() => projects, [projects])
  const requestedProject = new URLSearchParams(window.location.search).get('project')
  const requestedTask = new URLSearchParams(window.location.search).get('task')
  const [selectedId, setSelectedId] = useState(() => requestedProject || projectsWithPlans[0]?.id || '')
  const project = projectsWithPlans.find(item => item.id === selectedId) || projectsWithPlans[0]

  useEffect(() => {
    if (project?.id) localStorage.setItem('udaan:selected-project', project.id)
  }, [project?.id])

  const [view, setView] = useState('flowmap') // 'flowmap' | 'mindmap' | 'radar' | 'timeline' | 'team'
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [milestoneTooltipOpen, setMilestoneTooltipOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [selectedMilestone, setSelectedMilestone] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [milestoneFilter, setMilestoneFilter] = useState('all')
  const [personFilter, setPersonFilter] = useState('all')

  const [editing, setEditing] = useState(false)
  const [editorPlan, setEditorPlan] = useState(null)
  const editorBaselineRef = useRef(null)
  const [editorError, setEditorError] = useState('')
  const [proposedPlan, setProposedPlan] = useState(null)
  const [generationStatus, setGenerationStatus] = useState('')
  const [generationError, setGenerationError] = useState('')

  // Market Radar & Mind Map State
  const [marketRadar, setMarketRadar] = useState(() => project?.market_radar || null)
  const [mindMapGraph, setMindMapGraph] = useState(() => project?.mindmap_graph || null)
  const [loadingRadar, setLoadingRadar] = useState(false)
  const [loadingMindMap, setLoadingMindMap] = useState(false)
  const [addingExpId, setAddingExpId] = useState(null)

  // Grounded Market Radar: Use initial research from onboarding/start when marketRadar is not yet saved
  const effectiveMarketRadar = useMemo(() => {
    if (marketRadar && (marketRadar.competitors?.length || marketRadar.customer_voice?.length)) {
      return marketRadar
    }
    const startResearch = project?.workflow?.research || project?.research || {}
    const startUnderstanding = project?.understanding || project?.workflow?.understanding || {}
    return buildRadarFromStartResearch(startResearch, startUnderstanding, project)
  }, [marketRadar, project])

  // Task Workbench Drawer State
  const [workbenchTask, setWorkbenchTask] = useState(null)
  const [workbenchMilestoneTitle, setWorkbenchMilestoneTitle] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Replan Diff Drawer & Undo History State
  const [diffDrawerOpen, setDiffDrawerOpen] = useState(false)
  const [replanComparison, setReplanComparison] = useState(null)
  const [historyStack, setHistoryStack] = useState([])

  // Timing Modal
  const [timingModalOpen, setTimingModalOpen] = useState(false)
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)
  const [creativeBriefModalOpen, setCreativeBriefModalOpen] = useState(false)
  const [explainerTask, setExplainerTask] = useState(null)

  function handleAddNewTaskFromModal(partial) {
    if (!project || !flightPlan) return
    const milestonesList = flightPlan.milestones || []
    if (!milestonesList.length) return
    const targetIdx = selectedMilestone < milestonesList.length ? selectedMilestone : 0
    const currentTasks = milestonesList[targetIdx].tasks || []
    const newTask = {
      title: partial.title,
      category: partial.category,
      estimated_minutes: partial.estimatedMinutes || 25,
      lead: partial.lead || 'TS',
      due_today: partial.dueToday ?? true,
      difficulty: 'medium',
      subtasks: [],
    }
    const updatedMilestones = milestonesList.map((m, idx) => {
      if (idx !== targetIdx) return m
      return { ...m, tasks: [...currentTasks, newTask] }
    })
    const updatedPlan = { ...flightPlan, milestones: updatedMilestones }
    persistPlan(updatedPlan)
    setNotice(`Added "${partial.title}" to ${milestonesList[targetIdx].title || 'milestone'}`)
    setTimeout(() => setNotice(''), 3000)
  }

  // Repository & Roadmap Assessment State
  const [connectedRepo, setConnectedRepo] = useState(null)
  const [repoAnalysis, setRepoAnalysis] = useState(null)
  const [repoSyncing, setRepoSyncing] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [compareError, setCompareError] = useState('')
  const [assessment, setAssessment] = useState(null)
  const [compareSummary, setCompareSummary] = useState(null)

  // Inspection Drawer / Modal State
  const [inspectedTaskItem, setInspectedTaskItem] = useState(null)
  const [inspectedTaskAssessment, setInspectedTaskAssessment] = useState(null)
  const [explainingAI, setExplainingAI] = useState(false)
  const [taskAiExplanation, setTaskAiExplanation] = useState(null)

  const flightPlan = project?.workflow?.flight_plan || createStarterFlightPlan(project?.name)

  useEffect(() => {
    let active = true
    if (!project?.id) return () => { active = false }
    void getTeamWorkspace(project.id).then(workspace => {
      if (!active || !workspace.tasks.length) return
      const serverProgress = workspace.tasks.filter(task => task.status === 'completed' && task.source_position).map(task => task.source_position)
      setProjects(current => current.map(item => {
        if (item.id !== project.id) return item
        const previous = item.flightPlanProgress || item.workflow?.flightPlanProgress || []
        if (JSON.stringify([...previous].sort()) === JSON.stringify([...serverProgress].sort())) return item
        const workflow = { ...item.workflow, flightPlanProgress: serverProgress }
        const updated = { ...item, flightPlanProgress: serverProgress, workflow }
        updateSavedProject(item.id, updated)
        return updated
      }))
    }).catch(() => { })
    return () => { active = false }
  }, [project?.id])

  // Load project's connected repository & latest assessment
  useEffect(() => {
    let active = true
    if (!project?.id) return

    async function loadRepoAndAssessment() {
      try {
        const repo = await getProjectRepository(project.id)
        if (active && repo) {
          setConnectedRepo(repo)
          if (repo.latest_analysis && Object.keys(repo.latest_analysis).length) {
            setRepoAnalysis(repo.latest_analysis)
          }
        }
      } catch {
        const localRepo = readConnectedRepoLocally()
        if (active && localRepo) {
          setConnectedRepo({
            repo_owner: localRepo.owner,
            repo_name: localRepo.name,
            repo_full_name: localRepo.fullName || `${localRepo.owner}/${localRepo.name}`,
            repo_url: localRepo.url || `https://github.com/${localRepo.owner}/${localRepo.name}`,
            selected_branch: localRepo.branch || 'main',
            last_synced_sha: localRepo.revision || '',
            last_synced_at: localRepo.syncedAt,
            connection_status: localRepo.isEmpty ? 'empty' : 'connected',
            is_empty: localRepo.isEmpty || false,
          })
          if (localRepo.analysis) setRepoAnalysis(localRepo.analysis)
        }
      }

      try {
        const assess = await getRoadmapAssessment(project.id)
        if (active && assess) {
          setAssessment(assess)
        }
      } catch {
        if (active) setAssessment(null)
      }
    }

    void loadRepoAndAssessment()
    return () => { active = false }
  }, [project?.id])

  // Load project's Market Radar & Mind Map Graph
  useEffect(() => {
    let active = true
    if (!project?.id) return

    if (project.market_radar && Object.keys(project.market_radar).length) {
      setMarketRadar(project.market_radar)
    } else {
      setLoadingRadar(true)
      getMarketRadar(project.id)
        .then(res => {
          if (active && res && Object.keys(res).length) {
            setMarketRadar(res)
            updateSavedProject(project.id, current => ({ ...current, market_radar: res }))
          }
        })
        .catch(() => { })
        .finally(() => { if (active) setLoadingRadar(false) })
    }

    if (project.mindmap_graph && project.mindmap_graph.nodes?.length) {
      setMindMapGraph(project.mindmap_graph)
    } else {
      setLoadingMindMap(true)
      getMindMap(project.id)
        .then(res => {
          if (active && res && res.nodes?.length) {
            setMindMapGraph(res)
            updateSavedProject(project.id, current => ({ ...current, mindmap_graph: res }))
          } else if (active) {
            const fallbackGraph = buildClientMindMap(project, flightPlan, project.market_radar)
            setMindMapGraph(fallbackGraph)
          }
        })
        .catch(() => {
          if (active) {
            const fallbackGraph = buildClientMindMap(project, flightPlan, project.market_radar)
            setMindMapGraph(fallbackGraph)
          }
        })
        .finally(() => { if (active) setLoadingMindMap(false) })
    }

    return () => { active = false }
  }, [project?.id])

  function handleOpenWorkbench(item) {
    setWorkbenchTask(item.task)
    setWorkbenchMilestoneTitle(item.milestone)
  }

  function handleMindMapNodeSelect(node) {
    if (node.type === 'task' || node.taskId) {
      const targetId = node.taskId || node.id.replace(/^node-task-\d+-/, '').replace(/^node-/, '')
      const matched = allTasks.find(t => t.id === targetId || t.task?.id === targetId || t.task?.title === node.label)
      if (matched) {
        setWorkbenchTask(matched.task)
        setWorkbenchMilestoneTitle(matched.milestone)
      } else {
        setWorkbenchTask({
          title: node.label,
          why_matters: node.description,
          radar_chip: node.radar_chip,
          xp_reward: node.xp_reward || 150,
          steps: [{ text: 'Implement requirements', done: false }, { text: 'Run verification test', done: false }],
          expected_evidence: ['src/main.js'],
          verification_criteria: 'Deliverable complete and verified',
        })
        setWorkbenchMilestoneTitle('Mind Map Execution')
      }
    } else if (node.type === 'milestone') {
      const mIdx = parseInt(node.id.replace(/\D/g, ''), 10) - 1
      if (mIdx >= 0 && mIdx < milestones.length) {
        setSelectedMilestone(mIdx)
        setView('flowmap')
      }
    } else if (node.type === 'market') {
      setView('radar')
    }
  }

  async function handleSaveMindMap(graph) {
    if (!project?.id) return
    setMindMapGraph(graph)
    updateSavedProject(project.id, current => ({ ...current, mindmap_graph: graph }))
    try {
      await saveMindMap(project.id, {
        nodes: graph.nodes,
        edges: graph.edges,
        layoutSettings: graph.layout_settings,
      })
      setNotice('Mind Map layout saved.')
      setTimeout(() => setNotice(''), 2500)
    } catch {
      // Saved in project storage
    }
  }

  async function handleAddExperiment(exp) {
    if (!project?.id) return
    setAddingExpId(exp.id)
    try {
      const res = await addExperimentToRoadmap(project.id, exp)
      if (res?.flight_plan) {
        persistPlan(res.flight_plan, completed, ['flight_plan'])
      } else {
        const updatedMilestones = (flightPlan.milestones || []).map((m, idx) => {
          if (idx !== 0) return m
          const newTask = {
            id: `m1-exp-${Date.now()}`,
            title: `Validation: ${exp.title}`,
            why_matters: exp.hypothesis,
            radar_chip: exp.experiment_type || 'Experiment',
            priority: 'high',
            effort_estimate: `${exp.effort_days || 2} days`,
            steps: [
              { text: `Execute ${exp.method || 'smoke test'}`, done: false },
              { text: `Verify threshold: ${exp.pass_fail_metric || 'Pass'}`, done: false },
            ],
            expected_evidence: ['docs/validation_report.md'],
            verification_criteria: exp.pass_fail_metric,
            dependencies: [],
            xp_reward: 150,
          }
          return { ...m, tasks: [newTask, ...(m.tasks || [])] }
        })
        persistPlan({ ...flightPlan, milestones: updatedMilestones }, completed, ['flight_plan'])
      }
      setNotice(`Added validation experiment "${exp.title}" to Milestone 1!`)
      setTimeout(() => setNotice(''), 3500)
    } catch (err) {
      setError(err.message || 'Could not add experiment to roadmap.')
    } finally {
      setAddingExpId(null)
    }
  }

  async function handleVerifyTask(verificationPayload) {
    if (!project?.id) return
    setIsVerifying(true)
    try {
      const res = await verifyProjectTask(project.id, verificationPayload)
      const earnedXp = res?.receipt?.xp_awarded || verificationPayload.xpAwarded || 150
      const currentXp = Number(project.xp_points || 0)
      const newXp = currentXp + earnedXp
      const newLevel = res?.receipt?.xp_level || (newXp >= 1000 ? 4 : newXp >= 600 ? 3 : newXp >= 300 ? 2 : 1)

      setAssessment(prev => {
        const prevAssessments = prev?.task_assessments || {}
        return {
          ...prev,
          task_assessments: {
            ...prevAssessments,
            [verificationPayload.taskKey]: {
              status: 'verified',
              notes: verificationPayload.proofDetails?.notes || 'Verification proof verified',
              verified_at: new Date().toISOString(),
            },
          },
        }
      })

      if (!completed.includes(verificationPayload.taskKey)) {
        toggleTask(verificationPayload.taskKey)
      }

      const updated = updateSavedProject(project.id, current => ({
        ...current,
        xp_points: newXp,
        xp_level: newLevel,
      }))
      if (updated) setProjects(current => current.map(item => item.id === updated.id ? updated : item))

      setNotice(`🎉 Task Verified! Earned +${earnedXp} XP (Total: ${newXp} XP · Level ${newLevel})`)
      setTimeout(() => setNotice(''), 4500)
      setWorkbenchTask(null)
    } catch (err) {
      setError(err.message || 'Verification could not be recorded.')
    } finally {
      setIsVerifying(false)
    }
  }

  function handleAcceptReplan(newPlan) {
    setHistoryStack(prev => [...prev, structuredClone(flightPlan)])
    const { _comparison, ...cleanPlan } = newPlan
    persistPlan(cleanPlan, completed, ['flight_plan'])
    setProposedPlan(null)
    setDiffDrawerOpen(false)
    setNotice('Revised deadline-aware roadmap applied. 1-click Undo available.')
    setError('')
    setSelectedMilestone(0)
    setTimeout(() => setNotice(''), 4000)
  }

  function handleUndoReplan() {
    if (!historyStack.length) return
    const prevPlan = historyStack[historyStack.length - 1]
    setHistoryStack(prev => prev.slice(0, -1))
    persistPlan(prevPlan, completed, ['flight_plan'])
    setNotice('Roadmap changes undone. Restored previous plan.')
    setTimeout(() => setNotice(''), 3000)
  }

  // Sync Repository
  async function handleSyncRepository() {
    if (!connectedRepo || repoSyncing) return
    setRepoSyncing(true)
    setCompareError('')
    setNotice('')
    try {
      const owner = connectedRepo.repo_owner || connectedRepo.owner
      const name = connectedRepo.repo_name || connectedRepo.name
      const branch = connectedRepo.selected_branch || 'main'
      const syncResult = await syncAndAnalyzeRepository(owner, name, branch)

      const updatedRepo = {
        ...connectedRepo,
        last_synced_sha: syncResult.repository.revision,
        last_synced_at: syncResult.repository.syncedAt,
        connection_status: syncResult.repository.isEmpty ? 'empty' : 'connected',
        is_empty: syncResult.repository.isEmpty,
      }
      setConnectedRepo(updatedRepo)
      setRepoAnalysis(syncResult.analysis)

      if (project?.id) {
        await saveRepositoryAnalysis(project.id, {
          analysis: syncResult.analysis,
          commitSha: syncResult.repository.revision,
        }).catch(() => { })
      }

      setNotice('Repository files and deterministic analysis refreshed.')
    } catch (caught) {
      setCompareError(caught.message || 'Could not sync repository.')
    } finally {
      setRepoSyncing(false)
    }
  }

  // Compare with Repository
  async function handleCompareWithRepository() {
    if (!project?.id || !connectedRepo || comparing) return
    setComparing(true)
    setCompareError('')
    setNotice('')
    setCompareSummary(null)
    try {
      let analysisToUse = repoAnalysis
      let shaToUse = connectedRepo.last_synced_sha

      if (!analysisToUse || !Object.keys(analysisToUse).length) {
        const owner = connectedRepo.repo_owner || connectedRepo.owner
        const name = connectedRepo.repo_name || connectedRepo.name
        const syncResult = await syncAndAnalyzeRepository(owner, name, connectedRepo.selected_branch)
        analysisToUse = syncResult.analysis
        shaToUse = syncResult.repository.revision
        setRepoAnalysis(analysisToUse)
      }

      const result = await compareRoadmapWithRepository(project.id, {
        analysis: analysisToUse,
        commitSha: shaToUse,
      })

      setAssessment(result)
      setCompareSummary(result.summary)
      setNotice('Roadmap compared with repository evidence.')
    } catch (caught) {
      setCompareError(caught.message || 'Failed to compare roadmap with repository.')
    } finally {
      setComparing(false)
    }
  }

  function handleInspectTask(item, taskAssessment) {
    setInspectedTaskItem(item)
    setInspectedTaskAssessment(taskAssessment || assessment?.task_assessments?.[item.id] || null)
    setTaskAiExplanation(null)
  }

  async function handleSaveTaskCorrection(taskId, payload) {
    if (!project?.id) return
    const updated = await correctTaskAssessment(project.id, taskId, payload)
    setAssessment(updated)
    setInspectedTaskAssessment(updated.task_assessments?.[taskId] || null)
    if (compareSummary) setCompareSummary(updated.summary)
  }

  async function handleExplainWithAI(item, taskAssessment) {
    if (explainingAI) return
    setExplainingAI(true)
    try {
      const response = await explainTaskAssessment({
        repository: connectedRepo?.repo_full_name || `${connectedRepo?.repo_owner}/${connectedRepo?.repo_name}`,
        task: item.task,
        assessment: taskAssessment,
      })
      setTaskAiExplanation(response.explanation)
    } catch (caught) {
      setNotice(`Gemini explanation note: ${caught.message || 'Could not explain finding.'}`)
    } finally {
      setExplainingAI(false)
    }
  }

  // Generation status polling
  useEffect(() => {
    if (!project?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(project.id)) return undefined
    let active = true
    let timer
    const poll = async () => {
      try {
        let state = await getIdeaStageGeneration(project.id, 'flight_plan')
        if (!active) return
        if (state.status === 'not_started' && !hasActionableFlightPlan(project.workflow?.flight_plan) && project.workflow?.feasibility) {
          state = await queueIdeaStageGeneration({ projectId: project.id, stage: 'flight_plan' })
        }
        if (!active) return
        setGenerationStatus(state.status)
        setGenerationError(state.error || '')
        if (state.status === 'completed' && state.result && !state.manually_edited && JSON.stringify(project.workflow?.flight_plan || null) !== JSON.stringify(state.result)) {
          const updated = updateSavedProject(project.id, current => ({ ...current, workflow: { ...current.workflow, flight_plan: state.result } }))
          if (updated) setProjects(current => current.map(item => item.id === updated.id ? updated : item))
        }
        if (['queued', 'generating'].includes(state.status)) timer = setTimeout(poll, 1800)
      } catch {
        if (active) timer = setTimeout(poll, 5000)
      }
    }
    void poll()
    return () => { active = false; clearTimeout(timer) }
  }, [project?.id, generationStatus])

  const milestones = normalizeMilestones(flightPlan)
  const completed = project?.flightPlanProgress || project?.workflow?.flightPlanProgress || []
  const allTasks = milestones.flatMap((milestone, milestoneIndex) =>
    milestone.tasks.map((task, taskIndex) => ({
      id: `${milestoneIndex}-${taskIndex}`,
      task,
      milestone: milestone.title,
      milestoneIndex,
      taskIndex,
    }))
  )

  useEffect(() => {
    if (!requestedTask || !project?.id || requestedProject !== String(project.id)) return
    const match = allTasks.find(item => item.id === requestedTask)
    if (!match) return
    setSelectedMilestone(match.milestoneIndex)
    setView('tasks')
    requestAnimationFrame(() => document.getElementById('fp-task-return-target')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [project?.id, requestedTask])

  // Task Progress Computations
  const doneCount = allTasks.filter(task => completed.includes(task.id)).length
  const percent = allTasks.length ? Math.round((doneCount / allTasks.length) * 100) : 0

  function dependencyBlocked(taskItem) {
    return (taskItem.task.dependencies || []).some(dependency => {
      const match = allTasks.find(item => item.task.title === dependency)
      return !match || !completed.includes(match.id)
    })
  }

  // Task counts
  const overdueCount = allTasks.filter(t => isTaskOverdue(t.task, completed.includes(t.id))).length
  const blockedCount = allTasks.filter(t => !completed.includes(t.id) && dependencyBlocked(t)).length
  const inProgressCount = allTasks.filter(t => !completed.includes(t.id) && !dependencyBlocked(t) && !isTaskOverdue(t.task, false)).length

  const taskAssessmentsMap = assessment?.task_assessments || {}
  const evidenceCount = allTasks.filter(t => {
    const st = taskAssessmentsMap[t.id]?.status
    return st === 'evidence_found' || st === 'partially_implemented'
  }).length
  const evidencePercent = allTasks.length ? Math.round((evidenceCount / allTasks.length) * 100) : 0

  const verifiedCount = allTasks.filter(t => taskAssessmentsMap[t.id]?.status === 'verified').length
  const verifiedPercent = allTasks.length ? Math.round((verifiedCount / allTasks.length) * 100) : 0
  const unverifiedCount = allTasks.filter(t => {
    const st = taskAssessmentsMap[t.id]?.status
    return st === 'manual_review' || st === 'mismatch_detected'
  }).length

  const availableRoles = useMemo(() => {
    const roles = new Set()
    allTasks.forEach(item => {
      if (item.task?.suggested_role) roles.add(item.task.suggested_role)
    })
    return Array.from(roles)
  }, [allTasks])

  const currentMilestoneIndex = milestones.findIndex((milestone, index) => {
    const tasks = allTasks.filter(task => task.milestoneIndex === index)
    return !tasks.length || !tasks.every(task => completed.includes(task.id))
  })
  const completedMilestones = milestones.filter((_, index) =>
    allTasks.some(task => task.milestoneIndex === index) &&
    allTasks.filter(task => task.milestoneIndex === index).every(task => completed.includes(task.id))
  ).length
  const currentMilestone = currentMilestoneIndex >= 0 ? milestones[currentMilestoneIndex]?.title : ''
  const activeMilestoneIndex = Math.min(selectedMilestone, Math.max(milestones.length - 1, 0))
  const activeMilestone = milestones[activeMilestoneIndex]

  function milestoneStatus(index) {
    const milestoneTasks = allTasks.filter(task => task.milestoneIndex === index)
    if (milestoneTasks.length && milestoneTasks.every(task => completed.includes(task.id))) return 'completed'

    const mTarget = milestones[index]?.target_date ? new Date(milestones[index].target_date) : null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const hasOverdueTask = milestoneTasks.some(t => isTaskOverdue(t.task, completed.includes(t.id)))
    if (hasOverdueTask || (mTarget && mTarget < today)) return 'overdue'

    const hasBlocked = milestoneTasks.some(t => !completed.includes(t.id) && dependencyBlocked(t))
    if (hasBlocked && milestoneTasks.every(t => completed.includes(t.id) || dependencyBlocked(t))) {
      return 'blocked'
    }

    if (index === currentMilestoneIndex) {
      if (hasBlocked) return 'at-risk'
      return 'active'
    }
    if (index < currentMilestoneIndex) return 'at-risk'
    return 'upcoming'
  }

  function taskLocked(item) {
    // Only lock if an explicit dependency within the project is uncompleted, never lock simply because it's in an upcoming milestone
    return !completed.includes(item.id) && dependencyBlocked(item)
  }

  function persistPlan(nextPlan, progress = completed, editedStages = []) {
    if (!project) return
    const updated = updateSavedProject(project.id, current => ({
      ...current,
      workflow: { ...current.workflow, flight_plan: nextPlan, flightPlanProgress: progress },
      flightPlanProgress: progress,
    }))
    if (updated) setProjects(current => current.map(item => item.id === updated.id ? updated : item))
    if (updated?.idea && updated?.understanding) {
      void saveProjectDraft(
        {
          projectId: updated.id,
          idea: updated.idea,
          projectType: updated.category,
          attachment: updated.attachment,
          startDate: updated.startDate || updated.start_date,
          deadline: updated.deadline,
          teamSize: updated.teamSize || updated.team_size,
          weeklyHours: updated.weeklyHours || updated.weekly_hours,
          scheduleMetadata: updated.scheduleMetadata || updated.schedule_metadata,
        },
        updated.understanding,
        updated.workflow || {},
        'flight_plan',
        editedStages
      ).catch(() => { })
    }
  }

  function toggleTask(taskId) {
    const next = completed.includes(taskId) ? completed.filter(id => id !== taskId) : [...completed, taskId]
    persistPlan(flightPlan, next)
    const roadmapTask = allTasks.find(item => item.id === taskId)
    if (project?.id && roadmapTask) {
      void getTeamWorkspace(project.id).then(workspace => {
        const sharedTask = workspace.tasks.find(item => item.source_position === taskId)
        if (sharedTask) return updateTeamTask(project.id, sharedTask.id, { status: next.includes(taskId) ? 'completed' : 'not_started' })
        return null
      }).catch(() => { })
    }
  }

  function openEditor() {
    const source = structuredClone(flightPlan)
    source.milestones = (source.milestones || []).map((milestone, milestoneIndex) => ({
      ...milestone,
      _fpMilestoneId: `milestone-${milestoneIndex}`,
      tasks: (milestone.tasks || []).map((task, taskIndex) => ({
        ...emptyTask(),
        ...(typeof task === 'string' ? { title: task } : task),
        _fpId: `${milestoneIndex}-${taskIndex}`,
      })),
    }))
    editorBaselineRef.current = structuredClone(source)
    setEditorPlan(source)
    setEditorError('')
    setEditing(true)
  }

  function closeEditor(confirmDiscard = true) {
    if (confirmDiscard && editorPlan && JSON.stringify(editorPlan) !== JSON.stringify(editorBaselineRef.current) && !window.confirm('Discard your unsaved roadmap edits?')) return
    setEditing(false)
    setEditorPlan(null)
    editorBaselineRef.current = null
    setEditorError('')
  }

  function saveEditor() {
    if (editorPlan.milestones.some(milestone => !milestone.title?.trim())) {
      setEditorError('Give every milestone a name before saving.')
      return
    }
    if (editorPlan.milestones.some(milestone => milestone.tasks.some(task => !task.title?.trim()))) {
      setEditorError('Give every task a name or remove it before saving.')
      return
    }
    const nextProgress = []
    const nextPlan = {
      ...editorPlan,
      milestones: editorPlan.milestones.map((milestone, milestoneIndex) => ({
        ...Object.fromEntries(Object.entries(milestone).filter(([key]) => key !== '_fpMilestoneId')),
        tasks: milestone.tasks.map((task, taskIndex) => {
          if (completed.includes(task._fpId)) nextProgress.push(`${milestoneIndex}-${taskIndex}`)
          return Object.fromEntries(Object.entries(task).filter(([key]) => key !== '_fpId'))
        }),
      })),
    }
    persistPlan(nextPlan, nextProgress, ['flight_plan'])
    closeEditor(false)
    setNotice('Roadmap changes saved.')
    setError('')
  }

  async function replan(explicitTiming = null) {
    if (!project?.idea || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        completed_task_ids: completed,
        deadline: explicitTiming?.deadline || project.deadline || flightPlan.deadline || null,
        start_date: explicitTiming?.startDate || project.startDate || project.start_date || new Date().toISOString().slice(0, 10),
        team_size: explicitTiming?.teamSize || project.teamSize || project.team_size || 1,
        weekly_hours: explicitTiming?.weeklyHours || project.weeklyHours || project.weekly_hours || 20,
      }

      let replanResponse = null
      if (project.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(project.id)) {
        try {
          replanResponse = await replanProjectRoadmap(project.id, payload)
        } catch (backendErr) {
          console.warn('Backend replan endpoint issue, trying fallback generator:', backendErr)
        }
      }

      if (replanResponse && replanResponse.proposed_plan) {
        setProposedPlan({
          ...replanResponse.proposed_plan,
          _comparison: replanResponse.comparison,
        })
        setReplanComparison(replanResponse.comparison || null)
        setDiffDrawerOpen(true)
      } else {
        const response = await generateIdeaStage({
          stage: 'flight_plan',
          draft: {
            idea: project.idea,
            projectType: project.category || 'Personal Project',
            projectId: project.id,
            deadline: payload.deadline,
            startDate: payload.start_date,
            teamSize: payload.team_size,
            weeklyHours: payload.weekly_hours,
          },
          projectDetails: {
            understanding: project.understanding || {},
            flight_plan: flightPlan,
            completed_task_ids: completed,
          },
        })
        if (!hasActionableFlightPlan(response.result)) {
          throw new Error('The AI response did not include usable milestones and tasks. Your current plan is unchanged.')
        }
        setProposedPlan(response.result)
        setDiffDrawerOpen(true)
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not replan right now. Your current plan is unchanged.')
    } finally {
      setBusy(false)
    }
  }

  async function retryRoadmapGeneration() {
    if (!project?.id || busy) return
    setBusy(true)
    try {
      const state = await queueIdeaStageGeneration({ projectId: project.id, stage: 'flight_plan', retry: true })
      setGenerationStatus(state.status)
      setGenerationError(state.error || '')
    } catch (requestError) {
      setGenerationError(requestError.message || 'Could not retry roadmap preparation.')
    } finally {
      setBusy(false)
    }
  }

  function approveReplan() {
    if (!proposedPlan) return
    const { _comparison, ...cleanPlan } = proposedPlan
    // Preserve completed tasks
    persistPlan(cleanPlan, completed, ['flight_plan'])
    setProposedPlan(null)
    setNotice('Revised deadline-aware roadmap applied. Progress and completed tasks were preserved.')
    setError('')
    setSelectedMilestone(0)
  }

  async function handleSaveTiming(newTiming) {
    if (!project) return false
    const updated = {
      ...project,
      startDate: newTiming.startDate,
      deadline: newTiming.deadline,
      teamSize: newTiming.teamSize,
      weeklyHours: newTiming.weeklyHours,
      workflow: {
        ...project.workflow,
        flight_plan: {
          ...project.workflow?.flight_plan,
          start_date: newTiming.startDate,
          deadline: newTiming.deadline,
        },
      },
    }
    try {
      await saveProjectDraft({
        projectId: updated.id, idea: updated.idea, projectType: updated.category,
        attachment: updated.attachment, startDate: newTiming.startDate, deadline: newTiming.deadline,
        teamSize: newTiming.teamSize, weeklyHours: newTiming.weeklyHours,
      }, updated.understanding || {}, updated.workflow || {}, 'flight_plan', [])
    } catch (saveError) {
      setError(saveError.assigned_tasks?.length
        ? `Reassign ${saveError.assigned_tasks.map(task => task.title).join(', ')} from members who would be removed before reducing team size.`
        : saveError.message || 'Could not save project timing to the server.')
      return false
    }
    updateSavedProject(project.id, updated)
    setProjects(current => current.map(item => item.id === updated.id ? updated : item))
    setTimingModalOpen(false)
    setNotice('Project deadline and capacity updated.')
    setError('')
    return true
  }

  async function handleSaveAndReplanTiming(newTiming) {
    if (await handleSaveTiming(newTiming)) void replan(newTiming)
  }

  // ─── Google Calendar Automatic Sync & Direct Browser Link ─────────────────
  function openGoogleCalendar() {
    if (!project || !milestones.length) {
      setNotice('No milestones scheduled to sync yet.')
      return
    }
    // Find upcoming milestone or fallback to first
    const upcoming = milestones.find(ms => ms.target_date && new Date(ms.target_date) >= new Date()) || milestones[0]
    const title = encodeURIComponent(`🎯 [${project?.name || 'Project'}] ${upcoming?.title || 'Launch Milestone'}`)
    const targetDate = upcoming?.target_date || new Date().toISOString().slice(0, 10)
    const dateFormatted = targetDate.replace(/-/g, '')
    const desc = encodeURIComponent(
      `Milestone: ${upcoming?.title || ''}\nCategory: ${upcoming?.category || 'Sprint Checkpoint'}\nGoal: ${upcoming?.purpose || upcoming?.outcome || 'Deliver milestone on track'}\nProject: ${project?.name || ''}\n\nManaged automatically via UDAAN Studio`
    )
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateFormatted}/${dateFormatted}&details=${desc}`

    // Automatically record sync in local developer settings
    try {
      const stored = localStorage.getItem('udaan:calendar_synced_at')
      localStorage.setItem('udaan:calendar_synced_at', new Date().toISOString())
    } catch { }

    window.open(gcalUrl, '_blank', 'noopener,noreferrer')
    setNotice(`Opened "${upcoming.title}" in Google Calendar. No file downloads needed!`)
    setTimeout(() => setNotice(''), 4000)
  }

  function exportToGoogleCalendar() {
    openGoogleCalendar()
  }

  // ─── Notification helpers ──────────────────────────────────────────────────
  const notifications = useMemo(() => {
    const notifs = []
    allTasks.forEach(item => {
      const isDone = completed.includes(item.id)
      if (isDone) return
      const overdue = isTaskOverdue(item.task, false)
      if (overdue) {
        notifs.push({ type: 'overdue', id: item.id, title: item.task.title, milestone: item.milestone, date: item.task.target_date })
        return
      }
      // Due within 3 days
      if (item.task.target_date) {
        const daysInfo = getDaysRemaining(item.task.target_date)
        if (daysInfo && !daysInfo.isOverdue && daysInfo.days <= 3) {
          notifs.push({ type: 'due_soon', id: item.id, title: item.task.title, milestone: item.milestone, date: item.task.target_date, days: daysInfo.days })
        }
      }
    })
    // Milestone approaching
    milestones.forEach((ms, idx) => {
      if (!ms.target_date) return
      const milestoneTasks = allTasks.filter(t => t.milestoneIndex === idx)
      const allDone = milestoneTasks.length && milestoneTasks.every(t => completed.includes(t.id))
      if (allDone) return
      const daysInfo = getDaysRemaining(ms.target_date)
      if (daysInfo && !daysInfo.isOverdue && daysInfo.days <= 7) {
        notifs.push({ type: 'milestone_due', id: `ms-${idx}`, title: ms.title, date: ms.target_date, days: daysInfo.days })
      }
    })
    return notifs
  }, [allTasks, completed, milestones])

  // ─── Filtered and Sorted tasks for Timeline / Task List View ──────────────
  const sortedAndFilteredTasks = useMemo(() => {
    let tasks = [...allTasks]

    // Sort by target_date ascending, placing tasks without dates at the end
    tasks.sort((a, b) => {
      const dateA = a.task.target_date ? new Date(a.task.target_date).getTime() : Infinity
      const dateB = b.task.target_date ? new Date(b.task.target_date).getTime() : Infinity
      return dateA - dateB
    })

    return tasks.filter(item => {
      const isDone = completed.includes(item.id)
      const overdue = isTaskOverdue(item.task, isDone)
      const locked = taskLocked(item)

      // Status filter
      if (statusFilter === 'done' && !isDone) return false
      if (statusFilter === 'todo' && isDone) return false
      if (statusFilter === 'overdue' && !overdue) return false
      if (statusFilter === 'blocked' && (!locked || isDone)) return false
      if (statusFilter === 'in_progress' && (isDone || locked || overdue)) return false

      // Priority filter
      if (priorityFilter !== 'all' && (item.task.priority || 'medium').toLowerCase() !== priorityFilter) {
        return false
      }

      // Milestone filter
      if (milestoneFilter !== 'all' && String(item.milestoneIndex) !== milestoneFilter) {
        return false
      }

      // Person / Team member role filter
      if (personFilter !== 'all') {
        const itemRole = (item.task?.suggested_role || '').toLowerCase()
        const targetRole = personFilter.toLowerCase()
        if (!itemRole.includes(targetRole) && !targetRole.includes(itemRole)) {
          return false
        }
      }

      return true
    })
  }, [allTasks, completed, statusFilter, priorityFilter, milestoneFilter, personFilter])

  return (
    <div className="min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans'] fp-page">
      <Sidebar activePage="flight-plan" open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header
          currentProject={project}
          onToggleMobileMenu={() => setMenuOpen(!menuOpen)}
          onProjectSelect={(p) => {
            setSelectedId(p.id)
            setSelectedMilestone(0)
            setNotice('')
            setError('')
          }}
        />

        <main className="ud-main fp-main">
          <div className="fp-content">
            {!project ? (
              <section className="fp-empty">
                <span className="fp-empty-icon"><Route size={22} /></span>
                <p className="fp-eyebrow">YOUR NEXT STEPS</p>
                <h1>Your flight plan starts with an idea.</h1>
                <p>Shape a project first and UDAAN will help you turn it into milestones and practical tasks.</p>
                <Link className="fp-primary" to="/">Start a project <ArrowRight size={16} /></Link>
              </section>
            ) : (
              <>
                <div className="fp-project-switch">
                  <div className="flex items-center gap-2">
                    <span className="fp-eyebrow">YOUR WORKSPACE</span>
                    <button
                      type="button"
                      onClick={() => setCreativeBriefModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#EFEAE4] text-[11px] font-bold text-[#8E4B49] hover:bg-[#F9F2ED] transition-colors shadow-xs cursor-pointer ml-3"
                    >
                      <Sparkles size={13} />
                      <span>Creative Brief</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddTaskModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1D1B18] text-white text-[11px] font-bold hover:bg-black transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Task</span>
                    </button>
                  </div>
                  <label className="fp-project-select">
                    <span className="sr-only">Choose a project</span>
                    <select
                      value={project.id}
                      onChange={event => {
                        setSelectedId(event.target.value)
                        setSelectedMilestone(0)
                        setNotice('')
                        setError('')
                      }}
                    >
                      {projectsWithPlans.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <ChevronDown size={15} />
                  </label>
                </div>

                {/* Section 1: Connected Repository Panel */}
                <ConnectedRepositoryPanel
                  repository={connectedRepo}
                  syncing={repoSyncing}
                  comparing={comparing}
                  onSync={handleSyncRepository}
                  onCompare={handleCompareWithRepository}
                  error={compareError}
                  projectId={project.id}
                />

                {/* Comparison Summary Banner */}
                {compareSummary && (
                  <ComparisonSummaryBanner
                    summary={compareSummary}
                    onClose={() => setCompareSummary(null)}
                  />
                )}

                {/* Section 2: Roadmap Header with Deadline, Status Breakdown & Timeline Progress */}
                <RoadmapHeader
                  project={project}
                  description={flightPlan.summary}
                  percent={percent}
                  doneCount={doneCount}
                  taskCount={allTasks.length}
                  inProgressCount={inProgressCount}
                  blockedCount={blockedCount}
                  overdueCount={overdueCount}
                  unverifiedCount={unverifiedCount}
                  milestones={milestones.length}
                  completedMilestones={completedMilestones}
                  activeMilestone={currentMilestone}
                  onEdit={editing ? () => closeEditor() : openEditor}
                  editing={editing}
                  evidenceCount={evidenceCount}
                  evidencePercent={evidencePercent}
                  verifiedCount={verifiedCount}
                  verifiedPercent={verifiedPercent}
                  onReplan={() => replan()}
                  replanBusy={busy}
                  onOpenTimingEdit={() => setTimingModalOpen(true)}
                />

                {['queued', 'generating'].includes(generationStatus) && (
                  <div className="fp-message" role="status">
                    <MiniLoader color="#8E4B49" className="mr-1" />{' '}
                    {hasActionableFlightPlan(project.workflow?.flight_plan)
                      ? 'Your saved roadmap remains available while UDAAN prepares an updated flight plan.'
                      : 'UDAAN is preparing your roadmap in the background.'}
                  </div>
                )}

                {generationStatus === 'failed' && (
                  <div className="fp-message error" role="status">
                    <span>{generationError || 'Roadmap preparation failed. Your saved roadmap is still available.'}</span>
                    <button type="button" className="fp-replan-button" onClick={retryRoadmapGeneration} disabled={busy}>
                      {busy ? 'Retrying…' : 'Retry'}
                    </button>
                  </div>
                )}

                {!editing && (
                  <section className="fp-overview-controls">
                    <div className="fp-view-toggle" role="tablist" aria-label="Roadmap view selection">
                      <button
                        role="tab"
                        aria-selected={view === 'flowmap' || view === 'roadmap'}
                        className={(view === 'flowmap' || view === 'roadmap') ? 'active' : ''}
                        onClick={() => setView('flowmap')}
                      >
                        <Route size={15} /> Flow Map (Milestones)
                      </button>
                      <button
                        role="tab"
                        aria-selected={view === 'radar'}
                        className={view === 'radar' ? 'active' : ''}
                        onClick={() => setView('radar')}
                      >
                        <Compass size={15} /> Market Radar
                      </button>
                      <button
                        role="tab"
                        aria-selected={view === 'timeline' || view === 'tasks'}
                        className={(view === 'timeline' || view === 'tasks') ? 'active' : ''}
                        onClick={() => setView('timeline')}
                      >
                        <CalendarClock size={15} /> Gantt & Timeline
                      </button>
                    </div>

                    <div className="fp-controls-right-actions">
                      {historyStack.length > 0 && (
                        <button
                          className="fp-undo-btn"
                          type="button"
                          onClick={handleUndoReplan}
                          title="Undo last AI roadmap adjustment (Heuristic #3: User Control & Freedom)"
                        >
                          <Undo2 size={13} /> Undo Replan
                        </button>
                      )}

                      <button
                        className="fp-timing-quick-btn"
                        type="button"
                        onClick={() => setTimingModalOpen(true)}
                        title="Edit project deadline and weekly capacity"
                      >
                        <CalendarClock size={14} /> Adjust Schedule
                      </button>

                      <button className="fp-replan-button" type="button" onClick={() => replan()} disabled={busy || !project.idea}>
                        {busy ? <MiniLoader color="#8E4B49" className="mr-0.5" /> : <Sparkles size={15} />}
                        {busy ? 'Replanning…' : 'Replan with AI'}
                      </button>
                    </div>
                  </section>
                )}

                {error && <div className="fp-message error" role="alert">{error}</div>}
                {notice && <div className="fp-message" role="status"><CheckCircle2 size={16} />{notice}</div>}

                {editing && editorPlan ? (
                  <RoadmapEditor
                    plan={editorPlan}
                    onChange={setEditorPlan}
                    onCancel={() => closeEditor()}
                    onSave={saveEditor}
                    error={editorError}
                    completedTasks={completed}
                  />
                ) : (view === 'flowmap' || view === 'roadmap') ? (
                  <div className="space-y-4">
                    {/* Team Member / Person Feature Roadmap Strip */}
                    <TeamMemberRoadmapStrip
                      roles={availableRoles}
                      allTasks={allTasks}
                      completed={completed}
                      selectedRole={personFilter}
                      onSelectRole={setPersonFilter}
                    />

                    {personFilter !== 'all' && (
                      <div
                        className="fp-person-active-banner p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                        style={{
                          backgroundColor: getRoleConfig(personFilter).bg,
                          border: `1.5px solid ${getRoleConfig(personFilter).border}`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={getRoleConfig(personFilter).avatar}
                            alt={personFilter}
                            className="w-11 h-11 rounded-full object-cover border-2 shadow-xs shrink-0"
                            style={{ borderColor: getRoleConfig(personFilter).color }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                style={{ background: getRoleConfig(personFilter).badgeBg, color: getRoleConfig(personFilter).accent }}
                              >
                                Filtered by Role
                              </span>
                              <span className="text-sm font-bold text-[#1D1B18]">{personFilter}</span>
                            </div>
                            <p className="text-xs text-[#534342] m-0 mt-0.5">
                              Showing deliverables and colored cards specifically assigned to <b>{personFilter}</b>.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPersonFilter('all')}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-[#1D1B18] border border-[#E5E7EB] hover:bg-[#F9FAFB] shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <X size={13} /> Show All Members
                        </button>
                      </div>
                    )}

                    <div className="fp-roadmap-layout">
                      <div className="fp-roadmap" aria-label="Project milestones">
                        {milestones.length ? (
                          <>
                            <svg
                              className="fp-winding-path"
                              aria-hidden="true"
                              viewBox={`0 0 100 ${Math.max(160, milestones.length * 170 - 10)}`}
                              preserveAspectRatio="none"
                            >
                              <path
                                d={milestones
                                  .map((_, index) => {
                                    const center = 80 + index * 170
                                    if (index === 0) return `M 50 ${center}`
                                    const previous = center - 170
                                    const side = index % 2 ? 1 : -1
                                    return `C ${50 + side * 14} ${previous + 50}, ${50 - side * 14} ${center - 50}, 50 ${center}`
                                  })
                                  .join(' ')}
                              />
                            </svg>

                            {milestones.map((milestone, index) => {
                              const milestoneTasks = allTasks.filter(item => item.milestoneIndex === index)
                              const milestoneDone = milestoneTasks.filter(item => completed.includes(item.id)).length
                              const progress = milestoneTasks.length ? Math.round((milestoneDone / milestoneTasks.length) * 100) : 0
                              const milestoneAssessment = assessment?.milestone_assessments?.[String(index)]

                              return (
                                <RoadmapNode
                                  key={`${milestone.title}-${index}`}
                                  milestone={milestone}
                                  index={index}
                                  status={milestoneStatus(index)}
                                  completedCount={milestoneDone}
                                  taskCount={milestoneTasks.length}
                                  progress={progress}
                                  selected={activeMilestoneIndex === index}
                                  onSelect={() => setSelectedMilestone(index)}
                                  milestoneAssessment={milestoneAssessment}
                                />
                              )
                            })}
                          </>
                        ) : (
                          <div className="fp-no-plan">No milestones yet. Add one in Edit Roadmap to map the next steps.</div>
                        )}
                      </div>

                      {activeMilestone ? (
                        <aside className="fp-milestone-panel" aria-live="polite">
                          <div className="fp-panel-header">
                            <div>
                              <span className="fp-eyebrow">MILESTONE {String(activeMilestoneIndex + 1).padStart(2, '0')}</span>
                              <h2>{activeMilestone.title}</h2>
                            </div>
                            <span className={`fp-status ${milestoneStatus(activeMilestoneIndex)}`}>
                              {milestoneStatus(activeMilestoneIndex).replace('-', ' ')}
                            </span>
                          </div>

                          {/* Milestone Schedule Bar */}
                          <div className="fp-panel-schedule-bar">
                            <div className="fp-panel-date-col">
                              <Calendar size={12} />
                              <span>
                                {activeMilestone.start_date ? formatDisplayDate(activeMilestone.start_date) : 'Start'}
                                {' → '}
                                <b>{activeMilestone.target_date ? formatDisplayDate(activeMilestone.target_date) : 'Target date'}</b>
                              </span>
                            </div>
                            {activeMilestone.target_date && (
                              <span className={`fp-panel-days-pill ${getDaysRemaining(activeMilestone.target_date)?.isOverdue ? 'overdue' : 'normal'}`}>
                                {getDaysRemaining(activeMilestone.target_date)?.label}
                              </span>
                            )}
                          </div>

                          {activeMilestone.purpose && (
                            <div className="fp-panel-purpose">
                              <b>Milestone Purpose:</b> {activeMilestone.purpose}
                            </div>
                          )}

                          <p className="fp-panel-category">{activeMilestone.category}</p>
                          {activeMilestone.outcome && <p className="fp-panel-outcome">{activeMilestone.outcome}</p>}

                          {/* Warnings for overdue or blocked work in this milestone */}
                          {allTasks.filter(item => item.milestoneIndex === activeMilestoneIndex && isTaskOverdue(item.task, completed.includes(item.id))).length > 0 && (
                            <div className="fp-panel-warning overdue">
                              <AlertTriangle size={13} />
                              <span>Tasks in this milestone are past their target completion date.</span>
                            </div>
                          )}

                          {/* Person-by-Person Roadmap / Role Filter */}
                          <div className="fp-panel-task-heading flex-col items-start gap-2 border-b border-[#ECE7E1] pb-3 mb-3">
                            <div className="flex items-center justify-between w-full">
                              <h3>Tasks</h3>
                              <span>
                                {allTasks.filter(item => item.milestoneIndex === activeMilestoneIndex && completed.includes(item.id)).length} /{' '}
                                {allTasks.filter(item => item.milestoneIndex === activeMilestoneIndex).length} complete
                              </span>
                            </div>

                            {availableRoles.length > 0 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto w-full pt-1 pb-0.5">
                                <span className="text-[10px] font-bold text-[#8C847E] shrink-0 uppercase tracking-wider mr-1">Role:</span>
                                <button
                                  type="button"
                                  onClick={() => setPersonFilter('all')}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${personFilter === 'all'
                                    ? 'bg-[#1D1B18] text-white shadow-xs'
                                    : 'bg-[#F4EFEA] text-[#534342] hover:bg-[#EAE4DC]'
                                    }`}
                                >
                                  All Roles ({allTasks.filter(item => item.milestoneIndex === activeMilestoneIndex).length})
                                </button>
                                {availableRoles.map(role => {
                                  const countForRole = allTasks.filter(item => item.milestoneIndex === activeMilestoneIndex && item.task?.suggested_role === role).length
                                  if (countForRole === 0) return null
                                  return (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => setPersonFilter(role)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${personFilter === role
                                        ? 'bg-[#1D1B18] text-white shadow-xs'
                                        : 'bg-[#F4EFEA] text-[#534342] hover:bg-[#EAE4DC]'
                                        }`}
                                    >
                                      {role} ({countForRole})
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          <div className="fp-panel-tasks">
                            {allTasks
                              .filter(item => item.milestoneIndex === activeMilestoneIndex)
                              .filter(item => personFilter === 'all' || item.task?.suggested_role === personFilter)
                              .map(item => (
                                <TaskRow
                                  key={item.id}
                                  item={item}
                                  projectId={project.id}
                                  highlight={item.id === requestedTask}
                                  done={completed.includes(item.id)}
                                  locked={taskLocked(item)}
                                  onToggle={() => toggleTask(item.id)}
                                  assessment={assessment?.task_assessments?.[item.id]}
                                  onInspect={handleInspectTask}
                                  onOpenWorkbench={handleOpenWorkbench}
                                />
                              ))}
                            {!activeMilestone.tasks.length && <p className="fp-no-tasks">No tasks have been added yet.</p>}
                          </div>

                          <button type="button" className="fp-panel-edit" onClick={openEditor}>
                            <Pencil size={14} /> Edit milestone and tasks
                          </button>
                        </aside>
                      ) : (
                        <aside className="fp-milestone-panel fp-empty-panel">
                          <Compass size={22} />
                          <h2>Your roadmap is ready to shape</h2>
                          <p>Add milestones in Edit Roadmap, then explore them here as you build.</p>
                          <button type="button" className="fp-save-button" onClick={openEditor}>
                            <Pencil size={14} /> Edit Roadmap
                          </button>
                        </aside>
                      )}
                    </div>
                  </div>
                ) : view === 'radar' ? (
                  <MarketRadarView
                    radarData={effectiveMarketRadar}
                    onAddExperiment={handleAddExperiment}
                    addingExperimentId={addingExpId}
                  />
                ) : (
                  <section className="fp-task-list-view">
                    <header className="fp-task-list-heading">
                      <div>
                        <span className="fp-eyebrow">CHRONOLOGICAL SCHEDULE</span>
                        <h2>Timeline & Tasks</h2>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#748278' }}>
                          Sorted by target completion date with automatic sprint pacing and role-specific deliverables.
                        </p>
                      </div>
                      <span className="fp-task-count-pill">{sortedAndFilteredTasks.length} tasks matching</span>
                    </header>

                    {/* Automatic Milestone Sprint Gantt Timeline Visualizer */}
                    <MilestoneGanttTimeline
                      milestones={milestones}
                      allTasks={allTasks}
                      completed={completed}
                      personFilter={personFilter}
                      onSelectTask={handleOpenWorkbench}
                    />

                    <div className="fp-task-filters">
                      <label>
                        <span>Team Member</span>
                        <select value={personFilter} onChange={event => setPersonFilter(event.target.value)}>
                          <option value="all">All Team Members</option>
                          {availableRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Status</span>
                        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                          <option value="all">All statuses</option>
                          <option value="todo">To do</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                          <option value="overdue">Overdue only</option>
                          <option value="blocked">Blocked only</option>
                        </select>
                      </label>
                      <label>
                        <span>Priority</span>
                        <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}>
                          <option value="all">All priorities</option>
                          <option value="high">High priority</option>
                          <option value="medium">Medium priority</option>
                          <option value="low">Low priority</option>
                        </select>
                      </label>
                      <label>
                        <span>Milestone</span>
                        <select value={milestoneFilter} onChange={event => setMilestoneFilter(event.target.value)}>
                          <option value="all">All milestones</option>
                          {milestones.map((milestone, index) => (
                            <option key={`${index}-${milestone.title}`} value={index}>
                              {index + 1}. {milestone.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="fp-all-tasks">
                      {sortedAndFilteredTasks.length ? (
                        sortedAndFilteredTasks.map(item => (
                          <TaskRow
                            key={item.id}
                            item={item}
                            projectId={project.id}
                            highlight={item.id === requestedTask}
                            done={completed.includes(item.id)}
                            locked={taskLocked(item)}
                            onToggle={() => toggleTask(item.id)}
                            showMilestone
                            assessment={assessment?.task_assessments?.[item.id]}
                            onInspect={handleInspectTask}
                            onOpenWorkbench={handleOpenWorkbench}
                          />
                        ))
                      ) : (
                        <div className="fp-no-plan">No tasks match these filters.</div>
                      )}
                    </div>
                  </section>
                )}

                <div className="fp-footer-note">
                  <RefreshCw size={14} />Progress and schedule assessments are saved automatically.
                </div>
              </>
            )}
          </div>
        </main>

        {/* Task Workbench Drawer */}
        <TaskWorkbenchDrawer
          isOpen={Boolean(workbenchTask)}
          onClose={() => setWorkbenchTask(null)}
          task={workbenchTask}
          milestoneTitle={workbenchMilestoneTitle}
          onToggleStep={(stepIdx) => {
            if (!workbenchTask) return
            const updatedSteps = (workbenchTask.steps || []).map((s, idx) =>
              idx === stepIdx ? { ...s, done: !s.done } : s
            )
            const updatedTask = { ...workbenchTask, steps: updatedSteps }
            setWorkbenchTask(updatedTask)
            const updatedMilestones = (flightPlan.milestones || []).map(m => ({
              ...m,
              tasks: (m.tasks || []).map(t => (t.id === updatedTask.id || t.title === updatedTask.title) ? updatedTask : t)
            }))
            persistPlan({ ...flightPlan, milestones: updatedMilestones }, completed, ['flight_plan'])
          }}
          onVerifyTask={handleVerifyTask}
          isVerifying={isVerifying}
          allTasks={allTasks}
          repoAnalysis={repoAnalysis}
        />

        {/* AI Replan Diff Drawer (Heuristic #3: User Control & Freedom) */}
        <ReplanDiffDrawer
          isOpen={diffDrawerOpen}
          onClose={() => setDiffDrawerOpen(false)}
          currentPlan={flightPlan}
          proposedPlan={proposedPlan}
          comparison={replanComparison}
          onAccept={handleAcceptReplan}
          onReject={() => {
            setProposedPlan(null)
            setDiffDrawerOpen(false)
            setNotice('Proposed replan dismissed. Active roadmap unchanged.')
            setTimeout(() => setNotice(''), 3000)
          }}
          onUndo={handleUndoReplan}
          canUndo={historyStack.length > 0}
        />

        {/* Schedule & Timing Edit Modal */}
        {timingModalOpen && project && (
          <TimingEditModal
            project={project}
            onClose={() => setTimingModalOpen(false)}
            onSave={handleSaveTiming}
            onSaveAndReplan={handleSaveAndReplanTiming}
            busy={busy}
          />
        )}

        {/* Task Assessment Modal (Evidence Inspection & Human Control) */}
        {inspectedTaskItem && (
          <TaskAssessmentModal
            item={inspectedTaskItem}
            assessment={inspectedTaskAssessment}
            repository={connectedRepo}
            onClose={() => {
              setInspectedTaskItem(null)
              setInspectedTaskAssessment(null)
              setTaskAiExplanation(null)
            }}
            onSaveCorrection={handleSaveTaskCorrection}
            onExplainAI={handleExplainWithAI}
            explainingAI={explainingAI}
            aiExplanation={taskAiExplanation}
          />
        )}

        {/* Creative Brief Modal */}
        <CreativeBriefModal
          isOpen={creativeBriefModalOpen}
          onClose={() => setCreativeBriefModalOpen(false)}
          project={project}
        />

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={addTaskModalOpen}
          onClose={() => setAddTaskModalOpen(false)}
          onAddTask={handleAddNewTaskFromModal}
          projectName={project?.name}
        />

        {/* Plain English Explainer Modal */}
        <PlainEnglishExplainerModal
          isOpen={Boolean(explainerTask)}
          onClose={() => setExplainerTask(null)}
          taskTitle={explainerTask?.title}
          plainEnglish={explainerTask?.plain_english}
          analogy={explainerTask?.analogy}
        />
      </div>
    </div>
  )
}
