export default function CreativeBriefModal({ isOpen, onClose, project }) {
  if (!isOpen) return null

  const projectName = project?.name || 'Your Project'
  const category = project?.category || 'Creative Launchpad'
  const problem = project?.description || project?.understanding?.problem_statement || 'Delivering high-value experiences directly to users with clear measurable proof.'
  const audience = project?.understanding?.target_users || 'Early adopters, builders, and community advocates.'
  const outcome = project?.understanding?.expected_outcome || 'Complete functional sprint delivery with verified milestones and zero broken workflows.'

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFF8F3] rounded-3xl shadow-2xl border border-[#EFEAE4] p-6 space-y-4 animate-fadeIn max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#EFEAE4]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#FFAAA6] text-[#7A3C3A] flex items-center justify-center font-bold">
              📋
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                Creative Brief · 4 Core Pillars
              </h3>
              <span className="text-[11px] text-[#534342]">{projectName} · {category}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#534342] hover:text-[#1D1B18] rounded-full hover:bg-[#F3EDE7]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="p-3.5 bg-[#FFFFFF] rounded-2xl border border-[#EFEAE4] space-y-1">
            <span className="text-[10px] font-bold text-[#8E4B49] uppercase tracking-wider">
              1. What is the emotional core & problem?
            </span>
            <p className="text-xs text-[#1D1B18] leading-relaxed">
              {problem}
            </p>
          </div>

          <div className="p-3.5 bg-[#FFFFFF] rounded-2xl border border-[#EFEAE4] space-y-1">
            <span className="text-[10px] font-bold text-[#705D1B] uppercase tracking-wider">
              2. Who are the primary users?
            </span>
            <p className="text-xs text-[#1D1B18] leading-relaxed">
              {audience}
            </p>
          </div>

          <div className="p-3.5 bg-[#FFFFFF] rounded-2xl border border-[#EFEAE4] space-y-1">
            <span className="text-[10px] font-bold text-[#8e4b49] uppercase tracking-wider">
              3. What does success look like?
            </span>
            <p className="text-xs text-[#1D1B18] leading-relaxed">
              {outcome}
            </p>
          </div>

          <div className="p-3.5 bg-[#FFFFFF] rounded-2xl border border-[#EFEAE4] space-y-1">
            <span className="text-[10px] font-bold text-[#8E4B49] uppercase tracking-wider">
              4. Tech & Craft Rule
            </span>
            <p className="text-xs text-[#1D1B18] leading-relaxed">
              Maintain high tactile quality, clear user feedback, and verifiable milestone proof without simulated demo data.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors"
          >
            Close Brief
          </button>
        </div>
      </div>
    </div>
  )
}
