import { useState, useMemo } from 'react'
import { Calculator, Globe, Target, TrendingUp, Info, HelpCircle } from 'lucide-react'
import ConfidenceTag from '../ConfidenceTag.jsx'
import { formatCurrency, formatIndianNumber } from '../FormatCurrency.js'

export default function MarketSizeTab({
  data = {},
  onChange = () => {},
  currency = 'INR',
}) {
  const market = data.market_size || {}

  const updateMarket = (key, value) => {
    onChange('market_size', { ...market, [key]: value })
  }

  // Calculator inputs
  const totalCustomers = Number(market.total_customers) || 50000
  const annualPrice = Number(market.annual_price_per_customer) || 120000
  const samPercentage = Number(market.sam_percentage) || 25
  const somPercentage = Number(market.som_percentage) || 5

  // Calculations
  const calculatedTam = totalCustomers * annualPrice
  const calculatedSam = Math.round(calculatedTam * (samPercentage / 100))
  const calculatedSom = Math.round(calculatedSam * (somPercentage / 100))

  return (
    <div className="space-y-6">
      {/* ── Top Header & Principles ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Calculator size={18} className="text-[#FF6B6B]" />
          <h3 className="text-base font-bold text-[#1D1B18]">
            Bottom-Up Market Sizing Calculator
          </h3>
        </div>
        <p className="text-xs text-[#7C766F] leading-relaxed">
          Top-down industry reports (e.g. &quot;AI is a $500B market&quot;) are viewed with skepticism by investors.
          Use a credible <strong>bottom-up methodology</strong> based on verified customer counts, unit economics, and geographic capture targets.
        </p>
      </div>

      {/* ── Bottom-Up Inputs Card ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-5">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
            CALCULATOR INPUTS
          </span>
          <h4 className="text-sm font-bold text-[#1D1B18] mt-0.5">
            Unit &amp; Customer Population Dynamics
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Input 1: Total Customer Count */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              Total Customer Population
            </label>
            <input
              type="number"
              min="1"
              value={totalCustomers}
              onChange={(e) => updateMarket('total_customers', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Total businesses / units in the broader category.
            </p>
          </div>

          {/* Input 2: Annual Spend */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              Annual Spend per Customer ({currency === 'INR' ? '₹' : '$'})
            </label>
            <input
              type="number"
              min="1"
              value={annualPrice}
              onChange={(e) => updateMarket('annual_price_per_customer', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Contract value or cumulative purchases per year.
            </p>
          </div>

          {/* Input 3: SAM Segment % */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              SAM Segment Share ({samPercentage}%)
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={samPercentage}
              onChange={(e) => updateMarket('sam_percentage', Number(e.target.value))}
              className="w-full mt-2 accent-[#0284C7]"
            />
            <p className="text-[10px] text-[#8C847E]">
              Segment that matches your geography &amp; stack.
            </p>
          </div>

          {/* Input 4: SOM Year 1-3 Capture % */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              SOM Realistic Capture ({somPercentage}%)
            </label>
            <input
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={somPercentage}
              onChange={(e) => updateMarket('som_percentage', Number(e.target.value))}
              className="w-full mt-2 accent-[#10B981]"
            />
            <p className="text-[10px] text-[#8C847E]">
              Achievable capture within Year 1–3 runway.
            </p>
          </div>
        </div>
      </div>

      {/* ── Market Output Cards (TAM, SAM, SOM) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* TAM Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#EFEAE4] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
                TAM (Total Addressable)
              </span>
              <ConfidenceTag
                status={market.tam_confidence || 'single_source'}
                source={market.tam_source || 'Industry registry census'}
                onChange={(st) => updateMarket('tam_confidence', st)}
                editable
              />
            </div>

            <div>
              <span className="text-2xl font-black text-[#1D1B18] tracking-tight block">
                {formatCurrency(calculatedTam, currency, true)}
              </span>
              <span className="text-[11px] text-[#7C766F] font-mono mt-0.5 block">
                {formatCurrency(calculatedTam, currency, false)}
              </span>
            </div>

            <p className="text-[11px] text-[#555] leading-relaxed pt-1">
              Entire global or national demand if 100% of target customers purchased your product.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F9F8F6] border border-[#EFEAE4] text-[10px] text-[#666] font-mono">
            <strong>Formula:</strong> {formatIndianNumber(totalCustomers)} units × {formatCurrency(annualPrice, currency, true)}/yr
          </div>
        </div>

        {/* SAM Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#EFEAE4] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D]">
                SAM (Serviceable Addressable)
              </span>
              <ConfidenceTag
                status={market.sam_confidence || 'ai_estimate'}
                source={market.sam_source || 'Geographic target filter'}
                onChange={(st) => updateMarket('sam_confidence', st)}
                editable
              />
            </div>

            <div>
              <span className="text-2xl font-black text-[#1D1B18] tracking-tight block">
                {formatCurrency(calculatedSam, currency, true)}
              </span>
              <span className="text-[11px] text-[#7C766F] font-mono mt-0.5 block">
                {formatCurrency(calculatedSam, currency, false)}
              </span>
            </div>

            <p className="text-[11px] text-[#555] leading-relaxed pt-1">
              The segment of TAM that your current technology, language, and distribution channels can realistically serve.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F9F8F6] border border-[#EFEAE4] text-[10px] text-[#666] font-mono">
            <strong>Formula:</strong> {samPercentage}% of TAM ({formatIndianNumber(Math.round(totalCustomers * samPercentage / 100))} units)
          </div>
        </div>

        {/* SOM Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#EFEAE4] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF5FF] text-[#7E22CE]">
                SOM (Serviceable Obtainable)
              </span>
              <ConfidenceTag
                status={market.som_confidence || 'verified'}
                source={market.som_source || '12-Month Sales Pipeline'}
                onChange={(st) => updateMarket('som_confidence', st)}
                editable
              />
            </div>

            <div>
              <span className="text-2xl font-black text-[#1D1B18] tracking-tight block">
                {formatCurrency(calculatedSom, currency, true)}
              </span>
              <span className="text-[11px] text-[#7C766F] font-mono mt-0.5 block">
                {formatCurrency(calculatedSom, currency, false)}
              </span>
            </div>

            <p className="text-[11px] text-[#555] leading-relaxed pt-1">
              Your realistic 1–3 year commercial capture target considering sales cycle length, competition, and team capacity.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F9F8F6] border border-[#EFEAE4] text-[10px] text-[#666] font-mono">
            <strong>Formula:</strong> {somPercentage}% of SAM ({formatIndianNumber(Math.round(totalCustomers * samPercentage / 100 * somPercentage / 100))} clients)
          </div>
        </div>
      </div>
    </div>
  )
}
