import { useState } from 'react'
import { BookOpen, CalendarDays, Check, CheckCircle2, Code2, Copy, FileText, KeyRound, Lightbulb, LoaderCircle, Rocket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { readSavedProjects } from '../services/projectStorage.js'
import { createTeamMcpToken } from '../services/teamService.js'

function textValue(value, fallback = 'Not documented yet.') {
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export default function Docs() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [projects, setProjects] = useState(readSavedProjects)
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('udaan:selected-project') || projects[0]?.id || '')
  const [mcpConnection, setMcpConnection] = useState(null)
  const [mcpBusy, setMcpBusy] = useState(false)
  const [mcpError, setMcpError] = useState('')
  const [copied, setCopied] = useState(false)
  const project = projects.find(item => String(item.id) === String(selectedId)) || projects[0] || null
  const understanding = project?.understanding || {}
  const milestones = project?.workflow?.flight_plan?.milestones || []

  const selectProject = selected => {
    if (!selected?.id) return
    localStorage.setItem('udaan:selected-project', selected.id)
    setSelectedId(selected.id)
    setProjects(readSavedProjects())
    setMcpConnection(null)
    setMcpError('')
  }
  const createMcpConnection = async () => {
    if (!project || (mcpConnection && !window.confirm('Creating a new token immediately revokes the previous MCP token. Continue?'))) return
    setMcpBusy(true)
    setMcpError('')
    try {
      setMcpConnection(await createTeamMcpToken(project.id))
      setCopied(false)
    } catch (error) {
      setMcpError(error.message || 'Could not create an MCP connection.')
    } finally {
      setMcpBusy(false)
    }
  }
  const mcpConfig = mcpConnection && JSON.stringify({
    mcpServers: {
      udaan: {
        url: mcpConnection.mcp_url,
        headers: { Authorization: `Bearer ${mcpConnection.token}` },
      },
    },
  }, null, 2)
  const copyMcpConfig = async () => {
    try {
      await navigator.clipboard.writeText(mcpConfig)
      setCopied(true)
    } catch {
      setMcpError('Clipboard access failed. Select and copy the configuration manually.')
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans']">
      <Sidebar activePage="docs" open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header
          currentProject={project}
          onToggleMobileMenu={() => setMenuOpen(value => !value)}
          onProjectSelect={selectProject}
        />
        <main className="ud-main flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <div className="mx-auto max-w-5xl space-y-6">
            <section className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-[#8E4B49]"><BookOpen size={15} /> PROJECT DOCS</span>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1D1B18]">Project documentation</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746B65]">A shared reference for your project brief, people, and planned work.</p>
              </div>
              {project && <div className="flex gap-2">
                <Link to="/flight-plan" className="inline-flex items-center gap-2 rounded-xl border border-[#EFEAE4] bg-white px-3 py-2 text-sm font-semibold text-[#8E4B49] no-underline"><Rocket size={15} /> Flight Plan</Link>
                <Link to="/repository" className="inline-flex items-center gap-2 rounded-xl border border-[#EFEAE4] bg-white px-3 py-2 text-sm font-semibold text-[#8E4B49] no-underline"><Code2 size={15} /> Repository</Link>
              </div>}
            </section>

            {!project ? (
              <section className="rounded-2xl border border-[#EFEAE4] bg-white p-8 text-center">
                <FileText className="mx-auto text-[#A35A53]" size={28} />
                <h2 className="mt-3 text-lg font-bold">No project docs yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#746B65]">Create a project to collect its brief and roadmap documentation here.</p>
                <Link to="/projects/new/setup" className="mt-5 inline-flex rounded-xl bg-[#8E4B49] px-4 py-2.5 text-sm font-semibold text-white no-underline">Create a project</Link>
              </section>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,.8fr)]">
                <div className="space-y-5">
                  <section className="rounded-2xl border border-[#EFEAE4] bg-white p-6">
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#A35A53]"><Lightbulb size={15} /> PROJECT OVERVIEW</div>
                    <h2 className="mt-3 text-2xl font-bold text-[#1D1B18]">{project.name || understanding.project_name || 'Untitled project'}</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#625A55]">{project.description || understanding.problem_statement || project.idea || 'No project overview has been added yet.'}</p>
                    <div className="mt-5 grid gap-4 border-t border-[#F3EDE7] pt-5 sm:grid-cols-2">
                      <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#8E4B49]">Problem</h3><p className="mt-1 text-sm leading-6 text-[#746B65]">{textValue(understanding.problem_statement, project.idea || 'Not documented yet.')}</p></div>
                      <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#8E4B49]">Target users</h3><p className="mt-1 text-sm leading-6 text-[#746B65]">{textValue(understanding.target_users)}</p></div>
                      <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#8E4B49]">Expected outcome</h3><p className="mt-1 text-sm leading-6 text-[#746B65]">{textValue(understanding.expected_outcome)}</p></div>
                      <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#8E4B49]">Project type</h3><p className="mt-1 text-sm leading-6 text-[#746B65]">{project.category || project.project_type || 'Not specified'}</p></div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#EFEAE4] bg-white p-6">
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#A35A53]"><Rocket size={15} /> FLIGHT PLAN</div>
                    <h2 className="mt-2 text-xl font-bold text-[#1D1B18]">Milestones and tasks</h2>
                    {milestones.length ? <div className="mt-4 space-y-3">
                      {milestones.map((milestone, index) => (
                        <article key={`${milestone.title}-${index}`} className="rounded-xl border border-[#F3EDE7] p-4">
                          <h3 className="font-bold text-[#8E4B49]">{milestone.title || `Milestone ${index + 1}`}</h3>
                          {milestone.outcome && <p className="mt-1 text-sm leading-6 text-[#746B65]">{milestone.outcome}</p>}
                          {milestone.tasks?.length > 0 ? <ul className="mt-3 space-y-2">{milestone.tasks.map((task, taskIndex) => <li key={`${task.title || task}-${taskIndex}`} className="flex items-start gap-2 text-sm text-[#625A55]"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#A35A53]" /><span>{typeof task === 'string' ? task : task.title}</span></li>)}</ul> : <p className="mt-2 text-sm text-[#8B827C]">No tasks planned yet.</p>}
                        </article>
                      ))}
                    </div> : <p className="mt-3 text-sm leading-6 text-[#746B65]">No milestones have been added to this project yet.</p>}
                  </section>
                </div>

                <aside className="h-fit rounded-2xl border border-[#EFEAE4] bg-white p-6">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#A35A53]"><Users size={15} /> PROJECT DETAILS</div>
                  <h2 className="mt-2 text-lg font-bold text-[#1D1B18]">{project.name || 'Project'}</h2>
                  <dl className="mt-4 space-y-4 text-sm">
                    <div><dt className="text-xs font-semibold uppercase tracking-wider text-[#8B827C]">Status</dt><dd className="mt-1 font-semibold text-[#625A55]">{project.statusLabel || project.status || 'Planning'}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wider text-[#8B827C]">Team capacity</dt><dd className="mt-1 font-semibold text-[#625A55]">{project.teamSize || project.team_size || 1} members</dd></div>
                    <div><dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#8B827C]"><CalendarDays size={12} /> Target date</dt><dd className="mt-1 font-semibold text-[#625A55]">{project.deadline || 'Not set'}</dd></div>
                  </dl>
                  <Link to={`/team?project=${encodeURIComponent(project.id)}`} className="mt-5 inline-flex text-sm font-semibold text-[#8E4B49] no-underline">Open Team Workspace →</Link>
                  <div className="mt-6 border-t border-[#F3EDE7] pt-5">
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#A35A53]"><KeyRound size={14} /> MCP AGENT ACCESS</div>
                    <p className="mt-2 text-sm leading-6 text-[#746B65]">Connect an MCP-compatible agent to read project tasks, assign tasks to team members, and update task status or mark work complete.</p>
                    <button type="button" onClick={() => void createMcpConnection()} disabled={mcpBusy} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#8E4B49] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                      {mcpBusy ? <LoaderCircle size={15} className="animate-spin" /> : <KeyRound size={15} />}
                      {mcpBusy ? 'Creating token…' : mcpConnection ? 'Rotate MCP token' : 'Create MCP connection'}
                    </button>
                    {mcpError && <p role="alert" className="mt-2 text-sm text-red-700">{mcpError}</p>}
                    {mcpConnection && <div className="mt-3 space-y-2">
                      <p className="text-xs leading-5 text-[#8E4B49]">Token shown once. Copy the config now; rotating it later revokes this token.</p>
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[#625A55]">MCP client configuration</span><button type="button" onClick={() => void copyMcpConfig()} className="inline-flex items-center gap-1 text-xs font-semibold text-[#8E4B49]">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[#F9F2ED] p-3 text-[11px] leading-5 text-[#534342]">{mcpConfig}</pre>
                    </div>}
                  </div>
                </aside>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
