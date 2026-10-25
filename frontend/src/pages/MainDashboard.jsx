import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import InviteMakerModal from '../components/modals/InviteMakerModal.jsx'
import Interactive3DCharacter from '../components/mascot/Interactive3DCharacter.jsx'
import { fetchWorkspaceProjects } from '../services/ideaWorkflowService.js'
import { readSavedProjects, syncBackendProjects, updateSavedProject } from '../services/projectStorage.js'

// ── Icons ────────────────────────────────────────────────────────────
const IconBulb = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.16-3 5.2V16H9v-1.8A6.002 6.002 0 0 1 6 9a6 6 0 0 1 6-6Z" />
  </svg>
)

const IconBlueprint = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9M15 15h3M15 12h3M6 15h3M6 12h3" />
  </svg>
)

const IconCode = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

const IconFlask = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 3h6M9 3v6l-4 9a1 1 0 0 0 .9 1.45h12.2A1 1 0 0 0 21 18l-4-9V3" />
    <path d="M8 13h8" />
  </svg>
)

const IconRocket = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
)

const IconCheck = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconPlus = ({ size = 15, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconCalendar = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IconClock = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const IconPaperclip = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.88-7.88" />
  </svg>
)

const IconPlay = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

const IconPause = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
)

const IconMoreVertical = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
)

const IconChevronRight = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const JOURNEY_STEPS = [
  { label: 'Idea & Research', key: 'understanding', Icon: IconBulb, path: '/launch' },
  { label: 'Architecture', key: 'feasibility', Icon: IconBlueprint, path: '/launch' },
  { label: 'MVP Build', key: 'mvp', Icon: IconCode, path: '/flight-plan' },
  { label: 'Testing', key: 'testing', Icon: IconFlask, path: '/flight-plan' },
  { label: 'Launch', key: 'launch', Icon: IconRocket, path: '/flight-plan' },
]

