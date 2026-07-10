'use client';

export default function Navbar({ onCtaClick }) {
  return (
    <header className="animate-fade-down relative z-20">
      <nav className="flex items-center justify-between px-5 sm:px-8 lg:px-10 py-4 sm:py-5">
        {/* Logo */}
        <a href="/login" className="flex items-center gap-2 text-gray-900">
          <img src="/logo.png" alt="ProductRadar" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          <span className="text-[15px] sm:text-base font-medium tracking-tight">ProductRadar</span>
        </a>

        {/* CTA */}
        <button
          type="button"
          onClick={onCtaClick}
          className="bg-gray-900 text-white text-[13px] font-medium px-4 sm:px-5 py-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          Get Started
        </button>
      </nav>
    </header>
  );
}
