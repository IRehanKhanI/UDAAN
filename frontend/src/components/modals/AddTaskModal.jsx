import { useState } from 'react'

export default function AddTaskModal({ isOpen, onClose, onAddTask, projectName = '' }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Customer Experience')
  const [minutes, setMinutes] = useState(25)
  const [lead, setLead] = useState('TS')
  const [dueToday, setDueToday] = useState(true)

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onAddTask({
      title: title.trim(),
      category,
      estimatedMinutes: minutes,
      lead,
      dueToday,
      status: 'in_progress',
    })
    setTitle('')
    onClose()
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
            <span className="w-8 h-8 rounded-full bg-[#FFAAA6] text-[#7A3C3A] flex items-center justify-center font-bold">

            </span>
            <div>
              <h3 className="text-lg font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans']">
                Add New Task or Spark
              </h3>
              {projectName && (
                <span className="text-[11px] text-[#7C766F] font-medium">Project: {projectName}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#534342] hover:text-[#1D1B18] rounded-full hover:bg-[#F3EDE7]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider mb-1">
              Task Action Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Set up instant order confirmation email"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#EFEAE4] text-xs text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#EFEAE4] text-xs text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6]"
              >
                <option value="Customer Experience">Customer Experience</option>
                <option value="Checkout & Payments">Checkout & Payments</option>
                <option value="Core Architecture">Core Architecture</option>
                <option value="Fulfillment">Fulfillment</option>
                <option value="Brand Identity">Brand Identity</option>
                <option value="Verification">Verification</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider mb-1">
                Est. Minutes
              </label>
              <input
                type="number"
                min="5"
                max="180"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#EFEAE4] text-xs text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="due-today-check"
              checked={dueToday}
              onChange={(e) => setDueToday(e.target.checked)}
              className="w-4 h-4 rounded text-[#8E4B49] focus:ring-[#FFAAA6]"
            />
            <label htmlFor="due-today-check" className="text-xs font-semibold text-[#1D1B18]">
              Target for today&apos;s sprint workbench
            </label>
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
              className="px-5 py-2 rounded-full bg-[#1D1B18] hover:bg-black text-white text-xs font-bold transition-all shadow-md"
            >
              Add to Workbench
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
