import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, ChevronDown, CircleDollarSign,
  Compass, FileCheck, Layers, PieChart, RefreshCw, Save,
  Shield, Sparkles, TrendingUp, X
} from 'lucide-react'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { fetchProjectDraft } from '../services/ideaWorkflowService.js'
import { readSavedProjects, updateSavedProject } from '../services/projectStorage.js'
import {
  calculateBusinessMetrics, generateBusinessModel,
  getBusinessGuardrails, saveBusinessModel
} from '../services/businessModelService.js'

// Tab components
import OverviewTab from '../components/business/tabs/OverviewTab.jsx'
import MarketSizeTab from '../components/business/tabs/MarketSizeTab.jsx'
import UnitEconomicsTab from '../components/business/tabs/UnitEconomicsTab.jsx'
import RunwayAskTab from '../components/business/tabs/RunwayAskTab.jsx'
import MoatWhyNowTab from '../components/business/tabs/MoatWhyNowTab.jsx'
import ConsistencyChecksTab from '../components/business/tabs/ConsistencyChecksTab.jsx'
import BudgetSplitTab from '../components/business/tabs/BudgetSplitTab.jsx'
import { runBusinessConsistencyChecks } from '../components/business/businessConsistencyChecker.js'
import './BusinessModel.css'

const DEFAULT_PCTS = {
  techInfrastructure: 25,
  legalSetup: 10,
  mvpValidation: 25,
  marketing: 20,
  emergencyBuffer: 20,
}

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

