import { useState } from 'react'

export default function InviteMakerModal({ isOpen, onClose, onInviteSent }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Co-Maker')
  const [invited, setInvited] = useState(false)

  if (!isOpen) return null

  const handleSend = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setInvited(true)
    if (onInviteSent) onInviteSent({ email, role })
    setTimeout(() => {
      setInvited(false)
      setEmail('')
      onClose()
    }, 1200)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFF8F3] rounded-3xl shadow-2xl border border-[#EFEAE4] p-6 space-y-4 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#FBE191] text-[#705D1B] flex items-center justify-center font-bold">
              👥
            </span>
            <h3 className="text-lg font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
              Invite Studio Collaborator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#534342] hover:text-[#1D1B18] rounded-full hover:bg-[#F3EDE7]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="text-xs text-[#534342] leading-relaxed">
          Invite a co-creator, developer, or teammate to collaborate on this visual board, comment on milestones, and verify evidence.
        </p>

        {invited ? (
          <div className="p-4 rounded-2xl bg-[#f0dedb]/40 text-[#8e4b49] text-xs font-bold text-center flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Invitation sent to {email}!</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider mb-1">
                Collaborator Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@domain.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#EFEAE4] text-xs text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider mb-1">
                Role in Workshop
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Co-Maker', 'Advisor', 'Reviewer'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      role === r
                        ? 'bg-[#FFAAA6] text-[#7A3C3A] border-[#FFAAA6] font-bold'
                        : 'bg-[#FFFFFF] border-[#EFEAE4] text-[#534342] hover:bg-[#F9F2ED]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#534342] hover:bg-[#EDE7E2]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#8E4B49] hover:bg-[#7A3C3A] text-white text-xs font-bold transition-all shadow-md"
              >
                Send Invite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
