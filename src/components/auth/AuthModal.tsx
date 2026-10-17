'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Lock, User, Mail, Eye, EyeOff, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { soundService } from '@/lib/audioService';
import { BrandLogo } from '@/components/ui/BrandLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    loginAsGuest,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(identifier, password);
      } else {
        if (!displayName.trim()) {
          setError('Please choose a username for your Checkmate profile.');
          setIsSubmitting(false);
          return;
        }
        await registerWithEmail(identifier, password, displayName.trim());
      }
      soundService.playMove();
      closeAuthModal();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Incorrect email or password. Please try again or continue as guest.');
      } else if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Please choose a password with at least 6 characters.');
      } else {
        setError(err?.message || 'Unable to sign in. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      soundService.playMove();
      closeAuthModal();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestPlay = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginAsGuest();
      soundService.playMove();
      closeAuthModal();
    } catch (err: any) {
      setError(err?.message || 'Guest sign-in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      {/* Background board texture */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-[420px] bg-[#201e1a] border-2 border-[#38342c] rounded-3xl p-6 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.7)] flex flex-col gap-4 text-zinc-100 z-10 animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 rounded-full border border-[#38342c] bg-[#1a1815] text-zinc-400 hover:text-white hover:bg-[#282520] transition-all cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Solid Brand Header with new Vector Logo */}
        <div className="flex flex-col items-center text-center gap-1.5 pt-1">
          <BrandLogo size="lg" />
          <p className="text-xs text-zinc-400 mt-1 max-w-[280px]">
            {mode === 'login'
              ? 'Welcome back! Sign in to continue your games and track your rating.'
              : 'Create your free account to track rating progress and climb leaderboards.'}
          </p>
        </div>

        {/* Tab Toggle: Log In / Sign Up */}
        <div className="grid grid-cols-2 p-1 bg-[#161512] rounded-2xl border border-[#2d2a24]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-black rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-[#2a2722] text-white shadow-sm border border-[#3d3931]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-black rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-[#2a2722] text-white shadow-sm border border-[#3d3931]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-2xl flex items-start gap-2.5 text-xs text-rose-200 font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Fast Google 1-Tap Sign-In */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-[#282521] hover:bg-[#322e28] text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-[#3d3830] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Clean Divider */}
        <div className="flex items-center gap-3 my-0.5">
          <div className="flex-1 h-px bg-[#35322b]" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">or with email</span>
          <div className="flex-1 h-px bg-[#35322b]" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Choose Username"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#171613] border border-[#35322b] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition font-semibold"
              />
            </div>
          )}

          {/* Email / Identifier Input */}
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
            <input
              type="email"
              placeholder="Email address"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 bg-[#171613] border border-[#35322b] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition font-semibold"
            />
          </div>

          {/* Password Input with Visibility Toggle */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (minimum 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-10 py-2.5 bg-[#171613] border border-[#35322b] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition font-semibold"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3.5 top-3 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember Me & Reset Password */}
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-[#171613] border border-[#35322b] text-[#81b64c] focus:ring-0 cursor-pointer"
              />
              <span className="font-semibold text-zinc-300 text-[11px]">Remember me</span>
            </label>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setError('Password reset instructions will be sent if the email exists.')}
                className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                Forgot password?
              </button>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#81b64c] hover:bg-[#72a342] text-white font-black text-xs uppercase tracking-wider rounded-xl border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all mt-1 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log In to Checkmate' : 'Create Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Zero-Friction Guest Mode */}
        <div className="pt-2 border-t border-[#2d2a24] flex flex-col items-center">
          <button
            type="button"
            onClick={handleGuestPlay}
            disabled={isSubmitting}
            className="text-xs text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-[#282520]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#81b64c]" />
            <span>Just want to play? <strong className="text-zinc-200 underline">Continue as Guest</strong></span>
          </button>
        </div>
      </div>
    </div>
  );
};
