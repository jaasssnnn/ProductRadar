'use client';
import { useState } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';
import { createClient } from '@/src/lib/supabase/client';
import Navbar from '@/src/components/landing/Navbar';
import DashboardFrame from '@/src/components/landing/DashboardFrame';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    handleGoogleLogin();
  }

  return (
    <section
      className="font-hero relative min-h-[100svh] overflow-hidden bg-cover bg-center flex flex-col"
      style={{ backgroundImage: 'url(/landing/hero-bg.webp)' }}
    >
      <Navbar onCtaClick={handleGoogleLogin} />

      {/* Spacer between navbar and hero content */}
      <div className="flex-1 min-h-8 sm:min-h-12 lg:min-h-16 shrink-0" />

      {/* Hero content */}
      <div className="relative z-20 flex flex-col items-center text-center px-5 shrink-0">
        <h1 className="text-gray-900 font-normal leading-[1.05] tracking-tight text-[40px] min-[400px]:text-[44px] sm:text-6xl lg:text-7xl xl:text-[80px]">
          <span className="block animate-fade-up">Catch churn.</span>
          <span className="block animate-fade-up [animation-delay:100ms]">Before it happens.</span>
        </h1>

        {/* Search bar → login gate */}
        <form
          onSubmit={handleSearchSubmit}
          className="animate-fade-up [animation-delay:220ms] mt-5 sm:mt-6 w-full max-w-xl"
        >
          <div className="flex items-center gap-3 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-gray-200 pl-5 pr-1.5 py-1.5">
            <input
              type="text"
              placeholder="Which accounts are about to churn?"
              className="flex-1 bg-transparent text-sm sm:text-base text-gray-900 placeholder-gray-500 outline-none py-2"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label="Sign in to find out"
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-900 text-white hover:scale-105 active:scale-95 transition-transform shrink-0 disabled:opacity-60"
            >
              <ArrowUp className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </form>

        {/* Description */}
        <p className="animate-fade-up [animation-delay:340ms] mt-4 sm:mt-5 text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md">
          Score every account, see who's slipping
          <br />
          — powered by <Sparkles className="inline w-4 h-4 -mt-1" /> AI
        </p>

        {/* CTA buttons */}
        <div className="animate-fade-up [animation-delay:460ms] mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-gray-800 hover:shadow-lg transition-all disabled:opacity-60"
          >
            {loading ? 'Redirecting…' : 'Try It Free'}
          </button>
          <a
            href="mailto:jasonabhishek897@gmail.com"
            className="text-gray-700 text-sm font-medium px-6 py-2.5 rounded-full ring-1 ring-gray-300 hover:bg-gray-100 transition-colors"
          >
            Talk to sales
          </a>
        </div>
      </div>

      {/* Spacer between content and dashboard */}
      <div className="flex-1 min-h-10 sm:min-h-12 lg:min-h-16 shrink-0" />

      {/* Dashboard mockup */}
      <div className="animate-hero-rise [animation-delay:620ms] relative z-0 w-[92%] sm:w-[84%] lg:w-[72%] max-w-4xl mx-auto shrink-0 -mb-10 sm:-mb-20 lg:-mb-32">
        <DashboardFrame />
      </div>

      {/* Grass overlay */}
      <img
        src="/landing/grass.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-10 w-full select-none"
      />
    </section>
  );
}
