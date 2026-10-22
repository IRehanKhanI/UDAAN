import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  BriefcaseBusiness, ChevronRight, Copy, GraduationCap,
  Github, Lightbulb, Paperclip, Plus, Rocket, Send, Sparkles, X
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import InviteMakerModal from '../components/modals/InviteMakerModal.jsx'
import AddTaskModal from '../components/modals/AddTaskModal.jsx'
import MissionControl from './MissionControl.jsx'
import { saveProjectDraft } from '../services/ideaWorkflowService.js'
import { useAuth } from '../app/AuthContext.jsx'
import { readSavedProjects, updateSavedProject } from '../services/projectStorage.js'

const draftKey = 'udaan:idea-draft'
const paletteKey = 'udaan:studio-palette'
const defaultPalette = ['#FFAA8A', '#FBE191', '#FFF1ED', '#EAE4F8']

function readPalette() {
  try {
    const saved = JSON.parse(localStorage.getItem(paletteKey) || 'null')
    if (Array.isArray(saved)) {
      const colors = saved.filter(color => typeof color === 'string' && /^#[\da-f]{6}$/i.test(color))
      if (colors.length) return colors
    }
  } catch {
    // Fall back to the default palette when saved preferences cannot be read.
  }
  return defaultPalette
}

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

  const [taskFilter, setTaskFilter] = useState('all')
  const [paletteColors, setPaletteColors] = useState(readPalette)

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

  const completedTasks = currentProject.flightPlanProgress || currentProject.workflow?.flightPlanProgress || []
  const workbenchTasks = (currentProject.workflow?.flight_plan?.milestones || []).flatMap((milestone, milestoneIndex) =>
    (milestone.tasks || []).map((task, taskIndex) => ({
      ...task,
      id: `${milestoneIndex}-${taskIndex}`,
      title: typeof task === 'string' ? task : task.title,
      milestone: milestone.title,
      dueToday: typeof task === 'object' && Boolean(task.due_today),
      done: completedTasks.includes(`${milestoneIndex}-${taskIndex}`),
    }))
  )
  const displayedTasks = workbenchTasks.filter(task => {
    if (taskFilter === 'due_today') return task.dueToday
    if (taskFilter === 'unassigned') return !task.lead
    return true
  })

  const addWorkbenchTask = partial => {
    const project = projects.find(item => String(item.id) === String(currentProject.id))
    if (!project) return
    const plan = project.workflow?.flight_plan || { milestones: [] }
    const milestones = [...(plan.milestones || [])]
    if (!milestones.length) {
      milestones.push({
        title: 'Workbench',
        category: 'Milestone',
        outcome: '',
        start_date: '',
        target_date: '',
        tasks: [],
      })
    }
    const firstMilestone = milestones[0]
    const newTask = {
      title: partial.title,
      category: partial.category,
      estimated_minutes: partial.estimatedMinutes || 25,
      lead: partial.lead || 'TS',
      due_today: partial.dueToday ?? true,
      difficulty: 'medium',
      subtasks: [],
    }
    const updatedPlan = {
      ...plan,
      milestones: milestones.map((milestone, index) =>
        index === 0 ? { ...firstMilestone, tasks: [...(firstMilestone.tasks || []), newTask] } : milestone
      ),
    }
    updateSavedProject(project.id, current => ({
      ...current,
      workflow: { ...current.workflow, flight_plan: updatedPlan },
    }))
    setProjects(readSavedProjects())
  }

  useEffect(() => {
    localStorage.setItem(paletteKey, JSON.stringify(paletteColors))
  }, [paletteColors])

  const updatePaletteColor = (index, hex) => {
    setPaletteColors(colors => colors.map((color, colorIndex) => colorIndex === index ? hex.toUpperCase() : color))
  }

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

              {/* Workbench tasks come from the selected project's saved flight plan. */}
              <div className="bg-[#FFFFFF] rounded-3xl p-6 border border-[#EFEAE4] shadow-[0_2px_12px_-2px_rgba(31,29,26,0.04)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                      Workbench Task
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

                    <Link
                      to="/flight-plan"
                      className="px-3 py-1.5 rounded-full bg-[#1D1B18] text-white text-xs font-bold no-underline hover:bg-black"
                    >
                      Open Flight Plan
                    </Link>
                    <button
                      type="button"
                      onClick={() => setAddTaskModalOpen(true)}
                      disabled={!projects.length}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8E4B49] text-white text-xs font-bold hover:bg-[#723B39] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                      Add task
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {displayedTasks.length ? displayedTasks.map(task => (
                    <Link
                      key={task.id}
                      to={`/flight-plan?project=${encodeURIComponent(currentProject.id)}&task=${encodeURIComponent(task.id)}`}
                      className="flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-[#EFEAE4] bg-[#FFF8F3]/60 hover:bg-[#FFF8F3] no-underline"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          {task.milestone && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7C766F]">
                              {task.milestone}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.done ? 'bg-[#E7E1DC] text-[#534342]' : 'bg-[#FBE191] text-[#705D1B]'}`}>
                            {task.done ? 'Done' : 'Planned'}
                          </span>
                        </span>
                        <span className={`block mt-1.5 text-xs font-bold leading-snug ${task.done ? 'line-through text-[#7C766F]' : 'text-[#1D1B18]'}`}>
                          {task.title}
                        </span>
                        {(task.lead || task.effort_estimate) && (
                          <span className="block mt-1 text-[11px] text-[#7C766F] font-semibold">
                            {[task.lead && `Lead: ${task.lead}`, task.effort_estimate].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      <ChevronRight size={16} className="mt-1 shrink-0 text-[#7C766F]" />
                    </Link>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-[#D8C1C0] bg-[#FFF8F3]/60 px-4 py-6 text-center">
                      <p className="text-sm font-bold text-[#1D1B18]">
                        {workbenchTasks.length ? 'No tasks match this filter.' : 'No roadmap tasks yet.'}
                      </p>
                      <p className="mt-1 text-xs text-[#7C766F]">
                        {workbenchTasks.length
                          ? 'Choose another filter to see this project’s tasks.'
                          : 'Create tasks in this project’s Flight Plan to see them here.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Color Swatch Palette Bar */}
              <div className="bg-[#FFFFFF] rounded-2xl p-4 border border-[#EFEAE4] shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#7C766F] text-[18px]">palette</span>
                  <span className="text-xs font-bold text-[#1D1B18]">Studio Color Swatches:</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {paletteColors.map((color, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center rounded-full border border-[#EFEAE4] hover:border-[#8E4B49] transition-colors"
                    >
                      <label
                        className="relative inline-flex items-center gap-1.5 pl-2.5 py-1 text-[11px] font-mono font-semibold cursor-pointer"
                        title={`Change color ${color}`}
                      >
                        <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: color }}></span>
                        <span>{color}</span>
                        <input
                          type="color"
                          value={color}
                          onChange={event => updatePaletteColor(index, event.target.value)}
                          aria-label={`Choose color ${index + 1}`}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setPaletteColors(colors => colors.filter((_, colorIndex) => colorIndex !== index))}
                        className="inline-flex items-center justify-center w-7 h-7 mr-0.5 rounded-full text-[#7C766F] hover:bg-[#FFAAA6]/25 hover:text-[#8E4B49] cursor-pointer"
                        aria-label={`Delete color ${color}`}
                        title={`Delete ${color}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPaletteColors(colors => [...colors, defaultPalette[colors.length % defaultPalette.length]])}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-[#D8C1C0] text-[#8E4B49] hover:bg-[#FFAAA6]/20 transition-colors cursor-pointer"
                    aria-label="Add color swatch"
                    title="Add color"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <section id="mission-control" className="scroll-mt-24 space-y-3" aria-label="Project health and readiness">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E4B49]">Project Diagnostics</p>
                <h2 className="text-xl font-extrabold text-[#1D1B18] font-['Plus_Jakarta_Sans']">Project health &amp; readiness</h2>
              </div>
              <MissionControl embedded selectedProjectId={projects.length ? currentProject.id : ''} />
            </section>
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
        onAddTask={addWorkbenchTask}
        projectName={currentProject.name}
      />
    </div>
  )
}
