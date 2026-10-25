import { useState, useMemo } from 'react'
import { DollarSign, Clock, PieChart, Flag, Shield, ArrowUpRight } from 'lucide-react'
import ConfidenceTag from '../ConfidenceTag.jsx'
import { formatCurrency } from '../FormatCurrency.js'

export default function RunwayAskTab({
  data = {},
  onChange = () => {},
  currency = 'INR',
}) {
  const ask = data.runway_ask || {}

  const updateAsk = (key, value) => {
    onChange('runway_ask', { ...ask, [key]: value })
  }

  // Numbers
  const fundingNeeded = Number(ask.funding_needed) || Number(data.total_budget) || 2500000
  const monthlyBurn = Number(ask.monthly_burn) || 150000
  const calculatedRunway = monthlyBurn > 0 ? Number((fundingNeeded / monthlyBurn).toFixed(1)) : 0

  // Category split
  const engPct = Number(ask.split_engineering) || 45
  const mktPct = Number(ask.split_marketing) || 25
  const opsPct = Number(ask.split_operations) || 15
  const legalPct = Number(ask.split_legal) || 5
  const bufferPct = Math.max(0, 100 - engPct - mktPct - opsPct - legalPct)

  const runwayStatus = useMemo(() => {
    if (calculatedRunway < 6) {
      return {
        label: 'Critical Runway (< 6 mo)',
        color: 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]',
        advice: 'Too short to iterate through customer validation loops.',
      }
    }
    if (calculatedRunway < 12) {
      return {
        label: 'Tight Runway (6–12 mo)',
        color: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]',
        advice: 'Acceptable for hackathon/grant sprints; tight for institutional fundraising.',
      }
    }
    if (calculatedRunway <= 18) {
      return {
        label: 'Standard Seed Runway (12–18 mo)',
        color: 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]',
        advice: 'Optimal sweet spot for product-market fit and milestone execution.',
      }
    }
    return {
      label: 'Extended Runway (18+ mo)',
      color: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]',
      advice: 'Conservative safety net protecting against macro fundraising headwinds.',
    }
  }, [calculatedRunway])

  return (
    <div className="space-y-6">
      {/* ── The Ask & Runway Header ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-5">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
            CAPITAL ARCHITECTURE
          </span>
          <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
            The Ask, Monthly Burn &amp; Target Runway
          </h3>
          <p className="text-xs text-[#7C766F] mt-0.5">
            Investors evaluate whether your funding amount provides sufficient runway to hit the valuation-inflection milestone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Funding Needed (The Ask) */}
          <div className="p-4 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#534342]">
                Funding Needed ({currency === 'INR' ? '₹' : '$'})
              </label>
              <ConfidenceTag
                status={ask.funding_confidence || 'verified'}
                onChange={(st) => updateAsk('funding_confidence', st)}
                editable
              />
            </div>
            <input
              type="number"
              min="10000"
              step="50000"
              value={fundingNeeded}
              onChange={(e) => updateAsk('funding_needed', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-sm font-bold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Total seed or grant capital requested.
            </p>
          </div>

          {/* Monthly Net Burn */}
          <div className="p-4 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#534342]">
                Estimated Monthly Burn
              </label>
              <ConfidenceTag
                status={ask.burn_confidence || 'single_source'}
                onChange={(st) => updateAsk('burn_confidence', st)}
                editable
              />
            </div>
            <input
              type="number"
              min="1000"
              step="10000"
              value={monthlyBurn}
              onChange={(e) => updateAsk('monthly_burn', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-sm font-bold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Monthly net cash drain after initial revenues.
            </p>
          </div>

          {/* Calculated Runway */}
          <div className="p-4 rounded-xl bg-[#FFF8F3] border border-[#F5D8CE] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8E4B49] uppercase tracking-wider block">
                Calculated Runway
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${runwayStatus.color}`}
              >
                {runwayStatus.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black text-[#1D1B18]">
                {calculatedRunway}
              </span>
              <span className="text-sm font-bold text-[#7C766F]">months</span>
            </div>
            <p className="text-[10px] text-[#7C766F] leading-snug">
              {runwayStatus.advice}
            </p>
          </div>
        </div>
      </div>

      {/* ── Use of Funds Split ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
              CAPITAL ALLOCATION
            </span>
            <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
              Use of Funds Split (%)
            </h3>
          </div>
          <span className="text-xs font-bold text-[#1D1B18]">
            Total Allocated: {engPct + mktPct + opsPct + legalPct + bufferPct}%
          </span>
        </div>

        {/* Visual Allocation Stack */}
        <div className="h-4 w-full rounded-full bg-[#EFEAE4] overflow-hidden flex shadow-inner">
          <div style={{ width: `${engPct}%` }} className="bg-[#3B82F6]" title={`Engineering: ${engPct}%`} />
          <div style={{ width: `${mktPct}%` }} className="bg-[#10B981]" title={`Marketing: ${mktPct}%`} />
          <div style={{ width: `${opsPct}%` }} className="bg-[#F59E0B]" title={`Operations: ${opsPct}%`} />
          <div style={{ width: `${legalPct}%` }} className="bg-[#8B5CF6]" title={`Legal: ${legalPct}%`} />
          <div style={{ width: `${bufferPct}%` }} className="bg-[#EF4444]" title={`Buffer: ${bufferPct}%`} />
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-[#534342]">
              <span>Product &amp; Eng</span>
              <span>{engPct}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={engPct}
              onChange={(e) => updateAsk('split_engineering', Number(e.target.value))}
              className="w-full accent-[#3B82F6]"
            />
            <span className="text-[10px] text-[#7C766F] block font-mono">
              {formatCurrency(fundingNeeded * (engPct / 100), currency, true)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-[#534342]">
              <span>Growth &amp; Sales</span>
              <span>{mktPct}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={mktPct}
              onChange={(e) => updateAsk('split_marketing', Number(e.target.value))}
              className="w-full accent-[#10B981]"
            />
            <span className="text-[10px] text-[#7C766F] block font-mono">
              {formatCurrency(fundingNeeded * (mktPct / 100), currency, true)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-[#534342]">
              <span>Operations &amp; BOM</span>
              <span>{opsPct}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              value={opsPct}
              onChange={(e) => updateAsk('split_operations', Number(e.target.value))}
              className="w-full accent-[#F59E0B]"
            />
            <span className="text-[10px] text-[#7C766F] block font-mono">
              {formatCurrency(fundingNeeded * (opsPct / 100), currency, true)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-[#534342]">
              <span>Emergency Buffer</span>
              <span>{bufferPct}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={bufferPct}
              disabled
              className="w-full accent-[#EF4444] opacity-80"
            />
            <span className="text-[10px] text-[#7C766F] block font-mono">
              {formatCurrency(fundingNeeded * (bufferPct / 100), currency, true)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Follow-On Capital Strategy ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Flag size={18} className="text-[#8B5CF6]" />
          <h3 className="text-base font-bold text-[#1D1B18]">
            Follow-on Capital Milestone &amp; Next Round Trigger
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              Milestone to Reach Before Next Round
            </label>
            <input
              type="text"
              value={ask.next_round_milestone || ''}
              onChange={(e) => updateAsk('next_round_milestone', e.target.value)}
              placeholder="e.g. ₹25 Lakh ARR with 15 enterprise clients and < 3% churn"
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs font-medium text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              Target Follow-on Round Size &amp; Profile
            </label>
            <input
              type="text"
              value={ask.follow_on_round_target || ''}
              onChange={(e) => updateAsk('follow_on_round_target', e.target.value)}
              placeholder="e.g. ₹1.5 Cr Seed round from Climate / Hardware angels"
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs font-medium text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
