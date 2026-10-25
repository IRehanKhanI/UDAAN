import { useState, useMemo } from 'react'
import {
  TrendingUp, DollarSign, Lightbulb, Target, Users, BarChart3,
  ChevronDown, ChevronRight, ExternalLink, Sparkles, CircleDollarSign,
  Package, Zap, Calendar, ArrowRight, CheckCircle2, Info,
} from 'lucide-react'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { readSavedProjects } from '../services/projectStorage.js'
import './BusinessModel.css'

// ─── Revenue Model Options ────────────────────────────────────────────────────
const REVENUE_MODELS = [
  {
    id: 'subscription',
    icon: '📅',
    name: 'Subscription (SaaS)',
    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
    bestFor: ['Software', 'Hybrid'],
    desc: 'Recurring monthly or annual fees per seat or tier.',
    pros: ['Predictable revenue', 'Strong retention incentive', 'Easy to scale'],
    cons: ['Slow ramp-up', 'Churn management needed'],
    avgArpu: '₹500 – ₹2,500 / month',
    bestExample: 'Figma, Notion, Zoom',
  },
  {
    id: 'one_time',
    icon: '🏷️',
    name: 'One-Time Sale / Kit',
    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
    bestFor: ['Hardware'],
    desc: 'Customers pay once for your hardware product or lifetime licence.',
    pros: ['Immediate cash', 'No ongoing churn', 'Simple business model'],
    cons: ['Need continuous new customer acquisition', 'No recurring revenue'],
    avgArpu: '₹800 – ₹8,000 per unit',
    bestExample: 'Arduino Kits, ESP32 boards, One-time Indie App',
  },
  {
    id: 'freemium',
    icon: '🚀',
    name: 'Freemium + Upgrade',
    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
    bestFor: ['Software', 'Hybrid'],
    desc: 'Free tier to grow users, premium tier for power features.',
    pros: ['Viral growth', 'Large user funnel', 'Data flywheel'],
    cons: ['<5% conversion typical', 'High infra cost for free users'],
    avgArpu: '₹200 – ₹1,200 / month (paid users)',
    bestExample: 'Spotify, Dropbox, GitHub',
  },
  {
    id: 'marketplace',
    icon: '%',
    name: 'Marketplace Commission',
    color: '#BE185D', bg: '#FDF2F8', border: '#FBCFE8',
    bestFor: ['Software'],
    desc: 'Take a % of every transaction between buyers and sellers.',
    pros: ['Scales without extra cost', 'Network effects', 'Defensible moat'],
    cons: ['Long to reach critical mass', 'Both-side bootstrap challenge'],
    avgArpu: '5–20% per transaction',
    bestExample: 'Meesho, Urban Company, Swiggy',
  },
  {
    id: 'grant',
    icon: '🏆',
    name: 'Grant / Hackathon Prize',
    color: '#059669', bg: '#F0FDF4', border: '#A7F3D0',
    bestFor: ['Software', 'Hardware', 'Hybrid'],
    desc: 'Win grants, college competitions, or incubator funding.',
    pros: ['Non-dilutive capital', 'Credibility booster', 'Zero revenue pressure'],
    cons: ['Competitive', 'Strings may be attached'],
    avgArpu: '₹10,000 – ₹50,00,000 (grant / prize)',
    bestExample: 'SIH, SSIP, Startup India, Smart India Hackathon',
  },
  {
    id: 'hardware_service',
    icon: '🔧',
    name: 'Hardware + Service Plan',
    color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC',
    bestFor: ['Hardware', 'Hybrid'],
    desc: 'Sell hardware at cost; profit through recurring maintenance/data subscription.',
    pros: ['High LTV', 'Customer lock-in', 'Data monetization'],
    cons: ['Complex logistics', 'Hardware margin thin'],
    avgArpu: '₹3,000 device + ₹300/month service',
    bestExample: 'Oura Ring, Kore.ai, Smart-home devices',
  },
]

