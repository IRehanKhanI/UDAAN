import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Save, Sparkles, TrendingUp } from 'lucide-react'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { fetchProjectDraft } from '../services/ideaWorkflowService.js'
import { readSavedProjects, updateSavedProject } from '../services/projectStorage.js'
import { calculateBusinessMetrics, generateBusinessModel, getBusinessGuardrails, saveBusinessModel } from '../services/businessModelService.js'
import './BusinessModel.css'

const MODELS = [
  { id: 'subscription', icon: '📅', name: 'Subscription / SaaS', range: '₹500–₹2,500 / month', bestFor: 'Software', description: 'Recurring revenue per seat or tier.' },
  { id: 'one_time', icon: '🏷️', name: 'One-time sale', range: '₹800–₹8,000 / unit', bestFor: 'Hardware', description: 'Sell a device, kit, or lifetime licence.' },
  { id: 'freemium', icon: '🚀', name: 'Freemium + upgrade', range: '₹200–₹1,200 / paid user', bestFor: 'Software', description: 'Use a free tier to validate demand before paid conversion.' },
  { id: 'marketplace', icon: '%', name: 'Marketplace commission', range: '5–20% per transaction', bestFor: 'Software', description: 'Earn a percentage from buyer and seller transactions.' },
  { id: 'grant', icon: '🏆', name: 'Grant / hackathon prize', range: '₹10,000–₹50,00,000', bestFor: 'All projects', description: 'Non-dilutive capital for validation and prototyping.' },
  { id: 'hardware_service', icon: '🔧', name: 'Hardware + service', range: '₹3,000 device + ₹300 / month', bestFor: 'Hardware', description: 'Pair a device sale with recurring maintenance or data revenue.' },
]

const GRANTS = {
  Startup: [
    ['Startup India Seed Fund', 'Up to ₹20 lakh', 'https://seedfund.startupindia.gov.in/'],
    ['MeitY TIDE 2.0', 'Technology incubator support', 'https://meity.gov.in/content/tide-20'],
  ],
  Hackathon: [
    ['Smart India Hackathon', '₹1 lakh prize per team', 'https://sih.gov.in/'],
    ['MeitY TIDE 2.0', 'Technology incubator support', 'https://meity.gov.in/content/tide-20'],
  ],
  'College Project': [
    ['AICTE IDEA Lab', 'Lab and mentorship support', 'https://ideaab.aicte-india.org/'],
    ['SSIP / College Innovation Grant', 'Institution-dependent support', 'https://ssipgujarat.in/'],
  ],
  'Personal Project': [
    ['Local incubator grant', 'Apply through a nearby incubator', 'https://www.startupindia.gov.in/'],
    ['Startup India Seed Fund', 'Available after eligibility/incorporation', 'https://seedfund.startupindia.gov.in/'],
  ],
}

const DEFAULT_PCTS = { techInfrastructure: 25, legalSetup: 10, mvpValidation: 25, marketing: 20, emergencyBuffer: 20 }

export function buildBudget(totalBudget, percentages) {
  const emergencyBuffer = Math.round(totalBudget * percentages.emergencyBuffer / 100)
  const techInfrastructure = Math.round(totalBudget * percentages.techInfrastructure / 100)
  const legalSetup = Math.round(totalBudget * percentages.legalSetup / 100)
  const mvpValidation = Math.round(totalBudget * percentages.mvpValidation / 100)
  return {
    tech_infrastructure: techInfrastructure,
    legal_setup: legalSetup,
    mvp_validation: mvpValidation,
    marketing: Math.max(0, totalBudget - emergencyBuffer - techInfrastructure - legalSetup - mvpValidation),
    emergency_buffer: emergencyBuffer,
  }
}

