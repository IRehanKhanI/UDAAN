import { ExternalLink, Info, Sparkles } from 'lucide-react'
import { formatCurrency } from '../FormatCurrency.js'

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

export default function BudgetSplitTab({
  totalBudget = 30000,
  onTotalBudgetChange = () => {},
  percentages = {},
  onPercentageChange = () => {},
  budgetBuckets = {},
  project = {},
  currency = 'INR',
}) {
  const category = project?.category || project?.project_type || 'Startup'
  const grantList = GRANTS[category] || GRANTS.Startup

  return (
    <div className="space-y-6">
      {/* ── Total Budget Setting ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
              BUDGET ALLOCATION ENGINE
            </span>
            <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
              Initial Validation Capital &amp; Buckets
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#534342]">Total Capital:</label>
            <input
              type="number"
              min="5000"
              step="5000"
              value={totalBudget}
              onChange={(e) => onTotalBudgetChange(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#1D1B18] w-32 focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
          </div>
        </div>

        {/* 5-Bucket Visual Bar */}
        <div className="h-4 w-full rounded-full bg-[#EFEAE4] overflow-hidden flex shadow-inner">
          <div style={{ width: `${percentages.techInfrastructure}%` }} className="bg-[#3B82F6]" title="Tech Infra" />
          <div style={{ width: `${percentages.legalSetup}%` }} className="bg-[#8B5CF6]" title="Legal Setup" />
          <div style={{ width: `${percentages.mvpValidation}%` }} className="bg-[#10B981]" title="MVP Validation" />
          <div style={{ width: `${percentages.marketing}%` }} className="bg-[#F59E0B]" title="Marketing" />
          <div style={{ width: `${percentages.emergencyBuffer}%` }} className="bg-[#EF4444]" title="Emergency Buffer" />
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Tech Infra */}
          <div className="p-3 rounded-xl bg-[#F9F7F5] border border-[#EFEAE4] space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-[#1D1B18]">
              <span>Tech Infrastructure</span>
              <span>{percentages.techInfrastructure}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={percentages.techInfrastructure}
              onChange={(e) => onPercentageChange('techInfrastructure', Number(e.target.value))}
              className="w-full accent-[#3B82F6]"
            />
            <span className="text-[10px] text-[#7C766F] font-mono block">
              {formatCurrency(budgetBuckets.tech_infrastructure || 0, currency)}
            </span>
          </div>

          {/* Legal Setup */}
          <div className="p-3 rounded-xl bg-[#F9F7F5] border border-[#EFEAE4] space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-[#1D1B18]">
              <span>Legal &amp; Compliance</span>
              <span>{percentages.legalSetup}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={percentages.legalSetup}
              onChange={(e) => onPercentageChange('legalSetup', Number(e.target.value))}
              className="w-full accent-[#8B5CF6]"
            />
            <span className="text-[10px] text-[#7C766F] font-mono block">
              {formatCurrency(budgetBuckets.legal_setup || 0, currency)}
            </span>
          </div>

          {/* MVP Validation */}
          <div className="p-3 rounded-xl bg-[#F9F7F5] border border-[#EFEAE4] space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-[#1D1B18]">
              <span>MVP Prototype</span>
              <span>{percentages.mvpValidation}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={percentages.mvpValidation}
              onChange={(e) => onPercentageChange('mvpValidation', Number(e.target.value))}
              className="w-full accent-[#10B981]"
            />
            <span className="text-[10px] text-[#7C766F] font-mono block">
              {formatCurrency(budgetBuckets.mvp_validation || 0, currency)}
            </span>
          </div>

          {/* Marketing */}
          <div className="p-3 rounded-xl bg-[#F9F7F5] border border-[#EFEAE4] space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-[#1D1B18]">
              <span>Marketing &amp; Ads</span>
              <span>{percentages.marketing}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={percentages.marketing}
              onChange={(e) => onPercentageChange('marketing', Number(e.target.value))}
              className="w-full accent-[#F59E0B]"
            />
            <span className="text-[10px] text-[#7C766F] font-mono block">
              {formatCurrency(budgetBuckets.marketing || 0, currency)}
            </span>
          </div>

          {/* Emergency Buffer */}
          <div className="p-3 rounded-xl bg-[#F9F7F5] border border-[#EFEAE4] space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-[#1D1B18]">
              <span>Emergency Buffer</span>
              <span>{percentages.emergencyBuffer}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              value={percentages.emergencyBuffer}
              onChange={(e) => onPercentageChange('emergencyBuffer', Number(e.target.value))}
              className="w-full accent-[#EF4444]"
            />
            <span className="text-[10px] text-[#7C766F] font-mono block">
              {formatCurrency(budgetBuckets.emergency_buffer || 0, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Grant Opportunities Card ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#F59E0B]" />
          <h3 className="text-base font-bold text-[#1D1B18]">
            Non-Dilutive Indian Grant Opportunities ({category})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {grantList.map(([title, amount, url]) => (
            <div
              key={title}
              className="p-4 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] flex items-center justify-between"
            >
              <div>
                <h4 className="text-xs font-bold text-[#1D1B18]">{title}</h4>
                <span className="text-[11px] text-[#16A34A] font-semibold mt-0.5 block">
                  {amount}
                </span>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0284C7] hover:underline"
              >
                <span>Apply</span>
                <ExternalLink size={12} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
