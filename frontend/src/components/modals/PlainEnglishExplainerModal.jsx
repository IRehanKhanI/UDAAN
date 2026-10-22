export default function PlainEnglishExplainerModal({ isOpen, onClose, taskTitle, plainEnglish, analogy }) {
  if (!isOpen) return null

  const title = taskTitle || 'Instant action & verification'
  const explanation = plainEnglish || `Setting up "${title}" gives immediate clarity to the user and confirms the loop is closed.`
  const analogyText = analogy || "Think of it like getting a physical receipt with a warm smile at your favorite neighborhood bakery: you immediately know your order is recorded and when it will be ready."

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFF8F3] rounded-3xl shadow-2xl border border-[#EFEAE4] p-6 space-y-4 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#EFEAE4]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#FBE191] text-[#705D1B] flex items-center justify-center text-base">
              💡
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                Explain This Like I&apos;m 10
              </h3>
              <span className="text-[11px] text-[#534342]">Plain English Helper</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#534342] hover:text-[#1D1B18] rounded-full hover:bg-[#F3EDE7]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-4 bg-[#FFFFFF] rounded-2xl border border-[#EFEAE4] space-y-2.5">
          <div className="text-xs font-bold text-[#8E4B49]">
            Why does &ldquo;{title}&rdquo; matter in real life?
          </div>
          <p className="text-xs text-[#1D1B18] leading-relaxed">
            {explanation}
          </p>
          <div className="pt-1 border-t border-[#EFEAE4]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C766F] block mb-1">
              Real-World Analogy
            </span>
            <p className="text-xs text-[#534342] italic leading-relaxed">
              &ldquo;{analogyText}&rdquo;
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#fff8f3] rounded-2xl flex items-center gap-2 text-xs text-[#8e4b49]">
          <span className="material-symbols-outlined text-[18px] text-[#8e4b49]">check_circle</span>
          <span className="font-semibold">Designed for real clarity without unnecessary tech jargon.</span>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors"
          >
            Got it, makes total sense!
          </button>
        </div>
      </div>
    </div>
  )
}
