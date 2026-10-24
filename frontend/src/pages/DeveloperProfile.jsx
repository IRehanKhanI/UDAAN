import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import UdaanLoader from '../components/UdaanLoader.jsx'
import { AlertCircle, BookOpen, Calendar, Check, ExternalLink, Github, Key, LoaderCircle, LogOut, RefreshCw, Save, ShieldCheck, Sparkles, UserCheck, UserRound } from 'lucide-react'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { useAuth } from '../app/AuthContext.jsx'
import { readSavedProjects } from '../services/projectStorage.js'
import { getDeveloperProfile, startGitHubLogin, updateDeveloperProfile, quickLogin, logoutAccount, connectGitHubUsername } from '../services/authService.js'
import { getTechHistory, saveTechHistory } from '../services/githubService.js'
import { createGoogleCalendarUrl, downloadIcsFile } from '../services/calendarService.js'
import './DeveloperProfile.css'

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/bottts/svg?seed=udaan1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=udaan2',
]

const POPULAR_SKILLS = [
  'React', 'JavaScript', 'TypeScript', 'Next.js', 'Python', 'Django',
  'Node.js', 'PostgreSQL', 'Supabase', 'Firebase', 'Tailwind CSS',
  'Flutter', 'HTML/CSS', 'SQL', 'FastAPI', 'Docker', 'REST API'
]

