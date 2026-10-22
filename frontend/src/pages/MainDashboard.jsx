import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  BriefcaseBusiness, Check, ChevronRight, Copy, GraduationCap,
  Github, Lightbulb, Paperclip, Plus, Rocket, Send, Sparkles, X
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import InviteMakerModal from '../components/modals/InviteMakerModal.jsx'
import AddTaskModal from '../components/modals/AddTaskModal.jsx'
import { saveProjectDraft } from '../services/ideaWorkflowService.js'
import { useAuth } from '../app/AuthContext.jsx'
import { readSavedProjects } from '../services/projectStorage.js'

const draftKey = 'udaan:idea-draft'
function newUuid() {
  return globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.random() * 16 | 0
    return (char === 'x' ? random : (random & 3 | 8)).toString(16)
  })
}

function readDraft() {
  try { return JSON.parse(sessionStorage.getItem(draftKey) || localStorage.getItem(draftKey) || 'null') } catch { return null }
}

function flightGeometry(origin, width, height) {
  const destination = { x: width * 0.86, y: Math.max(48, height * 0.12) }
  const dx = destination.x - origin.x
  const dy = destination.y - origin.y
  const control1 = { x: origin.x + dx * 0.28, y: origin.y + dy * 0.12 - 52 }
  const control2 = { x: origin.x + dx * 0.72, y: destination.y + (origin.y - destination.y) * 0.18 - 35 }
  const pointAt = t => {
    const u = 1 - t
    return {
      x: u ** 3 * origin.x + 3 * u ** 2 * t * control1.x + 3 * u * t ** 2 * control2.x + t ** 3 * destination.x,
      y: u ** 3 * origin.y + 3 * u ** 2 * t * control1.y + 3 * u * t ** 2 * control2.y + t ** 3 * destination.y,
    }
  }
  const points = [0, 0.32, 0.68, 1].map(pointAt)
  const rotations = points.map((point, index) => {
    const next = points[Math.min(index + 1, points.length - 1)]
    const previous = points[Math.max(index - 1, 0)]
    return Math.atan2(next.y - previous.y, next.x - previous.x) * 180 / Math.PI + 45
  })
  return {
    width, height, origin, destination,
    path: `M ${origin.x} ${origin.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${destination.x} ${destination.y}`,
    x: points.map(point => point.x - origin.x),
    y: points.map(point => point.y - origin.y),
    rotate: rotations,
  }
}

