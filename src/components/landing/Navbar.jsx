'use client';
import { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Toolkit', hasChevron: true },
  { label: 'Plans' },
  { label: 'News' },
];

export default function Navbar({ onCtaClick }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="animate-fade-down relative z-20">
      <nav className="flex items-center justify-between px-5 sm:px-8 lg:px-10 py-4 sm:py-5">
        {/* Logo */}
        <a href="/login" className="flex items-center gap-2 text-gray-900">
          <img src="/logo.png" alt="ProductRadar" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          <span className="text-[15px] sm:text-base font-medium tracking-tight">ProductRadar</span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              className="flex items-center gap-1 text-[13px] text-gray-700 hover:text-gray-900 transition-colors"
            >
              {link.label}
              {link.hasChevron && <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        {/* Right: CTA + hamburger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCtaClick}
            className="bg-gray-900 text-white text-[13px] font-medium px-4 sm:px-5 py-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            Get Started
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full text-gray-900 hover:bg-gray-900/10 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute left-4 right-4 top-full rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-gray-200 px-5 py-3 animate-fade-up">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              className="flex w-full items-center justify-between py-3 text-[15px] text-gray-700 hover:text-gray-900 border-b border-gray-200 last:border-b-0 transition-colors"
            >
              {link.label}
              {link.hasChevron && <ChevronDown className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