// ─── Funding Sources ──────────────────────────────────────────────────────────
const FUNDING_SOURCES = {
  Startup: [
    { name: 'Startup India Seed Fund', icon: '🇮🇳', amount: 'Up to ₹20 lakh', url: 'https://seedfund.startupindia.gov.in/', type: 'Grant', color: '#16A34A', bg: '#F0FDF4' },
    { name: 'BIRAC BIG Grant', icon: '🔬', amount: '₹50 lakh (biotech)', url: 'https://birac.nic.in/', type: 'Grant', color: '#2563EB', bg: '#EFF6FF' },
    { name: 'iCreate Incubator', icon: '🏢', amount: 'Equity + ₹10L seed', url: 'https://icreate.org.in/', type: 'Incubator', color: '#7C3AED', bg: '#F5F3FF' },
    { name: 'Indian Angel Network', icon: '👼', amount: '$100K–$500K (angel)', url: 'https://www.indianangelnetwork.com/', type: 'Angel', color: '#D97706', bg: '#FFFBEB' },
  ],
  Hackathon: [
    { name: 'Smart India Hackathon (SIH)', icon: '💡', amount: '₹1 lakh prize per team', url: 'https://sih.gov.in/', type: 'Competition', color: '#D97706', bg: '#FFFBEB' },
    { name: 'SSIP Gujarat', icon: '🏅', amount: 'Up to ₹10 lakh', url: 'https://ssipgujarat.in/', type: 'Grant', color: '#16A34A', bg: '#F0FDF4' },
    { name: 'HackWithInfy', icon: '💻', amount: '₹1 lakh + internship', url: 'https://www.infosys.com/careers/hackwithinfy', type: 'Competition', color: '#2563EB', bg: '#EFF6FF' },
    { name: 'Microsoft Imagine Cup', icon: '🌐', amount: '$100,000 prize', url: 'https://imaginecup.microsoft.com/', type: 'Competition', color: '#7C3AED', bg: '#F5F3FF' },
  ],
  'College Project': [
    { name: 'SSIP (College)', icon: '🎓', amount: 'Up to ₹5 lakh', url: 'https://ssipgujarat.in/', type: 'Grant', color: '#16A34A', bg: '#F0FDF4' },
    { name: 'AICTE IDEA Lab', icon: '🧪', amount: 'Lab + mentorship', url: 'https://ideaab.aicte-india.org/', type: 'Support', color: '#2563EB', bg: '#EFF6FF' },
    { name: 'DST INSPIRE', icon: '🔭', amount: '₹80,000 per year', url: 'https://online-inspire.gov.in/', type: 'Grant', color: '#D97706', bg: '#FFFBEB' },
    { name: 'College Innovation Fund', icon: '🏫', amount: 'Varies by college', url: '#', type: 'Internal', color: '#7C3AED', bg: '#F5F3FF' },
  ],
  'Personal Project': [
    { name: 'Bootstrapped (Self-fund)', icon: '💰', amount: 'Your savings', url: '#', type: 'Bootstrap', color: '#16A34A', bg: '#F0FDF4' },
    { name: 'Product Hunt Launch', icon: '🚀', amount: 'Organic traction', url: 'https://producthunt.com', type: 'Marketing', color: '#D97706', bg: '#FFFBEB' },
    { name: 'Patreon / Ko-fi', icon: '☕', amount: '₹200 – ₹2000/supporter', url: 'https://ko-fi.com', type: 'Community', color: '#BE185D', bg: '#FDF2F8' },
    { name: 'Freelance Revenue', icon: '💼', amount: 'Project-based', url: '#', type: 'Services', color: '#2563EB', bg: '#EFF6FF' },
  ],
}

// ─── Domain-aware expense categories ─────────────────────────────────────────
function getBudgetCategories(domain = 'software') {
  if (domain === 'hardware') return [
    { label: 'Components & BOM', pct: 40, color: '#D97706', icon: '🔧' },
    { label: 'Tools & Equipment', pct: 20, color: '#F59E0B', icon: '🛠️' },
    { label: 'PCB & Fabrication', pct: 15, color: '#0891B2', icon: '⚡' },
    { label: 'Prototyping & Iteration', pct: 15, color: '#7C3AED', icon: '🧪' },
    { label: 'Contingency', pct: 10, color: '#9CA3AF', icon: '🛡️' },
  ]
  if (domain === 'hybrid') return [
    { label: 'Hardware & BOM', pct: 30, color: '#D97706', icon: '🔧' },
    { label: 'Cloud & Infra (Software)', pct: 20, color: '#2563EB', icon: '☁️' },
    { label: 'Tools & Dev Subscriptions', pct: 15, color: '#7C3AED', icon: '🛠️' },
    { label: 'Marketing & Launch', pct: 20, color: '#BE185D', icon: '📣' },
    { label: 'Contingency', pct: 15, color: '#9CA3AF', icon: '🛡️' },
  ]
  return [
    { label: 'Cloud Infrastructure', pct: 25, color: '#2563EB', icon: '☁️' },
    { label: 'Marketing & User Acquisition', pct: 30, color: '#BE185D', icon: '📣' },
    { label: 'Tools & SaaS Subscriptions', pct: 15, color: '#7C3AED', icon: '🛠️' },
    { label: 'Domain, Legal & Admin', pct: 10, color: '#16A34A', icon: '📝' },
    { label: 'Contingency', pct: 20, color: '#9CA3AF', icon: '🛡️' },
  ]
}