function money(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function defaultProject() {
  const projects = readSavedProjects()
  const selected = new URLSearchParams(window.location.search).get('project') || localStorage.getItem('udaan:selected-project')
  return projects.find(item => String(item.id) === String(selected)) || projects[0] || null
}

export default function BusinessModel() {
  const [project, setProject] = useState(defaultProject)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recommendation, setRecommendation] = useState(null)
  const [selectedModels, setSelectedModels] = useState([])
  const [totalBudget, setTotalBudget] = useState(30000)
  const [percentages, setPercentages] = useState(DEFAULT_PCTS)
  const [fixedMonthlyCosts, setFixedMonthlyCosts] = useState(5000)
  const [monthlyMarketing, setMonthlyMarketing] = useState(2000)
  const [monthlyCustomers, setMonthlyCustomers] = useState(10)
  const [averageRevenuePerCustomer, setAverageRevenuePerCustomer] = useState(500)
  const [cac, setCac] = useState(250)

  const domain = project?.domain || 'software'
  const category = project?.category || project?.project_type || 'Startup'
  const saved = project?.businessModel || {}

  useEffect(() => {
    let active = true
    async function load() {
      if (!project?.id) { setLoading(false); return }
      const local = project.businessModel || {}
      if (local.selected_models) {
        setSelectedModels(local.selected_models)
        setTotalBudget(local.total_budget || 30000)
        setFixedMonthlyCosts(local.fixed_monthly_costs || 0)
        setMonthlyMarketing(local.monthly_marketing || 0)
        setMonthlyCustomers(local.monthly_customers || 0)
        setAverageRevenuePerCustomer(local.average_revenue_per_customer || 0)
        setCac(local.cac || 0)
        if (local.buckets) {
          setPercentages({
            techInfrastructure: Math.round(local.buckets.tech_infrastructure * 100 / (local.total_budget || 30000)),
            legalSetup: Math.round(local.buckets.legal_setup * 100 / (local.total_budget || 30000)),
            mvpValidation: Math.round(local.buckets.mvp_validation * 100 / (local.total_budget || 30000)),
            marketing: Math.round(local.buckets.marketing * 100 / (local.total_budget || 30000)),
            emergencyBuffer: Math.round(local.buckets.emergency_buffer * 100 / (local.total_budget || 30000)),
          })
        }
      }
      try {
        const [draft, generated] = await Promise.all([
          fetchProjectDraft(project.id).catch(() => null),
          generateBusinessModel(project.id, project.domain).catch(() => null),
        ])
        if (!active) return
        if (draft?.business_model) {
          const plan = draft.business_model
          setProject(current => ({ ...current, businessModel: plan, domain: plan.domain || current?.domain }))
          setSelectedModels(plan.selected_models || [])
          setTotalBudget(plan.total_budget || 30000)
        }
        setRecommendation(generated)
        if (generated?.recommended_models?.length && !local.selected_models?.length) setSelectedModels(generated.recommended_models)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [project?.id])

  const budget = useMemo(() => buildBudget(totalBudget, percentages), [totalBudget, percentages])
  const metrics = useMemo(() => calculateBusinessMetrics({ totalBudget, fixedMonthlyCosts, monthlyMarketing, monthlyCustomers, averageRevenuePerCustomer }), [totalBudget, fixedMonthlyCosts, monthlyMarketing, monthlyCustomers, averageRevenuePerCustomer])
  const guardrails = useMemo(() => getBusinessGuardrails({ runwayMonths: metrics.runwayMonths, marketing: budget.marketing, mvpValidation: budget.mvp_validation, techInfrastructure: budget.tech_infrastructure }), [metrics.runwayMonths, budget])
  const grants = GRANTS[category] || GRANTS.Startup

  function toggleModel(id) {
    setSelectedModels(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 2 ? [...current, id] : [current[1], id])
  }

  function changePercentage(key, value) {
    const next = Math.max(0, Math.min(80, Number(value)))
    const adjustable = Object.keys(DEFAULT_PCTS).filter(item => item !== 'emergencyBuffer' && item !== key)
    const remaining = 80 - next
    const oldTotal = adjustable.reduce((sum, item) => sum + percentages[item], 0) || adjustable.length
    setPercentages(current => ({
      ...current,
      [key]: next,
      emergencyBuffer: 20,
      ...Object.fromEntries(adjustable.map(item => [item, Math.round(remaining * (current[item] / oldTotal))])),
    }))
  }

  async function save() {
    if (!project?.id || !guardrails.viable || selectedModels.length === 0) return
    setSaving(true); setError('')
    try {
      const payload = {
        domain,
        selected_models: selectedModels,
        total_budget: totalBudget,
        buckets: budget,
        fixed_monthly_costs: fixedMonthlyCosts,
        monthly_marketing: monthlyMarketing,
        monthly_customers: monthlyCustomers,
        average_revenue_per_customer: averageRevenuePerCustomer,
        cac,
      }
      const result = await saveBusinessModel(project.id, payload)
      updateSavedProject(project.id, { businessModel: result.business_model })
      setProject(current => ({ ...current, businessModel: result.business_model }))
      setNotice('Business plan locked and synced with roadmap constraints.')
    } catch (err) {
      setError(err.message || 'The business plan could not be saved.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="bm-page"><Sidebar /><div className="bm-main"><Header /><main className="bm-content"><p>Loading financial recommendations…</p></main></div></div>

  return (
    <div className="bm-page">
      <Sidebar />
      <div className="bm-main"><Header />
        <main className="bm-content">
          <header className="bm-hero">
            <div><span className="bm-eyebrow">Business Model</span><h1 className="bm-title">Financial Planner & Business Model</h1><p className="bm-subtitle">{project ? `Planning finances for ${project.name}` : 'Create a project before locking a business plan.'}</p></div>
            <div className="bm-stat-chip">💰 {money(totalBudget)} starting capital</div>
          </header>
          {error && <div className="bm-alert" role="alert"><AlertTriangle size={16} />{error}</div>}
          {notice && <div className="bm-success" role="status"><CheckCircle2 size={16} />{notice}</div>}
          {!project && <div className="bm-card"><p>Select a project from My Projects before saving a financial plan.</p></div>}
          {project && <div className="bm-grid">
            <div className="bm-left-col">
              <section className="bm-card">
                <div className="bm-section-header"><div className="bm-section-icon"><Sparkles size={16} /></div><div><h2 className="bm-section-title">Revenue Model</h2><p className="bm-section-sub">AI recommends up to two models for your {domain} project.</p></div></div>
                {recommendation?.reason && <p className="bm-projection-note"><Info size={12} /> {recommendation.reason}</p>}
                <div className="bm-model-grid">{MODELS.filter(model => model.bestFor === 'All projects' || model.bestFor.toLowerCase().includes(domain) || domain === 'software' && model.id === 'marketplace').map(model => (
                  <button type="button" key={model.id} className={`bm-model-card ${selectedModels.includes(model.id) ? 'selected' : ''}`} onClick={() => toggleModel(model.id)}>
                    <span className="bm-model-icon">{model.icon}</span><strong>{model.name}</strong><span className="bm-model-arpu">{model.range}</span><small>{model.description}</small>
                  </button>
                ))}</div>
              </section>
              <section className="bm-card">
                <div className="bm-section-header"><div className="bm-section-icon"><TrendingUp size={16} /></div><div><h2 className="bm-section-title">Budget Breakdown</h2><p className="bm-section-sub">The emergency buffer is always locked at 20%.</p></div></div>
                <label className="bm-budget-slider-row">Starting capital <strong>{money(totalBudget)}</strong><input type="range" min="5000" max="500000" step="5000" value={totalBudget} onChange={event => setTotalBudget(Number(event.target.value))} /></label>
                {[
                  ['techInfrastructure', 'Tech & Infrastructure'], ['legalSetup', 'Legal & Setup'], ['mvpValidation', 'MVP Validation'], ['marketing', 'Marketing'],
                ].map(([key, label]) => <label className="bm-alloc-item" key={key}>{label}<input type="range" min="0" max="60" value={percentages[key]} onChange={event => changePercentage(key, event.target.value)} /><b>{percentages[key]}% · {money(budget[{ techInfrastructure: 'tech_infrastructure', legalSetup: 'legal_setup', mvpValidation: 'mvp_validation', marketing: 'marketing' }[key]])}</b></label>)}
                <div className="bm-alloc-item"><span>🛡️ Emergency Runway Buffer</span><b>20% · {money(budget.emergency_buffer)}</b></div>
                <p className="bm-projection-note">Includes Indian operating realities such as GST/accounting setup, tier-2 hiring, cloud costs, validation interviews, and payment fees such as Razorpay.</p>
              </section>
            </div>
            <div className="bm-right-col">
              <section className="bm-card">
                <div className="bm-section-header"><div className="bm-section-icon"><TrendingUp size={16} /></div><div><h2 className="bm-section-title">Unit Economics & Runway</h2><p className="bm-section-sub">These inputs are guardrails, not promises.</p></div></div>
                <div className="bm-economics-grid">
                  {[
                    ['Fixed monthly costs', fixedMonthlyCosts, setFixedMonthlyCosts], ['Monthly marketing', monthlyMarketing, setMonthlyMarketing], ['Expected customers / month', monthlyCustomers, setMonthlyCustomers], ['Revenue / customer', averageRevenuePerCustomer, setAverageRevenuePerCustomer], ['CAC', cac, setCac],
                  ].map(([label, value, setter]) => <label key={label}>{label}<input type="number" min="0" value={value} onChange={event => setter(Number(event.target.value) || 0)} /></label>)}
                </div>
                <div className="bm-projection-summary"><div className="bm-proj-stat"><span>Monthly burn</span><strong>{money(metrics.monthlyBurn)}</strong></div><div className="bm-proj-stat"><span>Runway</span><strong>{metrics.runwayMonths.toFixed(1)} months</strong></div><div className="bm-proj-stat"><span>Monthly revenue</span><strong>{money(metrics.monthlyRevenue)}</strong></div></div>
                <div className={`bm-alert ${guardrails.viable ? 'bm-success' : ''}`}><AlertTriangle size={16} /><div><strong>{guardrails.viable ? 'Plan passes the safety check' : 'Reality Check: adjust this plan before saving'}</strong>{guardrails.warnings.map(warning => <div key={warning}>{warning}</div>)}</div></div>
              </section>
              <section className="bm-card"><div className="bm-section-header"><div className="bm-section-icon"><Sparkles size={16} /></div><div><h2 className="bm-section-title">Funding & Grants Radar</h2><p className="bm-section-sub">Matched for {category} projects.</p></div></div><div className="bm-funding-grid">{grants.map(([name, amount, url]) => <a className="bm-funding-card" href={url} target="_blank" rel="noreferrer" key={name}><strong>{name}</strong><span>{amount}</span><ExternalLink size={12} /></a>)}</div></section>
              <button type="button" className="bm-save-button" disabled={!guardrails.viable || !selectedModels.length || saving} onClick={save}><Save size={15} />{saving ? 'Saving…' : 'Lock & Save Business Plan'}</button>
            </div>
          </div>}
        </main>
      </div>
    </div>
  )
}