export default function MainDashboard() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)

  const [savedDraft] = useState(readDraft)
  const [idea, setIdea] = useState(savedDraft?.idea ?? '')
  const [intent, setIntent] = useState(savedDraft?.projectType ?? 'Startup')
  const [attachment, setAttachment] = useState(savedDraft?.attachment ?? null)
  const [attachmentNotice, setAttachmentNotice] = useState('')
  const [submission, setSubmission] = useState({ phase: 'idle', message: '', payload: null, geometry: null })
  const fileInput = useRef(null)
  const launchButton = useRef(null)
  const flightGuard = useRef(false)
  const flightPayload = useRef(null)
  const launching = submission.phase === 'flying'

  // Tasks state for Today's Tasks workshop widget
  const [taskFilter, setTaskFilter] = useState('all')
  const [copiedHex, setCopiedHex] = useState(null)
  const [localTasks, setLocalTasks] = useState([
    { id: 'task-1', title: 'Set up instant customer order confirmation flow', projectName: 'CERAMIC STUDIO', status: 'in_progress', lead: 'ER', estimatedMinutes: 20, dueToday: true },
    { id: 'task-2', title: 'Publish 12 limited edition stoneware vase SKUs', projectName: 'CERAMIC STUDIO', status: 'not_started', lead: 'AK', estimatedMinutes: 35, dueToday: true },
    { id: 'task-3', title: 'Connect repository evidence & build pipeline', projectName: 'CERAMIC STUDIO', status: 'done', lead: 'TS', estimatedMinutes: 15, dueToday: false },
  ])

  // Saved projects
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')

  useEffect(() => {
    const list = readSavedProjects()
    setProjects(list)
    const stored = localStorage.getItem('udaan:selected-project') || list[0]?.id || ''
    setSelectedProjectId(stored)
  }, [])

  useEffect(() => () => { flightGuard.current = false; flightPayload.current = null }, [])

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0] || {
    id: 'starter',
    name: 'Ceramic Studio Pre-Orders',
    category: 'E-Commerce / Craft',
    description: '12 bespoke stoneware vases collection',
  }

  const displayedTasks = localTasks.filter(t => {
    if (taskFilter === 'due_today') return t.dueToday
    if (taskFilter === 'unassigned') return !t.lead
    return true
  })

  const handleToggleTask = (id) => {
    setLocalTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'done' ? 'in_progress' : 'done'
        return { ...t, status: nextStatus }
      }
      return t
    }))
  }

  const handleAddNewTask = (newTask) => {
    setLocalTasks(prev => [{
      id: `task-${Date.now()}`,
      projectName: currentProject.name.toUpperCase().slice(0, 16),
      ...newTask,
    }, ...prev])
  }

  const copyPaletteHex = (hex) => {
    navigator.clipboard.writeText(hex)
    setCopiedHex(hex)
    setTimeout(() => setCopiedHex(null), 1800)
  }

  const paletteColors = [
    { hex: '#FFAA8A', label: '#FFAA' },
    { hex: '#FBE191', label: '#FBE1' },
    { hex: '#fff1ed', label: '#D7F5' },
    { hex: '#EAE4F8', label: '#EAE4' },
    { hex: '#8e4b49', label: '#4A65' },
    { hex: '#1D1B18', label: '#1D1B' },
  ]

  async function addAttachment(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 256 * 1024) {
      setAttachmentNotice('Attach a .txt or .md file smaller than 256 KB.')
      return
    }
    try {
      const text = await file.text()
      setAttachment({ name: file.name, text: text.slice(0, 20000) })
      setAttachmentNotice('')
    } catch {
      setAttachmentNotice('This file could not be read. Try another text or Markdown file.')
    }
  }

  function launch(event) {
    event.preventDefault()
    if (flightGuard.current || launching) return
    if (!idea.trim()) {
      setSubmission({ phase: 'error', message: 'Add a few words about your idea to get started.', payload: null, geometry: null })
      document.getElementById('idea-input-field')?.focus()
      return
    }
    setSubmission({ phase: 'idle', message: '', payload: null, geometry: null })
    const rect = launchButton.current?.getBoundingClientRect()
    const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: window.innerWidth * .72, y: window.innerHeight * .8 }
    const projectId = savedDraft?.projectId || newUuid()
    const payload = { ...savedDraft, projectId, idea: idea.trim(), projectType: intent, attachment }
    flightGuard.current = true
    flightPayload.current = payload
    sessionStorage.setItem(draftKey, JSON.stringify(payload))
    localStorage.setItem(draftKey, JSON.stringify(payload))
    saveProjectDraft(payload, savedDraft?.understanding || { project_name: '', problem_statement: '', target_users: '', expected_outcome: '' }, savedDraft?.workflow || {}, 'understanding').catch(() => {})
    setSubmission({ phase: 'flying', message: '', payload, geometry: flightGeometry(origin, window.innerWidth, window.innerHeight) })
  }

  function completeFlight() {
    const payload = flightPayload.current
    if (!flightGuard.current || !payload) return
    flightGuard.current = false
    sessionStorage.setItem(draftKey, JSON.stringify(payload))
    localStorage.setItem(draftKey, JSON.stringify(payload))
    navigate('/projects/new/setup', { state: { projectId: payload.projectId, idea: payload.idea, projectType: payload.projectType } })
  }

  return (
    <div className={`min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans'] ${launching ? 'is-launching' : ''}`}>
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

        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-7 animate-fadeIn">
          {/* GitHub Onboarding Banner if not authenticated */}
          {!auth.loading && !auth.authenticated && (
            <div className="bg-[#FFFFFF] border border-[#EFEAE4] rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#F9F2ED] flex items-center justify-center text-[#1D1B18]">
                  <Github size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1D1B18]">Personalize your workshop team</span>
                  <span className="text-[11px] text-[#534342]">Connect GitHub to save your developer profile and get evidence-aware task suggestions.</span>
                </div>
              </div>
              <Link to="/profile" className="px-3.5 py-1.5 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors no-underline">
                Connect GitHub
              </Link>
            </div>
          )}

          {/* Metrics Bar */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#FFFFFF] p-4 rounded-2xl shadow-[0_1px_4px_rgba(31,29,26,0.03)] border border-[#EFEAE4] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#7C766F] uppercase tracking-wider">
                Focus Time
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                  14
                </span>
                <span className="text-xs text-[#534342] font-semibold">hours logged</span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-4 rounded-2xl shadow-[0_1px_4px_rgba(31,29,26,0.03)] border border-[#EFEAE4] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#7C766F] uppercase tracking-wider">
                Tasks in Progress
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                  {localTasks.filter(t => t.status === 'in_progress').length}
                </span>
                <span className="text-xs text-[#534342] font-semibold">active pods</span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-4 rounded-2xl shadow-[0_1px_4px_rgba(31,29,26,0.03)] border border-[#EFEAE4] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#7C766F] uppercase tracking-wider">
                Milestones Verified
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-extrabold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                  3/5
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fff1ed] text-[#8e4b49]">
                  60%
                </span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-4 rounded-2xl shadow-[0_1px_4px_rgba(31,29,26,0.03)] border border-[#EFEAE4] flex items-center justify-between">
              <div className="flex items-center -space-x-2">
                <div className="w-7 h-7 rounded-full bg-[#FBE191] text-[#705D1B] flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                  LC
                </div>
                <div className="w-7 h-7 rounded-full bg-[#FFAAA6] text-[#7A3C3A] flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                  AV
                </div>
                <div className="w-7 h-7 rounded-full bg-[#f0dedb] text-[#8e4b49] flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                  MC
                </div>
                <div className="w-7 h-7 rounded-full bg-[#E7E1DC] text-[#534342] flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                  +3
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-[#8E4B49] hover:bg-[#FFAAA6]/20 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Invite maker</span>
              </button>
            </div>
          </section>

          {/* Main Workshop Area */}
          <div className="space-y-6">
              {/* Interactive Idea Launcher Card */}
              <div className="bg-[#FFFFFF] rounded-3xl p-6 border border-[#EFEAE4] shadow-[0_2px_12px_-2px_rgba(31,29,26,0.04)] space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#FFAAA6] text-[#7A3C3A] flex items-center justify-center">
                      <Sparkles size={15} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                        What are you dreaming of building?
                      </h2>
                      <p className="text-[11px] text-[#7C766F]">
                        Describe your idea in plain English. UDAAN will generate a flight plan with real milestones.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FBE191] text-[#766320]">
                    AI-Powered
                  </span>
                </div>

                <form onSubmit={launch} noValidate className="space-y-3.5">
                  <label className="sr-only" htmlFor="idea-input-field">Describe your idea</label>
                  <textarea
                    id="idea-input-field"
                    rows={4}
                    value={idea}
                    onChange={(e) => {
                      setIdea(e.target.value)
                      if (submission.phase === 'error') {
                        setSubmission({ phase: 'idle', message: '', payload: null, geometry: null })
                      }
                    }}
                    placeholder="I want to build a weekly artisan bakery drop where local food lovers reserve seasonal sourdough loaves & morning cardamom buns..."
                    disabled={launching}
                    className="w-full p-4 rounded-2xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs sm:text-sm text-[#1D1B18] placeholder-[#7C766F] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6] transition-all resize-none leading-relaxed"
                  />

                  {/* Project Type Selector Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-[#534342] uppercase tracking-wider mr-1">Project Type:</span>
                    {['Startup', 'Hackathon', 'College Project', 'Personal Project'].map((type, index) => {
                      const Icon = [BriefcaseBusiness, Rocket, GraduationCap, Lightbulb][index]
                      const isSelected = intent === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setIntent(type)}
                          disabled={launching}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFAAA6] text-[#7A3C3A] font-bold shadow-xs'
                              : 'bg-[#F9F2ED] text-[#534342] hover:bg-[#EDE7E2]'
                          }`}
                        >
                          <Icon size={13} />
                          <span>{type}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Attachment + Submit Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#EFEAE4]">
                    <div className="flex items-center gap-2">
                      <input
                        className="sr-only"
                        ref={fileInput}
                        type="file"
                        accept=".txt,.md,text/plain,text/markdown"
                        onChange={addAttachment}
                        disabled={launching}
                      />
                      {attachment ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fff8f3] text-[#8e4b49] text-xs font-semibold">
                          <Paperclip size={13} />
                          <span className="truncate max-w-[140px]">{attachment.name}</span>
                          <button
                            type="button"
                            onClick={() => setAttachment(null)}
                            disabled={launching}
                            className="text-[#8E4B49] hover:text-black ml-1"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInput.current?.click()}
                          disabled={launching}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F9F2ED] hover:bg-[#EDE7E2] text-xs text-[#534342] font-semibold transition-colors cursor-pointer"
                        >
                          <Paperclip size={13} />
                          <span>Attach .txt or .md</span>
                        </button>
                      )}
                    </div>

                    <button
                      ref={launchButton}
                      type="submit"
                      disabled={launching}
                      className="px-6 py-2.5 rounded-full bg-[#1D1B18] hover:bg-black text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {launching ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span>Taking off...</span>
                        </>
                      ) : (
                        <>
                          <span>Launch My Idea</span>
                          <Send size={14} />
                        </>
                      )}
                    </button>
                  </div>

                  {submission.phase === 'error' && (
                    <p className="text-xs text-[#8E4B49] bg-[#FFAAA6]/30 px-3 py-2 rounded-xl font-semibold" role="alert">
                      {submission.message}
                    </p>
                  )}
                  {attachmentNotice && (
                    <p className="text-xs text-[#705D1B] bg-[#FBE191]/30 px-3 py-2 rounded-xl font-semibold">
                      {attachmentNotice}
                    </p>
                  )}
                </form>

              </div>

              {/* Today's Tasks Section from Main Studio */}
              <div className="bg-[#FFFFFF] rounded-3xl p-6 border border-[#EFEAE4] shadow-[0_2px_12px_-2px_rgba(31,29,26,0.04)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                      Today&apos;s Workbench Tasks
                    </h2>
                    <span className="w-5 h-5 rounded-full bg-[#E7E1DC] text-[#1D1B18] text-xs font-bold flex items-center justify-center">
                      {displayedTasks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex p-1 bg-[#F3EDE7] rounded-full gap-1">
                      {['all', 'due_today', 'unassigned'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setTaskFilter(f)}
                          className={`px-3 py-1 text-xs font-bold rounded-full transition-all capitalize cursor-pointer ${
                            taskFilter === f
                              ? 'bg-[#FFFFFF] text-[#1D1B18] shadow-xs'
                              : 'text-[#7C766F] hover:text-[#1D1B18]'
                          }`}
                        >
                          {f.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setAddTaskModalOpen(true)}
                      className="p-1 text-[#8E4B49] hover:bg-[#FFAAA6]/30 rounded-full transition-colors cursor-pointer"
                      title="Add task"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {displayedTasks.map((task) => {
                    const isDone = task.status === 'done'
                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                          isDone
                            ? 'border-[#E7E1DC] bg-[#FAF8F5] opacity-75'
                            : 'border-[#EFEAE4] bg-[#FFF8F3]/60 hover:bg-[#FFF8F3]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7C766F]">
                                {task.projectName}
                              </span>
                              {task.status === 'in_progress' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff1ed] text-[#8e4b49] text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#8e4b49]"></span>
                                  In Progress
                                </span>
                              )}
                              {task.status === 'not_started' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBE191] text-[#705D1B] text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#705D1B]"></span>
                                  New
                                </span>
                              )}
                              {task.status === 'done' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7E1DC] text-[#534342] text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#8e4b49]"></span>
                                  Done
                                </span>
                              )}
                            </div>

                            <p className={`text-xs font-bold leading-snug ${isDone ? 'line-through text-[#7C766F]' : 'text-[#1D1B18]'}`}>
                              {task.title}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-[#7C766F] font-semibold">
                              <span>~{task.estimatedMinutes} mins</span>
                              <span>•</span>
                              <span>Lead: {task.lead || 'Unassigned'}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleTask(task.id)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                              isDone
                                ? 'bg-[#8e4b49] border-[#8e4b49] text-white'
                                : 'border-[#D8C1C0] hover:border-[#8E4B49]'
                            }`}
                            aria-label={`Mark ${task.title} as ${isDone ? 'incomplete' : 'done'}`}
                          >
                            {isDone && <Check size={14} strokeWidth={3} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Color Swatch Palette Bar */}
              <div className="bg-[#FFFFFF] rounded-2xl p-4 border border-[#EFEAE4] shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#7C766F] text-[18px]">palette</span>
                  <span className="text-xs font-bold text-[#1D1B18]">Studio Color Swatches:</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {paletteColors.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => copyPaletteHex(color.hex)}
                      className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#EFEAE4] hover:border-[#8E4B49] text-[11px] font-mono font-semibold transition-all cursor-pointer"
                      title={`Copy ${color.hex}`}
                    >
                      <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: color.hex }}></span>
                      <span>{color.hex}</span>
                    </button>
                  ))}
                  {copiedHex && (
                    <span className="text-[11px] text-[#8e4b49] bg-[#fff1ed] px-2 py-0.5 rounded-full font-bold animate-fadeIn">
                      Copied {copiedHex}!
                    </span>
                  )}
                </div>
              </div>
            </div>
        </main>
      </div>

      {/* Flight Takeoff Overlay Animation */}
      {launching && submission.geometry && createPortal(
        <motion.div
          className="fixed inset-0 pointer-events-none z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0.08 : 0.2 }}
          aria-hidden="true"
        >
          {!prefersReducedMotion && (
            <svg className="w-full h-full" viewBox={`0 0 ${submission.geometry.width} ${submission.geometry.height}`} preserveAspectRatio="none">
              <motion.path
                d={submission.geometry.path}
                fill="none"
                stroke="#8E4B49"
                strokeWidth="3"
                strokeDasharray="6 6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 0.7, 0.22, 0] }}
                transition={{ duration: 0.96, ease: [0.4, 0, 0.2, 1], opacity: { duration: 0.96, times: [0, 0.3, 0.72, 1] } }}
              />
            </svg>
          )}
          <motion.span
            className="fixed text-[#8E4B49]"
            style={{ left: submission.geometry.origin.x - 20, top: submission.geometry.origin.y - 20 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.86, rotate: submission.geometry.rotate[0] }}
            animate={prefersReducedMotion ? { opacity: 0, scale: 0.96 } : {
              x: submission.geometry.x,
              y: submission.geometry.y,
              rotate: submission.geometry.rotate,
              opacity: [1, 1, 0.9, 0],
              scale: [0.86, 1, 0.98, 0.88],
            }}
            transition={{
              duration: prefersReducedMotion ? 0.15 : 0.98,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: prefersReducedMotion ? 0.15 : 0.98, times: [0, 0.34, 0.76, 1] },
              scale: { duration: prefersReducedMotion ? 0.15 : 0.98, times: [0, 0.22, 0.72, 1] },
            }}
            onAnimationComplete={completeFlight}
          >
            <Send size={32} strokeWidth={2} />
          </motion.span>
        </motion.div>,
        document.body
      )}

      {/* Global Modals */}
      <InviteMakerModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      <AddTaskModal
        isOpen={addTaskModalOpen}
        onClose={() => setAddTaskModalOpen(false)}
        onAddTask={handleAddNewTask}
        projectName={currentProject.name}
      />
    </div>
  )
}
