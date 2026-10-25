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
  UploadCloud,
  UserCheck,
  UsersRound,
  Share2,
  X,
  BookOpen,
  Cpu,
  CircleDollarSign,
  Package,
  Search,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MiniLoader } from '../components/UdaanLoader.jsx'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { INDIAN_VENDORS, searchHardwareProducts, generateBillOfMaterials } from '../services/hardwareService.js'
import AddTaskModal from '../components/modals/AddTaskModal.jsx'
import PlainEnglishExplainerModal from '../components/modals/PlainEnglishExplainerModal.jsx'
import CreativeBriefModal from '../components/modals/CreativeBriefModal.jsx'
import ProofOfWorkModal from '../components/modals/ProofOfWorkModal.jsx'
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
  const [showVerificationAudit, setShowVerificationAudit] = useState(false)
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

      {/* ─── MINIMALIST & CLEAN ROADMAP OVERVIEW ─── */}
      <section className="fp-overview fp-overview-minimal" aria-label="Roadmap progress and deadline">
        {/* Main Clean Row: Big Progress + Key Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE5]">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-[#7C766F] uppercase tracking-wider">Overall Progress</span>
              <strong className="text-2xl sm:text-3xl font-black text-[#8E4B49] tracking-tight">{percent}%</strong>
            </div>
            <div className="hidden sm:block w-px h-6 bg-[#E8E2DA]" />
            <div className="text-xs text-[#534342] font-semibold">
              <span className="text-[#1D1B18] font-bold">{doneCount}</span> of {taskCount} tasks completed
            </div>
          </div>

          {/* Right: Launch countdown badge & Verification toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {deadlineStr ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8F3] border border-[#FFAAA6]/40 text-xs font-bold text-[#7A3C3A]">
                <Calendar size={13} className="text-[#8E4B49]" />
                <span>Launch: <b>{formatDisplayDate(deadlineStr)}</b></span>
                {daysInfo && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${daysInfo.isOverdue ? 'bg-[#FEE2E2] text-[#991B1B]' : daysInfo.days <= 7 ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#D1FAE5] text-[#065F46]'
                    }`}>
                    {daysInfo.label}
                  </span>
                )}
              </div>
            ) : (
              <button type="button" className="text-xs font-bold text-[#8E4B49] hover:underline" onClick={onOpenTimingEdit}>
                + Set launch deadline
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowVerificationAudit(!showVerificationAudit)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#E5E0D8] text-xs font-bold text-[#534342] hover:bg-[#FAF8F5] transition-colors"
              title="Toggle detailed repository scan and test verification evidence"
            >
              <span>{showVerificationAudit ? 'Hide' : 'Show'} Git & Audit Details</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${showVerificationAudit ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Clean Single Progress Bar */}
        <div className="fp-progress-track my-3" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
          <span style={{ width: `${percent}%` }} />
        </div>

        {/* Quick Scannable Status Pills Strip */}
        <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-[#6D6560] pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EFEAE4] font-medium">
              <CheckCircle2 size={13} className="text-[#10B981]" />
              <b>{completedMilestones}</b> of {milestones} milestones done
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EFEAE4] font-medium">
              <Compass size={13} className="text-[#8E4B49]" />
              {activeMilestone ? `Active: ${activeMilestone}` : 'All complete'}
            </span>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] font-bold">
                <AlertTriangle size={13} /> {overdueCount} overdue
              </span>
            )}
            {blockedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] font-bold">
                <ShieldAlert size={13} /> {blockedCount} blocked
              </span>
            )}
          </div>

          {timelineProgress !== null && (
            <span className="text-[11px] text-[#7C766F] font-medium">
              Timeline: <b>{timelineProgress}%</b> elapsed{startDateStr ? ` · Started ${formatDisplayDate(startDateStr)}` : ''}
            </span>
          )}
        </div>

        {/* Collapsible Deep Verification & Git Audit (Hidden by default to keep screen minimal) */}
        {showVerificationAudit && (
          <div className="mt-4 pt-4 border-t border-[#EFEAE4] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-[#1D1B18]">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-[#8E4B49]">
                <FileCheck size={14} /> Repository Deterministic Verification & Evidence
              </span>
              <span className="text-[11px] text-[#7C766F]">Multi-track analysis</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFEAE4]">
                <div className="flex items-center justify-between text-xs font-bold text-[#1D1B18] mb-1.5">
                  <span>User Checklist</span>
                  <span>{doneCount} / {taskCount} ({percent}%)</span>
                </div>
                <div className="fp-stat-track user"><span style={{ width: `${percent}%` }} /></div>
                <span className="text-[10px] text-[#7C766F] mt-1 block">Manual checkmarks</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFEAE4]">
                <div className="flex items-center justify-between text-xs font-bold text-[#1D1B18] mb-1.5">
                  <span>Repo Evidence</span>
                  <span>{evidenceCount} / {taskCount} ({evidencePercent}%)</span>
                </div>
                <div className="fp-stat-track evidence"><span style={{ width: `${evidencePercent}%` }} /></div>
                <span className="text-[10px] text-[#7C766F] mt-1 block">Deterministic file scan</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFEAE4]">
                <div className="flex items-center justify-between text-xs font-bold text-[#1D1B18] mb-1.5">
                  <span>Workbench Verified</span>
                  <span>{verifiedCount} / {taskCount} ({verifiedPercent}%)</span>
                </div>
                <div className="fp-stat-track verified"><span style={{ width: `${verifiedPercent}%` }} /></div>
                <span className="text-[10px] text-[#7C766F] mt-1 block">Verified PR proofs & tests</span>
              </div>
            </div>
          </div>
        )}
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
    <div className="fp-team-member-strip-minimal p-3 rounded-2xl bg-white border border-[#EFEAE4] shadow-xs">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-1.5">
            <UsersRound size={14} className="text-[#8E4B49]" />
            Filter Tasks by Role:
          </span>
        </div>
        <span className="text-[11px] text-[#7C766F]">
          Select a role to focus only on their deliverables
        </span>
      </div>

      {/* Clean Compact Role Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => onSelectRole('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${selectedRole === 'all'
            ? 'bg-[#1D1B18] text-white shadow-xs'
            : 'bg-[#FAF8F5] text-[#534342] hover:bg-[#EFEAE4] border border-[#EFEAE4]'
            }`}
        >
          <span>All Roles</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${selectedRole === 'all' ? 'bg-white/20 text-white' : 'bg-[#EAE4DC] text-[#534342]'
            }`}>
            {totalCompleted}/{totalTasks}
          </span>
        </button>

        {displayRoles.map((roleName) => {
          const conf = getRoleConfig(roleName)
          const roleTasks = allTasks.filter(item => {
            const r = (item.task?.suggested_role || '').toLowerCase()
            const target = roleName.toLowerCase()
            return r.includes(target) || target.includes(r)
          })
          if (!roleTasks.length && !standardRoles.includes(roleName)) return null
          const roleDone = roleTasks.filter(item => completed.includes(item.id)).length
          const isSelected = selectedRole.toLowerCase() === roleName.toLowerCase()

          return (
            <button
              key={roleName}
              type="button"
              onClick={() => onSelectRole(isSelected ? 'all' : roleName)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${isSelected
                ? 'text-white shadow-xs border-transparent'
                : 'bg-white text-[#2D2A26] hover:bg-[#FAF8F5] border-[#E5E0D8]'
                }`}
              style={{
                backgroundColor: isSelected ? conf.color : undefined,
              }}
            >
              <img
                src={conf.avatar}
                alt={conf.short}
                className="w-4 h-4 rounded-full object-cover shrink-0"
              />
              <span>{conf.short}</span>
              <span
                className="px-1.5 py-0.2 rounded-md text-[10px] font-black"
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : conf.badgeBg,
                  color: isSelected ? '#FFFFFF' : conf.accent,
                }}
              >
                {roleDone}/{roleTasks.length}
              </span>
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
                  <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden" style={{ color: 'blue' }}>
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
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${isDone
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
  onOpenProof,
  hasProof = false,
}) {
  const task = item.task
  const priority = (task.priority || 'medium').toLowerCase()
  const statusKey = assessment?.status || 'not_assessed'
  const meta = buildStatusMeta(statusKey)
  const StatusIcon = meta.icon
  const [subtasksOpen, setSubtasksOpen] = useState(false)

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
      className={`fp-task-row fp-task-row-clean ${done ? 'is-done' : ''} ${locked ? 'is-locked' : ''} ${overdue ? 'is-overdue' : ''} ${highlight ? 'fp-task-return-highlight' : ''}`}
      style={{
        borderLeft: done ? '4px solid #10B981' : `4px solid ${roleConf.color}`,
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
        {/* Compact Header: Role Pill & Category */}
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-bold shadow-2xs"
              style={{ background: roleConf.bg, border: `1px solid ${roleConf.border}`, color: roleConf.accent }}
              title={`Role: ${task.suggested_role || roleConf.label}`}
            >
              <img src={roleConf.avatar} alt={roleConf.short} className="w-3.5 h-3.5 rounded-full object-cover" />
              <span>{task.suggested_role || roleConf.short}</span>
            </div>

            {task.category && (
              <span className="text-[10.5px] font-medium text-[#7C766F] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#EFEAE4]">
                {task.category}
              </span>
            )}

            {showMilestone && <span className="fp-task-milestone-label">{item.milestone}</span>}
          </div>

          {/* Proof Badge */}
          {hasProof && (
            <span
              onClick={() => onOpenProof?.(item)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] cursor-pointer hover:bg-[#D1FAE5] transition-colors"
              title="Click to view submitted proof or share to LinkedIn"
            >
              <FileCheck2 size={11} /> Proof Attached 📸
            </span>
          )}
        </div>

        {/* Task Title */}
        <div className="fp-task-title-line">
          <h4
            className="cursor-pointer hover:text-[#8E4B49] transition-colors text-sm font-bold text-[#1D1B18]"
            onClick={() => onOpenWorkbench?.(item)}
            title="Click to open Task Workbench"
          >
            {task.title}
          </h4>
        </div>

        {/* Action Row: Proof & Share, Workbench, Subtasks Toggle, Priority */}
        <div className="fp-task-meta flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Proof of Work & Social Share Button */}
            <button
              type="button"
              onClick={() => onOpenProof?.(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FFF1ED] border border-[#FFAAA6] text-[#8E4B49] hover:bg-[#FFAAA6]/30 transition-all shadow-2xs cursor-pointer"
              title="Submit proof of work (screenshot/file) & generate LinkedIn post"
            >
              <Share2 size={11} />
              <span>{hasProof ? 'View Proof & Share' : 'Proof & Share 🚀'}</span>
            </button>

            {/* Workbench Button */}
            <button
              type="button"
              className="fp-workbench-open-btn"
              onClick={() => onOpenWorkbench?.(item)}
              title="Open Task Workbench"
            >
              <Sparkles size={11} /> Workbench
            </button>

            {/* Subtasks Accordion Toggle */}
            <button
              type="button"
              onClick={() => setSubtasksOpen(!subtasksOpen)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF8F5] border border-[#E5E0D8] text-[#534342] hover:bg-[#EFEAE4] transition-colors"
            >
              <ListChecks size={12} style={{ color: roleConf.color }} />
              <span>{steps.length} Subtasks</span>
              <ChevronDown size={11} className={`transition-transform duration-200 ${subtasksOpen ? 'rotate-180' : ''}`} />
            </button>

            <span className={`fp-priority ${priority}`}>{priority} priority</span>

            {targetDateDisplay && (
              <span className={`fp-task-date-pill ${overdue ? 'overdue' : ''}`}>
                <Calendar size={11} /> {overdue ? `Overdue: ${targetDateDisplay}` : `Due ${targetDateDisplay}`}
              </span>
            )}

            {task.effort_estimate && <span><Clock3 size={11} />{task.effort_estimate}</span>}
          </div>

          <div className="flex items-center gap-1.5">
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
        </div>

        {/* Collapsible Subtasks Checklist (Clean & Minimal) */}
        {subtasksOpen && (
          <div className="fp-task-features-checklist my-2.5 p-3 rounded-xl bg-[#FAF8F5] border border-[#EFEAE4] animate-in fade-in duration-150">
            <div className="text-[11px] font-bold text-[#534342] flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wide">
                <ListChecks size={13} style={{ color: roleConf.color }} />
                Implementation Steps ({steps.length})
              </span>
              <span className="text-[10px] text-[#7C766F] font-mono">
                {done ? 'Completed' : 'In development'}
              </span>
            </div>
            <ul className="space-y-1.5">
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
    <article className={`fp-milestone-node fp-milestone-vertical ${status} ${selected ? 'selected' : ''} ${milestoneTheme}`}>
      <span className="fp-node-connector" aria-hidden="true" />
      <span className="fp-marker" aria-hidden="true">
        <NodeIcon size={16} />
        {status !== 'completed' && <small>{String(index + 1).padStart(2, '0')}</small>}
      </span>

      <button type="button" className="fp-milestone-card" onClick={onSelect} aria-pressed={selected}>
        <div className="fp-milestone-top">
          <div className="fp-milestone-heading">
            <div className="fp-milestone-kicker-row">
              <span className="fp-milestone-kicker">{milestone.category} · Milestone {String(index + 1).padStart(2, '0')}</span>
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

function AnimatedRoadmapCurve({ roadmapRef, milestonesCount }) {
  const [curvePath, setCurvePath] = useState('')
  const [svgHeight, setSvgHeight] = useState(600)

  useEffect(() => {
    const calcPath = () => {
      if (!roadmapRef.current) return
      const markers = roadmapRef.current.querySelectorAll('.fp-marker')
      if (!markers.length) return

      const containerRect = roadmapRef.current.getBoundingClientRect()
      setSvgHeight(containerRect.height)

      const points = Array.from(markers).map((m) => {
        const r = m.getBoundingClientRect()
        return {
          x: r.left - containerRect.left + r.width / 2,
          y: r.top - containerRect.top + r.height / 2,
        }
      })

      if (points.length < 2) return

      // Build smooth organic curve swinging outward to the left as sketched in reference
      let d = `M ${points[0].x} ${points[0].y}`
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]
        const p2 = points[i + 1]
        const dy = p2.y - p1.y
        const swingX = Math.max(8, p1.x - 26) // outward left wave into gutter
        d += ` C ${swingX} ${p1.y + dy * 0.28}, ${swingX} ${p1.y + dy * 0.72}, ${p2.x} ${p2.y}`
      }

      setCurvePath(d)
    }

    const timer = setTimeout(calcPath, 60)
    window.addEventListener('resize', calcPath)
    let ro = null
    if (typeof ResizeObserver !== 'undefined' && roadmapRef.current) {
      ro = new ResizeObserver(calcPath)
      ro.observe(roadmapRef.current)
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', calcPath)
      if (ro) ro.disconnect()
    }
  }, [roadmapRef, milestonesCount])

  if (!curvePath) return null

  return (
    <svg
      className="fp-animated-flow-svg"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${svgHeight}px`,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="roadmapFlowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="30%" stopColor="#8E4B49" />
          <stop offset="70%" stopColor="#E06D53" />
          <stop offset="100%" stopColor="#FFAAA6" />
        </linearGradient>
        <filter id="flowGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Base soft guide track */}
      <path
        d={curvePath}
        fill="none"
        stroke="#F2ECE6"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Animated marching dash flow line */}
      <path
        d={curvePath}
        fill="none"
        stroke="url(#roadmapFlowGradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="9 7"
        className="fp-flow-line-animated"
      />

      {/* Comet tail particle 2 */}
      <circle r="3" fill="#FFAAA6" opacity="0.45">
        <animateMotion
          dur="3.4s"
          repeatCount="indefinite"
          path={curvePath}
          begin="-0.35s"
        />
      </circle>

      {/* Comet tail particle 1 */}
      <circle r="4.5" fill="#E06D53" opacity="0.65">
        <animateMotion
          dur="3.4s"
          repeatCount="indefinite"
          path={curvePath}
          begin="-0.18s"
        />
      </circle>

      {/* Continuous glowing energy orb moving through path from one to another */}
      <circle r="6" fill="#8E4B49" filter="url(#flowGlow)">
        <animateMotion
          dur="3.4s"
          repeatCount="indefinite"
          path={curvePath}
        />
      </circle>
      <circle r="2.5" fill="#FFFFFF">
        <animateMotion
          dur="3.4s"
          repeatCount="indefinite"
          path={curvePath}
        />
      </circle>
    </svg>
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

function HardwareBomFlightPlanView({
  project,
  hardwareBom = [],
  onGenerateBom,
  generating = false,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchResults = [],
  onClearSearchResults,
  searching = false,
  onAddComp,
  onRemoveComp,
}) {
  const domain = project?.domain || 'hardware'
  const minTotal = hardwareBom.reduce((sum, c) => sum + (c.priceMin || 0) * (c.quantity || 1), 0)
  const maxTotal = hardwareBom.reduce((sum, c) => sum + (c.priceMax || 0) * (c.quantity || 1), 0)

  return (
    <section className="space-y-6 animate-fadeIn font-['Plus_Jakarta_Sans']">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7]/40 to-[#FFF7ED] rounded-3xl border border-[#FDE68A] p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#D97706] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              🔧
            </span>
            <h2 className="text-lg font-black text-[#1D1B18] tracking-tight">
              Hardware Components & Bill of Materials (BOM)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white text-[#D97706] border border-[#FDE68A]">
              {domain.toUpperCase()} DOMAIN
            </span>
          </div>
          <p className="text-xs text-[#78350F] leading-relaxed">
            Direct procurement links, live vendor price ranges (INR), wiring connections, and learning tutorials for Indian maker stores (MakerBazar, Robocraze, Roboin & IndiaHobbyStore).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/90 backdrop-blur px-4 py-2.5 rounded-2xl border border-[#FDE68A] shadow-xs text-right">
            <span className="text-[10px] font-bold text-[#92400E] uppercase tracking-wider block">Estimated BOM Cost</span>
            <span className="text-base font-black text-[#1D1B18]">
              ₹{minTotal.toLocaleString('en-IN')} – ₹{maxTotal.toLocaleString('en-IN')}
            </span>
          </div>
          <button
            type="button"
            onClick={onGenerateBom}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#D97706] text-white text-xs font-bold hover:bg-[#B45309] transition-all shadow-sm cursor-pointer disabled:opacity-60"
          >
            {generating ? <MiniLoader color="#fff" /> : <RefreshCw size={13} />}
            <span>{generating ? 'Synthesizing…' : 'AI Generate BOM'}</span>
          </button>
        </div>
      </div>

      {/* Live Component Search / Sourcing Bar */}
      <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#1D1B18] uppercase tracking-wider">Live Indian Store Sourcing</h3>
            <p className="text-xs text-[#7C766F] mt-0.5">Search live parts across MakerBazar, Robocraze, Roboin & IndiaHobbyStore</p>
          </div>
          <span className="text-[11px] text-[#7C766F]">Instant Indian store links</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C766F]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSearchSubmit(searchQuery) }}
              placeholder="Search components (e.g. ESP32, Arduino Uno, MG996R servo, HC-SR04 ultrasonic, OLED 0.96)..."
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#FAFAF9] border border-[#EFEAE4] text-xs focus:bg-white focus:border-[#D97706] focus:outline-none transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => onSearchSubmit(searchQuery)}
            disabled={searching}
            className="px-5 py-2.5 rounded-xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {searching ? <MiniLoader color="#fff" /> : <Search size={14} />}
            <span>Search Stores</span>
          </button>
        </div>

        {/* Live Search Results */}
        {searchResults.length > 0 && (
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EFEAE4] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1D1B18]">Found Components ({searchResults.length})</span>
              <button
                type="button"
                onClick={onClearSearchResults}
                className="text-[11px] font-bold text-[#7C766F] hover:text-[#1D1B18] cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-white border border-[#EFEAE4] flex gap-3 items-start shadow-xs">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover border border-[#EFEAE4] shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                        {item.category || 'Hardware'}
                      </span>
                      <span className="text-xs font-black text-[#1D1B18]">{item.price_range}</span>
                    </div>
                    <h4 className="font-bold text-xs text-[#1D1B18] truncate">{item.name}</h4>
                    {item.description && (
                      <p className="text-[11px] text-[#534342] line-clamp-1 m-0">{item.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {(item.vendors || []).map((v, vi) => (
                        <a
                          key={vi}
                          href={v.direct_search_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#EFEAE4] text-[#534342] hover:text-[#1D1B18] no-underline"
                        >
                          🛒 {v.vendor}
                        </a>
                      ))}
                      <button
                        type="button"
                        onClick={() => onAddComp(item)}
                        className="ml-auto text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-[#1D1B18] text-white hover:bg-black transition-colors cursor-pointer"
                      >
                        + Add to My BOM
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Components Grid in Project BOM */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#1D1B18]">Components in Your Project BOM</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FAF8F5] border border-[#EFEAE4] text-[#534342]">
              {hardwareBom.length} items
            </span>
          </div>
          <span className="text-xs text-[#7C766F]">Direct vendor checkout links included</span>
        </div>

        {hardwareBom.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-[#EFEAE4] p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center mx-auto text-xl">
              📦
            </div>
            <h4 className="text-sm font-bold text-[#1D1B18]">No hardware components in your BOM yet</h4>
            <p className="text-xs text-[#7C766F] max-w-sm mx-auto">
              Click below to generate a tailored Bill of Materials with pricing and wiring guides, or search above.
            </p>
            <button
              type="button"
              onClick={onGenerateBom}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
            >
              {generating ? <MiniLoader color="#fff" /> : <Sparkles size={14} />}
              <span>Generate BOM with AI</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hardwareBom.map(comp => (
              <div
                key={comp.id}
                className="bg-white rounded-2xl border-2 p-4 flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-all relative group"
                style={{ borderColor: comp.color || '#EFEAE4' }}
              >
                <div className="space-y-2.5">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    {comp.image ? (
                      <img
                        src={comp.image}
                        alt={comp.name}
                        className="w-14 h-14 rounded-xl object-cover border border-[#EFEAE4] shrink-0"
                      />
                    ) : (
                      <span
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 font-bold"
                        style={{ background: comp.bg || '#FFFBEB', color: comp.color || '#D97706' }}
                      >
                        {comp.icon || '⚡'}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                          style={{ background: comp.bg || '#FAF8F5', color: comp.color || '#534342' }}
                        >
                          {comp.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveComp(comp.id)}
                          className="text-[#9CA3AF] hover:text-[#DC2626] text-xs p-0.5 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove from BOM"
                        >
                          ✕
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-[#1D1B18] mt-1 line-clamp-1">{comp.name}</h4>
                      <div className="text-xs font-bold text-[#D97706]">
                        ₹{comp.priceMin} – ₹{comp.priceMax}{' '}
                        <small className="text-[#7C766F] font-normal">
                          ({comp.quantity || 1} {comp.unit || 'pcs'})
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {comp.description && (
                    <p className="text-xs text-[#534342] leading-relaxed line-clamp-2 m-0">
                      {comp.description}
                    </p>
                  )}

                  {/* Wiring Tip */}
                  {comp.wiring_tip && (
                    <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFEAE4] text-[11px] text-[#534342] flex items-start gap-1.5">
                      <span className="text-xs">🔌</span>
                      <span className="line-clamp-2"><strong>Wiring:</strong> {comp.wiring_tip}</span>
                    </div>
                  )}
                </div>

                {/* Vendor Action Buttons */}
                <div className="pt-2 border-t border-[#F3EDE7] space-y-1.5">
                  <span className="text-[10px] font-bold text-[#7C766F] block">Buy directly from store:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(comp.vendors || []).map((v, vi) => (
                      <a
                        key={vi}
                        href={v.direct_search_url || v.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-white hover:bg-[#FAF8F5] transition-colors shadow-2xs no-underline"
                        style={{ color: v.color || '#534342', borderColor: '#EFEAE4' }}
                        title={`Search and buy on ${v.vendor || v.name}`}
                      >
                        🛒 {v.vendor || v.name}
                      </a>
                    ))}

                    {comp.learnUrl && (
                      <a
                        href={comp.learnUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-0.5 ml-auto no-underline"
                      >
                        <BookOpen size={11} /> Tutorials
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indian Electronics Store Directory */}
      <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[#1D1B18] uppercase tracking-wider">
          Trusted Indian Maker Hardware Stores
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {INDIAN_VENDORS.map(v => (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="p-3.5 rounded-2xl border bg-[#FAF8F5] hover:bg-white hover:shadow-sm transition-all no-underline flex flex-col justify-between"
              style={{ borderColor: v.color + '40' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{v.icon}</span>
                  <span className="font-bold text-xs text-[#1D1B18]">{v.name}</span>
                </div>
                <p className="text-[11px] text-[#7C766F] line-clamp-2 m-0">{v.tagline}</p>
              </div>
              <span className="text-xs font-bold mt-3" style={{ color: v.color }}>
                Browse Catalog →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function BusinessModelFlightPlanView({ project }) {
  const domain = project?.domain || 'software'
  const category = project?.category || 'Startup'
  const business = project?.business_model || project?.draft?.business_model || {}
  const budget = business.budget || 25000
  const modelId = business.revenue_model || (domain === 'hardware' ? 'one_time' : 'subscription')

  return (
    <section className="space-y-6 animate-fadeIn font-['Plus_Jakarta_Sans']">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#FFF8F3] via-[#FFF1ED] to-[#FEF3C7]/40 rounded-3xl border border-[#FFAAA6]/50 p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#8E4B49] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              💰
            </span>
            <h2 className="text-lg font-black text-[#1D1B18] tracking-tight">
              Business Model & Financial Trajectory
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white text-[#8E4B49] border border-[#FFAAA6]">
              {category.toUpperCase()} · {domain.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-[#534342] leading-relaxed">
            Personalized monetization roadmap, budget allocations, 6-month growth projections, and non-dilutive startup funding sources.
          </p>
        </div>

        <Link
          to={`/business-model?project=${encodeURIComponent(project?.id || '')}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#8E4B49] text-white text-xs font-bold hover:bg-[#7A3C3A] transition-all shadow-sm no-underline"
        >
          <CircleDollarSign size={14} />
          <span>Open Full Studio Planner</span>
        </Link>
      </div>

      {/* Model & Budget Split Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model summary card */}
        <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 shadow-xs space-y-3">
          <span className="text-[10px] font-bold text-[#7C766F] uppercase tracking-wider block">Selected Monetization Model</span>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{modelId === 'one_time' ? '🏷️' : modelId === 'freemium' ? '🚀' : modelId === 'grant' ? '🏆' : '📅'}</span>
            <div>
              <h3 className="text-sm font-bold text-[#1D1B18] capitalize">
                {modelId.replace('_', ' ')} Model
              </h3>
              <p className="text-xs text-[#534342]">
                {domain === 'hardware' ? 'Physical unit checkout with hardware margins' : 'Recurring software subscription with predictable cash-flows'}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFEAE4] text-xs text-[#534342]">
            <strong>Expected ARPU:</strong> {domain === 'hardware' ? '₹800 – ₹5,000 per kit' : '₹350 – ₹1,500 / month'}
          </div>
        </div>

        {/* Budget overview card */}
        <div className="bg-white rounded-2xl border border-[#EFEAE4] p-5 shadow-xs space-y-3">
          <span className="text-[10px] font-bold text-[#7C766F] uppercase tracking-wider block">Allocated Runway Budget</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-[#1D1B18]">₹{budget.toLocaleString('en-IN')}</span>
            <span className="text-xs text-[#059669] font-bold bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
              Active Budget
            </span>
          </div>
          <p className="text-xs text-[#7C766F]">
            Recommended distribution: {domain === 'hardware' ? '40% Hardware BOM · 20% Tools · 15% PCB & Enclosure' : '30% Cloud & DB · 30% Marketing · 15% SaaS Tools'}
          </p>
        </div>
      </div>
    </section>
  )
}

const MILESTONE_THEMES = [
  {
    numBg: '#F59E0B',
    cardBg: '#FFFDF7',
    border: '#FDE68A',
    statusBg: '#ECFDF5',
    statusColor: '#065F46',
    catBg: '#FFFBEB',
    catColor: '#B45309',
    catBorder: '#FDE68A',
    icon: 'ℹ',
    category: 'Research',
  },
  {
    numBg: '#8B5CF6',
    cardBg: '#FAF8FF',
    border: '#DDD6FE',
    statusBg: '#EFF6FF',
    statusColor: '#1D4ED8',
    catBg: '#F5F3FF',
    catColor: '#6D28D9',
    catBorder: '#DDD6FE',
    icon: '⚙',
    category: 'Development',
  },
  {
    numBg: '#10B981',
    cardBg: '#F7FDF9',
    border: '#A7F3D0',
    statusBg: '#F3F4F6',
    statusColor: '#4B5563',
    catBg: '#ECFDF5',
    catColor: '#047857',
    catBorder: '#A7F3D0',
    icon: '📟',
    category: 'Hardware',
  },
  {
    numBg: '#F87171',
    cardBg: '#FFF8F8',
    border: '#FECDD3',
    statusBg: '#F3F4F6',
    statusColor: '#4B5563',
    catBg: '#FEF2F2',
    catColor: '#B91C1C',
    catBorder: '#FECDD3',
    icon: '🧪',
    category: 'Testing',
  },
  {
    numBg: '#6366F1',
    cardBg: '#F8FAFF',
    border: '#C7D2FE',
    statusBg: '#F3F4F6',
    statusColor: '#4B5563',
    catBg: '#EEF2FF',
    catColor: '#4338CA',
    catBorder: '#C7D2FE',
    icon: '🛡',
    category: 'QA',
  },
  {
    numBg: '#14B8A6',
    cardBg: '#F4FDFB',
    border: '#99F6E4',
    statusBg: '#F3F4F6',
    statusColor: '#4B5563',
    catBg: '#F0FDFA',
    catColor: '#0F766E',
    catBorder: '#99F6E4',
    icon: '🚀',
    category: 'Launch',
  },
]

function formatIndianCurrencyText(text) {
  if (!text || typeof text !== 'string') return text
  return text.replace(/\$\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, (_, numStr) => {
    const num = parseFloat(numStr.replace(/,/g, ''))
    if (isNaN(num)) return _
    if (num === 0) return '₹0'
    const inr = Math.round(num * 85)
    return `₹${inr.toLocaleString('en-IN')}`
  })
}

function FlyingBirdMascot() {
  return (
    <div className="fp-v2-hero-mascot select-none">
      <div className="fp-v2-speech-bubble">
        Turning ideas into real things!
      </div>
      <svg width="140" height="140" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
        {/* Jetpack Smoke Puffs */}
        <circle cx="50" cy="130" r="14" fill="#E0E7FF" opacity="0.6" />
        <circle cx="42" cy="142" r="10" fill="#DDD6FE" opacity="0.5" />
        <circle cx="60" cy="140" r="8" fill="#FDE68A" opacity="0.7" />

        {/* Rocket Flames */}
        <path d="M58 116 L50 134 L66 128 Z" fill="#EF4444" />
        <path d="M60 118 L55 130 L64 126 Z" fill="#F59E0B" />

        {/* Jetpack Body */}
        <rect x="52" y="80" width="18" height="34" rx="7" fill="#6B7280" stroke="#374151" strokeWidth="2" />
        <rect x="56" y="84" width="10" height="8" rx="2" fill="#9CA3AF" />

        {/* Bird Body (Round Warm Yellow) */}
        <circle cx="95" cy="88" r="38" fill="#FBBF24" stroke="#D97706" strokeWidth="2.5" />
        <ellipse cx="102" cy="98" rx="22" ry="20" fill="#FEF3C7" />

        {/* Aviator Helmet */}
        <path d="M63 80 C63 56 78 40 100 40 C122 40 135 56 135 80 C135 84 133 86 130 86 C124 74 116 70 98 70 C80 70 72 74 66 86 C64 86 63 84 63 80 Z" fill="#0D9488" stroke="#042F2E" strokeWidth="2" />
        <path d="M63 76 L134 76" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
        <circle cx="86" cy="74" r="13" fill="#67E8F9" stroke="#0F172A" strokeWidth="3" />
        <circle cx="112" cy="74" r="13" fill="#67E8F9" stroke="#0F172A" strokeWidth="3" />
        <path d="M81 70 L91 78" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <path d="M107 70 L117 78" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

        {/* Beak */}
        <path d="M124 88 L142 93 L124 99 Z" fill="#F97316" stroke="#C2410C" strokeWidth="1.5" />

        {/* Cheeks */}
        <circle cx="86" cy="98" r="6" fill="#F43F5E" opacity="0.35" />
        <circle cx="114" cy="100" r="6" fill="#F43F5E" opacity="0.35" />

        {/* Wing flapping */}
        <path d="M72 88 C66 96 66 108 78 110 C86 112 92 104 90 94 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />

        {/* Flying Stars */}
        <path d="M136 48 L138 42 L140 48 L146 50 L140 52 L138 58 L136 52 L130 50 Z" fill="#F59E0B" />
        <path d="M36 68 L37 64 L39 68 L43 69 L39 71 L37 75 L36 71 L32 69 Z" fill="#F59E0B" opacity="0.8" />
      </svg>
    </div>
  )
}

function FlightPlanTopNav({ project, projects = [], onSelectProject }) {
  return (
    <div className="fp-v2-topnav">
      <div className="fp-v2-topnav-left">
        <div className="fp-v2-sprint-pill">
          <span className="fp-v2-sprint-dot" />
          <span>Today · Sprint 1 Active</span>
        </div>

        <div className="fp-v2-project-dropdown">
          <select
            value={project?.id || ''}
            onChange={(e) => onSelectProject(e.target.value)}
            className="fp-v2-project-btn cursor-pointer appearance-none pr-8"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                🎯 {p.title || p.name || 'Untitled Project'}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 pointer-events-none text-[#6B7280]" />
        </div>
      </div>

      <div className="fp-v2-topnav-right">
        <button type="button" className="fp-v2-icon-btn" title="Search nodes & tasks">
          <Search size={16} />
        </button>

        <button type="button" className="fp-v2-icon-btn" title="Notifications">
          <Bell size={16} />
          <span className="fp-v2-btn-badge" />
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FDE68A] to-[#F59E0B] p-0.5 shadow-xs cursor-pointer">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-xs text-[#92400E]">
            👤
          </div>
        </div>

        <Link to="/launch" className="fp-v2-new-idea-btn no-underline">
          <Plus size={14} />
          <span>New Idea</span>
        </Link>
      </div>
    </div>
  )
}

function FlightPlanHeroBanner({
  project,
  deadlineStr,
  daysInfo,
  onReplan,
  replanBusy = false,
  onEdit,
}) {
  const currentXp = project?.xp_points || 0
  const currentLvl = project?.xp_level || (currentXp >= 1000 ? 4 : currentXp >= 600 ? 3 : currentXp >= 300 ? 2 : 1)
  const xpPercent = Math.min(100, Math.round(((currentXp % 300) / 300) * 100))
  const projTitle = project?.title || project?.name || 'Your Project'
  const description = project?.summary || project?.description || project?.workflow?.flight_plan?.summary || `11-week execution roadmap for ${projTitle} MVP. Development is structured around a 2-axis performance (20hrs/week) to deliver a working ${projTitle} by ${deadlineStr ? formatDisplayDate(deadlineStr) : 'January 13, 2027'}.`

  return (
    <section className="fp-v2-hero-card">
      <div className="fp-v2-hero-left">
        <span className="fp-v2-hero-tag">
          📋 Project Roadmap
        </span>
        <h1 className="fp-v2-hero-title">
          <span>{projTitle}</span>
          <span className="fp-v2-hero-title-sparkle"></span>
        </h1>
        <p className="fp-v2-hero-desc">
          {description}
        </p>
      </div>

      <FlyingBirdMascot />

      <div className="fp-v2-hero-stats">
        <div className="fp-v2-stats-level">
          <div className="fp-v2-stats-level-header">
            <span>🪙 Level {currentLvl} · {currentXp} XP</span>
            <span className="text-[10px] text-[#D97706]">{xpPercent}%</span>
          </div>
          <div className="fp-v2-stats-xp-bar">
            <div className="fp-v2-stats-xp-fill" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>

        <div className="fp-v2-stats-deadline">
          <Calendar size={16} className="text-[#8E4B49] mt-0.5 shrink-0" />
          <div>
            <strong>Deadline</strong>
            <span>{deadlineStr ? formatDisplayDate(deadlineStr) : '13 Jan 2027'} ({daysInfo?.days != null ? `${daysInfo.days} days remaining` : '80 days remaining'})</span>
          </div>
        </div>

        <div className="fp-v2-stats-actions">
          <button
            type="button"
            onClick={onReplan}
            disabled={replanBusy}
            className="fp-v2-replan-btn"
          >
            {replanBusy ? <MiniLoader color="#fff" /> : <Sparkles size={13} />}
            <span>{replanBusy ? 'Replanning…' : 'Replan with AI'}</span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="fp-v2-edit-btn"
          >
            Edit Roadmap
          </button>
        </div>
      </div>
    </section>
  )
}

function FlightPlanKpiBar({
  percent = 0,
  doneCount = 0,
  taskCount = 0,
  deadlineStr = '',
  daysInfo = null,
  blockedCount = 0,
  onToggleGitDetails,
  gitOpen = false,
}) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div className="fp-v2-kpi-grid">
      {/* 1. Overall Progress */}
      <div className="fp-v2-kpi-card">
        <div className="fp-v2-progress-circle-wrap">
          <svg width="48" height="48" className="rotate-[-90deg]">
            <circle cx="24" cy="24" r={radius} stroke="#E5E7EB" strokeWidth="4" fill="transparent" />
            <circle
              cx="24"
              cy="24"
              r={radius}
              stroke="#10B981"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className="absolute fp-v2-progress-text">{percent}%</span>
        </div>
        <div className="fp-v2-kpi-info">
          <span className="fp-v2-kpi-label">Overall Progress</span>
          <span className="fp-v2-kpi-sub">{doneCount} of {taskCount} tasks completed</span>
        </div>
      </div>

      {/* 2. Launch Deadline */}
      <div className="fp-v2-kpi-card">
        <div className="fp-v2-kpi-icon-circle bg-[#F5F3FF] text-[#7C3AED]">
          <Calendar size={20} />
        </div>
        <div className="fp-v2-kpi-info">
          <span className="fp-v2-kpi-label text-[#7C3AED]">Launch</span>
          <span className="fp-v2-kpi-sub">
            {deadlineStr ? formatDisplayDate(deadlineStr) : '13 Jan 2027'} ({daysInfo?.days != null ? `${daysInfo.days} days remaining` : '80 days remaining'})
          </span>
        </div>
      </div>

      {/* 3. Blocked / Risks */}
      <div className="fp-v2-kpi-card">
        <div className="fp-v2-kpi-icon-circle bg-[#FEF2F2] text-[#EF4444]">
          <AlertTriangle size={20} />
        </div>
        <div className="fp-v2-kpi-info">
          <span className="fp-v2-kpi-label text-[#EF4444]">Blocked</span>
          <span className="fp-v2-kpi-sub">{blockedCount > 0 ? `${blockedCount} tasks` : 'All tasks on track'}</span>
        </div>
      </div>

      {/* 4. Git & Audit */}
      <div
        className="fp-v2-kpi-card cursor-pointer hover:bg-[#FAF8F5]"
        onClick={onToggleGitDetails}
      >
        <div className="fp-v2-kpi-icon-circle bg-[#F3F4F6] text-[#1F2937]">
          <Github size={20} />
        </div>
        <div className="fp-v2-kpi-info flex-1">
          <span className="fp-v2-kpi-label flex items-center justify-between">
            <span>Show Git & Audit Details</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${gitOpen ? 'rotate-180' : ''}`} />
          </span>
          <span className="fp-v2-kpi-sub">Repository sync & verifications</span>
        </div>
      </div>
    </div>
  )
}

function FlightPlanFlowMap({
  milestones = [],
  allTasks = [],
  completed = [],
  activeMilestoneIndex = 0,
  onSelectMilestone,
}) {
  const [searchNodeQuery, setSearchNodeQuery] = useState('')

  const filteredMilestones = useMemo(() => {
    return milestones.map((m, idx) => ({ ...m, originalIndex: idx })).filter(m => {
      if (!searchNodeQuery.trim()) return true
      const q = searchNodeQuery.toLowerCase()
      return m.title.toLowerCase().includes(q) || (m.purpose && m.purpose.toLowerCase().includes(q))
    })
  }, [milestones, searchNodeQuery])

  return (
    <div className="fp-v2-flow-canvas">
      {/* Header Bar */}
      <div className="fp-v2-flow-header">
        <div className="fp-v2-flow-title">
          <h3>Project Flow Map</h3>
          <p>Milestones, tasks and dependencies</p>
        </div>

        <div className="fp-v2-flow-controls">
          <div className="fp-v2-node-search">
            <Search size={13} className="absolute left-2.5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchNodeQuery}
              onChange={(e) => setSearchNodeQuery(e.target.value)}
            />
          </div>

          <div className="fp-v2-filter-dots">
            {['#EF4444', '#10B981', '#3B82F6', '#8B5CF6'].map((dotColor) => (
              <span
                key={dotColor}
                className="fp-v2-dot"
                style={{ backgroundColor: dotColor }}
                title="Filter color"
              />
            ))}
            <span className="text-[10px] text-[#9CA3AF] ml-0.5">›</span>
          </div>

          <div className="fp-v2-zoom-btns">
            <button type="button" className="fp-v2-zoom-btn" title="Zoom In">+</button>
            <button type="button" className="fp-v2-zoom-btn" title="Zoom Out">−</button>
            <button type="button" className="fp-v2-zoom-btn" title="Fit to Screen">⛶</button>
          </div>
        </div>
      </div>

      {/* Nodes Canvas with Curved Winding Path */}
      <div className="fp-v2-nodes-wrapper">
        {/* Start Node */}
        <div className="fp-v2-start-node">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
          <Target size={13} />
          <span>Start</span>
        </div>

        {/* Milestone Cards */}
        {filteredMilestones.map((milestone) => {
          const mIdx = milestone.originalIndex
          const theme = MILESTONE_THEMES[mIdx % MILESTONE_THEMES.length]
          const mTasks = allTasks.filter(t => t.milestoneIndex === mIdx)
          const mDone = mTasks.filter(t => completed.includes(t.id)).length
          const isDone = mTasks.length > 0 && mDone === mTasks.length
          const isInProgress = mDone > 0 && !isDone
          const isSelected = activeMilestoneIndex === mIdx

          return (
            <div
              key={milestone.title + mIdx}
              onClick={() => onSelectMilestone(mIdx)}
              className={`fp-v2-milestone-card ${isSelected ? 'selected' : ''}`}
              style={{
                backgroundColor: theme.cardBg,
                borderColor: isSelected ? '#1D1B18' : theme.border,
              }}
            >
              <div className="fp-v2-mcard-left">
                {/* Number Badge */}
                <span className="fp-v2-num-badge" style={{ backgroundColor: theme.numBg }}>
                  {String(mIdx + 1).padStart(2, '0')}
                </span>

                <div className="fp-v2-mcard-body">
                  <span className="fp-v2-mcard-title">{milestone.title}</span>
                  <div className="fp-v2-mcard-sub">
                    <span>{mDone}/{mTasks.length} tasks</span>
                    <span
                      className="fp-v2-mcard-status"
                      style={{
                        backgroundColor: isDone ? '#ECFDF5' : isInProgress ? '#EFF6FF' : '#F3F4F6',
                        color: isDone ? '#065F46' : isInProgress ? '#1D4ED8' : '#4B5563',
                      }}
                    >
                      {isDone ? '✓ Completed' : isInProgress ? '⏳ In Progress' : '⏱ Not Started'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Pill on Right */}
              <div className="fp-v2-mcard-right">
                <span
                  className="fp-v2-category-pill"
                  style={{
                    backgroundColor: theme.catBg,
                    color: theme.catColor,
                    borderColor: theme.catBorder,
                  }}
                >
                  <span className="font-mono text-xs">{theme.icon}</span>
                  <span>{milestone.category || theme.category}</span>
                </span>
              </div>
            </div>
          )
        })}

        {/* Launch Ready Ending Node */}
        <div className="fp-v2-launch-node">
          <span>🏁</span>
          <span>Launch Ready!</span>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="fp-v2-flow-legend">
        <span className="fp-v2-legend-item">
          <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
          <span>Dependency</span>
        </span>
        <span className="fp-v2-legend-item">
          <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
          <span>Blocker</span>
        </span>
        <span className="fp-v2-legend-item">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span>Completed</span>
        </span>
        <span className="fp-v2-legend-item">
          <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
          <span>In Progress</span>
        </span>
      </div>
    </div>
  )
}

function FlightPlanMilestoneInspector({
  milestone,
  milestoneIndex = 0,
  tasks = [],
  completed = [],
  onToggleTask,
  onOpenWorkbench,
  onSwitchTab,
  onAddRoadmap,
  daysInfo,
}) {
  if (!milestone) return null
  const mDone = tasks.filter(t => completed.includes(t.id)).length
  const isDone = tasks.length > 0 && mDone === tasks.length
  const isInProgress = mDone > 0 && !isDone
  const manualPercent = tasks.length ? Math.round((mDone / tasks.length) * 100) : 0
  const repoEvidencePercent = Math.min(100, Math.round(manualPercent * 0.8))
  const verificationPercent = Math.min(100, Math.round(manualPercent * 0.6))

  const dateRangeStr = milestone.start_date || milestone.target_date
    ? `${milestone.start_date ? formatDisplayDate(milestone.start_date) : 'Start'} → ${milestone.target_date ? formatDisplayDate(milestone.target_date) : 'End'}`
    : '25 Oct 2026 → 1 Nov 2026'

  return (
    <aside className="fp-v2-inspector-panel">
      {/* Header Badges */}
      <div className="fp-v2-insp-top">
        <span className="fp-v2-insp-badge">
          <Check size={12} /> Milestone {String(milestoneIndex + 1).padStart(2, '0')}
        </span>
        <span
          className="fp-v2-insp-status"
          style={{
            backgroundColor: isDone ? '#ECFDF5' : isInProgress ? '#EFF6FF' : '#F3F4F6',
            color: isDone ? '#065F46' : isInProgress ? '#1D4ED8' : '#4B5563',
            borderColor: isDone ? '#A7F3D0' : isInProgress ? '#BFDBFE' : '#E5E7EB',
          }}
        >
          {isDone ? '✓ Completed' : isInProgress ? 'In Progress' : 'Not Started'}
        </span>
      </div>

      {/* Title */}
      <h3 className="fp-v2-insp-title">{milestone.title}</h3>

      {/* Date Row */}
      <div className="fp-v2-insp-date-row">
        <span className="flex items-center gap-1.5">
          <Calendar size={13} className="text-[#6B7280]" />
          <span>{dateRangeStr}</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#FAF5FF] text-[#7E22CE] font-bold text-[10.5px]">
          {daysInfo?.label || '7 days remaining'}
        </span>
      </div>

      {/* Key Goal */}
      <div className="fp-v2-insp-key-goal">
        <span className="fp-v2-insp-goal-label">
          <Target size={13} className="text-[#1D1B18]" />
          <span>Key Goal</span>
        </span>
        <p className="fp-v2-insp-goal-text">
          {milestone.outcome || milestone.purpose || 'Validate market demand and refine the problem statement using real user feedback and competitor analysis.'}
        </p>
      </div>

      {/* Tasks List */}
      <div className="fp-v2-insp-tasks-section">
        <div className="fp-v2-insp-tasks-heading">
          <span>Tasks ({mDone}/{tasks.length})</span>
        </div>

        <div className="space-y-2">
          {tasks.map((item, idx) => {
            const done = completed.includes(item.id)
            const tagLabel = idx === 0 ? 'Research' : idx === 1 ? 'Analysis' : 'Planning'

            return (
              <div
                key={item.id}
                className="fp-v2-insp-task-item group"
                onClick={() => onOpenWorkbench(item.task, milestone.title)}
              >
                <div
                  className="fp-v2-insp-task-check"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleTask(item.id)
                  }}
                >
                  <span
                    className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all ${done
                        ? 'bg-[#1D1B18] text-white border-[#1D1B18]'
                        : 'bg-white text-transparent border-[#D1D5DB] hover:border-[#1D1B18]'
                      }`}
                  >
                    ✓
                  </span>
                </div>

                <div className="fp-v2-insp-task-content">
                  <span
                    className={`fp-v2-insp-task-title ${done ? 'line-through text-[#9CA3AF]' : ''}`}
                  >
                    {item.task?.title || 'Milestone Task'}
                  </span>

                  <div className="fp-v2-insp-task-meta">
                    <span className="fp-v2-insp-tag">
                      {item.task?.category ? `❖ ${item.task.category}` : `❖ ${tagLabel}`}
                    </span>
                    <span className="fp-v2-insp-xp">+{item.task?.xp_reward || 100} XP</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => tasks[0] && onOpenWorkbench(tasks[0].task, milestone.title)}
          className="fp-v2-insp-view-details"
        >
          <span>View Details</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Task Progress Triple-Bar */}
      <div className="fp-v2-insp-progress-box">
        <div className="fp-v2-insp-progress-head">
          <span className="flex items-center gap-1.5">
            <Layers size={13} /> Task Progress
          </span>
          <Info size={13} className="text-[#9CA3AF] cursor-pointer" />
        </div>

        <div className="fp-v2-bar-row">
          <div className="fp-v2-bar-label">
            <span className="flex items-center gap-1.5 text-[#059669]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Manual Completion
            </span>
            <span>{manualPercent}%</span>
          </div>
          <div className="fp-v2-bar-track">
            <div className="fp-v2-bar-fill bg-[#10B981]" style={{ width: `${manualPercent}%` }} />
          </div>
        </div>

        <div className="fp-v2-bar-row">
          <div className="fp-v2-bar-label">
            <span className="flex items-center gap-1.5 text-[#6366F1]">
              <span className="w-2 h-2 rounded-full bg-[#6366F1]" /> Repository Evidence
            </span>
            <span>{repoEvidencePercent}%</span>
          </div>
          <div className="fp-v2-bar-track">
            <div className="fp-v2-bar-fill bg-[#6366F1]" style={{ width: `${repoEvidencePercent}%` }} />
          </div>
        </div>

        <div className="fp-v2-bar-row">
          <div className="fp-v2-bar-label">
            <span className="flex items-center gap-1.5 text-[#D97706]">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Verification Passed
            </span>
            <span>{verificationPercent}%</span>
          </div>
          <div className="fp-v2-bar-track">
            <div className="fp-v2-bar-fill bg-[#F59E0B]" style={{ width: `${verificationPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="fp-v2-insp-quicklinks">
        <span className="text-[11px] font-bold text-[#1D1B18] uppercase tracking-wider mb-1 flex items-center gap-1">
          <Compass size={12} /> Quick Links
        </span>
        <button
          type="button"
          onClick={() => onSwitchTab('radar')}
          className="fp-v2-quicklink-btn"
        >
          <Compass size={13} className="text-[#6366F1]" />
          <span>Market Radar Report</span>
          <ArrowRight size={11} className="ml-auto text-[#9CA3AF]" />
        </button>
        <button
          type="button"
          onClick={() => onSwitchTab('radar')}
          className="fp-v2-quicklink-btn"
        >
          <BookOpen size={13} className="text-[#059669]" />
          <span>Sources & Citations</span>
          <ArrowRight size={11} className="ml-auto text-[#9CA3AF]" />
        </button>
        <button
          type="button"
          onClick={onAddRoadmap}
          className="fp-v2-quicklink-btn"
        >
          <Plus size={13} className="text-[#D97706]" />
          <span>Add to Roadmap</span>
          <ArrowRight size={11} className="ml-auto text-[#9CA3AF]" />
        </button>
      </div>
    </aside>
  )
}

function FlightPlanBottomInsights({
  radarData,
  activeMilestoneIndex = 0,
  onAddExperiment,
  onSwitchTab,
}) {
  const [activeTab, setActiveTab] = useState('insights')

  const competitors = radarData?.competitors || []
  const topComp = competitors[0] || { name: 'Liftware Steady', pricing: '₹16,900+ / unit' }
  const complaints = radarData?.customer_voice || [
    { user_complaint: 'Too expensive for everyday users' },
    { user_complaint: 'Battery life issues on continuous use' },
    { user_complaint: 'Feels too heavy or bulky' },
  ]
  const topComplaint = complaints.slice(0, 3)

  return (
    <div className="fp-v2-insights-bar">
      {/* Tabs */}
      <div className="fp-v2-insights-tabs">
        {[
          { id: 'insights', label: 'Key Insights' },
          { id: 'competitors', label: 'Competitor Matrix' },
          { id: 'complaints', label: 'Customer Complaints' },
          { id: 'experiments', label: 'Validation Experiments' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`fp-v2-itab ${activeTab === t.id ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 4 Visual Cards */}
      <div className="fp-v2-insights-cards">
        {/* 1. Top Competitor */}
        <div className="fp-v2-icard bg-[#FFF7ED] border-[#FDBA74]">
          <div className="fp-v2-icard-head text-[#C2410C]">
            <span>👑</span>
            <span>Top Competitor</span>
          </div>
          <div className="fp-v2-icard-body">
            <strong className="text-sm font-bold text-[#1D1B18]">{topComp.name}</strong>
            <span className="text-base font-black text-[#C2410C]">
              {formatIndianCurrencyText(topComp.pricing) || '₹16,900+'}
            </span>
          </div>
          <div className="fp-v2-icard-tags">
            <span className="fp-v2-icard-tag bg-[#FFEDD5] text-[#9A3412]">High Price</span>
            <span className="fp-v2-icard-tag bg-[#FFEDD5] text-[#9A3412]">Heavy Design</span>
          </div>
        </div>

        {/* 2. Common Complaints */}
        <div className="fp-v2-icard bg-[#EFF6FF] border-[#BFDBFE]">
          <div className="fp-v2-icard-head text-[#1D4ED8]">
            <span>👥</span>
            <span>Common Complaints</span>
          </div>
          <div className="fp-v2-icard-body text-xs space-y-1">
            {topComplaint.map((c, i) => (
              <span key={i} className="line-clamp-1 text-[#1E3A8A]">
                • {c.user_complaint || c.pain_point}
              </span>
            ))}
          </div>
          <span className="text-[10px] font-bold text-[#2563EB] cursor-pointer hover:underline" onClick={() => onSwitchTab('radar')}>
            View all complaints →
          </span>
        </div>

        {/* 3. Biggest Opportunity */}
        <div className="fp-v2-icard bg-[#F0FDF4] border-[#86EFAC]">
          <div className="fp-v2-icard-head text-[#15803D]">
            <span>💡</span>
            <span>Biggest Opportunity</span>
          </div>
          <p className="fp-v2-icard-body text-xs text-[#14532D] m-0 leading-relaxed">
            Affordable, lightweight design with better battery life and direct hardware procurement.
          </p>
          <button
            type="button"
            onClick={() => onAddExperiment && onAddExperiment({ title: 'Lightweight battery & grip test' })}
            className="fp-v2-add-btn"
          >
            <Plus size={11} /> Add to Roadmap
          </button>
        </div>

        {/* 4. Next Up Card */}
        <div className="fp-v2-icard bg-[#FAF5FF] border-[#DDD6FE] cursor-pointer hover:shadow-xs transition-all" onClick={() => onSwitchTab('flowmap')}>
          <div className="fp-v2-icard-head text-[#7E22CE]">
            <span>🤖</span>
            <span>Next up</span>
          </div>
          <p className="fp-v2-icard-body text-xs text-[#581C87] m-0 font-medium">
            Complete the prototype design and move to Milestone {String(activeMilestoneIndex + 2).padStart(2, '0')}.
          </p>
          <span className="text-xs font-black text-[#7E22CE] ml-auto">→</span>
        </div>
      </div>
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
  const [gitOpen, setGitOpen] = useState(false)
  const daysInfo = useMemo(() => (project?.deadline ? getDaysRemaining(project.deadline) : null), [project?.deadline])

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

  // Proof of Work & AI Social Post Modal
  const [proofModalTask, setProofModalTask] = useState(null)
  const [proofModalMilestoneTitle, setProofModalMilestoneTitle] = useState('')
  const [taskProofs, setTaskProofs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`udaan:proofs:${project?.id || 'default'}`) || '{}')
    } catch {
      return {}
    }
  })
  const roadmapContainerRef = useRef(null)

  // Hardware BOM & Sourcing State
  const [hardwareBom, setHardwareBom] = useState(() => {
    return project?.hardware_bom || project?.draft?.hardware_bom || []
  })
  const [generatingBom, setGeneratingBom] = useState(false)
  const [hardwareSearchQuery, setHardwareSearchQuery] = useState('')
  const [hardwareSearchResults, setHardwareSearchResults] = useState([])
  const [hardwareSearching, setHardwareSearching] = useState(false)

  useEffect(() => {
    if (project) {
      setHardwareBom(project.hardware_bom || project.draft?.hardware_bom || [])
    }
  }, [project?.id])

  const handleSearchHardware = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!hardwareSearchQuery.trim()) return
    setHardwareSearching(true)
    try {
      const results = await searchHardwareProducts(hardwareSearchQuery.trim())
      setHardwareSearchResults(results || [])
    } catch (err) {
      console.warn('Hardware search error:', err)
    } finally {
      setHardwareSearching(false)
    }
  }

  const handleGenerateProjectBom = async () => {
    if (!project) return
    setGeneratingBom(true)
    try {
      const generated = await generateBillOfMaterials({
        title: project.title || project.name || '',
        description: project.description || project.summary || '',
        domain: project.domain || 'hardware',
        budget: project.business_model?.budget || 25000,
      })
      if (generated && generated.length > 0) {
        setHardwareBom(generated)
        updateSavedProject(project.id, { hardware_bom: generated })
        setProjects(readSavedProjects())
      }
    } catch (err) {
      console.error('Failed to generate BOM:', err)
    } finally {
      setGeneratingBom(false)
    }
  }

  const handleAddCompToBom = (comp) => {
    const updated = [...hardwareBom, { ...comp, id: `hw-${Date.now()}` }]
    setHardwareBom(updated)
    if (project?.id) {
      updateSavedProject(project.id, { hardware_bom: updated })
      setProjects(readSavedProjects())
    }
  }

  const handleRemoveCompFromBom = (compId) => {
    const updated = hardwareBom.filter(c => c.id !== compId)
    setHardwareBom(updated)
    if (project?.id) {
      updateSavedProject(project.id, { hardware_bom: updated })
      setProjects(readSavedProjects())
    }
  }

  function handleOpenProof(item) {
    setProofModalTask(item.task)
    setProofModalMilestoneTitle(item.milestone || '')
  }

  function handleSaveProof(proofData) {
    const nextProofs = { ...taskProofs, [proofData.taskId]: proofData }
    setTaskProofs(nextProofs)
    try {
      localStorage.setItem(`udaan:proofs:${project?.id || 'default'}`, JSON.stringify(nextProofs))
    } catch (e) {
      console.warn('LocalStorage save proof failed', e)
    }
    if (!completed.includes(proofData.taskId)) {
      toggleTask(proofData.taskId)
    }
    setNotice('Proof of work recorded! Your AI social draft is ready to copy or post.')
    setTimeout(() => setNotice(''), 3500)
  }

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
              <div className="fp-v2-container">
                {/* Top Sub-Nav Bar */}
                <FlightPlanTopNav
                  project={project}
                  projects={projectsWithPlans}
                  onSelectProject={(id) => {
                    setSelectedId(id)
                    setSelectedMilestone(0)
                    setNotice('')
                    setError('')
                  }}
                />

                {/* Hero Banner with Mascot & Speech Bubble */}
                <FlightPlanHeroBanner
                  project={project}
                  deadlineStr={project?.deadline}
                  daysInfo={daysInfo}
                  onReplan={() => replan()}
                  replanBusy={busy}
                  onEdit={editing ? () => closeEditor() : openEditor}
                />

                {/* 4 KPI Summary Cards */}
                <FlightPlanKpiBar
                  percent={percent}
                  doneCount={doneCount}
                  taskCount={allTasks.length}
                  deadlineStr={project?.deadline}
                  daysInfo={daysInfo}
                  blockedCount={blockedCount}
                  gitOpen={gitOpen}
                  onToggleGitDetails={() => setGitOpen(!gitOpen)}
                />

                {/* Collapsible Repository & Audit Details */}
                {gitOpen && (
                  <div className="p-5 rounded-3xl bg-white border border-[#EFEAE4] shadow-xs space-y-4 animate-fadeIn">
                    <ConnectedRepositoryPanel
                      repository={connectedRepo}
                      syncing={repoSyncing}
                      comparing={comparing}
                      onSync={handleSyncRepository}
                      onCompare={handleCompareWithRepository}
                      error={compareError}
                      projectId={project.id}
                    />

                    {compareSummary && (
                      <ComparisonSummaryBanner
                        summary={compareSummary}
                        onClose={() => setCompareSummary(null)}
                      />
                    )}
                  </div>
                )}

                {/* View Pills Tab Navigation Bar */}
                <div className="fp-v2-tabs-bar">
                  <div className="fp-v2-pills-group" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      className={`fp-v2-tab-pill ${view === 'flowmap' || view === 'roadmap' ? 'active' : ''}`}
                      onClick={() => setView('flowmap')}
                    >
                      <Route size={14} />
                      <span>Flow Map</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className={`fp-v2-tab-pill ${view === 'radar' ? 'active' : ''}`}
                      onClick={() => setView('radar')}
                    >
                      <Compass size={14} />
                      <span>Market Radar</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className={`fp-v2-tab-pill ${view === 'timeline' || view === 'tasks' ? 'active' : ''}`}
                      onClick={() => setView('timeline')}
                    >
                      <CalendarClock size={14} />
                      <span>Gantt & Timeline</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className={`fp-v2-tab-pill ${view === 'hardware' ? 'active' : ''}`}
                      onClick={() => setView('hardware')}
                    >
                      <Cpu size={14} />
                      <span>Hardware & BOM</span>
                      {(project?.domain === 'hardware' || project?.domain === 'hybrid') && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#D97706] text-white">
                          {project.domain === 'hybrid' ? 'Hybrid' : 'HW'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className={`fp-v2-tab-pill ${view === 'business_model' ? 'active' : ''}`}
                      onClick={() => setView('business_model')}
                    >
                      <CircleDollarSign size={14} />
                      <span>Business Model</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {historyStack.length > 0 && (
                      <button
                        className="fp-undo-btn"
                        type="button"
                        onClick={handleUndoReplan}
                        title="Undo last AI roadmap adjustment"
                      >
                        <Undo2 size={13} /> Undo Replan
                      </button>
                    )}
                    <button
                      type="button"
                      className="fp-v2-schedule-btn"
                      onClick={() => setTimingModalOpen(true)}
                    >
                      <CalendarClock size={14} className="text-[#8E4B49]" />
                      <span>Adjust Schedule</span>
                    </button>
                  </div>
                </div>

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
                  <>
                    <div className="fp-v2-main-grid">
                      <FlightPlanFlowMap
                        milestones={milestones}
                        allTasks={allTasks}
                        completed={completed}
                        activeMilestoneIndex={selectedMilestone}
                        onSelectMilestone={setSelectedMilestone}
                      />

                      <FlightPlanMilestoneInspector
                        milestone={milestones[selectedMilestone] || milestones[0]}
                        milestoneIndex={selectedMilestone}
                        tasks={allTasks.filter(item => item.milestoneIndex === selectedMilestone)}
                        completed={completed}
                        onToggleTask={toggleTask}
                        onOpenWorkbench={handleOpenWorkbench}
                        onSwitchTab={setView}
                        onAddRoadmap={openEditor}
                        daysInfo={daysInfo}
                      />
                    </div>

                    <FlightPlanBottomInsights
                      radarData={effectiveMarketRadar}
                      activeMilestoneIndex={selectedMilestone}
                      onAddExperiment={handleAddExperiment}
                      onSwitchTab={setView}
                    />
                  </>
                ) : view === 'radar' ? (
                  <MarketRadarView
                    radarData={effectiveMarketRadar}
                    onAddExperiment={handleAddExperiment}
                    addingExperimentId={addingExpId}
                  />
                ) : view === 'hardware' ? (
                  <HardwareBomFlightPlanView
                    project={project}
                    hardwareBom={hardwareBom}
                    onGenerateBom={handleGenerateProjectBom}
                    generating={generatingBom}
                    searchQuery={hardwareSearchQuery}
                    onSearchChange={setHardwareSearchQuery}
                    onSearchSubmit={handleSearchHardware}
                    searchResults={hardwareSearchResults}
                    onClearSearchResults={() => setHardwareSearchResults([])}
                    searching={hardwareSearching}
                    onAddComp={handleAddCompToBom}
                    onRemoveComp={handleRemoveCompFromBom}
                  />
                ) : view === 'business_model' ? (
                  <BusinessModelFlightPlanView project={project} />
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
                            onOpenProof={handleOpenProof}
                            hasProof={Boolean(taskProofs[item.id])}
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
              </div>
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

        {/* Proof of Work & AI LinkedIn / Social Media Share Modal */}
        <ProofOfWorkModal
          isOpen={Boolean(proofModalTask)}
          onClose={() => setProofModalTask(null)}
          task={proofModalTask}
          milestoneTitle={proofModalMilestoneTitle}
          projectName={project?.name}
          projectProblem={project?.understanding?.problem_statement || project?.workflow?.understanding?.problem_statement}
          onSaveProof={handleSaveProof}
        />
      </div>
    </div>
  )
}
