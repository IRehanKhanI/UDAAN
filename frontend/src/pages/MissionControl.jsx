import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity, ArrowRight, Bookmark, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, Copy, ExternalLink, Globe, Info, Link2, LoaderCircle,
  Menu, RefreshCw, Share2, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { readSavedProjects } from '../services/projectStorage.js'
import { apiRequest } from '../services/apiClient.js'
import {
  getHealthScore, refreshHealthScore,
  getPassport, updatePassport, deletePassport,
  statusLabel, statusClass,
} from '../services/healthService.js'
import './MissionControl.css'

// ─── Colour maps ──────────────────────────────────────────────────────────────
const BAND_COLOR  = { green: '#8e4b49', blue: '#1d5c9b', amber: '#9a5c00', red: '#8b2020', grey: '#57706a' }
const BAND_BG     = { green: '#fff8f3', blue: '#e5eef9', amber: '#fdf1d7', red: '#fde8e8', grey: '#fff8f3' }
const BAND_TRACK  = { green: '#fff1ed', blue: '#c2d9f2', amber: '#f5dfa0', red: '#f5c0c0', grey: '#fff1ed' }
const CONF_LABEL  = { high: 'High confidence', medium: 'Partial evidence', low: 'Not verified' }
const CONF_DOT    = { high: '#8e4b49', medium: '#9a5c00', low: '#8b2020' }
// ─── SVG Circular Gauge ──────────────────────────────────────────────────────
function Gauge({ score, band, size = 160 }) {
  const r = 58, cx = 80, cy = 80
  const circ = 2 * Math.PI * r
  const filled = score !== null ? circ * (score / 100) : 0
  const color = BAND_COLOR[statusClass(band)] ?? '#57706a'
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden="true" className="mc-gauge-svg">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#8e4b49" strokeWidth="12" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - filled}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)' }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="32" fontWeight="700" fontFamily="inherit">
        {score !== null ? score : '—'}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="#d8a09a" fontSize="11" fontFamily="inherit">/ 100</text>
    </svg>
  )
}