export default function BusinessModel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const savedProjects = readSavedProjects()

  // Project ID resolution
  const urlProjectId = searchParams.get('project')
  const [projectId, setProjectId] = useState(
    () => urlProjectId || localStorage.getItem('udaan:selected-project') || savedProjects[0]?.id || ''
  )

  useEffect(() => {
    if (urlProjectId && urlProjectId !== projectId) {
      setProjectId(urlProjectId)
    }
  }, [urlProjectId])

  const project = useMemo(
    () => savedProjects.find(p => String(p.id) === String(projectId)) || savedProjects[0] || null,
    [savedProjects, projectId]
  )

  const [activeTab, setActiveTab] = useState('overview')
  const [currency, setCurrency] = useState('INR') // 'INR' or 'USD'
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  // Studio Data Model
  const [modelData, setModelData] = useState({
    overview: {
      one_line_purpose: '',
      who_pays: 'Target Business Customers',
      who_pays_confidence: 'verified',
      how_much: '₹12,000 / year',
      how_much_confidence: 'single_source',
      to_whom: 'Direct SaaS Subscription Entity',
      to_whom_confidence: 'verified',
      quantified_pain: 'Loses 8 hrs/week on manual spreadsheets',
      current_workaround: 'Manual paper checklists',
    },
    market_size: {
      total_customers: 50000,
      annual_price_per_customer: 120000,
      sam_percentage: 25,
      som_percentage: 5,
      tam_confidence: 'single_source',
      sam_confidence: 'ai_estimate',
      som_confidence: 'verified',
    },
    unit_economics: {
      price_per_unit: 1200,
      cost_to_serve: 300,
      cac: 400,
      monthly_churn_pct: 5,
      fixed_overhead: 50000,
      price_confidence: 'verified',
      cost_confidence: 'single_source',
      cac_confidence: 'ai_estimate',
    },
    runway_ask: {
      funding_needed: 2500000,
      monthly_burn: 150000,
      split_engineering: 45,
      split_marketing: 25,
      split_operations: 15,
      split_legal: 5,
      next_round_milestone: '₹25 Lakh ARR with 15 enterprise clients',
      follow_on_round_target: '₹1.5 Cr Seed round',
      funding_confidence: 'verified',
      burn_confidence: 'single_source',
    },
    moat_why_now: {
      x_axis_label: 'Ease of Integration',
      y_axis_label: 'Automation & Accuracy',
      barrier_ratings: {
        tech: 'Strong',
        data: 'Strong',
        network: 'Weak',
        switching: 'Strong',
        regulation: 'None',
        cost: 'Weak',
      },
    },
    total_budget: 30000,
    percentages: DEFAULT_PCTS,
    fixed_monthly_costs: 5000,
  })

  // Load project's business model from backend or local storage
  useEffect(() => {
    let active = true
    async function load() {
      if (!project?.id) {
        setLoading(false)
        return
      }
      setLoading(true)
      const local = project.businessModel || {}

      if (local && Object.keys(local).length > 0) {
        setModelData(prev => ({
          ...prev,
          ...local,
          overview: { ...prev.overview, ...(local.overview || {}) },
          market_size: { ...prev.market_size, ...(local.market_size || {}) },
          unit_economics: { ...prev.unit_economics, ...(local.unit_economics || {}) },
          runway_ask: { ...prev.runway_ask, ...(local.runway_ask || {}) },
          moat_why_now: { ...prev.moat_why_now, ...(local.moat_why_now || {}) },
          total_budget: local.total_budget || prev.total_budget,
          percentages: local.percentages || prev.percentages,
        }))
      }

      // Try fetching from backend draft
      try {
        const draft = await fetchProjectDraft(project.id)
        if (active && draft?.business_model) {
          const bm = draft.business_model
          setModelData(prev => ({
            ...prev,
            ...bm,
            overview: { ...prev.overview, ...(bm.overview || {}) },
            market_size: { ...prev.market_size, ...(bm.market_size || {}) },
            unit_economics: { ...prev.unit_economics, ...(bm.unit_economics || {}) },
            runway_ask: { ...prev.runway_ask, ...(bm.runway_ask || {}) },
            moat_why_now: { ...prev.moat_why_now, ...(bm.moat_why_now || {}) },
          }))
        }
      } catch { }

      if (active) setLoading(false)
    }

    load()
    return () => { active = false }
  }, [project?.id])

  // Update specific section
  const handleSectionChange = useCallback((section, data) => {
    setModelData(prev => ({
      ...prev,
      [section]: data,
    }))
  }, [])

  // Auto-calculated budget buckets
  const budgetBuckets = useMemo(() => {
    return buildBudget(modelData.total_budget, modelData.percentages || DEFAULT_PCTS)
  }, [modelData.total_budget, modelData.percentages])

  // Consistency checks
  const consistencyIssues = useMemo(() => {
    return runBusinessConsistencyChecks(modelData)
  }, [modelData])

  const criticalIssuesCount = consistencyIssues.filter(i => i.severity === 'error').length
  const warningIssuesCount = consistencyIssues.filter(i => i.severity === 'warning').length

  // Save changes
  const handleSave = async () => {
    if (!project?.id) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...modelData,
        buckets: budgetBuckets,
        currency,
        updated_at: new Date().toISOString(),
      }

      // Save locally
      updateSavedProject(project.id, {
        businessModel: payload,
      })

      // Save to backend
      try {
        await saveBusinessModel(project.id, payload)
      } catch { }

      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setNotice('All business model sections and financials saved successfully.')
    } catch (err) {
      setError(err.message || 'Could not save business model changes.')
    } finally {
      setSaving(false)
    }
  }

  // One-click mathematical fix
  const handleFixValue = (tab, fixValue) => {
    if (tab === 'runway_ask') {
      setModelData(prev => ({
        ...prev,
        runway_ask: {
          ...prev.runway_ask,
          runway_months: fixValue,
        },
      }))
      setNotice(`Synchronized stated runway to ${fixValue} months.`)
    }
  }

  const TABS = [
    { id: 'overview', label: '1. Overview', icon: Sparkles },
    { id: 'market_size', label: '2. Market Size', icon: Compass },
    { id: 'unit_economics', label: '3. Unit Economics', icon: TrendingUp },
    { id: 'runway_ask', label: '4. Runway & Ask', icon: CircleDollarSign },
    { id: 'moat_why_now', label: '5. Moat & Why Now', icon: Shield },
    {
      id: 'consistency_checks',
      label: '6. Checks',
      icon: FileCheck,
      badge: criticalIssuesCount > 0 ? `${criticalIssuesCount}` : warningIssuesCount > 0 ? `${warningIssuesCount}` : null,
      badgeColor: criticalIssuesCount > 0 ? 'bg-[#DC2626]' : 'bg-[#D97706]',
    },
    { id: 'budget_split', label: 'Budget Allocation', icon: Layers },
  ]

  return (
    <div className="min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans'] bm-studio-page">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header
          currentProject={project}
          onToggleMobileMenu={() => setMenuOpen(!menuOpen)}
          onProjectSelect={(proj) => {
            if (proj?.id) {
              setProjectId(proj.id)
              setSearchParams({ project: proj.id })
            }
          }}
        />

        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ── Top Bar Alerts ── */}
          {notice && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#EBF7EE] border border-[#CDEBD4] text-[#1F7A3F] text-xs font-semibold animate-fadeIn">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} />
                {notice}
              </span>
              <button onClick={() => setNotice('')} className="hover:opacity-75">
                <X size={14} />
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs font-semibold animate-fadeIn">
              <span className="flex items-center gap-2">
                <AlertTriangle size={15} />
                {error}
              </span>
              <button onClick={() => setError('')} className="hover:opacity-75">
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── Hero Studio Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <div>
              <span className="text-[10px] font-black tracking-wider text-[#8C847E] uppercase flex items-center gap-1.5">
                <CircleDollarSign size={13} className="text-[#10B981]" />
                INVESTOR FINANCIAL STUDIO
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1B18] tracking-tight mt-0.5">
                Business Model &amp; Unit Economics
              </h1>
              <p className="text-xs sm:text-sm text-[#7C766F] mt-1 font-medium">
                Structured financial architecture for {project?.name || 'your project'}: TAM/SAM/SOM, defensibility, unit margins, and runway.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {/* Currency Selector Toggle */}
              <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#EFEAE4] shadow-xs">
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    currency === 'INR'
                      ? 'bg-[#1D1B18] text-white shadow-xs'
                      : 'text-[#7C766F] hover:text-[#1D1B18]'
                  }`}
                >
                  ₹ INR
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    currency === 'USD'
                      ? 'bg-[#1D1B18] text-white shadow-xs'
                      : 'text-[#7C766F] hover:text-[#1D1B18]'
                  }`}
                >
                  $ USD
                </button>
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D1B18] hover:bg-black text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{saving ? 'Saving…' : 'Save Studio'}</span>
              </button>

              {lastSavedTime && (
                <span className="text-[11px] text-[#8C847E] font-medium hidden sm:inline">
                  Saved at {lastSavedTime}
                </span>
              )}
            </div>
          </div>

          {/* ── Tab Navigation Strip ── */}
          <div className="overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-2 border-b border-[#EFEAE4] min-w-max pb-2">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#1D1B18] shadow-xs border border-[#EFEAE4]'
                        : 'text-[#7C766F] hover:text-[#1D1B18] hover:bg-white/60'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-[#FF6B6B]' : 'text-[#8C847E]'} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center ${tab.badgeColor}`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Active Tab View ── */}
          <div className="pt-1">
            {activeTab === 'overview' && (
              <OverviewTab
                data={modelData}
                onChange={handleSectionChange}
                currency={currency}
                project={project}
              />
            )}

            {activeTab === 'market_size' && (
              <MarketSizeTab
                data={modelData}
                onChange={handleSectionChange}
                currency={currency}
              />
            )}

            {activeTab === 'unit_economics' && (
              <UnitEconomicsTab
                data={modelData}
                onChange={handleSectionChange}
                currency={currency}
              />
            )}

            {activeTab === 'runway_ask' && (
              <RunwayAskTab
                data={modelData}
                onChange={handleSectionChange}
                currency={currency}
              />
            )}

            {activeTab === 'moat_why_now' && (
              <MoatWhyNowTab
                data={modelData}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === 'consistency_checks' && (
              <ConsistencyChecksTab
                data={modelData}
                onSelectTab={(tabKey) => setActiveTab(tabKey)}
                onFixValue={handleFixValue}
              />
            )}

            {activeTab === 'budget_split' && (
              <BudgetSplitTab
                totalBudget={modelData.total_budget}
                onTotalBudgetChange={(val) => setModelData(p => ({ ...p, total_budget: val }))}
                percentages={modelData.percentages || DEFAULT_PCTS}
                onPercentageChange={(k, v) => setModelData(p => ({
                  ...p,
                  percentages: { ...(p.percentages || DEFAULT_PCTS), [k]: v },
                }))}
                budgetBuckets={budgetBuckets}
                project={project}
                currency={currency}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
