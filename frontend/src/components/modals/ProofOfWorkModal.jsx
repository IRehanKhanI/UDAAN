import { useState, useId } from 'react'
import {
  X,
  UploadCloud,
  FileCheck2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Link2,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Award,
  Globe,
} from 'lucide-react'

export default function ProofOfWorkModal({
  isOpen,
  onClose,
  task,
  milestoneTitle,
  projectName = 'My Project',
  projectProblem = '',
  onSaveProof,
}) {
  const fileInputId = useId()
  const [proofFile, setProofFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [demoUrl, setDemoUrl] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('linkedin')
  const [copied, setCopied] = useState(false)
  const [isGeneratingPost, setIsGeneratingPost] = useState(false)
  const [customPostText, setCustomPostText] = useState('')

  if (!isOpen || !task) return null

  // Generate an initial AI draft if not customized yet
  const defaultProblemText = projectProblem || 'solve critical user friction with an intuitive, guided platform'
  const taskTitle = task.title || 'Completed Key Milestone Feature'
  const roleName = task.suggested_role || 'Developer'
  const skills = Array.isArray(task.required_skills) && task.required_skills.length
    ? task.required_skills.join(', ')
    : 'React, Node.js, Modern Web'

  const generatePostDraft = (platform = selectedPlatform) => {
    setIsGeneratingPost(true)
    setTimeout(() => {
      let draft = ''
      if (platform === 'linkedin') {
        draft = `🚀 Shipped another key milestone for ${projectName}!

🎯 The Problem Solved:
Many users struggle because current solutions ${defaultProblemText.toLowerCase().startsWith('solve') ? defaultProblemText.toLowerCase() : `fail to ${defaultProblemText.toLowerCase()}`}. We set out to change that.

💡 What I Built & Tested:
✓ ${taskTitle}
✓ Verified deliverables with complete proof of work
✓ Built with high reliability and clean architecture

🛠 Tech Stack & Tools: ${skills}
${demoUrl ? `🔗 Live Demo / Proof: ${demoUrl}\n` : ''}
Building in public step-by-step with UDAAN. Sharing the journey from idea to deployment!

What are your thoughts on this approach? Would love your feedback!

#BuildInPublic #WebDevelopment #SoftwareEngineering #StartupJourney #IndieHacker #TechCommunity`
      } else {
        draft = `🚀 Just shipped: ${taskTitle} on ${projectName}!

🎯 Solving: ${defaultProblemText.slice(0, 80)}...
🛠 Built with: ${skills.slice(0, 50)}
${demoUrl ? `🔗 Demo: ${demoUrl}` : ''}

Building in public step-by-step with @Udaan! Feedback appreciated 👇
#BuildInPublic #WebDev #IndieHacker`
      }
      setCustomPostText(draft)
      setIsGeneratingPost(false)
    }, 250)
  }

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => setFilePreview(event.target?.result)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleCopyPost = () => {
    const textToCopy = customPostText || ''
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleShareLinkedIn = () => {
    const textToShare = customPostText || ''
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(textToShare)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleShareTwitter = () => {
    const textToShare = customPostText || ''
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textToShare)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSaveProof?.({
      taskId: task.id,
      fileName: proofFile?.name || null,
      filePreview: filePreview || null,
      demoUrl: demoUrl.trim(),
      description: description.trim(),
      postDraft: customPostText,
      submittedAt: new Date().toISOString(),
    })
    onClose()
  }

  // Initialize draft text if empty
  if (!customPostText && !isGeneratingPost) {
    generatePostDraft(selectedPlatform)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-[#EFEAE4] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-[#FFF8F3] via-[#FFF3EE] to-[#FFF8F3] border-b border-[#EFEAE4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8E4B49] text-white flex items-center justify-center shadow-xs">
              <Award size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8E4B49] bg-[#FFF1ED] px-2 py-0.5 rounded-full border border-[#FFAAA6]/40">
                  Proof of Work & Social Boost
                </span>
                {milestoneTitle && (
                  <span className="text-[11px] text-[#7C766F] hidden sm:inline">
                    · {milestoneTitle}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#1D1B18] mt-0.5 line-clamp-1">
                {taskTitle}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#7C766F] hover:text-[#1D1B18] hover:bg-black/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Section 1: Upload Proof of Work */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 size={14} className="text-[#8E4B49]" />
                1. Upload Proof of Work (Screenshot / File / Demo)
              </label>
              <span className="text-[11px] text-[#7C766F]">Screenshots, PNG, JPG, or PDF</span>
            </div>

            {/* Drag & drop upload box */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all ${
                proofFile
                  ? 'border-[#10B981] bg-[#ECFDF5]/30'
                  : 'border-[#E5E0D8] hover:border-[#8E4B49] bg-[#FAF8F5]'
              }`}
            >
              <input
                id={fileInputId}
                type="file"
                accept="image/*,.pdf,.zip"
                onChange={handleFileChange}
                className="sr-only"
              />

              {filePreview ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group max-h-48 overflow-hidden rounded-xl border border-[#E5E7EB] shadow-xs">
                    <img
                      src={filePreview}
                      alt="Proof Preview"
                      className="object-cover max-h-48 rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <label
                        htmlFor={fileInputId}
                        className="px-3 py-1.5 bg-white text-xs font-bold rounded-lg cursor-pointer text-[#1D1B18] shadow-md"
                      >
                        Change Image
                      </label>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#059669] flex items-center gap-1">
                    <CheckCircle2 size={13} /> {proofFile.name} ({(proofFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : proofFile ? (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#059669]">
                  <CheckCircle2 size={16} />
                  <span>{proofFile.name}</span>
                  <label
                    htmlFor={fileInputId}
                    className="ml-2 text-[11px] text-[#8E4B49] underline cursor-pointer"
                  >
                    Change
                  </label>
                </div>
              ) : (
                <label htmlFor={fileInputId} className="cursor-pointer block">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#EFEAE4] shadow-xs text-[#8E4B49] flex items-center justify-center mx-auto mb-2">
                    <UploadCloud size={22} />
                  </div>
                  <p className="text-xs font-bold text-[#1D1B18]">
                    Click to upload screenshot or drag and drop
                  </p>
                  <p className="text-[11px] text-[#7C766F] mt-0.5">
                    Show your UI, passing test terminal, or architecture diagram
                  </p>
                </label>
              )}
            </div>

            {/* Links and Brief description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-[#534342] mb-1 block">
                  Live Demo / GitHub PR URL (Optional)
                </label>
                <div className="relative">
                  <Globe size={13} className="absolute left-3 top-3 text-[#9CA3AF]" />
                  <input
                    type="url"
                    placeholder="https://github.com/... or vercel.app"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#E5E0D8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8E4B49]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#534342] mb-1 block">
                  What did you solve? (One liner)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Added real-time speech practice with 0ms delay"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8E4B49]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: AI Social Media Post Generator */}
          <div className="space-y-3 pt-2 border-t border-[#EFEAE4]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-[#FFF1ED] text-[#8E4B49] flex items-center justify-center font-bold text-xs">
                  <Sparkles size={12} />
                </span>
                <label className="text-xs font-bold text-[#1D1B18] uppercase tracking-wider">
                  2. AI LinkedIn & Social Media Showcase
                </label>
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-[#FAF8F5] border border-[#EFEAE4] rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatform('linkedin')
                    generatePostDraft('linkedin')
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    selectedPlatform === 'linkedin'
                      ? 'bg-[#0077B5] text-white shadow-xs'
                      : 'text-[#7C766F] hover:text-[#1D1B18]'
                  }`}
                >
                  💼 LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatform('twitter')
                    generatePostDraft('twitter')
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    selectedPlatform === 'twitter'
                      ? 'bg-[#1D1B18] text-white shadow-xs'
                      : 'text-[#7C766F] hover:text-[#1D1B18]'
                  }`}
                >
                  🐦 X / Twitter
                </button>
              </div>
            </div>

            <p className="text-[11.5px] text-[#534342] leading-relaxed">
              Posting your proof of work builds a strong personal brand, attracts collaborators, and helps you stand out to hiring managers and users.
            </p>

            {/* Generated Post Box */}
            <div className="relative rounded-2xl border border-[#E5E0D8] bg-[#FCFAF8] p-3 sm:p-4">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#EFEAE4] text-[11px] text-[#7C766F]">
                <span className="font-semibold flex items-center gap-1 text-[#8E4B49]">
                  <Sparkles size={11} /> AI Generated Draft (Editable)
                </span>
                <button
                  type="button"
                  onClick={() => generatePostDraft(selectedPlatform)}
                  disabled={isGeneratingPost}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#7C766F] hover:text-[#1D1B18]"
                >
                  <RefreshCw size={11} className={isGeneratingPost ? 'animate-spin' : ''} />
                  Regenerate
                </button>
              </div>

              <textarea
                rows={7}
                value={customPostText}
                onChange={(e) => setCustomPostText(e.target.value)}
                className="w-full text-xs text-[#1D1B18] bg-transparent resize-y focus:outline-none leading-relaxed font-sans"
                placeholder="AI is preparing your post..."
              />

              {/* Direct share actions row */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#EFEAE4] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPost}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E0D8] text-xs font-bold text-[#1D1B18] hover:bg-[#FAF8F5] transition-all shadow-2xs"
                  >
                    {copied ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Post'}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareLinkedIn}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0077B5] text-white text-xs font-bold hover:bg-[#006097] transition-all shadow-xs"
                  >
                    <ExternalLink size={12} /> Post to LinkedIn
                  </button>

                  <button
                    type="button"
                    onClick={handleShareTwitter}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#000000] text-white text-xs font-bold hover:bg-[#222] transition-all shadow-xs"
                  >
                    <ExternalLink size={12} /> Post to X
                  </button>
                </div>

                <span className="text-[11px] text-[#7C766F]">
                  {customPostText.length} characters
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#7C766F] hover:text-[#1D1B18]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-all shadow-md"
            >
              <CheckCircle2 size={14} className="text-[#10B981]" />
              Save Proof & Complete Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
