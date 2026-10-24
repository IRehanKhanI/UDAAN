import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import InviteMakerModal from '../components/modals/InviteMakerModal.jsx'
import { fetchWorkspaceProjects } from '../services/ideaWorkflowService.js'
import { readSavedProjects, syncBackendProjects } from '../services/projectStorage.js'

// ── Clean inline SVG icons (Phosphor / custom line style) ────────────
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

const IconCheck = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

const IconPlus = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const IconUsers = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IconCalendar = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)

const IconChevronRight = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18l6-6-6-6" />
  </svg>
)

const IconTarget = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
)

const IconCheckCircle = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const IconRepo = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

// ── Journey step definitions with SVG icon components ────────────────
const JOURNEY_STEPS = [
  { label: 'Idea & Research', key: 'understanding', Icon: IconBulb },
  { label: 'Architecture', key: 'feasibility', Icon: IconBlueprint },
  { label: 'MVP Build', key: 'mvp', Icon: IconCode },
  { label: 'Testing', key: 'testing', Icon: IconFlask },
  { label: 'Launch', key: 'launch', Icon: IconRocket },
]

export default function MainDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')

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
    }).catch(() => {})
  }, [])

  const currentProject = projects.find(p => String(p.id) === String(selectedProjectId)) || projects[0] || {
    id: 'starter',
    name: 'WorkCraft – Freelance & Task Marketplace',
    category: 'Startup',
    description: 'Peer-to-peer freelance task marketplace with milestone verification and escrow.',
    progress: 15,
  }

  const progress = currentProject.progress || 0
  const completedTasks = currentProject.flightPlanProgress || []
  const flightMilestones = currentProject.workflow?.flight_plan?.milestones || []
  const totalTasks = flightMilestones.flatMap(m => m.tasks || []).length || 9
  const doneCount = completedTasks.length

  // Ring chart math
  const radius = 26
  const circ = 2 * Math.PI * radius
  const strokeDash = circ - (progress / 100) * circ

  // Active step
  const activeIndex = Math.min(
    Math.floor((progress / 100) * JOURNEY_STEPS.length),
    JOURNEY_STEPS.length - 1
  )

  return (
    <div className="min-h-screen bg-[#F7F4F0] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans']">
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

        <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-4">

          {/* ── Hero card ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#E8E3DD] shadow-sm overflow-hidden">
            <div className="h-[3px] w-full bg-gradient-to-r from-[#FF6B6B] via-[#FFD93D] to-[#6BCB77]" />

            <div className="p-6 flex flex-col sm:flex-row gap-5 items-start">

              {/* Ring */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <svg width="68" height="68" viewBox="0 0 68 68">
                  {/* Track */}
                  <circle cx="34" cy="34" r={radius} fill="none" stroke="#F0ECE6" strokeWidth="6" />
                  {/* Progress arc */}
                  <circle
                    cx="34" cy="34" r={radius}
                    fill="none"
                    stroke="url(#progressGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={strokeDash}
                    transform="rotate(-90 34 34)"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FF6B6B" />
                      <stop offset="100%" stopColor="#FFD93D" />
                    </linearGradient>
                  </defs>
                  <text x="34" y="38" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1D1B18" fontFamily="Plus Jakarta Sans, sans-serif">{progress}%</text>
                </svg>
                <span className="text-[10px] font-semibold text-[#9B9590] tracking-wide uppercase">Progress</span>
              </div>

              {/* Project info */}
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#FFF0F0] text-[#C0392B] border border-[#FECACA]">
                    {currentProject.category || 'Startup'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-[#9B9590]">
                    <IconCalendar size={11} />
                    80 days left
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-[#1D1B18] tracking-tight leading-tight">
                  {currentProject.name}
                </h1>

                {/* Stats row */}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F4F9F7] border border-[#D1EDE8] text-xs font-semibold text-[#2A7A6F]">
                    <IconCheckCircle size={13} className="text-[#2A9D8F]" />
                    {doneCount}/{totalTasks} Tasks
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F3FA] border border-[#DDD6F3] text-xs font-semibold text-[#5B3E9A]">
                    <IconRepo size={13} className="text-[#7C5CBF]" />
                    {currentProject.repository ? currentProject.repository.name : 'No Repo'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate('/launch')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1D1B18] hover:bg-[#111] text-white text-xs font-bold transition-all shadow-sm hover:shadow hover:-translate-y-px active:translate-y-0 cursor-pointer"
                >
                  <IconPlus size={14} />
                  New Idea
                </button>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF7F4] text-[#1D1B18] text-xs font-bold border border-[#E8E3DD] transition-colors cursor-pointer"
                >
                  <IconUsers size={13} />
                  Invite
                </button>
              </div>
            </div>
          </div>

          {/* ── Journey path ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#E8E3DD] shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                  <IconTarget size={15} className="text-[#92400E]" />
                </span>
                <span className="text-sm font-bold text-[#1D1B18]">Your Journey</span>
              </div>
              <Link to="/flight-plan" className="text-[11px] font-bold text-[#8E4B49] hover:opacity-70 flex items-center gap-0.5 no-underline transition-opacity">
                Full Plan
                <IconChevronRight size={12} />
              </Link>
            </div>

            {/* Steps */}
            <div className="relative px-4">
              {/* Track line */}
              <div className="absolute left-10 right-10 top-[22px] h-0.5 bg-[#F0ECE6] z-0">
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FFD93D] rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(2, progress)}%` }}
                />
              </div>

              <div className="relative z-10 flex items-start justify-between">
                {JOURNEY_STEPS.map((step, i) => {
                  const done = i < activeIndex
                  const active = i === activeIndex
                  const { Icon } = step
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2" style={{ flex: '1 1 0' }}>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all duration-200 ${
                        done
                          ? 'bg-[#2A9D8F] border-[#2A9D8F] shadow-sm'
                          : active
                            ? 'bg-white border-[#FF6B6B] shadow-md ring-4 ring-[#FF6B6B]/10'
                            : 'bg-white border-[#E8E3DD]'
                      }`}>
                        {done
                          ? <IconCheck size={16} className="text-white" />
                          : <Icon size={17} className={active ? 'text-[#FF6B6B]' : 'text-[#C5BFB8]'} />
                        }
                      </div>
                      <span className={`text-[10px] font-semibold text-center leading-tight max-w-[60px] ${
                        done ? 'text-[#2A9D8F]' : active ? 'text-[#1D1B18]' : 'text-[#C5BFB8]'
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
