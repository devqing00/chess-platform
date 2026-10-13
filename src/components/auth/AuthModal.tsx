'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { soundService } from '@/lib/audioService';

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
  const [turnstileVerified, setTurnstileVerified] = useState(false);
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
          setError('Please provide a username');
          setIsSubmitting(false);
          return;
        }
        await registerWithEmail(identifier, password, displayName);
      }
      soundService.playMove();
      closeAuthModal();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
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
      setError(err?.message || 'Google Sign-In failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      {/* Background board silhouette texture */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Main Login Card (Image 2 Parity) */}
      <div className="relative w-full max-w-[420px] bg-[#262421] border border-[#36322d] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4 text-zinc-100 z-10">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#312e2b] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl text-[#81b64c]">♟️</span>
            <span className="text-2xl font-black tracking-tight text-white flex items-center">
              Chess<span className="text-[#81b64c]">.com</span>
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 bg-red-950/60 border border-red-800/70 rounded-xl flex items-start gap-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Username"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-3 bg-[#1e1c18] border border-[#3b3833] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition font-medium"
              />
            </div>
          )}

          {/* Identifier Input */}
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Username, Phone, or Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full pl-10 pr-3 py-3 bg-[#1e1c18] border border-[#3b3833] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition font-medium"
            />
          </div>

          {/* Password Input with Visibility Toggle */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-10 py-3 bg-[#1e1c18] border border-[#3b3833] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs text-zinc-400 px-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-[#1e1c18] border-[#3b3833] text-[#81b64c] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="font-semibold text-zinc-300">Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => setError('Password reset instructions will be sent to your email.')}
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 transition cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {/* Big Green Log In Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#81b64c] hover:bg-[#73a542] active:bg-[#68973b] text-white font-black text-base rounded-xl transition shadow-lg shadow-[#81b64c]/20 mt-1 cursor-pointer"
          >
            {mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {/* Cloudflare Turnstile "Verify you are human" Widget (Image 2 Parity) */}
        <div className="p-3 bg-[#1e1c18] border border-[#3b3833] rounded-xl flex items-center justify-between shadow-inner">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={turnstileVerified}
              onChange={(e) => setTurnstileVerified(e.target.checked)}
              className="w-5 h-5 rounded bg-[#2b2824] border-[#4a453f] text-[#81b64c] focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-bold text-zinc-200">Verify you are human</span>
          </label>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <svg className="w-5 h-3 text-[#f48120]" viewBox="0 0 100 60" fill="currentColor">
                <path d="M70 20 C68 9, 58 2, 47 2 C37 2, 28 8, 25 18 C11 20, 0 31, 0 44 C0 57, 11 60, 24 60 L78 60 C90 60, 100 50, 100 38 C100 28, 92 20, 81 20 Z" />
              </svg>
              <span className="text-[10px] font-black tracking-tight text-zinc-300">CLOUDFLARE</span>
            </div>
            <div className="flex gap-1.5 text-[8px] text-zinc-500">
              <span className="hover:underline cursor-pointer">Privacy</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Terms</span>
            </div>
          </div>
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-3 my-0.5">
          <div className="flex-1 h-px bg-[#36322d]" />
          <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">OR</span>
          <div className="flex-1 h-px bg-[#36322d]" />
        </div>

        {/* Social Logins (Apple, Google, Facebook) */}
        <div className="flex flex-col gap-2">
          {/* Apple Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 bg-[#322f2a] hover:bg-[#3d3a34] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer border border-[#403c36]"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.74-7.94-12.16-14.59-6.42-9.74-11.44-20.73-15.06-32.96-3.63-12.23-5.44-23.75-5.44-34.56 0-14.54 3.73-26.68 11.19-36.42 7.46-9.75 16.92-14.75 28.38-15.02 4.8.12 10.19 1.34 16.16 3.66 5.98 2.32 9.94 3.54 11.9 3.66 1.74-.24 5.92-1.52 12.54-3.84 6.62-2.32 12.16-3.35 16.63-3.08 12.52.85 22.42 5.51 29.7 13.98-10.99 6.69-16.36 15.82-16.12 27.38.24 9.07 3.65 16.71 10.23 22.91 6.58 6.2 14.44 9.77 23.59 10.72-2.33 7.02-5.35 14.15-9.06 21.41zM119.22 33.52c0-7.39 2.65-14.28 7.95-20.67 5.3-6.39 11.75-10.45 19.35-12.18.98 6.83-1.06 13.82-6.12 20.97-5.06 7.15-11.48 11.42-19.26 12.8-.25-.3-.99-.61-1.92-.92z" />
            </svg>
            <span>Log in with Apple</span>
          </button>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 bg-[#322f2a] hover:bg-[#3d3a34] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer border border-[#403c36]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Log in with Google</span>
          </button>

          {/* Facebook Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 bg-[#322f2a] hover:bg-[#3d3a34] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer border border-[#403c36]"
          >
            <svg className="w-4 h-4 fill-[#1877f2]" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Log in with Facebook</span>
          </button>
        </div>

        {/* Footer Mode Switcher */}
        <div className="text-center pt-2 border-t border-[#36322d]">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'register' : 'login'));
              setError(null);
            }}
            className="text-xs text-zinc-400 hover:text-white transition cursor-pointer"
          >
            {mode === 'login' ? (
              <>
                New? <span className="font-bold text-[#81b64c] hover:underline">Sign up - and start playing chess!</span>
              </>
            ) : (
              <>
                Existing member? <span className="font-bold text-[#81b64c] hover:underline">Log in to your account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
