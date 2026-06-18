'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/src/lib/supabase/client';
import CanvasBackground from '@/src/components/ui/CanvasBackground';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex w-full flex-col min-h-screen bg-black relative">
      <CanvasBackground />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 -mt-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm text-center space-y-8"
        >
          <div className="-space-y-5">
            <img src="/logo.png" alt="ChurnRadar" className="w-56 h-56 mx-auto" />
            <div className="space-y-2">
              <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-white whitespace-nowrap">Welcome to ChurnRadar</h1>
              <p className="text-xl text-white/50 font-light">Sign in to your account</p>
            </div>
          </div>

          <motion.button
            onClick={handleGoogleLogin}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white border border-white/15 rounded-full py-3.5 px-5 transition-colors backdrop-blur-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            <span className="font-medium">{loading ? 'Redirecting…' : 'Continue with Google'}</span>
          </motion.button>

          <p className="text-xs text-white/25 leading-relaxed">
            Your data is private to your account.<br />No one else can see your accounts or workflow.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