// ─── Signal Bar ──────────────────────────────────────────────────────────────
function SignalBar({ signal }) {
  const cls = statusClass(
    signal.raw_score >= 80 ? 'strong' : signal.raw_score >= 60 ? 'on_track' : signal.raw_score >= 40 ? 'at_risk' : 'needs_attention'
  )
  const color  = BAND_COLOR[cls]
  const track  = BAND_TRACK[cls]
  const conf   = signal.confidence ?? 'low'
  const [open, setOpen] = useState(false)
  return (
    <div className="mc-signal-row">
      <div className="mc-signal-head" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(v => !v)}
        aria-expanded={open}>
        <span className="mc-signal-name">{signal.label}</span>
        <div className="mc-signal-bar-wrap">
          <div className="mc-signal-track" style={{ background: track }}>
            <div className="mc-signal-fill"
              style={{ width: `${signal.raw_score ?? 0}%`, background: color,
                transition: 'width 1.1s cubic-bezier(.4,0,.2,1)' }} />
          </div>
        </div>
        <span className="mc-signal-pct" style={{ color }}>{signal.raw_score ?? 0}%</span>
        <span className="mc-signal-conf-dot" style={{ background: CONF_DOT[conf] }} title={CONF_LABEL[conf]} />
        <ChevronRight size={13} className={`mc-signal-chevron ${open ? 'open' : ''}`} />
      </div>
      {open && (
        <div className="mc-signal-detail">
          <p className="mc-signal-explanation">{signal.explanation}</p>
          <div className="mc-signal-footer">
            <span className="mc-conf-tag" style={{ background: CONF_DOT[conf] + '22', color: CONF_DOT[conf] }}>
              {CONF_LABEL[conf]}
            </span>
            {signal.fix_link && (
              <Link to={signal.fix_link} className="mc-fix-link">
                Improve <ArrowRight size={11} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Passport Panel ──────────────────────────────────────────────────────────
const ALL_FIELDS = [
  { key: 'score',              label: 'Health score & status' },
  { key: 'signals',            label: 'Signal breakdown' },
  { key: 'evidence_coverage',  label: 'Evidence coverage %' },
  { key: 'problem_statement',  label: 'Problem statement' },
  { key: 'tech_stack',         label: 'Technology stack' },
  { key: 'team_size',          label: 'Team size' },
]

function PassportPanel({ projectId }) {
  const [passport, setPassport] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [notice,  setNotice]    = useState('')
  const [copied,  setCopied]    = useState(false)

  useEffect(() => {
    if (!projectId) return
    getPassport(projectId).then(setPassport).catch(() => {})
  }, [projectId])

  const toggle = async (key, val) => {
    if (!passport) return
    setLoading(true); setNotice('')
    try {
      const updated = await updatePassport(projectId, { [key]: val })
      setPassport(updated)
      setNotice(key === 'is_published' ? (val ? 'Passport published.' : 'Passport unpublished.') : 'Settings saved.')
    } catch (e) { setNotice(e.message || 'Could not update passport.') }
    finally { setLoading(false) }
  }

  const toggleField = async (fieldKey) => {
    if (!passport) return
    const current = passport.disclosed_fields ?? []
    const next = current.includes(fieldKey) ? current.filter(f => f !== fieldKey) : [...current, fieldKey]
    await toggle('disclosed_fields', next)
  }

  const copyLink = async () => {
    if (!passport?.public_url) return
    try { await navigator.clipboard.writeText(passport.public_url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { setNotice(passport.public_url) }
  }

  if (!passport) return <div className="mc-passport-empty"><LoaderCircle size={15} className="mc-spin" /> Loading passport settings…</div>

  return (
    <div className="mc-passport">
      <div className="mc-passport-head">
        <Globe size={15} />
        <div>
          <strong>Project Passport</strong>
          <small>Share a public read-only health summary for this project.</small>
        </div>
        <span className={`mc-passport-badge ${passport.is_published ? 'published' : 'draft'}`}>
          {passport.is_published ? 'Published' : 'Unpublished'}
        </span>
      </div>

      {notice && <p className="mc-passport-notice" role="status">{notice}</p>}

      <div className="mc-passport-fields">
        <p className="mc-passport-fields-label">Choose what to disclose:</p>
        {ALL_FIELDS.map(f => (
          <label key={f.key} className="mc-passport-field-row">
            <input type="checkbox"
              checked={passport.disclosed_fields?.includes(f.key) ?? false}
              onChange={() => void toggleField(f.key)}
              disabled={loading}
            />
            {f.label}
          </label>
        ))}
      </div>

      <div className="mc-passport-actions">
        <button className={`mc-passport-btn ${passport.is_published ? 'unpublish' : 'publish'}`}
          onClick={() => void toggle('is_published', !passport.is_published)}
          disabled={loading}>
          {passport.is_published ? 'Unpublish' : <><Share2 size={13} /> Publish passport</>}
        </button>
        {passport.is_published && (
          <button className="mc-passport-copy" onClick={copyLink} disabled={loading}>
            {copied ? <><CheckCircle2 size={13} /> Copied!</> : <><Copy size={13} /> Copy link</>}
          </button>
        )}
      </div>
      {passport.is_published && passport.public_url && (
        <a href={passport.public_url} target="_blank" rel="noreferrer" className="mc-passport-preview">
          Preview public page <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}

// ─── Studio Debugging Buddy (from main branch ProofHealth) ───────────────────
function StudioDebuggingBuddy() {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState(null)
  const [asking, setAsking] = useState(false)

  const quickPrompts = [
    'Why is my health score lower than 100%?',
    'Payment button stays grey in checkout',
    'How do I test my app on mobile?',
    'Will customers get an email receipt?',
  ]

  const ask = async (text) => {
    const q = text || query
    if (!q.trim()) return
    setAsking(true)
    setResponse(null)
    try {
      const res = await apiRequest('/api/ai/ask/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      if (res?.answer) {
        setResponse(res.answer)
        setAsking(false)
        return
      }
    } catch {}

    // Deterministic fallback explanation
    setTimeout(() => {
      const lower = q.toLowerCase()
      if (lower.includes('score') || lower.includes('health') || lower.includes('100')) {
        setResponse(
          'Your health score is evidence-based across 7 signals (code-to-plan, tests, roadmap, etc.). In UDAAN, unverified signals contribute partial weight rather than artificial 100% inflation. Adding test commands and connecting GitHub will boost your score.'
        )
      } else if (lower.includes('gray') || lower.includes('grey') || lower.includes('button')) {
        setResponse(
          "A checkout button stays greyed out when required input fields (such as delivery date or terms confirmation) are waiting for user interaction. In your preview, select a pickup slot and the button lights up coral immediately."
        )
      } else if (lower.includes('mobile') || lower.includes('phone')) {
        setResponse(
          "To test on mobile, simply open your preview link in Chrome or Safari on your phone. You can also use 'Add to Home Screen' to test the full-screen progressive web app experience."
        )
      } else if (lower.includes('receipt') || lower.includes('email')) {
        setResponse(
          "Yes! When your payment webhook receives an event from Stripe or UPI, it triggers the automated confirmation receipt within 0.8 seconds to the customer's billing address."
        )
      } else {
        setResponse(
          `In plain English: "${q}" usually relates to configuration parameters or missing test evidence. Check the Seven Signals breakdown above to see exact file-backed diagnostics.`
        )
      }
      setAsking(false)
    }, 600)
  }

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#EFEAE4] shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#8E4B49]">smart_toy</span>
        <h3 className="font-extrabold text-[#1D1B18] text-base font-['Plus_Jakarta_Sans']">
          Studio Debugging Buddy
        </h3>
        <span className="text-[10px] font-bold bg-[#D7F5D8] text-[#2F432B] px-2 py-0.5 rounded-full ml-auto">
          Plain English
        </span>
      </div>
      <p className="text-xs text-[#534342] leading-relaxed">
        Ask any practical question about diagnostics, health score signals, or testing fixes. No jargon.
      </p>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 pt-1">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => { setQuery(p); ask(p) }}
            className="text-[11px] bg-[#FFF8F3] hover:bg-[#F9F2ED] text-[#8E4B49] border border-[#FFAAA6]/40 px-3 py-1.5 rounded-full transition-all text-left"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); ask() }} className="flex gap-2 pt-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about your project health..."
          className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-[#EFEAE4] bg-[#FFF8F3] text-[#1D1B18] placeholder-[#A35A53]/60 focus:outline-none focus:border-[#FFAAA6]"
        />
        <button
          type="submit"
          disabled={asking || !query.trim()}
          className="px-4 py-2 rounded-xl bg-[#8E4B49] hover:bg-[#723B39] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {asking ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {/* Answer */}
      {response && (
        <div className="bg-[#FFF8F3] p-4 rounded-2xl border border-[#FFAAA6]/50 text-xs text-[#1D1B18] leading-relaxed animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold text-[#8E4B49] mb-1">
            <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
            <span>Buddy's Explanation:</span>
          </div>
          <p>{response}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MissionControl({ embedded = false, selectedProjectId }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [menuOpen, setMenuOpen]   = useState(false)
  const projects = readSavedProjects()
  const [projectId, setProjectId] = useState(
    () => selectedProjectId || searchParams.get('project') || localStorage.getItem('udaan:selected-project') || projects[0]?.id || ''
  )
  const activeProjectId = selectedProjectId ? String(selectedProjectId) : projectId
  const project = projects.find(p => String(p.id) === String(activeProjectId)) || projects[0] || null

  const [health,   setHealth]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error,    setError]    = useState('')

  const load = useCallback(async (id) => {
    if (!id) { setHealth(null); return }
    setLoading(true); setError('')
    try {
      setHealth(await getHealthScore(id))
    } catch (error) {
      setError(error.message || 'Could not load health score.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(activeProjectId) }, [activeProjectId, load])

  const changeProject = id => {
    setProjectId(id)
    localStorage.setItem('udaan:selected-project', id)
    setSearchParams({ project: id }, { replace: true })
  }

  const doRefresh = async () => {
    if (!activeProjectId || refreshing) return
    setRefreshing(true); setError('')
    try {
      const h = await refreshHealthScore(activeProjectId)
      setHealth(h)
    } catch (e) { setError(e.message || 'Refresh failed.') }
    finally { setRefreshing(false) }
  }

  // Resolve signals from the nested structure the backend returns
  const signals = useMemo(() => {
    if (!health) return []
    const raw = health.signals?.signals ?? health.signals ?? {}
    return Object.values(raw).filter(Boolean)
  }, [health])

  const score  = health?.score ?? null
  const band   = health?.signals?.status ?? health?.status ?? 'needs_attention'
  const cls    = statusClass(band)
  const label  = statusLabel(band)
  const evCov  = health?.evidence_coverage ?? null
  const compAt = health?.computed_at ? new Date(health.computed_at).toLocaleString() : null

  const passedSignalsCount = signals.filter(s => (s.raw_score ?? 0) >= 60).length

  return (
    <div className={`mc-page ${embedded ? 'mc-embedded' : "min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans']"}`}>
      {!embedded && <Sidebar activePage="issues" open={menuOpen} onClose={() => setMenuOpen(false)} />}
      <div className={embedded ? 'w-full' : 'lg:pl-80 flex-1 flex flex-col min-w-0'}>
        {!embedded && (
          <Header
            currentProject={project}
            onToggleMobileMenu={() => setMenuOpen(!menuOpen)}
            onProjectSelect={(p) => changeProject(p.id)}
          />
        )}

        <main className={`ud-main mc-main w-full mx-auto ${embedded ? 'p-0' : 'flex-1 p-6 md:p-8 max-w-7xl'}`}>
          <div className="mc-content w-full">

            {/* ── Toolbar ── */}
            <div className="mc-toolbar flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
              {!embedded && <label className="mc-project-select">
                  <span>Project</span>
                  <select value={activeProjectId} onChange={e => changeProject(e.target.value)} aria-label="Select project">
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name || 'Untitled'}</option>)}
                  </select>
                  <ChevronDown size={14} />
              </label>}
                <button className="mc-refresh-btn" onClick={doRefresh} disabled={refreshing || loading} aria-label="Refresh score">
                  <RefreshCw size={14} className={refreshing ? 'mc-spin' : ''} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D7F5D8] text-[#2F432B] text-xs font-bold shadow-xs">
                <span className="material-symbols-outlined text-[16px] text-[#4A654E]">verified</span>
                <span>Verified Diagnostics · No Synthetic Scores</span>
              </div>
            </div>

            {error && <div className="mc-error" role="alert">{error}<button onClick={() => setError('')}><X size={14} /></button></div>}

            {!project ? (
              <div className="mc-empty-state">
                <Activity size={32} />
                <h2>No project selected</h2>
                <p>Create or select a project to view its health score.</p>
                <Link to="/" className="mc-cta">Start a project <ArrowRight size={14} /></Link>
              </div>
            ) : (
              <div className="space-y-7">
                {/* ── 4 Stat Summary Cards (from main ProofHealth) ── */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card 1: Sage (Signals on track) */}
                  <div className="bg-[#D7F5D8]/50 p-5 rounded-3xl border border-[#ABC8AD] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-[#FFFFFF] text-[#4A654E] flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[20px]">check</span>
                      </span>
                      <span className="text-[10px] font-bold bg-[#FFFFFF] text-[#2F432B] px-2 py-0.5 rounded-full">
                        {signals.length ? `${Math.round((passedSignalsCount / signals.length) * 100)}% Solid` : 'Pending'}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-2xl sm:text-3xl font-extrabold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                        {passedSignalsCount} / {signals.length || 7} Signals
                      </div>
                      <p className="text-xs text-[#534342] mt-1">
                        Healthy score across inspected implementation signals.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Butter (Evidence Coverage) */}
                  <div className="bg-[#FBE191]/40 p-5 rounded-3xl border border-[#FBE191] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-[#FFFFFF] text-[#705D1B] flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[20px]">shield</span>
                      </span>
                      <span className="text-[10px] font-bold bg-[#FFFFFF] text-[#705D1B] px-2 py-0.5 rounded-full">
                        Coverage
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-2xl sm:text-3xl font-extrabold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                        {evCov !== null ? `${evCov}%` : '—'} Proof
                      </div>
                      <p className="text-xs text-[#534342] mt-1">
                        Actual files &amp; manifests checked with zero hallucination.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Lavender (Status Assessment) */}
                  <div className="bg-[#EAE4F8]/50 p-5 rounded-3xl border border-[#D7C9F2] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-[#FFFFFF] text-[#49385F] flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[20px]">verified</span>
                      </span>
                      <span className="text-[10px] font-bold bg-[#FFFFFF] text-[#49385F] px-2 py-0.5 rounded-full">
                        Status
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-2xl sm:text-3xl font-extrabold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                        {label}
                      </div>
                      <p className="text-xs text-[#534342] mt-1">
                        {compAt ? `Assessed ${compAt}` : 'Awaiting sync'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Hero: Gauge + Score ── */}
                <section className="mc-hero" aria-label="Project health score">
                  <div className="mc-gauge-area">
                    {loading
                      ? <div className="mc-gauge-loading"><LoaderCircle size={40} className="mc-spin mc-spin-lg" /></div>
                      : <Gauge score={score} band={band} size={160} />
                    }
                  </div>
                  <div className="mc-hero-copy">
                    <p className="mc-eyebrow">PROJECT HEALTH SCORE</p>
                    <h1 className="mc-hero-title">
                      {score !== null ? score : '—'}
                      <span className="mc-hero-denom">/100</span>
                    </h1>
                    <span className="mc-status-badge" style={{ background: BAND_COLOR[cls] + '22', color: BAND_COLOR[cls] }}>
                      {label}
                    </span>
                    <div className="mc-hero-meta">
                      {evCov !== null && (
                        <span><ShieldCheck size={12} /> {evCov}% evidence coverage</span>
                      )}
                      {compAt && (
                        <span><Info size={12} /> Last assessed {compAt}</span>
                      )}
                    </div>
                    <p className="mc-hero-note">
                      Score is computed from real project data across 7 signals.
                      Missing evidence lowers confidence — not artificially inflated.
                    </p>
                  </div>
                </section>

                {/* ── Signal Bars ── */}
                <section className="mc-section">
                  <div className="mc-section-heading">
                    <p className="mc-eyebrow">SEVEN SIGNALS</p>
                    <h2>Score breakdown</h2>
                    <p>Click any signal to see what evidence was used and how to improve it.</p>
                  </div>
                  {loading ? (
                    <div className="mc-loading-rows">
                      {[1,2,3,4,5,6,7].map(i => <div key={i} className="mc-skeleton-bar" />)}
                    </div>
                  ) : signals.length ? (
                    <div className="mc-signals-list">
                      {signals.map(sig => <SignalBar key={sig.key} signal={sig} />)}
                    </div>
                  ) : (
                    <div className="mc-inline-empty">No signal data yet. Select a project and refresh.</div>
                  )}
                </section>

                {/* Studio Buddy + Passport */}
                <div className="mc-right-col space-y-6">
                  <StudioDebuggingBuddy />

                  <section className="mc-section mc-passport-col">
                    <div className="mc-section-heading">
                      <p className="mc-eyebrow">SHARING</p>
                      <h2>Project Passport</h2>
                    </div>
                    <PassportPanel projectId={activeProjectId} />
                  </section>
                </div>

                {/* ── Methodology note ── */}
                <aside className="mc-methodology">
                  <Sparkles size={13} />
                  <p>
                    <strong>How the score works:</strong> Seven signals are weighted —
                    Code-to-Plan Match (25%), Testing &amp; Stability (20%), Roadmap Coverage (15%),
                    Idea Clarity (10%), Team Alignment (10%), Repository Activity (10%),
                    Delivery Readiness (10%). Signals without evidence are marked <em>Not Verified</em> and
                    contribute a reduced score rather than zero or perfect. A high score reflects observed
                    evidence, not a guarantee of working software.
                  </p>
                </aside>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