export default function DeveloperProfile() {
  const { auth, refresh } = useAuth()
  const [query, setQuery] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ skills: '', experience: '', preferred_roles: '', availability_hours: 10, learning_goals: '', avatar_url: '' })
  const [quickName, setQuickName] = useState('Lead Developer')
  const [quickEmail, setQuickEmail] = useState('')
  const [quickRole, setQuickRole] = useState('Full-Stack Lead')
  const [githubHandle, setGithubHandle] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0])
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(query.get('github') === 'connected' ? 'GitHub is connected. Review your developer profile below.' : '')

  // Google Calendar Integration State
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')

  // GitHub Personal Access Token (Secret Key) State
  const [githubPat, setGithubPat] = useState('')
  const [hasSavedPat, setHasSavedPat] = useState(false)

  // User Tech Knowledge History (DB Stored)
  const [knownTech, setKnownTech] = useState([])

  useEffect(() => {
    const errors = {
      cancelled: 'GitHub sign-in was cancelled.',
      invalid_state: 'The sign-in session expired. Start GitHub sign-in again.',
      not_configured: 'GitHub OAuth is not configured on this server.',
      token_error: 'GitHub could not exchange the sign-in code.',
      provider_error: 'GitHub profile information could not be retrieved.',
      account_link_error: 'That GitHub identity is already linked to a different UDAAN account.',
      account_error: 'UDAAN could not finish connecting the account.'
    }
    if (errors[query.get('github')]) setError(errors[query.get('github')])
  }, [])

  useEffect(() => {
    if (query.has('github')) { const next = new URLSearchParams(query); next.delete('github'); setQuery(next, { replace: true }); void refresh() }
  }, [])

  // Load tech history from DB
  useEffect(() => {
    getTechHistory().then(th => {
      if (th?.known_stacks?.length) {
        setKnownTech(th.known_stacks.map(s => s.name || s))
      }
    }).catch(() => {})
  }, [auth.authenticated])

  useEffect(() => {
    if (!auth.authenticated) {
      setProfile(null)
      return
    }
    let active = true
    void getDeveloperProfile().then(data => {
      if (!active) return
      setProfile(data)
      setGoogleConnected(Boolean(data.google_calendar_connected))
      setGoogleEmail(data.google_calendar_email || '')
      setHasSavedPat(Boolean(data.github_access_token))
      setForm({ skills: (data.skills || []).join(', '), experience: data.experience || '', preferred_roles: (data.preferred_roles || []).join(', '), availability_hours: data.availability_hours ?? 10, learning_goals: data.learning_goals || '', avatar_url: data.avatar_url || '' })
    }).catch(err => {
      if (!active) return
      // Safe fallback profile from auth.user so profile always renders
      const fallback = {
        github_login: auth.user?.github_login || auth.user?.name || 'developer',
        avatar_url: auth.user?.avatar_url || '',
        skills: auth.user?.skills || ['Full-Stack', 'React', 'Python'],
        preferred_roles: ['Lead Developer'],
        availability_hours: 15,
        public_repositories: auth.user?.public_repositories || []
      }
      setProfile(fallback)
      setForm({ skills: fallback.skills.join(', '), experience: '', preferred_roles: fallback.preferred_roles.join(', '), availability_hours: 15, learning_goals: '', avatar_url: fallback.avatar_url })
      if (err.status !== 404) setError(err.message)
    })
    return () => { active = false }
  }, [auth.authenticated, auth.user])

  const login = async refreshAnalysis => {
    setBusy(true); setError('')
    try { window.location.assign(await startGitHubLogin({ refresh: refreshAnalysis, returnTo: query.get('return_to') || '/profile', projectIds: readSavedProjects().map(project => project.id) })) }
    catch (err) { setError(err.message || 'GitHub sign-in is unavailable.'); setBusy(false) }
  }

  const handleConnectGitHubUsername = async (e) => {
    if (e) e.preventDefault()
    const handle = githubHandle.trim().replace(/^@/, '')
    if (!handle) {
      setError('Please enter your GitHub username.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await connectGitHubUsername(handle)
      await refresh()
      setNotice(`Successfully connected GitHub profile @${handle}! Loaded verified avatar and repositories.`)
    } catch (err) {
      setError(err.message || `Could not connect GitHub user "${handle}".`)
    } finally {
      setBusy(false)
    }
  }

  const handleQuickLogin = async (e) => {
    if (e) e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await quickLogin({
        name: quickName.trim() || 'Lead Developer',
        email: quickEmail.trim() || undefined,
        avatar_url: selectedAvatar,
        role: quickRole.trim() || 'Lead Developer',
      })
      await refresh()
      setNotice('Signed in successfully!')
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    setBusy(true)
    try {
      await logoutAccount()
      await refresh()
      setProfile(null)
      setNotice('Signed out successfully.')
    } catch (err) {
      setError(err.message || 'Could not sign out.')
    } finally {
      setBusy(false)
    }
  }

  const save = async event => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const updated = await updateDeveloperProfile({
        skills: form.skills.split(',').map(item => item.trim()).filter(Boolean),
        experience: form.experience,
        preferred_roles: form.preferred_roles.split(',').map(item => item.trim()).filter(Boolean),
        availability_hours: Number(form.availability_hours),
        learning_goals: form.learning_goals,
        avatar_url: form.avatar_url,
      })
      setProfile(updated)
      await refresh()
      setNotice('Your developer profile and avatar were saved.')
    } catch (err) { setError(err.message || 'Could not save your profile.') }
    finally { setBusy(false) }
  }

  const toggleTechInHistory = async (techName) => {
    const next = knownTech.includes(techName) ? knownTech.filter(t => t !== techName) : [...knownTech, techName]
    setKnownTech(next)
    try {
      await saveTechHistory({ known_stacks: next.map(name => ({ name, confidence: 'comfortable', source: 'profile' })) })
      setNotice(`Updated tech skills: ${next.length} technologies in your database profile.`)
      setTimeout(() => setNotice(''), 3000)
    } catch {
      setError('Could not update tech history in database.')
    }
  }

  const handleSaveGoogleCalendar = async (e) => {
    if (e) e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const emailToUse = googleEmail.trim() || auth.user?.email || 'user@gmail.com'
      const updated = await updateDeveloperProfile({
        google_calendar_connected: true,
        google_calendar_email: emailToUse,
        google_calendar_synced_at: new Date().toISOString(),
      })
      setProfile(updated)
      setGoogleConnected(true)
      setGoogleEmail(emailToUse)
      setNotice('Google Calendar connected! You can now sync project milestones and receive timeline alerts.')
      setTimeout(() => setNotice(''), 4000)
    } catch (err) {
      setError(err.message || 'Failed to save Google Calendar settings.')
    } finally {
      setBusy(false)
    }
  }

  const handleDisconnectGoogleCalendar = async () => {
    setBusy(true)
    try {
      const updated = await updateDeveloperProfile({
        google_calendar_connected: false,
      })
      setProfile(updated)
      setGoogleConnected(false)
      setNotice('Google Calendar disconnected.')
      setTimeout(() => setNotice(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to disconnect Google Calendar.')
    } finally {
      setBusy(false)
    }
  }

  const handleSyncAllMilestonesToCalendar = () => {
    const projects = readSavedProjects()
    const events = []
    projects.forEach(p => {
      const flightPlan = p.workflow?.flight_plan
      if (flightPlan?.milestones) {
        flightPlan.milestones.forEach((m, idx) => {
          events.push({
            title: `[${p.name || 'UDAAN'}] M${idx + 1}: ${m.title}`,
            description: `${m.purpose || m.outcome || 'Milestone checkpoint'}\nProject: ${p.name}\nCategory: ${m.category || 'Milestone'}`,
            startDate: m.start_date || p.startDate,
            endDate: m.target_date || m.deadline || p.deadline,
          })
        })
      }
      if (p.deadline) {
        events.push({
          title: `🚀 TARGET LAUNCH: ${p.name || 'Project Launch'}`,
          description: `Target launch deadline for ${p.name}!`,
          startDate: p.deadline,
          endDate: p.deadline,
        })
      }
    })

    if (!events.length) {
      setError('No active project milestones found to sync. Create or open a project first!')
      return
    }

    downloadIcsFile('udaan-project-milestones.ics', events)
    setNotice(`Exported ${events.length} milestones & deadlines to Calendar (.ics)! Open it to sync directly to Google Calendar.`)
    setTimeout(() => setNotice(''), 5000)
  }

  const handleSaveGitHubPat = async (e) => {
    if (e) e.preventDefault()
    if (!githubPat.trim()) {
      setError('Please enter a valid GitHub token or Secret Key.')
      return
    }
    setBusy(true)
    try {
      const updated = await updateDeveloperProfile({
        github_access_token: githubPat.trim(),
      })
      setProfile(updated)
      setHasSavedPat(true)
      setNotice('GitHub Personal Access Token / Secret Key saved! UDAAN can now create repositories directly.')
      setGithubPat('')
      setTimeout(() => setNotice(''), 4000)
    } catch (err) {
      setError(err.message || 'Failed to save GitHub token.')
    } finally {
      setBusy(false)
    }
  }

  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }))

  return (
    <div className="min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans'] dp-page">
      <Sidebar activePage="profile" open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header onToggleMobileMenu={() => setMenuOpen(!menuOpen)} />
        <main className="ud-main flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <div className="dp-content w-full space-y-6">
            <div className="dp-heading">
              <span className="dp-eyebrow"><UserRound size={15} /> YOUR DEVELOPER PROFILE</span>
              <h1>Bring your experience to the team</h1>
              <p>Sign in to personalize your studio profile, display your real-time avatar, and match with project roles.</p>
            </div>
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-2 shadow-xs" role="alert">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle size={16} className="text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
                {error.includes('expired') && (
                  <p className="text-[11px] text-red-700 pl-6">
                    Tip: Enter your GitHub username in the box below to link your real GitHub avatar & public repositories instantly without redirecting!
                  </p>
                )}
              </div>
            )}
            {notice && <div className="dp-notice" role="status"><Check size={16} />{notice}</div>}

            {!auth.authenticated ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Direct GitHub Profile Sync */}
                <section className="bg-white rounded-3xl p-6 border-2 border-[#1D1B18] shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-full bg-[#1D1B18] text-white flex items-center justify-center font-bold shadow-xs">
                        <Github size={20} />
                      </span>
                      <div>
                        <span className="dp-eyebrow text-[#8E4B49]">FAST & DIRECT</span>
                        <h2 className="text-sm font-bold text-[#1D1B18]">Sync GitHub Profile</h2>
                      </div>
                    </div>
                    <p className="text-xs text-[#534342] leading-relaxed">
                      Instant sync with your GitHub identity. Fetches your real avatar, bio, and public repositories without session redirects.
                    </p>
                  </div>

                  <form onSubmit={handleConnectGitHubUsername} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider mb-1">
                        GitHub Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-[#7C766F]">@</span>
                        <input
                          type="text"
                          value={githubHandle}
                          onChange={e => setGithubHandle(e.target.value)}
                          placeholder="e.g. torvalds"
                          disabled={busy}
                          className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs font-bold text-[#1D1B18] focus:border-[#1D1B18] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-2.5 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Github size={14} />
                      <span>{busy ? 'Connecting…' : 'Sync GitHub Profile'}</span>
                    </button>
                  </form>
                </section>

                {/* 2. Continue with GitHub OAuth */}
                <section className="bg-white rounded-3xl p-6 border border-[#EFEAE4] shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-full bg-[#F3EDE7] text-[#1D1B18] flex items-center justify-center font-bold">
                        <ShieldCheck size={20} />
                      </span>
                      <div>
                        <span className="dp-eyebrow">BROWSER OAUTH</span>
                        <h2 className="text-sm font-bold text-[#1D1B18]">GitHub Sign-In</h2>
                      </div>
                    </div>
                    <p className="text-xs text-[#534342] leading-relaxed">
                      Authorize full OAuth sign-in with your GitHub account to access private scopes and commit history.
                    </p>
                  </div>

                  <div className="space-y-2 pt-4">
                    <button
                      className="w-full py-2.5 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      disabled={busy || !auth.github_configured}
                      onClick={() => void login(false)}
                    >
                      <Github size={15} />
                      <span>{busy ? 'Connecting…' : 'Start GitHub Sign-In'}</span>
                    </button>
                    {!auth.github_configured && (
                      <p className="text-[10px] text-[#7C766F] text-center">
                        OAuth credentials optional if using username sync
                      </p>
                    )}
                  </div>
                </section>

                {/* 3. 1-Click Quick Developer Sign In */}
                <section className="bg-white rounded-3xl p-6 border border-[#EFEAE4] shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-full bg-[#FFAAA6] text-[#7A3C3A] flex items-center justify-center font-bold">
                      <UserCheck size={18} />
                    </span>
                    <div>
                      <span className="dp-eyebrow text-[#8E4B49]">LOCAL DEMO</span>
                      <h2 className="text-sm font-bold text-[#1D1B18]">Quick Local Sign-In</h2>
                    </div>
                  </div>
                  <p className="text-xs text-[#534342]">
                    Instant mock sign-in for testing without connecting GitHub. Choose your avatar and role.
                  </p>

                  <form onSubmit={handleQuickLogin} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-[#534342] mb-1">Pick Avatar</label>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {AVATAR_PRESETS.map((av, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedAvatar(av)}
                            className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                              selectedAvatar === av ? 'border-[#8E4B49] scale-110 shadow-md ring-2 ring-[#FFAAA6]' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={av} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={quickName}
                        onChange={e => setQuickName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs font-bold text-[#1D1B18]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-2 rounded-full bg-[#8E4B49] text-white text-xs font-bold hover:bg-[#723B39] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck size={13} />
                      <span>{busy ? 'Signing in…' : 'Quick Sign-In'}</span>
                    </button>
                  </form>
                </section>
              </div>
            ) : profile ? (
              <>
                <section className="dp-evidence">
                  <div className="dp-evidence-head">
                    <div className="dp-avatar overflow-hidden ring-2 ring-[#8E4B49]/30">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserRound size={19} />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <b>@{profile.github_login || auth.user?.name || 'developer'}</b>
                        {profile.github_login && (
                          <a
                            href={profile.profile_url || `https://github.com/${profile.github_login}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1D1B18] bg-[#F3EDE7] px-2 py-0.5 rounded-full hover:bg-[#EDE7E2] no-underline"
                          >
                            <Github size={11} />
                            <span>GitHub</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <span className="text-xs text-[#534342] block">{auth.user?.email}</span>
                      {profile.bio && (
                        <p className="text-xs text-[#7C766F] italic max-w-xl">{profile.bio}</p>
                      )}
                    </div>
                    <button
                      className="dp-secondary text-red-600 hover:text-red-800 ml-auto flex items-center gap-1.5 cursor-pointer"
                      onClick={handleLogout}
                      disabled={busy}
                    >
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>

                  {/* Public repositories loaded from GitHub */}
                  {profile.public_repositories && profile.public_repositories.length > 0 && (
                    <div className="pt-3 border-t border-[#EFEAE4]">
                      <span className="text-[11px] font-bold text-[#534342] uppercase tracking-wider block mb-2">
                        Verified Public Repositories ({profile.public_repositories.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        {profile.public_repositories.slice(0, 8).map((repo, i) => (
                          <a
                            key={i}
                            href={repo.url || repo.html_url || `https://github.com/${repo.full_name || repo.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white border border-[#EFEAE4] hover:border-[#1D1B18] transition-colors no-underline block space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#1D1B18] truncate max-w-[130px]">{repo.name}</span>
                              <Github size={12} className="text-[#7C766F]" />
                            </div>
                            {repo.language && (
                              <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#FFF8F3] text-[#8E4B49] border border-[#EFEAE4]">
                                {repo.language}
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Switch or Re-sync GitHub Username */}
                  <div className="pt-3 border-t border-[#EFEAE4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#534342]">
                      Want to connect a different GitHub account or refresh repos?
                    </span>
                    <form onSubmit={handleConnectGitHubUsername} className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        value={githubHandle}
                        onChange={e => setGithubHandle(e.target.value)}
                        placeholder="new GitHub username"
                        className="px-2.5 py-1 text-xs rounded-xl border border-[#EFEAE4] bg-[#FFF8F3]"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="px-3 py-1 bg-[#1D1B18] text-white text-xs font-bold rounded-xl hover:bg-black transition-colors"
                      >
                        Re-sync
                      </button>
                    </form>
                  </div>
                </section>

                <form className="dp-form" onSubmit={save}>
                  <div className="dp-form-head">
                    <div>
                      <span className="dp-eyebrow"><Sparkles size={14} /> PROFILE DETAILS</span>
                      <h2>Review and edit your profile</h2>
                      <p>Personalize your public details and avatar picture.</p>
                    </div>
                  </div>
                  <label>
                    Custom Avatar Image URL
                    <input
                      value={form.avatar_url || ''}
                      onChange={e => setField('avatar_url', e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </label>
                  <label>
                    Skills you want teams to consider
                    <input value={form.skills} onChange={e => setField('skills', e.target.value)} placeholder="React, Python, API Design" />
                  </label>
                  <div className="dp-two-col">
                    <label>
                      Preferred roles
                      <input value={form.preferred_roles} onChange={e => setField('preferred_roles', e.target.value)} placeholder="Frontend, backend, lead" />
                    </label>
                    <label>
                      Available hours per week
                      <input type="number" min="1" max="80" value={form.availability_hours} onChange={e => setField('availability_hours', e.target.value)} />
                    </label>
                  </div>
                  <label>
                    Experience and context
                    <textarea rows="3" maxLength="4000" value={form.experience} onChange={e => setField('experience', e.target.value)} placeholder="Relevant work or background" />
                  </label>
                  <div className="dp-footer">
                    <button className="dp-primary" disabled={busy}>
                      <Save size={15} />
                      <span>{busy ? 'Saving…' : 'Save profile'}</span>
                    </button>
                  </div>
                </form>

                {/* Google Calendar Integration Card */}
                <section className="bg-white rounded-3xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center font-bold">
                        <Calendar size={18} />
                      </span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#1A73E8]">CALENDAR & TIMELINE SYNC</span>
                        <h2 className="text-sm font-bold text-[#1D1B18]">Google Calendar Connection</h2>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${googleConnected ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]' : 'bg-[#F1F3F4] text-[#5F6368]'}`}>
                      <span className={`w-2 h-2 rounded-full ${googleConnected ? 'bg-[#137333]' : 'bg-[#70757A]'}`} />
                      {googleConnected ? 'Connected & Synced' : 'Not Connected'}
                    </span>
                  </div>

                  <p className="text-xs text-[#534342] leading-relaxed">
                    Connect your Google Calendar to synchronize project milestones, track launch deadlines, and get timely reminders as dates approach.
                  </p>

                  <form onSubmit={handleSaveGoogleCalendar} className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="email"
                          value={googleEmail}
                          onChange={e => setGoogleEmail(e.target.value)}
                          placeholder="your.email@gmail.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs font-bold text-[#1D1B18] focus:border-[#1A73E8] focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2.5 rounded-xl bg-[#1A73E8] text-white text-xs font-bold hover:bg-[#1557B0] transition-colors flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Calendar size={13} />
                        {googleConnected ? 'Update Calendar Email' : 'Connect Google Calendar'}
                      </button>
                      {googleConnected && (
                        <button
                          type="button"
                          onClick={handleDisconnectGoogleCalendar}
                          disabled={busy}
                          className="px-3 py-2.5 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#8E4B49] hover:bg-[#FFF1ED] transition-colors"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="pt-2 flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={handleSyncAllMilestonesToCalendar}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors"
                    >
                      <Calendar size={13} />
                      Sync & Download All Milestones (.ics)
                    </button>
                    <span className="text-[11px] text-[#7C766F]">
                      Compatible with Google Calendar, Apple Calendar & Outlook
                    </span>
                  </div>
                </section>

                {/* GitHub Secret Key / PAT Direct Setup */}
                <section className="bg-white rounded-3xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-2xl bg-[#FFF1ED] text-[#8E4B49] flex items-center justify-center font-bold">
                        <Key size={18} />
                      </span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#8E4B49]">DIRECT GITHUB ACCESS</span>
                        <h2 className="text-sm font-bold text-[#1D1B18]">GitHub Secret Key & Personal Access Token</h2>
                      </div>
                    </div>
                    {hasSavedPat && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                        <Check size={12} />
                        Token Saved in DB
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#534342] leading-relaxed">
                    Provide a GitHub Personal Access Token (PAT / Secret Key) with <code className="px-1.5 py-0.5 rounded bg-[#FFF8F3] text-[#8E4B49] font-mono text-[11px]">repo</code> scope so UDAAN can create and configure repositories directly for you without OAuth redirects.
                  </p>

                  <form onSubmit={handleSaveGitHubPat} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={githubPat}
                      onChange={e => setGithubPat(e.target.value)}
                      placeholder={hasSavedPat ? '•••••••••••••••••••••••• (Stored — enter new to replace)' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs font-mono text-[#1D1B18] focus:border-[#8E4B49] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2.5 rounded-xl bg-[#8E4B49] text-white text-xs font-bold hover:bg-[#7A3C3A] transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Save size={13} />
                      Save Secret Key
                    </button>
                  </form>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=UDAAN+Studio+Launchpad"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8E4B49] hover:underline"
                  >
                    Generate a new Personal Access Token on GitHub <ExternalLink size={11} />
                  </a>
                </section>

                {/* Known Technologies History (DB Tracked) */}
                <section className="bg-white rounded-3xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-2xl bg-[#FFFBEB] text-[#B45309] flex items-center justify-center font-bold">
                      <BookOpen size={18} />
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#B45309]">SKILLS HISTORY IN DATABASE</span>
                      <h2 className="text-sm font-bold text-[#1D1B18]">Technologies You Know</h2>
                    </div>
                  </div>

                  <p className="text-xs text-[#534342] leading-relaxed">
                    Select the technologies you already know. UDAAN stores this in your database profile to recommend the best matching stacks and tailor video tutorials specifically for what you still need to learn.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {POPULAR_SKILLS.map(skill => {
                      const isKnown = knownTech.includes(skill)
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleTechInHistory(skill)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isKnown ? 'bg-[#2A9D8F] border-[#2A9D8F] text-white shadow-xs' : 'bg-[#FAFAF9] border-[#EFEAE4] text-[#534342] hover:border-[#2A9D8F]'}`}
                        >
                          {isKnown && <Check size={11} />}
                          <span>{skill}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-[#7C766F]">
                    {knownTech.length} technologies recorded in your permanent learning history.
                  </p>
                </section>
              </>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-[#EFEAE4] flex items-center justify-center">
                <UdaanLoader character="thinker" size="md" message="Loading your profile…" sub="fetching GitHub & project data" />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
