import { useState } from 'react'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import './Glimpse.css'

export default function Glimpse() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="glimpse-page bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans']">
      <Sidebar activePage="glimpse" open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="glimpse-layout lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header onToggleMobileMenu={() => setMenuOpen(!menuOpen)} />
        <main className="glimpse-main px-3 sm:px-5">
          <iframe
            title="Glimpse AI website generation workspace"
            src="/glimpse/index.html"
            className="glimpse-frame w-full border-0 rounded-3xl bg-[#FFF8F3] shadow-[0_2px_12px_-2px_rgba(31,29,26,0.06)]"
            sandbox="allow-scripts allow-same-origin allow-modals"
            allowFullScreen
          />
        </main>
      </div>
    </div>
  )
}
