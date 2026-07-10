'use client';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
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
          <span className="block animate-fade-up">Every signal.</span>
          <span className="block animate-fade-up [animation-delay:100ms]">One radar.</span>
        </h1>

        {/* Google sign-in */}
        <div className="animate-fade-up [animation-delay:220ms] mt-6 sm:mt-7 w-full max-w-xs sm:max-w-sm">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-gray-200 hover:bg-white/80 text-gray-900 py-3 sm:py-3.5 px-5 transition-colors disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            <span className="text-sm sm:text-base font-medium">{loading ? 'Redirecting…' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Description */}
        <p className="animate-fade-up [animation-delay:340ms] mt-4 sm:mt-5 text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md">
          Score every account, see who's slipping
          <br />
          — powered by <Sparkles className="inline w-4 h-4 -mt-1" /> AI
        </p>
      </div>

      {/* Spacer between content and dashboard */}
      <div className="flex-1 min-h-10 sm:min-h-12 lg:min-h-16 shrink-0" />

      {/* Dashboard mockup — hidden on phones so the page fits the screen */}
      <div className="hidden sm:block animate-hero-rise [animation-delay:620ms] relative z-0 w-[84%] lg:w-[72%] max-w-4xl mx-auto shrink-0 -mb-20 lg:-mb-32">
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