export default function MainDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')

  // Live Stopwatch for session time tracking
  const [isTracking, setIsTracking] = useState(false)
  const [trackedSeconds, setTrackedSeconds] = useState(4965) // ~1h 22m 45s default

  // New task inline composer
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskHours, setNewTaskHours] = useState('2')

  useEffect(() => {
    let interval = null
    if (isTracking) {
      interval = setInterval(() => {
        setTrackedSeconds(s => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTracking])

  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  useEffect(() => {
    const list = readSavedProjects()
    setProjects(list)
    const urlProj = searchParams.get('project')
    const stored = urlProj || localStorage.getItem('udaan:selected-project') || list[0]?.id || ''
    setSelectedProjectId(stored)
  }, [searchParams])

  useEffect(() => {
    fetchWorkspaceProjects().then(data => {
      if (data?.results?.length) {
        const synced = syncBackendProjects(data.results)
        setProjects(synced)
      }
    }).catch(() => { })
  }, [])

  const currentProject = projects.find(p => String(p.id) === String(selectedProjectId)) || projects[0] || {
    id: 'starter',
    name: 'StudentBudgetPlanner',
    category: 'Fintech & Student Tools',
    description: 'Smart student budget manager with automated expense tracking and meal splits.',
    progress: 45,
  }

  const completedTasks = currentProject.flightPlanProgress || []
  const flightMilestones = currentProject.workflow?.flight_plan?.milestones || []

  // Extract all tasks from project milestones, or provide realistic initial tasks
  const rawMilestoneTasks = flightMilestones.flatMap((m, mIdx) =>
    (m.tasks || []).map((t, tIdx) => {
      const id = t._fpId || `${mIdx}-${tIdx}`
      const isDone = completedTasks.includes(id)
      return {
        id,
        title: typeof t === 'string' ? t : t.title,
        projectName: currentProject.name,
        time: t.effort_estimate || '2 hrs',
        attachments: 2,
        status: isDone ? 'Done' : (tIdx === 0 ? 'In progress' : 'New'),
        done: isDone,
        milestoneIndex: mIdx,
      }
    })
  )

  const defaultStarterTasks = [
    {
      id: 'default-1',
      title: 'UI design_moodboard creation',
      projectName: currentProject.name,
      time: '2 hrs',
      attachments: 2,
      status: 'In progress',
      done: false,
    },
    {
      id: 'default-2',
      title: 'UI design_design layouts & assets',
      projectName: currentProject.name,
      time: '6 hrs',
      attachments: 8,
      status: 'In progress',
      done: false,
    },
    {
      id: 'default-3',
      title: 'UI design_presentation & user testing',
      projectName: currentProject.name,
      time: '1 hrs',
      attachments: 2,
      status: 'Done',
      done: true,
    },
  ]

  const customDaily = currentProject.customDailyTasks || []
  const allDisplayTasks = rawMilestoneTasks.length > 0
    ? [...customDaily, ...rawMilestoneTasks]
    : [...customDaily, ...defaultStarterTasks]

  const totalTasks = allDisplayTasks.length
  const doneCount = allDisplayTasks.filter(t => t.done).length
  const inProgressCount = allDisplayTasks.filter(t => !t.done && t.status === 'In progress').length
  const progressPercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : (currentProject.progress || 0)

  // Toggle task completed state
  const handleToggleTask = (taskId) => {
    const isCustom = customDaily.some(t => t.id === taskId)
    if (isCustom) {
      const updatedCustom = customDaily.map(t =>
        t.id === taskId ? { ...t, done: !t.done, status: !t.done ? 'Done' : 'New' } : t
      )
      const updated = updateSavedProject(currentProject.id, cur => ({
        ...cur,
        customDailyTasks: updatedCustom,
      }))
      if (updated) {
        setProjects(readSavedProjects())
      }
      return
    }

    // Toggle in flightPlanProgress
    const alreadyDone = completedTasks.includes(taskId)
    const nextCompleted = alreadyDone
      ? completedTasks.filter(id => id !== taskId)
      : [...completedTasks, taskId]

    const nextPct = rawMilestoneTasks.length > 0
      ? Math.round((nextCompleted.length / rawMilestoneTasks.length) * 100)
      : Math.min(100, Math.max(0, (currentProject.progress || 0) + (alreadyDone ? -15 : 15)))

    const updated = updateSavedProject(currentProject.id, cur => ({
      ...cur,
      flightPlanProgress: nextCompleted,
      progress: nextPct,
    }))

    if (updated) {
      setProjects(readSavedProjects())
    }
  }

  // Add new task
  const handleCreateNewTask = (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    const newTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      projectName: currentProject.name,
      time: `${newTaskHours || 2} hrs`,
      attachments: 1,
      status: 'New',
      done: false,
    }
    const updatedCustom = [newTask, ...customDaily]
    const updated = updateSavedProject(currentProject.id, cur => ({
      ...cur,
      customDailyTasks: updatedCustom,
    }))
    if (updated) {
      setProjects(readSavedProjects())
    }
    setNewTaskTitle('')
    setIsAddingTask(false)
  }

  // Active step calculation
  const activeJourneyIndex = Math.min(
    Math.floor((progressPercent / 100) * JOURNEY_STEPS.length),
    JOURNEY_STEPS.length - 1
  )

  // Today formatted date
  const todayStr = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
  }, [])

  // Second project for recent projects card
  const otherProjects = projects.filter(p => String(p.id) !== String(currentProject.id))
  const secondaryProject = otherProjects[0] || {
    id: 'starter-2',
    name: 'WorkCraft – Freelance Task Hub',
    category: 'Freelance & Marketplace',
    progress: 80,
  }

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans'] antialiased">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header
          currentProject={currentProject}
          onToggleMobileMenu={() => setMenuOpen(!menuOpen)}
          onInviteClick={() => setInviteModalOpen(true)}
          onProjectSelect={(p) => {
            setSelectedProjectId(p.id)
            setProjects(readSavedProjects())
          }}
        />

        <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto w-full space-y-7">

          {/* ── Top Bar / Date ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#8C847E] tracking-wider uppercase">Overview</span>
              <h1 className="text-xl sm:text-2xl font-black text-[#1D1B18] tracking-tight">Today, {todayStr}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/launch')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1D1B18] hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <IconPlus size={14} />
                <span>New Project</span>
              </button>
            </div>
          </div>

          {/* ── Welcome Banner Card (Warm Pastel Mint with Brush Strokes) ─ */}
          <div className="relative rounded-3xl bg-gradient-to-r from-[#EBF7EE] via-[#F4F9EA] to-[#FDF4EA] border border-[#D5EAD9] p-6 sm:p-8 overflow-hidden shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Playful abstract brush strokes in background */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none opacity-80 hidden sm:block">
              <svg viewBox="0 0 400 160" fill="none" className="w-full h-full object-cover">
                {/* Pink brush stroke */}
                <path d="M 40 80 Q 90 20 180 70 T 320 40" stroke="#FF6584" strokeWidth="18" strokeLinecap="round" opacity="0.85" />
                {/* Yellow/Amber brush stroke */}
                <path d="M 120 130 Q 200 100 280 140 T 380 90" stroke="#FBBF24" strokeWidth="22" strokeLinecap="round" opacity="0.6" />
                {/* Warm illustrated hand / flower doodle */}
                <circle cx="340" cy="50" r="16" fill="#F472B6" opacity="0.3" />
                <circle cx="290" cy="110" r="12" fill="#FCD34D" opacity="0.4" />
              </svg>
            </div>

            <div className="relative z-10 max-w-xl space-y-3">
              <span className="text-xs sm:text-sm font-semibold text-[#5B8266] tracking-wide">
                Welcome back to your
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#1D1B18] tracking-tight leading-tight">
                Daily task manager
              </h2>
              <p className="text-xs sm:text-sm text-[#5B635A] max-w-md">
                Keep the momentum going. Track your active flight sprint, verify tasks, and stay on schedule for launch.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTracking(!isTracking)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${isTracking
                    ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                    : 'bg-[#1D1B18] text-white hover:bg-black'
                    }`}
                >
                  {isTracking ? <IconPause size={13} /> : <IconPlay size={13} />}
                  <span>{isTracking ? 'Pause tracking' : 'Start tracking'}</span>
                  {isTracking && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 font-mono text-[11px]">
                      {formatTimer(trackedSeconds)}
                    </span>
                  )}
                </button>

                <Link
                  to="/flight-plan"
                  className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-white/80 hover:bg-white text-[#1D1B18] text-xs font-bold border border-[#D5EAD9] transition-all no-underline shadow-xs cursor-pointer"
                >
                  <span>Flight Plan Roadmap</span>
                  <IconChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* Interactive 3D Companion Copilot (Clean, Large, Bubble-Free) */}
            <div className="relative z-10 hidden sm:flex flex-col items-center select-none shrink-0 self-center">
              <Interactive3DCharacter size="overview" showBubble={false} modelIndex={0} phase={activeJourneyIndex} />
            </div>
          </div>

          {/* ── Metric Strip (Time tracker, Tasks in progress, Finished, Team) ── */}


          {/* ── Main Two-Column Split (Recent Projects vs Daily Tasks) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

            {/* ── LEFT COLUMN (5 Cols): Recent Projects + Quote + Boards ── */}
            <div className="lg:col-span-5 space-y-6">

              {/* Recent projects header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#1D1B18] tracking-tight">Recent projects</h3>
                <Link to="/projects" className="text-xs font-bold text-[#8C847E] hover:text-[#1D1B18] no-underline transition-colors">
                  View all
                </Link>
              </div>

              {/* Projects Card Grid (Berry Pink + Golden Amber) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">

                {/* Card 1: Active Project (Berry Pink Gradient) */}
                <div
                  onClick={() => navigate('/flight-plan')}
                  className="rounded-3xl bg-gradient-to-br from-[#FF6384] to-[#F04368] p-5 text-white shadow-md flex flex-col justify-between min-h-[190px] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-white/30 backdrop-blur text-[9px] font-bold flex items-center justify-center ring-1 ring-white/50">
                        +7
                      </span>
                      <span className="w-5 h-5 rounded-full bg-white/40 text-[9px] font-bold flex items-center justify-center ring-1 ring-white/50">
                        ●
                      </span>
                    </div>
                    <span className="p-1 rounded-full hover:bg-white/20 transition-colors">
                      <IconMoreVertical size={14} className="text-white/80" />
                    </span>
                  </div>

                  <div className="space-y-1 my-3">
                    <h4 className="text-lg font-black tracking-tight leading-snug line-clamp-2">
                      {currentProject.name}
                    </h4>
                    <p className="text-[11px] font-medium text-white/80 line-clamp-1">
                      {currentProject.category || 'Startup · Active Sprint'}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-white/90">
                      <span>{doneCount}/{totalTasks} Tasks</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Secondary / Next Project (Warm Golden Amber) */}
                <div
                  onClick={() => {
                    if (secondaryProject.id !== 'starter-2') {
                      setSelectedProjectId(secondaryProject.id)
                      localStorage.setItem('udaan:selected-project', secondaryProject.id)
                    } else {
                      navigate('/launch')
                    }
                  }}
                  className="rounded-3xl bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] p-5 text-white shadow-md flex flex-col justify-between min-h-[190px] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:rotate-0 rotate-1 transition-all relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-white/30 backdrop-blur text-[9px] font-bold flex items-center justify-center ring-1 ring-white/50">
                        +3
                      </span>
                    </div>
                    <span className="p-1 rounded-full hover:bg-white/20 transition-colors">
                      <IconMoreVertical size={14} className="text-white/80" />
                    </span>
                  </div>

                  <div className="space-y-1 my-3">
                    <h4 className="text-lg font-black tracking-tight leading-snug line-clamp-2">
                      {secondaryProject.name}
                    </h4>
                    <p className="text-[11px] font-medium text-white/80 line-clamp-1">
                      {secondaryProject.category || 'Fintech / Task Engine'}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-white/90">
                      <span>240 hours</span>
                      <span>{secondaryProject.progress || 80}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${secondaryProject.progress || 80}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Motivational Founder Quote Sticky Note Card */}
              <div className="rounded-2xl bg-white border border-[#E8E2D9] p-5 relative shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#1D1B18] italic leading-relaxed">
                      "Until we can manage time, we can manage nothing else."
                    </p>
                    <span className="text-xs font-bold text-[#8C847E] block">
                      Peter Drucker
                    </span>
                  </div>

                  {/* Ink squiggle / doodle SVG */}
                  <svg width="48" height="24" viewBox="0 0 54 26" fill="none" className="shrink-0 text-[#1D1B18]">
                    <path d="M2 14C12 8 20 20 30 10C38 2 46 16 52 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Workspace Board Quick Cards (Creative brief, Architecture, Google Calendar) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  to="/flight-plan"
                  className="rounded-2xl bg-white border border-[#E8E2D9] p-3.5 flex flex-col justify-between hover:border-[#8E4B49] transition-all no-underline group shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition-transform">
                    ★
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1D1B18] block group-hover:text-[#9333EA] transition-colors">Creative brief</span>
                    <span className="text-[11px] text-[#8C847E]">14 cards</span>
                  </div>
                </Link>

                <Link
                  to="/launch"
                  className="rounded-2xl bg-white border border-[#E8E2D9] p-3.5 flex flex-col justify-between hover:border-[#8E4B49] transition-all no-underline group shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition-transform">
                    ⚡
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1D1B18] block group-hover:text-[#10B981] transition-colors">Tech Architecture</span>
                    <span className="text-[11px] text-[#8C847E]">3 boards</span>
                  </div>
                </Link>

                <Link
                  to="/developer-profile"
                  className="rounded-2xl bg-white border border-[#E8E2D9] p-3.5 flex flex-col justify-between hover:border-[#8E4B49] transition-all no-underline group shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition-transform">
                    📅
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1D1B18] block group-hover:text-[#3B82F6] transition-colors">Calendar Sync</span>
                    <span className="text-[11px] text-[#8C847E]">Google Cal</span>
                  </div>
                </Link>
              </div>

            </div>

            {/* ── RIGHT COLUMN (7 Cols): Daily Tasks Checklist ────────── */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#1D1B18] tracking-tight">
                  Daily tasks ({allDisplayTasks.length})
                </h3>
                <span className="text-xs text-[#8C847E] font-medium">
                  {doneCount} of {allDisplayTasks.length} completed
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3">
                {allDisplayTasks.map((task) => {
                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl bg-white border transition-all p-4.5 flex items-start justify-between gap-3 shadow-xs hover:border-[#D5CFC7] ${task.done ? 'bg-[#FAF8F5] border-[#EAE4DC] opacity-75' : 'border-[#E8E2D9]'
                        }`}
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#8C847E] block">
                          Project: {task.projectName}
                        </span>

                        <h4 className={`text-sm font-bold text-[#1D1B18] tracking-tight leading-snug ${task.done ? 'line-through text-[#8C847E]' : ''
                          }`}>
                          {task.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#8C847E] font-medium">
                          <span className="inline-flex items-center gap-1">
                            <IconClock size={12} />
                            {task.time}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <IconPaperclip size={12} />
                            {task.attachments} attachments
                          </span>
                        </div>
                      </div>

                      {/* Right side: Status Tag + Checkbox */}
                      <div className="flex items-center gap-3 shrink-0 pt-0.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${task.done
                          ? 'bg-[#F0ECE6] text-[#6B7280]'
                          : task.status === 'In progress'
                            ? 'bg-[#ECFDF5] text-[#059669]'
                            : 'bg-[#FFFBEB] text-[#D97706]'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${task.done
                            ? 'bg-[#9CA3AF]'
                            : task.status === 'In progress'
                              ? 'bg-[#10B981]'
                              : 'bg-[#F59E0B]'
                            }`} />
                          {task.done ? 'Done' : task.status}
                        </span>

                        {/* Interactive Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${task.done
                            ? 'bg-[#1D1B18] border-[#1D1B18] text-white shadow-xs'
                            : 'bg-white border-[#D1CAC0] hover:border-[#1D1B18]'
                            }`}
                          title={task.done ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {task.done && <IconCheck size={12} />}
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Add new task button / inline form */}
                {isAddingTask ? (
                  <form onSubmit={handleCreateNewTask} className="rounded-2xl bg-white border border-[#1D1B18] p-4 space-y-3 shadow-sm">
                    <input
                      type="text"
                      autoFocus
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Design responsive landing hero"
                      className="w-full text-xs font-bold text-[#1D1B18] placeholder-[#9B9590] outline-none border-b border-[#E8E2D9] pb-2"
                    />
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-[#8C847E]">
                        <IconClock size={12} />
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={newTaskHours}
                          onChange={e => setNewTaskHours(e.target.value)}
                          className="w-12 px-1.5 py-0.5 rounded border border-[#E8E2D9] text-xs font-bold text-center"
                        />
                        <span>hours</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingTask(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#8C847E] hover:text-[#1D1B18]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black"
                        >
                          Add Task
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(true)}
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#E5DFD7] hover:border-[#1D1B18] hover:bg-white text-[#8C847E] hover:text-[#1D1B18] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <IconPlus size={14} />
                    <span>Add a new task</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* ── "Your Journey" Milestones Track (Polished Footer Strip) ─── */}
          <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-xs p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center font-bold text-xs">
                  🎯
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#1D1B18]">Your Journey · Product Flight Path</h3>
                  <span className="text-[11px] text-[#8C847E]">Stage {activeJourneyIndex + 1} of 5: {JOURNEY_STEPS[activeJourneyIndex]?.label}</span>
                </div>
              </div>
              <Link
                to="/flight-plan"
                className="text-xs font-bold text-[#8E4B49] hover:underline flex items-center gap-0.5 no-underline"
              >
                Full Plan
                <IconChevronRight size={13} />
              </Link>
            </div>

            {/* Stepper with connector line */}
            <div className="relative px-3 sm:px-6">
              {/* Connector line */}
              <div className="absolute left-10 right-10 top-5 h-0.5 bg-[#EFEBE4] z-0">
                <div
                  className="h-full bg-gradient-to-r from-[#FF6384] via-[#FBBF24] to-[#10B981] rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>

              <div className="relative z-10 flex items-start justify-between">
                {JOURNEY_STEPS.map((step, i) => {
                  const done = i < activeJourneyIndex
                  const active = i === activeJourneyIndex
                  const { Icon } = step
                  return (
                    <div
                      key={step.key}
                      onClick={() => navigate(step.path)}
                      className="flex flex-col items-center gap-2 cursor-pointer group"
                      style={{ flex: '1 1 0' }}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-200 group-hover:scale-105 ${done
                        ? 'bg-[#10B981] border-[#10B981] shadow-xs text-white'
                        : active
                          ? 'bg-white border-[#FF6384] shadow-md ring-4 ring-[#FF6384]/15'
                          : 'bg-white border-[#E8E2D9] text-[#9B9590]'
                        }`}>
                        {done
                          ? <IconCheck size={16} />
                          : <Icon size={16} className={active ? 'text-[#FF6384]' : 'text-[#9B9590]'} />
                        }
                      </div>
                      <span className={`text-[11px] font-bold text-center leading-tight max-w-[70px] ${done ? 'text-[#10B981]' : active ? 'text-[#1D1B18]' : 'text-[#8C847E]'
                        }`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </main>
      </div>

      <InviteMakerModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </div>
  )
}
