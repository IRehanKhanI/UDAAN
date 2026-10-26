import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Mail, Save, Settings, UserPlus, Users, X } from 'lucide-react'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { fetchProjectDraft, saveProjectDraft } from '../services/ideaWorkflowService.js'
import { readSavedProjects, updateSavedProject } from '../services/projectStorage.js'
import { createTeamInvitations, getTeamWorkspace, removeTeamMember, updateTeamMember, updateTeamSize } from '../services/teamService.js'
import './ProjectSettings.css'

const types = ['Startup', 'Hackathon', 'College Project', 'Personal Project']

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function ProjectSettings() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const localProject = useMemo(() => readSavedProjects().find(item => String(item.id) === String(projectId)), [projectId])
  const [project, setProject] = useState(localProject)
  const [form, setForm] = useState({
    name: localProject?.name || '',
    idea: localProject?.idea || localProject?.description || '',
    description: localProject?.description || '',
    projectType: localProject?.category || 'Startup',
    startDate: localProject?.startDate || '',
    deadline: localProject?.deadline || '',
    weeklyHours: localProject?.weeklyHours || 20,
  })
  const [workspace, setWorkspace] = useState(null)
  const [currentStage, setCurrentStage] = useState('understanding')
  const [teamSize, setTeamSize] = useState(localProject?.teamSize || 1)
  const [memberForms, setMemberForms] = useState({})
  const [inviteEmail, setInviteEmail] = useState('')
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([fetchProjectDraft(projectId).catch(() => null), getTeamWorkspace(projectId).catch(() => null)])
      .then(([draft, team]) => {
        if (!active) return
        if (draft) {
          const understanding = draft.understanding || {}
          setProject(current => ({ ...current, id: projectId, businessModel: draft.business_model, workflow: draft.workflow, understanding }))
          setCurrentStage(draft.current_stage || 'understanding')
          setForm({
            name: understanding.project_name || localProject?.name || '',
            idea: draft.idea || '',
            description: understanding.problem_statement || localProject?.description || '',
            projectType: draft.project_type || 'Startup',
            startDate: draft.start_date || '',
            deadline: draft.deadline || '',
            weeklyHours: draft.weekly_hours || 20,
          })
          setTeamSize(draft.team_size || 1)
        }
        if (team) {
          setWorkspace(team)
          setTeamSize(team.project?.team_size || 1)
          setMemberForms(Object.fromEntries((team.members || []).map(member => [member.id, {
            name: member.name || '', email: member.email || '', role: member.role || '', skills: (member.skills || []).join(', '),
          }])))
        }
      })
      .finally(() => active && setBusy(false))
    return () => { active = false }
  }, [projectId])

  const updateForm = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const updateMemberForm = (id, key, value) => setMemberForms(current => ({ ...current, [id]: { ...current[id], [key]: value } }))

  async function saveDetails(event) {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const understanding = {
        ...(project?.understanding || {}),
        project_name: form.name.trim(),
        problem_statement: form.description.trim(),
      }
      const result = await saveProjectDraft({
        projectId, idea: form.idea.trim(), projectType: form.projectType,
        startDate: form.startDate, deadline: form.deadline, weeklyHours: Number(form.weeklyHours),
        teamSize, attachment: project?.attachment, scheduleMetadata: project?.scheduleMetadata,
      }, understanding, project?.workflow || {}, currentStage)
      updateSavedProject(projectId, {
        name: form.name.trim(), idea: form.idea.trim(), description: form.description.trim(),
        category: form.projectType, startDate: form.startDate || null, deadline: form.deadline || null,
        weeklyHours: Number(form.weeklyHours), teamSize,
        understanding, workflow: result?.workflow || project?.workflow || {},
      })
      setNotice('Project details saved.')
    } catch (err) { setError(err.message || 'Project details could not be saved.') }
    finally { setSaving(false) }
  }

  async function saveMember(member) {
    const values = memberForms[member.id] || {}
    setError(''); setNotice('')
    try {
      const updated = await updateTeamMember(projectId, member.id, {
        ...values, skills: values.skills.split(',').map(item => item.trim()).filter(Boolean),
      })
      setWorkspace(current => ({ ...current, members: current.members.map(item => item.id === member.id ? updated : item) }))
      setNotice(`${updated.display_name || 'Member'} updated.`)
    } catch (err) { setError(err.message || 'Member could not be updated.') }
  }

  async function changeTeamSize(value) {
    const next = Math.max(1, Math.min(50, Number(value) || 1))
    setTeamSize(next); setError('')
    try {
      const result = await updateTeamSize(projectId, next)
      setWorkspace(current => ({ ...current, members: result.members }))
      setNotice('Team capacity updated.')
    } catch (err) { setError(err.message || 'Team capacity could not be updated.') }
  }

  async function inviteMember(event) {
    event.preventDefault()
    if (!inviteEmail.trim()) return
    setError(''); setNotice('')
    try {
      const result = await createTeamInvitations(projectId, [{ email: inviteEmail.trim().toLowerCase() }])
      setWorkspace(current => ({ ...current, invitations: result.invitations || current.invitations }))
      setInviteEmail('')
      setNotice('Invitation sent.')
    } catch (err) { setError(err.message || 'Invitation could not be sent.') }
  }

  async function removeMember(member) {
    if (!window.confirm(`Remove ${member.display_name || 'this member'} from the project?`)) return
    try {
      await removeTeamMember(projectId, member.id)
      setWorkspace(current => ({ ...current, members: current.members.filter(item => item.id !== member.id) }))
      setNotice('Member removed.')
    } catch (err) { setError(err.message || 'Member could not be removed.') }
  }

  if (busy) return <div className="psettings-page"><Sidebar /><div className="psettings-main"><Header /><main className="psettings-content"><p>Loading project settings…</p></main></div></div>
  if (!project && !workspace) return <div className="psettings-page"><Sidebar /><div className="psettings-main"><Header /><main className="psettings-content"><section className="psettings-card"><h1>Project not found</h1><Link to="/projects">Back to My Projects</Link></section></main></div></div>

  return <div className="psettings-page">
    <Sidebar />
    <div className="psettings-main"><Header />
      <main className="psettings-content">
        <Link className="psettings-back" to={`/flight-plan?project=${projectId}`}><ArrowLeft size={14} /> Back to project</Link>
        <div className="psettings-heading"><div><span className="psettings-eyebrow"><Settings size={14} /> Project administration</span><h1>Project settings</h1><p>Edit the project context and manage who can work on it.</p></div><span className="psettings-project-pill">{form.name || 'Untitled project'}</span></div>
        {error && <div className="psettings-message error">{error}</div>}
        {notice && <div className="psettings-message success"><Check size={15} /> {notice}</div>}

        <section className="psettings-card"><div className="psettings-section-title"><div><h2>Project details</h2><p>These details are used by UDAAN when generating research, tasks, and recommendations.</p></div></div>
          <form className="psettings-form" onSubmit={saveDetails}>
            <label>Project name<input required value={form.name} onChange={event => updateForm('name', event.target.value)} /></label>
            <label>Project type<select value={form.projectType} onChange={event => updateForm('projectType', event.target.value)}>{types.map(type => <option key={type}>{type}</option>)}</select></label>
            <label className="wide">Idea / solution<textarea required rows="3" value={form.idea} onChange={event => updateForm('idea', event.target.value)} /></label>
            <label className="wide">Problem statement / project description<textarea rows="3" value={form.description} onChange={event => updateForm('description', event.target.value)} /></label>
            <label>Start date<input type="date" value={form.startDate} onChange={event => updateForm('startDate', event.target.value)} /></label>
            <label>Deadline<input type="date" value={form.deadline} onChange={event => updateForm('deadline', event.target.value)} /></label>
            <label>Weekly hours<input type="number" min="1" max="168" value={form.weeklyHours} onChange={event => updateForm('weeklyHours', event.target.value)} /></label>
            <div className="psettings-actions wide"><button className="psettings-primary" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save project details'}</button></div>
          </form>
        </section>

        <section className="psettings-card"><div className="psettings-section-title"><div><h2><Users size={18} /> Team members</h2><p>Edit roles, skills, and contact details. Changes also appear in Team Workspace.</p></div><label className="psettings-capacity">Team capacity<input type="number" min="1" max="50" value={teamSize} onChange={event => changeTeamSize(event.target.value)} /></label></div>
          <form className="psettings-invite" onSubmit={inviteMember}><Mail size={16} /><input type="email" required placeholder="Invite by email address" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} /><button className="psettings-secondary"><UserPlus size={14} /> Invite</button></form>
          <div className="psettings-members">{(workspace?.members || []).map(member => <article className="psettings-member" key={member.id}><div className="psettings-member-head"><span className="psettings-avatar">{initials(member.display_name || member.name)}</span><div><strong>{member.display_name || 'Unassigned slot'}</strong><small>{member.is_creator ? 'Project creator' : `${member.task_count || 0} tasks assigned`}</small></div></div><div className="psettings-member-fields"><label>Name<input value={memberForms[member.id]?.name || ''} onChange={event => updateMemberForm(member.id, 'name', event.target.value)} /></label><label>Email<input type="email" value={memberForms[member.id]?.email || ''} onChange={event => updateMemberForm(member.id, 'email', event.target.value)} /></label><label>Role<input value={memberForms[member.id]?.role || ''} onChange={event => updateMemberForm(member.id, 'role', event.target.value)} /></label><label>Skills<input value={memberForms[member.id]?.skills || ''} onChange={event => updateMemberForm(member.id, 'skills', event.target.value)} placeholder="React, research" /></label></div><div className="psettings-member-actions"><button className="psettings-secondary" type="button" onClick={() => saveMember(member)}><Save size={14} /> Save member</button>{!member.is_creator && <button className="psettings-danger" type="button" onClick={() => removeMember(member)}><X size={14} /> Remove</button>}</div></article>)}</div>
          <Link className="psettings-workspace-link" to={`/team?project=${projectId}`}>Open full Team Workspace <span>→</span></Link>
        </section>
      </main>
    </div>
  </div>
}
