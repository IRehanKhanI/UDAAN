import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Calendar, Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardCheck, Clock, Code2, Compass, FileSearch, FlaskConical, Lightbulb, LoaderCircle, Pencil, Plus, Rocket, Save, ShieldAlert, ShieldCheck, Sparkles, Trash2, UsersRound, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { analyzeIdeaDraft } from '../services/ideaAnalysisService.js'
import { queueIdeaStageGeneration, getIdeaStageGeneration, saveProjectDraft, fetchProjectDraft, generateIdeaStage } from '../services/ideaWorkflowService.js'
import { saveIdeaProject } from '../services/projectStorage.js'
import { hasActionableFlightPlan } from '../services/flightPlanUtils.js'
import { applyRoadmapSync } from '../services/teamService.js'

const draftKey = 'udaan:idea-draft'
function newUuid() { return globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => { const random = Math.random() * 16 | 0; return (char === 'x' ? random : (random & 3 | 8)).toString(16) }) }
const stages = [
  { key: 'understanding', title: 'Understanding', icon: Sparkles },
  { key: 'research', title: 'Research', icon: FileSearch },
  { key: 'feasibility', title: 'Feasibility', icon: CircleHelp },
  { key: 'launch_timing', title: 'Launch Timing', icon: Calendar },
  { key: 'flight_plan', title: 'Flight Plan', icon: Rocket },
]
const understandingFields = [
  { key: 'project_name', label: 'Project name', placeholder: 'Give your idea a working name', rows: 1 },
  { key: 'problem_statement', label: 'Problem to solve', placeholder: 'What problem are you trying to solve?', rows: 3 },
  { key: 'target_users', label: 'Who it is for', placeholder: 'Who would benefit from this?', rows: 3 },
  { key: 'expected_outcome', label: 'What success looks like', placeholder: 'What would your project help people do?', rows: 3 },
]
function readDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey) || localStorage.getItem(draftKey) || 'null')
    if (draft && !draft.projectId) {
      draft.projectId = newUuid()
      sessionStorage.setItem(draftKey, JSON.stringify(draft))
      localStorage.setItem(draftKey, JSON.stringify(draft))
    }
    return draft
  } catch { return null }
}
function multiline(items) { return (items || []).join('\n') }
function fromMultiline(value) { return value.split('\n').map(item => item.trim()).filter(Boolean) }
const researchSections = [
  { key: 'market_problem_context', title: 'Market and problem context', icon: BookOpen, kind: 'text' },
  { key: 'existing_solutions_competitors', title: 'Existing solutions and alternatives', icon: FileSearch, kind: 'text' },
  { key: 'commonly_available_features', title: 'Commonly available features', icon: ClipboardCheck, kind: 'list' },
  { key: 'gaps_opportunities', title: 'Gaps and opportunities', icon: Lightbulb, kind: 'list' },
  { key: 'potential_users', title: 'Potential users', icon: UsersRound, kind: 'list' },
  { key: 'research_questions', title: 'Research questions', icon: CircleHelp, kind: 'list', tone: 'questions' },
  { key: 'assumptions_to_verify', title: 'Assumptions to verify', icon: ShieldCheck, kind: 'list', tone: 'assumptions' },
  { key: 'recommended_validation_actions', title: 'Validation actions', icon: FlaskConical, kind: 'list', tone: 'actions' },
  { key: 'preliminary_hypotheses', title: 'Preliminary hypotheses', icon: Lightbulb, kind: 'list', note: 'Unverified starting points' },
  { key: 'sources', title: 'Sources', icon: FileSearch, kind: 'sources' },
  { key: 'evidence_note', title: 'Evidence note', icon: Sparkles, kind: 'text' },
]
const feasibilitySections = [
  { key: 'summary', title: 'Feasibility Summary', icon: Sparkles, kind: 'text', layout: 'summary' },
  { key: 'technical_feasibility', title: 'Technical Feasibility, Architecture and Challenges', icon: Code2, kind: 'text', layout: 'technical' },
  { key: 'advantages', title: 'Advantages', icon: CheckCircle2, kind: 'list', layout: 'advantages' },
  { key: 'limitations', title: 'Limitations', icon: AlertCircle, kind: 'list', layout: 'limitations' },
  { key: 'risks_and_mitigations', title: 'Risks and Mitigations', icon: ShieldAlert, kind: 'risks', layout: 'risks' },
  { key: 'mvp_scope', title: 'MVP Scope', icon: Compass, kind: 'scope', layout: 'scope' },
  { key: 'resources_and_effort', title: 'Resources and Effort', icon: UsersRound, kind: 'text', layout: 'resources' },
  { key: 'validation_checklist', title: 'Validation Checklist', icon: ClipboardCheck, kind: 'list', layout: 'validation' },
  { key: 'market_demand_note', title: 'Market Demand Note', icon: FileSearch, kind: 'text', layout: 'market-demand' },
]
function isHttpUrl(value) {
  try { const parsed = new URL(value); return parsed.protocol === 'http:' || parsed.protocol === 'https:' } catch { return false }
}
function researchEditorValue(section, value) {
  if (section.kind === 'sources') return (value || []).map(source => [source.title || '', source.url || '', source.explanation || ''].join(' | ')).join('\n')
  return section.kind === 'list' ? multiline(value) : value || ''
}
function researchEditorResult(section, value) {
  if (section.kind === 'text') return value
  if (section.kind === 'list') return fromMultiline(value)
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const [title = '', url = '', ...explanation] = line.split('|').map(part => part.trim())
    return { title, url, explanation: explanation.join(' | ') }
  })
}
function FeasibilityReportCard({ section, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const editorRef = useRef(null)
  const Icon = section.icon
  const populated = section.kind === 'text' ? Boolean(value?.trim()) : section.kind === 'list' || section.kind === 'risks' ? Boolean(value?.length) : Boolean(value && (value.essential_features?.length || value.postpone?.length || value.scope_rationale?.trim()))
  useEffect(() => {
    if (!editing || !editorRef.current) return
    editorRef.current.querySelectorAll('textarea').forEach(editor => {
      editor.style.height = 'auto'
      editor.style.height = `${editor.scrollHeight}px`
    })
  }, [editing, editValue])
  function startEditing() {
    if (section.kind === 'text') setEditValue(value || '')
    else if (section.kind === 'list') setEditValue(multiline(value))
    else if (section.kind === 'risks') setEditValue(JSON.stringify(value || [], null, 2))
    else if (section.kind === 'scope') setEditValue(JSON.stringify(value || { essential_features: [], postpone: [], scope_rationale: '' }, null, 2))
    setEditing(true)
  }
  function saveEditing() {
    try {
      if (section.kind === 'text') onSave(editValue)
      else if (section.kind === 'list') onSave(fromMultiline(editValue))
      else if (section.kind === 'risks' || section.kind === 'scope') onSave(JSON.parse(editValue))
      setEditing(false)
    } catch { /* Syntax error handled gracefully */ }
  }
  return (
    <article className={`ud-feasibility-section ud-feasibility-${section.layout}`}>
      <header className="ud-feasibility-header">
        <div className="ud-feasibility-header-title">
          <span className="ud-feasibility-icon"><Icon size={16} /></span>
          <h3>{section.title}</h3>
        </div>
        <button type="button" className="ud-research-edit" onClick={() => editing ? setEditing(false) : startEditing()}>
          <Pencil size={13} /> {editing ? 'Close' : 'Edit'}
        </button>
      </header>
      {editing ? (
        <div className="ud-feasibility-editor" ref={editorRef}>
          <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={4} />
          <div className="ud-research-editor-actions">
            <button type="button" className="ud-research-cancel" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
            <button type="button" className="ud-research-save" onClick={saveEditing}><Check size={14} /> Save</button>
          </div>
        </div>
      ) : !populated ? (
        <p className="ud-research-empty">No details yet. Use Edit to add content.</p>
      ) : section.kind === 'text' ? (
        <p className="ud-research-paragraph">{value}</p>
      ) : section.kind === 'list' ? (
        <ul className="ud-research-list">{(value || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
      ) : section.kind === 'risks' ? (
        <div className="space-y-2">{(value || []).map((r, i) => (
          <div key={i} className="p-3 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4]">
            <strong className="text-xs font-bold text-[#8E4B49] block">{r.risk || r.title || 'Risk'}</strong>
            <p className="text-xs text-[#534342] mt-0.5">{r.mitigation || r.solution}</p>
          </div>
        ))}</div>
      ) : (
        <div className="space-y-2">
          {value?.scope_rationale && <p className="text-xs text-[#1D1B18] font-medium">{value.scope_rationale}</p>}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#fff1ed]/50 border border-[#f0dedb]">
              <span className="font-bold text-[#8e4b49] block mb-1">Essential MVP:</span>
              <ul className="list-disc pl-4 space-y-0.5">{(value?.essential_features || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FBE191]/40 border border-[#FBE191]">
              <span className="font-bold text-[#766320] block mb-1">Postpone for Later:</span>
              <ul className="list-disc pl-4 space-y-0.5">{(value?.postpone || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

function FlightPlanMilestone({ milestone, index, onFieldChange, onTasksChange, onRemove }) {
  return (
    <div className="p-4 rounded-2xl bg-[#FFF8F3] border border-[#EFEAE4] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#8E4B49]">Milestone {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-[#8E4B49] hover:text-black p-1">
          <Trash2 size={14} />
        </button>
      </div>
      <input
        type="text"
        value={milestone.title || ''}
        onChange={e => onFieldChange('title', e.target.value)}
        placeholder="Milestone title"
        className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFEAE4] text-xs font-bold"
      />
      <input
        type="text"
        value={milestone.outcome || ''}
        onChange={e => onFieldChange('outcome', e.target.value)}
        placeholder="Expected outcome"
        className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#EFEAE4] text-xs"
      />
    </div>
  )
}

function hasStageContent(result) {
  if (!result) return false
  if (typeof result === 'string') return Boolean(result.trim())
  if (Array.isArray(result)) return result.length > 0
  return Object.values(result).some(v => Boolean(v))
}

export default function IdeaAnalysis() {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [draft, setDraft] = useState(readDraft)
  const [step, setStep] = useState(draft?.currentStage ?? 0)
  const [loading, setLoading] = useState(false)
  const [stageLoading, setStageLoading] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [persistenceError, setPersistenceError] = useState('')

  const [understanding, setUnderstanding] = useState(draft?.understanding || { project_name: '', problem_statement: '', target_users: '', expected_outcome: '' })
  const [workflow, setWorkflow] = useState(draft?.workflow || {})
  const [startDate, setStartDate] = useState(draft?.startDate || new Date().toISOString().split('T')[0])
  const [deadline, setDeadline] = useState(draft?.deadline || '')
  const [teamSize, setTeamSize] = useState(draft?.teamSize || 1)
  const [weeklyHours, setWeeklyHours] = useState(draft?.weeklyHours || 20)
  const [projectType, setProjectType] = useState(draft?.projectType || 'Startup')

  const [editingResearch, setEditingResearch] = useState('')
  const [researchEditValue, setResearchEditValue] = useState('')
  const researchEditorRef = useRef(null)

  const draftRef = useRef(draft)
  draftRef.current = draft
  const understandingRef = useRef(understanding)
  understandingRef.current = understanding
  const workflowRef = useRef(workflow)
  workflowRef.current = workflow
  const saveTimerRef = useRef(null)
  const saveQueueRef = useRef(Promise.resolve())
  const editedStagesRef = useRef(new Set())
  const pollingRef = useRef(false)
  const stageRequestsRef = useRef(new Set())

  const research = workflow?.research || {}
  const feasibility = workflow?.feasibility || {}
  const flightPlan = workflow?.flight_plan || {}
  const stageStatuses = draft?.stageStatuses || {}
  const stageErrors = draft?.stageErrors || {}

  const loadingMessages = {
    research: 'Surveying market, competitor patterns, and validation questions…',
    feasibility: 'Analyzing technical feasibility, MVP scope, and operational risks…',
    flight_plan: 'Sequencing milestones, dependencies, and actionable work pods…',
  }

  function persist(updates = {}) {
    setDraft(current => {
      const next = {
        ...current,
        understanding: understandingRef.current,
        workflow: workflowRef.current,
        startDate,
        deadline,
        teamSize,
        weeklyHours,
        projectType,
        ...updates,
      }
      sessionStorage.setItem(draftKey, JSON.stringify(next))
      localStorage.setItem(draftKey, JSON.stringify(next))
      return next
    })
  }

  function changeUnderstanding(key, value) {
    setUnderstanding(prev => {
      const next = { ...prev, [key]: value }
      understandingRef.current = next
      persist({ understanding: next })
      return next
    })
  }

  function updateWorkflowField(stage, path, value) {
    setWorkflow(prev => {
      const nextStage = { ...(prev[stage] || {}) }
      const keys = path.split('.')
      let curr = nextStage
      for (let i = 0; i < keys.length - 1; i++) {
        if (!curr[keys[i]]) curr[keys[i]] = {}
        curr = curr[keys[i]]
      }
      curr[keys[keys.length - 1]] = value
      const nextWorkflow = { ...prev, [stage]: nextStage }
      workflowRef.current = nextWorkflow
      editedStagesRef.current.add(stage)
      persist({ workflow: nextWorkflow })
      return nextWorkflow
    })
  }

  function startResearchEdit(section) {
    setEditingResearch(section.key)
    setResearchEditValue(researchEditorValue(section, research[section.key]))
  }

  function saveResearchEdit(section) {
    const updated = researchEditorResult(section, researchEditValue)
    updateWorkflowField('research', section.key, updated)
    setEditingResearch('')
    setResearchEditValue('')
  }

  async function analyzeUnderstanding() {
    if (!draft?.idea?.trim()) {
      setError('Add a short description of your idea first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await analyzeIdeaDraft(draft.idea, draft.attachment?.text)
      if (res) {
        setUnderstanding({
          project_name: res.project_name || understanding.project_name,
          problem_statement: res.problem_statement || understanding.problem_statement,
          target_users: res.target_users || understanding.target_users,
          expected_outcome: res.expected_outcome || understanding.expected_outcome,
        })
        persist({ understandingSaved: true })
        setNotice('Idea breakdown generated successfully!')
        setTimeout(() => setNotice(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Could not analyze idea with AI.')
    } finally {
      setLoading(false)
    }
  }

  function goToStage(idx) {
    setStep(idx)
    persist({ currentStage: idx })
  }

  async function generateStageDirectly(stage) {
    setStageLoading(stage)
    try {
      const res = await generateIdeaStage(draft.projectId, stage)
      if (res) {
        setWorkflow(prev => ({ ...prev, [stage]: res }))
        persist({ workflow: { ...workflow, [stage]: res } })
      }
    } catch (err) {
      setError(`Failed to generate ${stage}: ${err.message}`)
    } finally {
      setStageLoading('')
    }
  }

  async function saveForLater() {
    persist()
    navigate('/')
  }

  async function createProject() {
    const name = understanding.project_name.trim()
    if (!name) {
      setError('Add a project name in Understanding before creating your project.')
      setStep(0)
      return
    }
    setLoading(true)
    try {
      const project = saveIdeaProject({
        draft: { ...draft, projectId: draft.projectId, idea: draft.idea, projectType, startDate, deadline, teamSize, weeklyHours },
        understanding,
        workflow,
      })
      sessionStorage.removeItem(draftKey)
      localStorage.removeItem(draftKey)
      navigate(`/flight-plan?project=${encodeURIComponent(project.id)}`, { state: { createdProject: name } })
    } catch (err) {
      setError(err.message || 'Could not save project.')
    } finally {
      setLoading(false)
    }
  }

  const pageEntrance = prefersReducedMotion ? {} : {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25 },
  }

  return (
    <div className="min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans'] ud-analysis-page">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header onToggleMobileMenu={() => setMenuOpen(!menuOpen)} />

        {!draft ? (
          <motion.main className="ud-analysis-main" {...pageEntrance}>
            <section className="ud-no-draft">
              <Sparkles size={28} className="mx-auto mb-2 text-[#8E4B49]" />
              <h1>No idea draft found</h1>
              <p>Start with your idea on the studio dashboard, then come back here to shape it into a full flight plan.</p>
              <Link className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors no-underline" to="/">
                <span>Back to Dashboard</span>
                <ArrowRight size={15} />
              </Link>
            </section>
          </motion.main>
        ) : (
          <motion.main className="ud-analysis-main" {...pageEntrance}>
            <Link className="ud-analysis-back" to="/" onClick={saveForLater}>
              <ArrowLeft size={15} /> Back to dashboard
            </Link>

            <section className="ud-analysis-heading">
              <span className="ud-analysis-kicker">
                <Sparkles size={15} /> YOUR IDEA, TAKING SHAPE
              </span>
              <h1>
                {[
                  "Let's give your idea clear structure.",
                  "Let's research what to validate.",
                  "Let's see what is feasible.",
                  "When do you want to launch?",
                  "Your first flight plan.",
                ][step]}
              </h1>
              <p>
                {[
                  'Shape the idea before doing deeper work. Clarify core problem, target audience, and outcome.',
                  'Turn unknowns into questions and practical validation steps with AI research.',
                  'Review what seems promising and what needs evidence before building.',
                  'Set your target deadline and team capacity to create a realistic schedule.',
                  'Put the build steps in a realistic, deadline-driven order you can act on.',
                ][step]}
              </p>
            </section>

            {/* Stage Rail Navigation */}
            <nav className="ud-stage-rail" aria-label="Project creation stages">
              {stages.map((stage, index) => {
                const isComplete = (draft.completedStages || []).includes(stage.key)
                return (
                  <button
                    type="button"
                    key={stage.key}
                    className={`${index === step ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                    aria-current={index === step ? 'step' : undefined}
                    onClick={() => goToStage(index)}
                  >
                    <span>{isComplete ? <Check size={14} /> : index + 1}</span>
                    <small>{stage.title}</small>
                  </button>
                )
              })}
            </nav>

            {/* Main Stage Card */}
            <section className="ud-analysis-card">
              <div className="ud-idea-summary">
                <div>
                  <span className="ud-field-eyebrow">YOUR ORIGINAL IDEA</span>
                  <p>{draft.idea}</p>
                </div>
                <span className="ud-summary-type">{projectType || draft.projectType}</span>
              </div>
              {draft.attachment?.name && (
                <p className="ud-summary-attachment">
                  Reference attached: {draft.attachment.name}
                </p>
              )}

              {/* Step 0: Understanding */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[#1D1B18]">Clarify the Idea Pillars</h2>
                      <p className="text-xs text-[#534342]">Review the original idea and refine its working name, problem, audience, and outcome.</p>
                    </div>
                    {loading && <LoaderCircle size={16} className="animate-spin text-[#8E4B49]" />}
                  </div>

                  <div className="ud-analysis-fields">
                    {understandingFields.map((field) => (
                      <label key={field.key}>
                        <span>{field.label}</span>
                        <textarea
                          value={understanding[field.key] || ''}
                          onChange={(e) => changeUnderstanding(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={field.rows}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: Research */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[#1D1B18]">Research Landscape & Validation</h2>
                      <p className="text-xs text-[#534342]">Preliminary AI landscape and competitor patterns. Verify claims before relying on them.</p>
                    </div>
                    {stageLoading === 'research' && <LoaderCircle size={16} className="animate-spin text-[#8E4B49]" />}
                  </div>

                  <div className="space-y-3">
                    {researchSections.map((section) => {
                      const Icon = section.icon
                      const value = research[section.key]
                      const hasContent = section.kind === 'text' ? Boolean(value?.trim()) : Boolean(value?.length)
                      const isEditing = editingResearch === section.key
                      return (
                        <article key={section.key} className="p-4 rounded-2xl bg-[#FFF8F3] border border-[#EFEAE4] space-y-2">
                          <header className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-[#FFAAA6]/30 text-[#8E4B49] flex items-center justify-center">
                                <Icon size={14} />
                              </span>
                              <h3 className="text-xs font-bold text-[#1D1B18]">{section.title}</h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => isEditing ? setEditingResearch('') : startResearchEdit(section)}
                              className="text-xs font-semibold text-[#8E4B49] hover:underline"
                            >
                              {isEditing ? 'Close' : 'Edit'}
                            </button>
                          </header>

                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                ref={researchEditorRef}
                                value={researchEditValue}
                                onChange={(e) => setResearchEditValue(e.target.value)}
                                rows={4}
                                className="w-full p-3 rounded-xl bg-white border border-[#EFEAE4] text-xs font-sans"
                              />
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditingResearch('')} className="px-3 py-1 text-xs text-[#534342]">Cancel</button>
                                <button type="button" onClick={() => saveResearchEdit(section)} className="px-4 py-1 rounded-full bg-[#1D1B18] text-white text-xs font-bold">Save</button>
                              </div>
                            </div>
                          ) : !hasContent ? (
                            <p className="text-xs text-[#7C766F] italic">No details yet. Click Edit to add notes.</p>
                          ) : section.kind === 'text' ? (
                            <p className="text-xs text-[#1D1B18] leading-relaxed">{value}</p>
                          ) : section.kind === 'list' ? (
                            <ul className="text-xs space-y-1 list-disc pl-4 text-[#1D1B18]">
                              {(value || []).map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                          ) : (
                            <ul className="text-xs space-y-1">
                              {(value || []).map((s, i) => (
                                <li key={i} className="text-[#1D1B18]">
                                  <strong>{s.title || s.url}</strong>: {s.explanation}
                                </li>
                              ))}
                            </ul>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Feasibility */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[#1D1B18]">Feasibility Review & MVP Scope</h2>
                      <p className="text-xs text-[#534342]">Assess buildability separately from market demand. Review architecture challenges and scope.</p>
                    </div>
                    {stageLoading === 'feasibility' && <LoaderCircle size={16} className="animate-spin text-[#8E4B49]" />}
                  </div>

                  <div className="space-y-3">
                    {feasibilitySections.map((section) => (
                      <FeasibilityReportCard
                        key={section.key}
                        section={section}
                        value={section.key === 'mvp_scope' ? feasibility.mvp_scope : feasibility[section.key]}
                        onSave={(val) => updateWorkflowField('feasibility', section.key, val)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Launch Timing */}
              {step === 3 && (() => {
                const todayIso = new Date().toISOString().split('T')[0]
                const startVal = startDate || todayIso
                let daysRemaining = 0
                if (deadline) {
                  const ms = new Date(deadline) - new Date(startVal)
                  daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
                }
                const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7))
                const capacityHours = weeksRemaining * teamSize * weeklyHours

                return (
                  <div className="space-y-4">
                    <h2 className="text-base font-bold text-[#1D1B18]">Target Launch Schedule & Capacity</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1D1B18] mb-1">Target Deadline *</label>
                        <input
                          type="date"
                          min={todayIso}
                          value={deadline}
                          onChange={(e) => {
                            setDeadline(e.target.value)
                            persist({ deadline: e.target.value })
                          }}
                          className="w-full p-3 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1D1B18] mb-1">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value)
                            persist({ startDate: e.target.value })
                          }}
                          className="w-full p-3 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1D1B18] mb-1">Team Size (Contributors)</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={teamSize}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1)
                            setTeamSize(val)
                            persist({ teamSize: val })
                          }}
                          className="w-full p-3 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1D1B18] mb-1">Weekly Hours / Person</label>
                        <input
                          type="number"
                          min="1"
                          max="168"
                          value={weeklyHours}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 20)
                            setWeeklyHours(val)
                            persist({ weeklyHours: val })
                          }}
                          className="w-full p-3 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs"
                        />
                      </div>
                    </div>

                    {deadline ? (
                      <div className="p-4 rounded-2xl bg-[#fff1ed]/50 border border-[#f0dedb] flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-[#8e4b49] block text-sm font-bold">{daysRemaining} days remaining ({weeksRemaining} weeks)</strong>
                          <span className="text-[#534342]">Estimated capacity: ~{capacityHours} person-hours</span>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-[#8e4b49]">Pacing: Balanced</span>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#FBE191]/30 border border-[#FBE191] text-xs text-[#705D1B]">
                        Pick a target deadline to calculate estimated delivery pacing and person-hours.
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Step 4: Flight Plan Preview */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[#1D1B18]">Your Generated Flight Plan</h2>
                      <p className="text-xs text-[#534342]">Review milestones and sequenced tasks before creating your project.</p>
                    </div>
                    {!(flightPlan.milestones || []).length && (
                      <button
                        type="button"
                        onClick={() => generateStageDirectly('flight_plan')}
                        disabled={Boolean(stageLoading)}
                        className="px-4 py-2 rounded-full bg-[#FFAAA6] text-[#7A3C3A] text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Sparkles size={14} />
                        <span>Generate with AI</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {(flightPlan.milestones || []).map((m, idx) => (
                      <FlightPlanMilestone
                        key={idx}
                        milestone={m}
                        index={idx}
                        onFieldChange={(k, v) => updateWorkflowField('flight_plan', `milestones.${idx}.${k}`, v)}
                        onTasksChange={(t) => updateWorkflowField('flight_plan', `milestones.${idx}.tasks`, t)}
                        onRemove={() => updateWorkflowField('flight_plan', 'milestones', (flightPlan.milestones || []).filter((_, i) => i !== idx))}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => updateWorkflowField('flight_plan', 'milestones', [...(flightPlan.milestones || []), { title: '', outcome: '', tasks: [] }])}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-[#D8C1C0] hover:border-[#8E4B49] text-xs font-bold text-[#8E4B49] flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    <span>Add Milestone Manually</span>
                  </button>
                </div>
              )}

              {/* Feedback messages */}
              {notice && <div className="ud-analysis-success"><Check size={16} /><span>{notice}</span></div>}
              {error && <div className="ud-analysis-error"><AlertCircle size={16} /><span>{error}</span></div>}
              {persistenceError && <div className="ud-analysis-error"><AlertCircle size={16} /><span>{persistenceError}</span></div>}

              {/* Action buttons */}
              <div className="ud-analysis-actions">
                <button type="button" onClick={saveForLater} className="ud-analysis-secondary">
                  <Save size={14} /> Save for later
                </button>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <button type="button" onClick={() => goToStage(step - 1)} className="ud-analysis-secondary">
                      <ArrowLeft size={14} /> Back
                    </button>
                  )}
                  {step === 0 && (
                    <button type="button" onClick={analyzeUnderstanding} disabled={loading} className="ud-analysis-secondary">
                      {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span>{loading ? 'Analyzing…' : 'Analyze My Idea'}</span>
                    </button>
                  )}
                  {step < 4 ? (
                    <button type="button" onClick={() => goToStage(step + 1)} className="ud-analysis-primary">
                      <span>Continue to {stages[step + 1].title}</span>
                      <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button type="button" onClick={createProject} disabled={loading} className="ud-analysis-primary">
                      {loading ? <LoaderCircle size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}
                      <span>Create Project & Roadmap</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            <p className="ud-analysis-footnote">
              Your work saves in this browser as you go. AI suggestions are editable and never replace verified evidence.
            </p>
          </motion.main>
        )}
      </div>
    </div>
  )
}