// ─── 6-Month Projection ───────────────────────────────────────────────────────
function generateProjection(budget, revModelId, teamSize) {
  const monthly = budget / 6
  const rows = [
    { month: 'Month 1–2', milestone: 'Build & Internal Test', users: 0, rev: 0, cost: Math.round(monthly * 1.4) },
    { month: 'Month 3', milestone: 'Beta Launch', users: Math.max(20, teamSize * 10), rev: revModelId === 'grant' ? 0 : Math.round(monthly * 0.15), cost: Math.round(monthly * 0.9) },
    { month: 'Month 4', milestone: 'Growth Sprint', users: Math.max(80, teamSize * 40), rev: Math.round(monthly * 0.5), cost: Math.round(monthly * 1.0) },
    { month: 'Month 5', milestone: 'Feature Iteration', users: Math.max(200, teamSize * 100), rev: Math.round(monthly * 0.85), cost: Math.round(monthly * 0.85) },
    { month: 'Month 6', milestone: 'Profitability Target', users: Math.max(500, teamSize * 250), rev: Math.round(monthly * 1.2), cost: Math.round(monthly * 0.7) },
  ]
  return rows.map(r => ({ ...r, net: r.rev - r.cost }))
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BusinessModel() {
  const projects = readSavedProjects()
  const requestedProject = new URLSearchParams(window.location.search).get('project')
  const project = projects.find(p => p.id === requestedProject) || projects[0]

  const domain = project?.domain || 'software'
  const category = project?.category || 'Startup'
  const teamSize = project?.teamSize || 2
  const saved = project?.businessModel || {}

  const [selectedModels, setSelectedModels] = useState(saved.models || [])
  const [budget, setBudget] = useState(saved.budget || 30000)
  const [expandedModel, setExpandedModel] = useState(null)
  const [showRationale, setShowRationale] = useState(false)

  function toggleModel(id) {
    setSelectedModels(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id].slice(0, 2))
  }

  const budgetCategories = useMemo(() => getBudgetCategories(domain), [domain])
  const projection = useMemo(() => generateProjection(budget, selectedModels[0], teamSize), [budget, selectedModels, teamSize])
  const fundingSources = FUNDING_SOURCES[category] || FUNDING_SOURCES['Startup']
  const totalRevProjection = projection.reduce((s, r) => s + r.rev, 0)
  const totalCostProjection = projection.reduce((s, r) => s + r.cost, 0)

  const domainBadge = { software: { label: '💻 Software', color: '#2563EB', bg: '#EFF6FF' }, hardware: { label: '🔧 Hardware', color: '#D97706', bg: '#FFFBEB' }, hybrid: { label: '⚡ Hybrid', color: '#7C3AED', bg: '#F5F3FF' } }[domain] || {}

  return (
    <div className="bm-page">
      <Sidebar />
      <div className="bm-main">
        <Header />
        <div className="bm-content">
          {/* Header */}
          <div className="bm-hero">
            <div className="bm-hero-left">
              <div className="flex items-center gap-2 mb-2">
                <span className="bm-eyebrow">Business Model</span>
                {project && (
                  <span className="bm-domain-badge" style={{ background: domainBadge.bg, color: domainBadge.color }}>
                    {domainBadge.label}
                  </span>
                )}
              </div>
              <h1 className="bm-title">Financial Planner & Business Model</h1>
              <p className="bm-subtitle">
                {project ? `Planning finances for ${project.name}` : 'Select a project to plan your business model & budget'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bm-stat-chip">
                <span>💰</span>
                <span>₹{(budget / 1000).toFixed(0)}K budget</span>
              </div>
              <div className="bm-stat-chip">
                <span>👥</span>
                <span>{teamSize} member{teamSize > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div className="bm-grid">
            {/* LEFT COLUMN */}
            <div className="bm-left-col">

              {/* Section A: Revenue Model */}
              <section className="bm-card">
                <div className="bm-section-header">
                  <div className="bm-section-icon" style={{ background: '#EFF6FF' }}>
                    <CircleDollarSign size={16} style={{ color: '#2563EB' }} />
                  </div>
                  <div>
                    <h2 className="bm-section-title">Revenue Model</h2>
                    <p className="bm-section-sub">Pick up to 2 revenue models for your project</p>
                  </div>
                </div>

                <div className="bm-model-grid">
                  {REVENUE_MODELS.filter(m => !m.bestFor || m.bestFor.some(b => b.toLowerCase() === domain || b.toLowerCase() === 'software')).map(model => {
                    const isSelected = selectedModels.includes(model.id)
                    const isExpanded = expandedModel === model.id
                    return (
                      <div key={model.id}
                        className={`bm-model-card ${isSelected ? 'selected' : ''}`}
                        style={isSelected ? { borderColor: model.color, background: model.bg } : {}}
                      >
                        <button type="button" className="bm-model-header" onClick={() => toggleModel(model.id)}>
                          <span className="bm-model-icon">{model.icon}</span>
                          <div className="bm-model-info">
                            <span className="bm-model-name">{model.name}</span>
                            <span className="bm-model-arpu" style={{ color: model.color }}>{model.avgArpu}</span>
                          </div>
                          {isSelected && <CheckCircle2 size={15} style={{ color: model.color, flexShrink: 0 }} />}
                        </button>
                        <p className="bm-model-desc">{model.desc}</p>
                        <button type="button" className="bm-model-expand" onClick={() => setExpandedModel(isExpanded ? null : model.id)}>
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          <span>{isExpanded ? 'Less' : 'Details'}</span>
                        </button>
                        {isExpanded && (
                          <div className="bm-model-details">
                            <div className="bm-pros-cons">
                              <div>
                                <span className="bm-pros-label">✅ Pros</span>
                                <ul>{model.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
                              </div>
                              <div>
                                <span className="bm-cons-label">⚠️ Cons</span>
                                <ul>{model.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
                              </div>
                            </div>
                            <p className="bm-example">📍 Examples: {model.bestExample}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Section B: Budget Breakdown */}
              <section className="bm-card">
                <div className="bm-section-header">
                  <div className="bm-section-icon" style={{ background: '#FFFBEB' }}>
                    <BarChart3 size={16} style={{ color: '#D97706' }} />
                  </div>
                  <div>
                    <h2 className="bm-section-title">Budget Breakdown</h2>
                    <p className="bm-section-sub">Drag to set total budget</p>
                  </div>
                </div>

                <div className="bm-budget-slider-row">
                  <span className="bm-budget-label">Total Budget</span>
                  <span className="bm-budget-value">₹{budget.toLocaleString('en-IN')}</span>
                </div>
                <input type="range" min="5000" max="500000" step="5000" value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                  className="bm-slider"
                />
                <div className="bm-budget-range-labels">
                  <span>₹5K</span><span>₹2.5L</span><span>₹5L</span>
                </div>

                <div className="bm-allocation-bar">
                  {budgetCategories.map((cat, i) => (
                    <div key={i} className="bm-alloc-segment" style={{ width: `${cat.pct}%`, background: cat.color }} title={`${cat.label}: ${cat.pct}%`} />
                  ))}
                </div>

                <div className="bm-alloc-list">
                  {budgetCategories.map((cat, i) => (
                    <div key={i} className="bm-alloc-item">
                      <span className="bm-alloc-dot" style={{ background: cat.color }} />
                      <span className="bm-alloc-icon">{cat.icon}</span>
                      <span className="bm-alloc-label">{cat.label}</span>
                      <span className="bm-alloc-pct">{cat.pct}%</span>
                      <span className="bm-alloc-amt">₹{Math.round(budget * cat.pct / 100).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN */}
            <div className="bm-right-col">

              {/* Section C: 6-Month Projection */}
              <section className="bm-card">
                <div className="bm-section-header">
                  <div className="bm-section-icon" style={{ background: '#F0FDF4' }}>
                    <TrendingUp size={16} style={{ color: '#16A34A' }} />
                  </div>
                  <div>
                    <h2 className="bm-section-title">6-Month Financial Projection</h2>
                    <p className="bm-section-sub">Personalized from your team & timeline</p>
                  </div>
                </div>

                <div className="bm-projection-summary">
                  <div className="bm-proj-stat" style={{ background: '#F0FDF4' }}>
                    <span className="bm-proj-stat-label" style={{ color: '#16A34A' }}>Projected Revenue</span>
                    <span className="bm-proj-stat-value" style={{ color: '#16A34A' }}>₹{totalRevProjection.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bm-proj-stat" style={{ background: '#FEF2F2' }}>
                    <span className="bm-proj-stat-label" style={{ color: '#DC2626' }}>Projected Cost</span>
                    <span className="bm-proj-stat-value" style={{ color: '#DC2626' }}>₹{totalCostProjection.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bm-proj-stat" style={{ background: totalRevProjection >= totalCostProjection ? '#F0FDF4' : '#FEF2F2' }}>
                    <span className="bm-proj-stat-label" style={{ color: totalRevProjection >= totalCostProjection ? '#16A34A' : '#DC2626' }}>Net</span>
                    <span className="bm-proj-stat-value" style={{ color: totalRevProjection >= totalCostProjection ? '#16A34A' : '#DC2626' }}>
                      {totalRevProjection - totalCostProjection >= 0 ? '+' : ''}₹{(totalRevProjection - totalCostProjection).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="bm-projection-table-wrap">
                  <table className="bm-projection-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Milestone</th>
                        <th>Users</th>
                        <th>Revenue</th>
                        <th>Cost</th>
                        <th>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projection.map((row, i) => (
                        <tr key={i}>
                          <td className="bm-proj-month">{row.month}</td>
                          <td className="bm-proj-milestone">{row.milestone}</td>
                          <td>{row.users.toLocaleString()}</td>
                          <td style={{ color: '#16A34A' }}>₹{row.rev.toLocaleString('en-IN')}</td>
                          <td style={{ color: '#DC2626' }}>₹{row.cost.toLocaleString('en-IN')}</td>
                          <td style={{ color: row.net >= 0 ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
                            {row.net >= 0 ? '+' : ''}₹{row.net.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bm-projection-note">
                  <Info size={11} />
                  Based on ₹{budget.toLocaleString('en-IN')} budget, {teamSize}-person team, and industry conversion benchmarks for a {domain} project.
                </div>
              </section>

              {/* Section D: Funding Sources */}
              <section className="bm-card">
                <div className="bm-section-header">
                  <div className="bm-section-icon" style={{ background: '#F5F3FF' }}>
                    <Sparkles size={16} style={{ color: '#7C3AED' }} />
                  </div>
                  <div>
                    <h2 className="bm-section-title">Funding Sources for You</h2>
                    <p className="bm-section-sub">Best options for a {category} {domain} project</p>
                  </div>
                </div>
                <div className="bm-funding-grid">
                  {fundingSources.map((fund, i) => (
                    <a key={i} href={fund.url} target="_blank" rel="noreferrer" className="bm-funding-card"
                      style={{ background: fund.bg, borderColor: fund.bg }}>
                      <div className="bm-funding-header">
                        <span className="bm-funding-icon">{fund.icon}</span>
                        <span className="bm-funding-type" style={{ color: fund.color }}>{fund.type}</span>
                      </div>
                      <div className="bm-funding-name">{fund.name}</div>
                      <div className="bm-funding-amount" style={{ color: fund.color }}>{fund.amount}</div>
                      <div className="bm-funding-link">Apply <ExternalLink size={10} /></div>
                    </a>
                  ))}
                </div>
              </section>

              {/* Section E: AI Rationale */}
              <section className="bm-card bm-rationale-card">
                <button type="button" className="bm-rationale-toggle" onClick={() => setShowRationale(p => !p)}>
                  <div className="flex items-center gap-2">
                    <Lightbulb size={14} style={{ color: '#D97706' }} />
                    <span>Why these recommendations?</span>
                  </div>
                  {showRationale ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {showRationale && (
                  <div className="bm-rationale-body">
                    <p>Based on your <strong>{domain}</strong> project type and <strong>{category}</strong> context, here's the reasoning:</p>
                    <ul>
                      {domain === 'hardware' && <li>🔧 <strong>Hardware projects</strong> benefit most from One-Time Sale or Hardware + Service plans because BOM costs are upfront and predictable.</li>}
                      {domain === 'software' && <li>💻 <strong>Software projects</strong> scale best with Subscription or Freemium models since the marginal cost per user approaches zero.</li>}
                      {domain === 'hybrid' && <li>⚡ <strong>Hybrid projects</strong> often combine hardware one-time sale with a software subscription — maximizing both initial cash and recurring LTV.</li>}
                      <li>📊 Budget allocation prioritizes <strong>{budgetCategories[0]?.label}</strong> ({budgetCategories[0]?.pct}%) because that's the highest-impact spend for your project domain.</li>
                      <li>🌱 For a <strong>{category}</strong>, {fundingSources[0]?.name} is the most accessible funding with realistic eligibility requirements.</li>
                      <li>📈 Revenue projections use conservative industry benchmarks: 2–5% free-to-paid conversion, ₹300–₹500 ARPU for Indian markets.</li>
                    </ul>
                    <p className="bm-rationale-disclaimer">These are estimates based on market data. Actual results depend on execution, market fit, and timing.</p>
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
