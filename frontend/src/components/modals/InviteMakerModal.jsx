import { useState } from 'react'
import { Check, Copy, ExternalLink, Github, Mail, Send, Sparkles, UserRound, X } from 'lucide-react'
import { createTeamInvitations } from '../../services/teamService.js'

export default function InviteMakerModal({ isOpen, onClose, onInviteSent, projectId }) {
  const [tab, setTab] = useState('email') // 'email' | 'github'
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [githubAvatar, setGithubAvatar] = useState('')
  const [role, setRole] = useState('Co-Maker')
  const [invited, setInvited] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('link_only')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleLookupGithub = async () => {
    if (!githubUsername.trim()) return
    setError('')
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(githubUsername.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setGithubAvatar(data.avatar_url || '')
        if (!name) setName(data.name || data.login)
        if (!email) setEmail(data.email || `${data.login}@users.noreply.github.com`)
      } else {
        setError(`GitHub user ${githubUsername} not found.`)
      }
    } catch {
      // Fallback gracefully
      setEmail(`${githubUsername.trim()}@users.noreply.github.com`)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const targetEmail = email.trim() || (githubUsername.trim() ? `${githubUsername.trim()}@users.noreply.github.com` : '')
    if (!targetEmail) {
      setError('Please provide an email address or GitHub username.')
      return
    }
    setError('')
    setBusy(true)

    try {
      const activeProjectId = (projectId && projectId !== 'starter')
        ? projectId
        : (localStorage.getItem('udaan:selected-project') || '')

      if (activeProjectId) {
        const res = await createTeamInvitations(activeProjectId, [{
          email: targetEmail,
          role,
          name: name.trim() || (githubUsername.trim() ? `@${githubUsername.trim()}` : targetEmail.split('@')[0]),
        }])
        const created = res?.invitations?.[0]
        if (created?.invite_link) {
          setInviteLink(created.invite_link)
        }
        setDeliveryStatus(created?.delivery || 'link_only')
      } else {
        setInviteLink(`${window.location.origin}/team/invite/starter-${Date.now()}`)
        setDeliveryStatus('link_only')
      }
      setInvited(true)
      if (onInviteSent) onInviteSent({ email: targetEmail, role, name: name.trim() })
    } catch (err) {
      setError(err.message || 'Could not create invitation.')
    } finally {
      setBusy(false)
    }
  }

  const copyToClipboard = () => {
    if (!inviteLink) return
    navigator.clipboard?.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setInvited(false)
    setEmail('')
    setName('')
    setGithubUsername('')
    setGithubAvatar('')
    setInviteLink('')
    setError('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-[#FFF8F3] rounded-3xl shadow-2xl border border-[#EFEAE4] p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#FFAAA6] text-[#7A3C3A] flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                Invite Teammate to Project
              </h3>
              <p className="text-[11px] text-[#534342]">Share workspace access, assignments & test pilot evidence.</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-[#534342] hover:text-[#1D1B18] rounded-full hover:bg-[#F3EDE7]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
            {error}
          </div>
        )}

        {invited ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border text-xs font-bold text-center flex items-center justify-center gap-2 ${
              deliveryStatus === 'sent'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-[#2A5D54]/10 border-[#2A5D54]/30 text-[#2A5D54]'
            }`}>
              <Check size={18} />
              <span>
                {deliveryStatus === 'sent'
                  ? `Invitation email sent to ${email || name || `@${githubUsername}`}!`
                  : `Invitation link generated for ${name || email || `@${githubUsername}`}!`}
              </span>
            </div>

            {deliveryStatus === 'sent' ? (
              <p className="text-[11px] text-[#2A5D54] text-center font-medium px-2">
                Your collaborator has been emailed their invitation. You can also share the direct link below:
              </p>
            ) : (
              <p className="text-[11px] text-[#7C766F] text-center font-medium px-2">
                Share this direct invite link via WhatsApp, Slack, or email so your collaborator can join this workspace:
              </p>
            )}

            {inviteLink && (
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-white border border-[#EFEAE4]">
                <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider">
                  Direct Invitation Link:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="w-full text-xs font-mono bg-[#FFF8F3] p-2 rounded-xl border border-[#EFEAE4] text-[#1D1B18] select-all"
                  />
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="px-3.5 py-2 rounded-xl bg-[#1D1B18] text-white text-xs font-bold shrink-0 hover:bg-black flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            {/* Tab switch: Email vs GitHub */}
            <div className="flex items-center gap-2 p-1 bg-[#F3EDE7] rounded-2xl">
              <button
                type="button"
                onClick={() => setTab('email')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  tab === 'email' ? 'bg-white text-[#1D1B18] shadow-xs' : 'text-[#7C766F] hover:text-[#1D1B18]'
                }`}
              >
                <Mail size={13} />
                <span>Invite by Email</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('github')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  tab === 'github' ? 'bg-[#1D1B18] text-white shadow-xs' : 'text-[#7C766F] hover:text-[#1D1B18]'
                }`}
              >
                <Github size={13} />
                <span>Invite from GitHub</span>
              </button>
            </div>

            {tab === 'github' ? (
              <div className="space-y-3 p-3.5 rounded-2xl bg-white border border-[#EFEAE4]">
                <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider">
                  GitHub Username
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-[#7C766F]">@</span>
                    <input
                      type="text"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      onBlur={handleLookupGithub}
                      placeholder="e.g. torvalds, octocat"
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs font-bold text-[#1D1B18] focus:border-[#8E4B49] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLookupGithub}
                    className="px-3 py-2 rounded-xl bg-[#F3EDE7] text-[#1D1B18] text-xs font-bold hover:bg-[#EDE7E2]"
                  >
                    Check
                  </button>
                </div>

                {githubAvatar && (
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4]">
                    <img src={githubAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-xs font-bold text-[#1D1B18]">@{githubUsername}</span>
                    <span className="text-[10px] text-[#2A5D54] font-bold ml-auto">✓ Verified GitHub User</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider mb-1">
                  Collaborator Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborator@company.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FFFFFF] border border-[#EFEAE4] text-xs text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider mb-1">
                Collaborator Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2 rounded-2xl bg-[#FFFFFF] border border-[#EFEAE4] text-xs text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider mb-1">
                Project Role & Permissions
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-[#FFFFFF] border border-[#EFEAE4] text-xs font-medium text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6]"
              >
                <option value="Full-Stack Lead">Full-Stack Lead (Architecture & Code Review)</option>
                <option value="Frontend / UI Specialist">Frontend / UI Specialist (Screens & Components)</option>
                <option value="Backend & API Engineer">Backend & API Engineer (Endpoints & Models)</option>
                <option value="QA & Test Engineer">QA & Test Engineer (TestPilot & Verification)</option>
                <option value="Product & Growth Lead">Product & Growth Lead (Validation & Marketing)</option>
                <option value="Co-Maker">General Co-Maker</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFEAE4]">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#534342] hover:bg-[#F3EDE7]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Send size={13} />
                <span>{busy ? 'Sending…' : 'Generate & Send Invitation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
