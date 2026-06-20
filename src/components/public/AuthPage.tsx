import { useState, type FormEvent } from 'react';
import { AlertCircle, Info, Lock, Mail, Shield, User } from 'lucide-react';
import { SACRAMENTO_NEIGHBORHOODS } from '../../types';
import { PRIVACY, RULES, SITE } from '../../siteContent';
import { publicRouteHref } from '../../public/routes';
import PublicPageShell from './PublicPageShell';

interface AuthPageProps {
  onEmailSignIn: (email: string, password: string) => Promise<boolean>;
  onEmailSignUp: (
    email: string,
    password: string,
    displayName: string,
    neighborhood: string,
    bio: string,
  ) => Promise<boolean>;
  errorMsg?: string;
  isAuthLoading?: boolean;
}

export default function AuthPage({
  onEmailSignIn,
  onEmailSignUp,
  errorMsg,
  isAuthLoading,
}: AuthPageProps) {
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [neighborhood, setNeighborhood] = useState('Midtown');
  const [bio, setBio] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const busy = localLoading || isAuthLoading;
  const displayError = localError || errorMsg;

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
    if (!privacyAccepted) {
      setLocalError('Please read and accept the privacy policy to join.');
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
      );
      if (!success) setLocalError('Registration failed. Please try again.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setLocalError(message);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <PublicPageShell
      title="Sign in or join"
      subtitle={`${SITE.freeRule} Create an account to post, message neighbors, and browse free stuff.`}
      showBack={false}
    >
      <div className="bg-surface border border-app rounded-2xl overflow-hidden max-w-md">
        <div className="flex border-b border-app">
          <button
            type="button"
            onClick={() => {
              setAuthTab('signin');
              setLocalError('');
            }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${
              authTab === 'signin' ? 'bg-inset text-accent' : 'text-muted hover:text-app'
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
              authTab === 'signup' ? 'bg-inset text-accent' : 'text-muted hover:text-app'
            }`}
          >
            Join
          </button>
        </div>

        <div className="p-5 space-y-4">
          {displayError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{displayError}</span>
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
                  autoComplete="email"
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                  placeholder="Your password"
                />
              </div>
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
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-inset border border-app rounded-xl text-sm text-app"
                  placeholder="Min 6 characters"
                />
              </div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Name / nickname</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="name"
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
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wide">Bio (optional)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={180}
                className="w-full px-3 py-2.5 h-20 resize-none bg-inset border border-app rounded-xl text-sm text-app"
                placeholder="Tell neighbors a little about yourself"
              />
              <label className="flex items-start gap-3 p-3 rounded-xl bg-inset border border-app cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-app accent-[#FF4500]"
                />
                <span className="text-[11px] text-muted font-semibold leading-relaxed">
                  I have read the{' '}
                  <a href={publicRouteHref('privacy')} className="text-accent font-bold hover:underline">
                    privacy policy
                  </a>{' '}
                  and understand my data is stored by Supabase, not sold, and used only to run this community.
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

          <a
            href={publicRouteHref('privacy')}
            className="flex items-center justify-center gap-2 text-[11px] font-semibold text-accent hover:underline"
          >
            <Shield className="w-3.5 h-3.5" />
            Read our privacy & data policy
          </a>
        </div>
      </div>
    </PublicPageShell>
  );
}
