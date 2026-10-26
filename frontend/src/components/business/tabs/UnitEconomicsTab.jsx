import { useState, useMemo } from 'react'
import {
  TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck,
  Scale, PieChart, Activity
} from 'lucide-react'
import ConfidenceTag from '../ConfidenceTag.jsx'
import { formatCurrency } from '../FormatCurrency.js'

export default function UnitEconomicsTab({
  data = {},
  onChange = () => {},
  currency = 'INR',
}) {
  const unit = data.unit_economics || {}

  const updateUnit = (key, value) => {
    onChange('unit_economics', { ...unit, [key]: value })
  }

  // Inputs
  const price = Number(unit.price_per_unit) || 1200
  const costToServe = Number(unit.cost_to_serve) || 300
  const cac = Number(unit.cac) || 400
  const churnRate = Number(unit.monthly_churn_pct) || 5 // 5% monthly churn
  const fixedOverhead = Number(unit.fixed_overhead) || 50000

  // Calculations
  const grossProfitPerUnit = Math.max(0, price - costToServe)
  const grossMarginPct = price > 0 ? Math.round((grossProfitPerUnit / price) * 100) : 0

  // LTV = Monthly Gross Profit / (Monthly Churn Rate / 100)
  const ltvMonths = churnRate > 0 ? Math.round(100 / churnRate) : 24
  const ltv = Math.round(grossProfitPerUnit * ltvMonths)

  // LTV:CAC ratio
  const ltvCacRatio = cac > 0 ? Number((ltv / cac).toFixed(2)) : 0

  // Break-even units per month = Fixed Overhead / Gross Profit Per Unit
  const breakEvenUnits = grossProfitPerUnit > 0 ? Math.ceil(fixedOverhead / grossProfitPerUnit) : 0

  // Health assessment
  const healthStatus = useMemo(() => {
    if (ltvCacRatio < 1.0) {
      return {
        label: 'Critical: Losing Money per User',
        color: 'text-[#DC2626] bg-[#FEE2E2] border-[#FECACA]',
        text: 'Acquisition cost exceeds lifetime gross margin. Every new customer burns more cash.',
      }
    }
    if (ltvCacRatio < 3.0) {
      return {
        label: 'Caution: Sub-optimal Ratio',
        color: 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]',
        text: 'Below the 3.0x investor threshold. Vulnerable to churn spikes and marketing inflation.',
      }
    }
    if (ltvCacRatio <= 5.0) {
      return {
        label: 'Healthy: Investor-Grade SaaS',
        color: 'text-[#16A34A] bg-[#DCFCE7] border-[#BBF7D0]',
        text: 'Strong margin buffer covering operational overhead with reliable payback periods.',
      }
    }
    return {
      label: 'Exceptional: High Capital Efficiency',
      color: 'text-[#0284C7] bg-[#E0F2FE] border-[#BAE6FD]',
      text: 'Outstanding unit economics. Opportunity to aggressively scale marketing spend.',
    }
  }, [ltvCacRatio])

  return (
    <div className="space-y-6">
      {/* ── Core Pricing & Gross Margin Row ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-5">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
            UNIT MARGINS
          </span>
          <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
            Unit Price, Cost to Serve &amp; Gross Margin
          </h3>
          <p className="text-xs text-[#7C766F] mt-0.5">
            Break down the fundamental unit of transaction (per user, per license, or per device).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Selling Price */}
          <div className="p-4 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#534342]">
                Price per Customer / Unit ({currency === 'INR' ? '₹' : '$'})
              </label>
              <ConfidenceTag
                status={unit.price_confidence || 'verified'}
                onChange={(st) => updateUnit('price_confidence', st)}
                editable
              />
            </div>
            <input
              type="number"
              min="1"
              value={price}
              onChange={(e) => updateUnit('price_per_unit', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-sm font-bold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Average monthly or per-sale customer invoice.
            </p>
          </div>

          {/* Cost to Serve */}
          <div className="p-4 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#534342]">
                Cost to Serve (COGS / Server / BOM)
              </label>
              <ConfidenceTag
                status={unit.cost_confidence || 'single_source'}
                onChange={(st) => updateUnit('cost_confidence', st)}
                editable
              />
            </div>
            <input
              type="number"
              min="0"
              value={costToServe}
              onChange={(e) => updateUnit('cost_to_serve', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-sm font-bold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Variable costs incurred directly per customer.
            </p>
          </div>

          {/* Gross Margin Output */}
          <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-1">
            <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wider block">
              Gross Margin Contribution
            </span>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-[#15803D]">
                {grossMarginPct}%
              </span>
              <span className="text-xs font-bold text-[#16A34A]">
                ({formatCurrency(grossProfitPerUnit, currency)} profit)
              </span>
            </div>
            <p className="text-[10px] text-[#166534] pt-1">
              Healthy software benchmarks target &gt;70%; hardware &gt;35%.
            </p>
          </div>
        </div>
      </div>

      {/* ── LTV vs CAC Health Meter ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
              SUSTAINABILITY RATIO
            </span>
            <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
              LTV : CAC Health Check
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${healthStatus.color}`}
          >
            <span>{ltvCacRatio >= 3.0 ? '✓' : '⚠'}</span>
            <span>{healthStatus.label} ({ltvCacRatio}x)</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CAC Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#534342]">
                Customer Acquisition Cost (CAC)
              </label>
              <ConfidenceTag
                status={unit.cac_confidence || 'ai_estimate'}
                onChange={(st) => updateUnit('cac_confidence', st)}
                editable
              />
            </div>
            <input
              type="number"
              min="1"
              value={cac}
              onChange={(e) => updateUnit('cac', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Total sales &amp; marketing spend divided by new acquired customers.
            </p>
          </div>

          {/* Retention / Churn Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              Monthly Churn Rate ({churnRate}%)
            </label>
            <input
              type="range"
              min="0.5"
              max="25"
              step="0.5"
              value={churnRate}
              onChange={(e) => updateUnit('monthly_churn_pct', Number(e.target.value))}
              className="w-full mt-2 accent-[#9333EA]"
            />
            <p className="text-[10px] text-[#8C847E]">
              Implied customer lifetime: <strong>{ltvMonths} months</strong>
            </p>
          </div>

          {/* LTV Output */}
          <div className="p-3.5 rounded-xl bg-[#FAF5FF] border border-[#F3E8FF] space-y-1">
            <span className="text-[10px] font-bold text-[#7E22CE] uppercase tracking-wider block">
              Estimated Lifetime Value (LTV)
            </span>
            <span className="text-xl font-black text-[#581C87] block">
              {formatCurrency(ltv, currency)}
            </span>
            <p className="text-[10px] text-[#6B21A8]">
              Total gross profit realized across average customer lifespan.
            </p>
          </div>
        </div>

        {/* Health Progress Visual Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#7C766F]">
            <span>0.0x (Loss)</span>
            <span>1.0x (Break-even)</span>
            <span className="font-bold text-[#15803D]">3.0x (Target)</span>
            <span>5.0x+ (Outstanding)</span>
          </div>
          <div className="h-3 w-full rounded-full bg-[#EFEAE4] overflow-hidden flex">
            <div className="h-full bg-[#F87171] w-[20%]" title="Danger (< 1x)" />
            <div className="h-full bg-[#FBBF24] w-[40%]" title="Caution (1x - 3x)" />
            <div className="h-full bg-[#34D399] w-[40%]" title="Healthy (3x+)" />
          </div>
          <p className="text-[11px] text-[#666] leading-relaxed pt-1">
            {healthStatus.text}
          </p>
        </div>
      </div>

      {/* ── Break-Even Card ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-[#0284C7]" />
          <h3 className="text-base font-bold text-[#1D1B18]">
            Monthly Break-Even Volume
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              Fixed Monthly Overhead ({currency === 'INR' ? '₹' : '$'})
            </label>
            <input
              type="number"
              min="0"
              value={fixedOverhead}
              onChange={(e) => updateUnit('fixed_overhead', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Salaries, office/cloud infra, and operational baseline.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#1D4ED8] uppercase block">
                Break-Even Threshold
              </span>
              <span className="text-2xl font-black text-[#1E40AF]">
                {breakEvenUnits} units / month
              </span>
            </div>
            <p className="text-[11px] text-[#1E3A8A] max-w-[200px] text-right font-medium">
              Generating {formatCurrency(breakEvenUnits * price, currency)}/mo to cover all fixed costs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
