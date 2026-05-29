import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Heart, Info, Lock, Mail, MapPin, User, XCircle } from 'lucide-react';
import { SACRAMENTO_NEIGHBORHOODS } from '../types';
import ThemeToggle from './ThemeToggle';
import {
  SITE,
  ABOUT,
  COMMON_ITEMS,
  HOW_IT_WORKS,
  RULES,
  WHY_IT_MATTERS,
  COMMUNITY_VALUES,
  COMMUNITY_FIRST,
  FUTURE_FEATURES
} from '../siteContent';

interface LandingPageProps {
  onEmailSignIn: (email: string, password: string) => Promise<boolean>;
  onEmailSignUp: (email: string, password: string, displayName: string, neighborhood: string, bio: string) => Promise<boolean>;
  errorMsg?: string;
  isAuthLoading?: boolean;
}

export default function LandingPage({ onEmailSignIn, onEmailSignUp, errorMsg, isAuthLoading }: LandingPageProps) {
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [neighborhood, setNeighborhood] = useState('Midtown');
  const [bio, setBio] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both your email and password.');
      return;
    }
    setLocalLoading(true);
    setLocalError('');
    try {
      const success = await onEmailSignIn(email.trim(), password);
      if (!success) setLocalError('Invalid credentials. Please try again.');
    } catch (err: any) {
      setLocalError(err?.message || 'Sign in failed. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      setLocalError('Please fill out all required fields.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    setLocalLoading(true);
    setLocalError('');
    try {
      const success = await onEmailSignUp(email.trim(), password, displayName.trim(), neighborhood, bio.trim());
      if (!success) setLocalError('Registration failed. Please try again.');
    } catch (err: any) {
      setLocalError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-app font-sans">
      <section className="border-b border-app bg-surface relative">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle showLabel />
        </div>
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5" />
            {SITE.name}
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-tight">
            {SITE.description.replace(' — completely free.', '')}
            <span className="text-[#FF4500]"> — completely free.</span>
          </h1>
          <div className="mt-4 text-sm md:text-base text-muted font-semibold space-y-1">
            {SITE.principles.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <article className="lg:col-span-2 space-y-6">
          <section className="bg-surface border border-app rounded-2xl p-6">
            <h2 className="text-xl font-black text-app">🌎 {ABOUT.title}</h2>
            <p className="mt-3 text-sm text-muted leading-relaxed">{ABOUT.body}</p>
            <p className="mt-4 text-xs font-bold text-muted uppercase tracking-wider">Members can:</p>
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-muted">
              {ABOUT.memberCan.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-black uppercase tracking-wider text-[#FF4500]">{SITE.freeRule}</p>
          </section>

          <section className="bg-surface border border-app rounded-2xl p-6">
            <h2 className="text-xl font-black">📦 Common Items Shared</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {COMMON_ITEMS.map((item) => (
                <span key={item} className="px-3 py-1.5 rounded-full bg-inset border border-app text-xs font-bold text-zinc-200">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="bg-surface border border-app rounded-2xl p-6">
            <h2 className="text-xl font-black">📌 How It Works</h2>
            <ol className="mt-4 space-y-4">
              {HOW_IT_WORKS.map((step) => (
                <li key={step.step} className="text-sm">
                  <p className="font-black text-[#FF4500]">
                    {step.step}. {step.title}
                  </p>
                  <p className="text-muted mt-1">{step.body}</p>
                  {'examples' in step && step.examples && (
                    <p className="text-muted text-xs mt-2">
                      Examples: {step.examples.join(' · ')}
                    </p>
                  )}
                  {'bullets' in step && step.bullets && (
                    <ul className="mt-2 text-muted text-xs space-y-1 list-disc list-inside">
                      {step.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-app rounded-2xl p-5">
              <h3 className="text-base font-black flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                🛑 Rules — Allowed
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted font-semibold">
                {RULES.allowed.map((item) => (
                  <li key={item}>✅ {item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-surface border border-app rounded-2xl p-5">
              <h3 className="text-base font-black flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                Not Allowed
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted font-semibold">
                {RULES.notAllowed.map((item) => (
                  <li key={item}>❌ {item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bg-surface border border-app rounded-2xl p-6">
            <h2 className="text-xl font-black">♻️ {WHY_IT_MATTERS.title}</h2>
            <p className="mt-2 text-sm text-muted font-semibold">{WHY_IT_MATTERS.intro}</p>
            <ul className="mt-3 text-sm text-muted space-y-1.5 font-semibold">
              {WHY_IT_MATTERS.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-zinc-200 font-bold">{WHY_IT_MATTERS.closing}</p>
          </section>

          <section className="bg-surface border border-app rounded-2xl p-6">
            <h2 className="text-xl font-black">🏙️ Sacramento Neighborhoods</h2>
            <p className="mt-2 text-sm text-muted">Users from all around Sacramento are welcome:</p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SACRAMENTO_NEIGHBORHOODS.map((area) => (
                <div key={area} className="px-3 py-2 rounded-xl bg-inset border border-app text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#FF4500]" />
                  {area}
                </div>
              ))}
              <div className="px-3 py-2 rounded-xl bg-inset border border-app text-xs font-bold text-zinc-200">
                And surrounding areas
              </div>
            </div>
          </section>

          <section className="bg-surface border border-app rounded-2xl p-6">
            <h2 className="text-xl font-black">💚 {COMMUNITY_FIRST.title}</h2>
            <p className="mt-2 text-sm text-muted">{COMMUNITY_FIRST.intro}</p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMUNITY_VALUES.map((value) => (
                <div key={value} className="px-3 py-2 text-center rounded-xl bg-inset border border-app text-xs font-black uppercase tracking-wider text-zinc-200">
                  {value}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">{COMMUNITY_FIRST.closing}</p>
          </section>

          <section className="bg-surface border border-app rounded-2xl p-6">
            <h2 className="text-xl font-black">🚀 Future Features</h2>
            <p className="mt-2 text-sm text-muted">Planned features may include:</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FUTURE_FEATURES.map((feature) => (
                <div key={feature} className="px-3 py-2 rounded-xl bg-inset border border-app text-xs font-semibold text-zinc-200">
                  {feature}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface border border-app rounded-2xl p-6">
            <h2 className="text-xl font-black">📬 {SITE.joinCta.title}</h2>
            {SITE.joinCta.lines.map((line) => (
              <p key={line} className="mt-2 text-sm text-zinc-200 font-semibold">
                {line}
              </p>
            ))}
            <p className="mt-4 text-sm text-[#FF4500] font-black">{SITE.name}</p>
            <p className="text-sm text-muted font-semibold">{SITE.tagline}</p>
          </section>
        </article>

        <aside id="auth_credential_desk" className="h-fit sticky top-4 bg-surface border border-app rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-app bg-inset">
            <p className="text-xs font-black text-[#FF4500] uppercase tracking-wider">Join the community</p>
            <p className="text-[11px] text-muted mt-1 leading-relaxed">{SITE.freeRule}</p>
          </div>
          <div className="flex border-b border-app">
            <button
              type="button"
              onClick={() => {
                setAuthTab('signin');
                setLocalError('');
              }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${
                authTab === 'signin' ? 'bg-inset text-[#FF4500]' : 'text-muted hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('signup');
                setLocalError('');
              }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${
                authTab === 'signup' ? 'bg-inset text-[#FF4500]' : 'text-muted hover:text-white'
              }`}
            >
              Join
            </button>
          </div>

          <div className="p-5 space-y-4">
            {(localError || errorMsg) && (
              <div className="p-3 rounded-xl bg-[#241A0F] border border-[#FF9F43]/30 text-[#FF9F43] text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{localError || errorMsg}</span>
              </div>
            )}

            {authTab === 'signin' ? (
              <form onSubmit={handleSignInSubmit} className="space-y-3">
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                    placeholder="name@email.com"
                  />
                </div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                    placeholder="Your password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={localLoading || isAuthLoading}
                  className="w-full py-3 rounded-xl bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-black uppercase tracking-wider disabled:opacity-60"
                >
                  {localLoading || isAuthLoading ? 'Signing in...' : 'Step Inside'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUpSubmit} className="space-y-3">
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                    placeholder="name@email.com"
                  />
                </div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                    placeholder="Min 6 characters"
                  />
                </div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Name / Nickname</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                    placeholder="Friendly display name"
                  />
                </div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Neighborhood</label>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app font-semibold"
                >
                  {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Bio (Optional)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={180}
                  className="w-full px-3 py-2.5 h-20 resize-none bg-inset border border-app rounded-xl text-sm text-app"
                  placeholder="Tell neighbors a little about yourself"
                />
                <button
                  type="submit"
                  disabled={localLoading || isAuthLoading}
                  className="w-full py-3 rounded-xl bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-black uppercase tracking-wider disabled:opacity-60"
                >
                  {localLoading || isAuthLoading ? 'Creating account...' : 'Join Our Community'}
                </button>
              </form>
            )}

            <div className="p-3 rounded-xl bg-inset border border-app text-[11px] text-muted font-semibold flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#FF4500]" />
              <span>{RULES.postReminder}</span>
            </div>
          </div>
        </aside>
      </div>

      <footer className="border-t border-app bg-app-secondary py-6 text-center text-xs text-subtle">
        <p>
          © {new Date().getFullYear()} {SITE.name} · {SITE.tagline}
        </p>
      </footer>
    </div>
  );
}
