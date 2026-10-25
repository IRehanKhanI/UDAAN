import { useState } from 'react'
import { CheckCircle2, AlertCircle, Sparkles, HelpCircle, ExternalLink } from 'lucide-react'

export const CONFIDENCE_LEVELS = {
  verified: {
    label: 'Verified',
    color: 'bg-[#EBF7EE] text-[#1E824C] border-[#BCE5C7]',
    icon: CheckCircle2,
    description: 'Backed by primary verified evidence or direct market research.',
  },
  single_source: {
    label: 'Single source',
    color: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    icon: AlertCircle,
    description: 'Reported by one third-party source; needs second validation.',
  },
  ai_estimate: {
    label: 'AI estimate',
    color: 'bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]',
    icon: Sparkles,
    description: 'AI model hypothesis based on market comps; unverified.',
  },
  missing: {
    label: 'Not enough data',
    color: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]',
    icon: HelpCircle,
    description: 'No verified source or estimate yet. Tagged for field testing.',
  },
}

export default function ConfidenceTag({
  status = 'ai_estimate',
  source = '',
  sourceUrl = '',
  onChange = null,
  editable = false,
}) {
  const [open, setOpen] = useState(false)
  const current = CONFIDENCE_LEVELS[status] || CONFIDENCE_LEVELS.ai_estimate
  const Icon = current.icon

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer select-none ${current.color}`}
        title={source || current.description}
      >
        <Icon size={11} strokeWidth={2.4} />
        <span>{current.label}</span>
      </button>

      {open && (
        <div
          className="absolute z-40 right-0 mt-1 w-64 rounded-xl bg-white shadow-xl border border-[#EFEAE4] p-3 space-y-2 text-xs font-['Plus_Jakarta_Sans'] animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#EFEAE4] pb-1.5">
            <span className="font-bold text-[#1D1B18] text-[11px]">Data Integrity Tag</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#8C847E] hover:text-[#1D1B18] text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-[#666] leading-relaxed">
            {current.description}
          </p>

          {source && (
            <div className="p-2 rounded-lg bg-[#F9F7F5] border border-[#EFEAE4] text-[10px] text-[#555] space-y-1">
              <span className="font-bold text-[#1D1B18] block">Attached Source:</span>
              <p className="break-words">{source}</p>
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#2563EB] hover:underline pt-0.5"
                >
                  <span>Open reference</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}

          {editable && onChange && (
            <div className="pt-1.5 border-t border-[#EFEAE4] space-y-1">
              <span className="text-[10px] font-bold text-[#8C847E] uppercase block">
                Update Confidence
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {Object.entries(CONFIDENCE_LEVELS).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onChange(key)
                      setOpen(false)
                    }}
                    className={`px-2 py-1 rounded text-left font-semibold border ${
                      status === key ? 'bg-[#1D1B18] text-white' : 'hover:bg-[#F3EDE7] text-[#555]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
