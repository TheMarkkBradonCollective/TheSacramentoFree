import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Gift, Info, Lock, Mail, Shield, Sparkles, User } from 'lucide-react';
import { SACRAMENTO_NEIGHBORHOODS } from '../../types';
import { PRIVACY, RULES, SITE } from '../../siteContent';
import { usePublicRoute } from '../../public/usePublicRoute';
import { useNewspaperSkin } from '../../preview/NewspaperSkinContext';
import { NEWSPAPER } from '../../preview/newspaperBrand';
import { supabase } from '../../supabase';
import BrandLogo from '../BrandLogo';

interface AuthPageProps {
  onEmailSignIn: (email: string, password: string) => Promise<boolean>;
  onEmailSignUp: (
    email: string,
    password: string,
    displayName: string,
    neighborhood: string,
    bio: string,
    acceptedLegal?: boolean,
  ) => Promise<boolean>;
  errorMsg?: string;
  isAuthLoading?: boolean;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthPage({
  onEmailSignIn,
  onEmailSignUp,
  errorMsg,
  isAuthLoading,
}: AuthPageProps) {
  const { navigate } = usePublicRoute();
  const { enabled: newspaper } = useNewspaperSkin();
  const brandName = newspaper ? NEWSPAPER.name : SITE.name;
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [neighborhood, setNeighborhood] = useState('Midtown');
  const [bio, setBio] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const busy = localLoading || isAuthLoading;
  const displayError = localError || errorMsg;

  const resetLocalState = () => {
    setLocalError('');
    setForgotSent(false);
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    resetLocalState();
  };

  const handleSignInSubmit = async (e: FormEvent) => {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      setLocalError(message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      setLocalError('Please fill out all required fields.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (!legalAccepted) {
      setLocalError('Please read and accept the privacy policy and terms of use to join.');
      return;
    }
    setLocalLoading(true);
    setLocalError('');
    try {
      const success = await onEmailSignUp(
        email.trim(),
        password,
        displayName.trim(),
        neighborhood,
        bio.trim(),
        true,
      );
      if (!success) setLocalError('Registration failed. Please try again.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setLocalError(message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setLocalError('Enter the email address on your account.');
      return;
    }
    setLocalLoading(true);
    setLocalError('');
    setForgotSent(false);
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}#/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send reset email. Please try again.';
      setLocalError(message);
    } finally {
      setLocalLoading(false);
    }
  };

  const pageTitle = authMode === 'forgot' ? 'Reset your password' : 'Sign in or join';
  const pageSubtitle =
    authMode === 'forgot'
      ? 'We will email you a link to choose a new password.'
      : `${SITE.freeRule} Create an account to post, message neighbors, and browse free stuff.`;

  return (
    <div className="lg:flex lg:min-h-full" id="auth_page_root">
      {/* Brand story panel — desktop/tablet-landscape only */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] sbn-auth-brand-panel flex-col justify-between p-10 lg:p-12">
        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo imgClassName="h-11 w-11 object-cover rounded-xl shadow-lg" showTitle={false} />
          {newspaper ? null : (
            <span className="font-display font-bold text-lg text-white">
              Sacramento <span className="text-white/80">Buy Nothing</span>
            </span>
          )}
        </div>

        <div className="relative z-10">
          <h2 className="font-display text-3xl font-bold leading-tight text-white">
            {SITE.joinCta.title}
          </h2>
          <div className="mt-5 space-y-3">
            {SITE.joinCta.lines.map((line) => (
              <p key={line} className="sbn-auth-brand-principle">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                {line}
              </p>
            ))}
          </div>
          <blockquote className="sbn-auth-quote mt-8">
            "{SITE.freeRule}" No selling, no bidding, no flipping — just neighbors helping neighbors.
          </blockquote>
        </div>

        <p className="relative z-10 text-xs font-semibold text-white/70">
          Free forever · No ads · Sacramento-owned and operated
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 lg:py-14">
        <div className="w-full max-w-md">
          {/* Compact brand hero — mobile/tablet only (no split panel at this width) */}
          <div className="lg:hidden mb-6">
            <div className="sbn-native-hero flex items-center gap-3">
              <BrandLogo imgClassName="h-10 w-10 object-cover rounded-xl shrink-0" showTitle={false} />
              <div className="min-w-0">
                {newspaper ? null : (
                  <p className="font-display font-bold text-white leading-tight">{brandName}</p>
                )}
                <p className="text-[11px] text-white/85 mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  {newspaper ? NEWSPAPER.tagline : SITE.freeRule}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('home')}
            className="sbn-back-btn"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <header className="sbn-page-header !mb-5">
            <h1>{pageTitle}</h1>
            <p>{pageSubtitle}</p>
          </header>

          <div className="bg-surface border border-app rounded-2xl overflow-hidden shadow-app">
            {authMode !== 'forgot' && (
              <div className="flex border-b border-app">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${
                    authMode === 'signin' ? 'bg-inset text-accent' : 'text-muted hover:text-app'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${
                    authMode === 'signup' ? 'bg-inset text-accent' : 'text-muted hover:text-app'
                  }`}
                >
                  Join
                </button>
              </div>
            )}

            <div className="p-5 space-y-4">
              {displayError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{displayError}</span>
                </div>
              )}

              {forgotSent && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs font-semibold flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.
                  </span>
                </div>
              )}

              {authMode === 'forgot' ? (
                <form onSubmit={handleForgotSubmit} className="space-y-3">
                  <label htmlFor="auth-forgot-email" className="block text-[11px] font-bold text-muted uppercase tracking-wide">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-forgot-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                      placeholder="name@email.com"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-black uppercase tracking-wider disabled:opacity-60"
                  >
                    {busy ? 'Sending…' : 'Send reset link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="w-full text-xs font-semibold text-accent hover:underline"
                  >
                    Back to sign in
                  </button>
                </form>
              ) : authMode === 'signin' ? (
                <form onSubmit={handleSignInSubmit} className="space-y-3">
                  <label htmlFor="auth-signin-email" className="block text-[11px] font-bold text-muted uppercase tracking-wide">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-signin-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                      placeholder="name@email.com"
                    />
                  </div>
                  <label htmlFor="auth-signin-password" className="block text-[11px] font-bold text-muted uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-signin-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                      placeholder="Your password"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] font-semibold text-accent hover:underline"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-black uppercase tracking-wider disabled:opacity-60"
                  >
                    {busy ? 'Signing in…' : 'Step inside'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignUpSubmit} className="space-y-3">
                  <label htmlFor="auth-signup-email" className="block text-[11px] font-bold text-muted uppercase tracking-wide">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                      placeholder="name@email.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="auth-signup-password" className="block text-[11px] font-bold text-muted uppercase tracking-wide mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-signup-password"
                          type="password"
                          required
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                          placeholder="Min 6 chars"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="auth-signup-name" className="block text-[11px] font-bold text-muted uppercase tracking-wide mb-1.5">
                        Name
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-signup-name"
                          type="text"
                          required
                          autoComplete="name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                          placeholder="Display name"
                        />
                      </div>
                    </div>
                  </div>
                  <label htmlFor="auth-signup-neighborhood" className="block text-[11px] font-bold text-muted uppercase tracking-wide">
                    Neighborhood
                  </label>
                  <select
                    id="auth-signup-neighborhood"
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
                  <label htmlFor="auth-signup-bio" className="block text-[11px] font-bold text-muted uppercase tracking-wide">
                    Bio (optional)
                  </label>
                  <textarea
                    id="auth-signup-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={500}
                    className="w-full px-3 py-2.5 h-20 resize-none bg-inset border border-app rounded-xl text-sm text-app"
                    placeholder="Tell neighbors a little about yourself"
                  />
                  <div className="text-right text-[10px] text-subtle font-mono font-medium">{bio.length}/500</div>
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-inset border border-app cursor-pointer">
                    <input
                      type="checkbox"
                      checked={legalAccepted}
                      onChange={(e) => setLegalAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-app accent-accent"
                    />
                    <span className="text-[11px] text-muted font-semibold leading-relaxed">
                      I have read the{' '}
                      <button
                        type="button"
                        onClick={() => navigate('privacy')}
                        className="text-accent font-bold hover:underline"
                      >
                        privacy policy
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => navigate('terms')}
                        className="text-accent font-bold hover:underline"
                      >
                        terms of use
                      </button>{' '}
                      and agree to follow community rules. My data is stored by Supabase and is never sold.
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-black uppercase tracking-wider disabled:opacity-60"
                  >
                    {busy ? 'Creating account…' : 'Join our community'}
                  </button>
                </form>
              )}

              <div className="p-3 rounded-xl bg-inset border border-app text-[11px] text-muted font-semibold flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
                <span>{RULES.postReminder}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                <button
                  type="button"
                  onClick={() => navigate('privacy')}
                  className="flex items-center justify-center gap-2 text-[11px] font-semibold text-accent hover:underline"
                >
                  <Shield className="w-3.5 h-3.5" />
                  {PRIVACY.shortTitle}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('terms')}
                  className="flex items-center justify-center gap-2 text-[11px] font-semibold text-accent hover:underline"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Terms of use
                </button>
              </div>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-subtle">
            <Gift className="w-3.5 h-3.5 text-accent" />
            {SITE.name} is 100% free — no ads, no selling, ever.
          </p>
        </div>
      </div>
    </div>
  );
}

export function PasswordRecoveryForm({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setLocalError('Use at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    setLocalLoading(true);
    setLocalError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      onComplete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not update password. Please try again.';
      setLocalError(message);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 mesh-bg" id="password_recovery_form">
      <div className="w-full max-w-md bg-card border border-app rounded-2xl p-6 shadow-lg">
        <h1 className="text-lg font-black text-app">Choose a new password</h1>
        <p className="text-sm text-muted mt-1">This finishes the reset link from your email.</p>
        {localError ? (
          <p className="mt-3 text-sm text-red-600 font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {localError}
          </p>
        ) : null}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label htmlFor="auth-reset-password" className="block text-[11px] font-bold text-muted uppercase tracking-wide">
            New password
          </label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="auth-reset-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
              placeholder="Min 6 chars"
            />
          </div>
          <label htmlFor="auth-reset-confirm" className="block text-[11px] font-bold text-muted uppercase tracking-wide">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="auth-reset-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
              placeholder="Repeat password"
            />
          </div>
          <button
            type="submit"
            disabled={localLoading}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-black uppercase tracking-wider disabled:opacity-60"
          >
            {localLoading ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  );
}
