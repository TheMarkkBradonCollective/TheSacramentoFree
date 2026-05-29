import React, { useState } from 'react';
import { SACRAMENTO_NEIGHBORHOODS } from '../types';
import { upsertSupabaseProfile } from '../supabase';
import { MapPin, User, Heart } from 'lucide-react';
import { IN_APP, SITE } from '../siteContent';
import { UserProfile } from '../types';

interface OnboardingProps {
  user: any; // Supabase user
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [displayName, setDisplayName] = useState(user?.user_metadata?.displayName || '');
  const [neighborhood, setNeighborhood] = useState(
    user?.user_metadata?.neighborhood || SACRAMENTO_NEIGHBORHOODS[0],
  );
  const [bio, setBio] = useState(user?.user_metadata?.bio || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveWarning, setSaveWarning] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const newProfile: UserProfile = {
      uid: user.id,
      displayName: displayName.trim(),
      photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(displayName)}`,
      email: user.email || '',
      neighborhood,
      bio: bio.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      const { ok, errorMessage } = await upsertSupabaseProfile(newProfile);

      if (!ok) {
        setSaveWarning(
          errorMessage ||
            'Profile saved locally but the database sync failed. You can still use the app; try updating your profile later.',
        );
      }

      onComplete(newProfile);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save your profile.';
      setErrorMsg(message);
      onComplete(newProfile);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="onboarding_viewport" className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-app font-sans">
      <div className="max-w-md w-full bg-surface p-8 rounded-2xl border border-app shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-full text-accent mb-4" id="onboarding_icon_wrapper">
            <Heart className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-app tracking-tight font-display">
            {IN_APP.onboardingTitle}
          </h2>
          <p className="mt-2 text-sm text-subtle leading-relaxed">
            {IN_APP.onboardingBody}
          </p>
          <p className="mt-2 text-xs font-bold text-accent">{SITE.freeRule}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" id="onboarding_form">
          {errorMsg && (
            <div className="p-3 bg-red-950/50 text-red-400 text-xs font-bold rounded-xl border border-red-900" id="onboarding_error">
              {errorMsg}
            </div>
          )}
          {saveWarning && (
            <div className="p-3 bg-amber-950/40 text-amber-300 text-xs font-semibold rounded-xl border border-amber-900/50">
              {saveWarning}
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-1.5">
            <label htmlFor="on_display_name" className="text-xs font-bold text-subtle uppercase tracking-wide block">
              YOUR NAME OR NICKNAME
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-subtle" />
              </div>
              <input
                type="text"
                id="on_display_name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Grandma Rosie, TreeHugger Sam"
                className="block w-full pl-11 pr-3 py-3 bg-inset border border-app rounded-xl text-sm text-app placeholder:text-subtle font-medium focus:outline-hidden focus:border-[#FF4500]"
              />
            </div>
          </div>

          {/* Neighborhood Selector */}
          <div className="space-y-1.5">
            <label htmlFor="on_neighborhood" className="text-xs font-bold text-subtle uppercase tracking-wide block">
              YOUR SACRAMENTO NEIGHBORHOOD
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-subtle" />
              </div>
              <select
                id="on_neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="block w-full pl-11 pr-3 py-3 bg-inset border border-app rounded-xl text-sm font-bold text-app appearance-none cursor-pointer focus:outline-hidden focus:border-[#FF4500]"
              >
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} className="bg-surface text-app">
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-subtle leading-relaxed">
              We'll match you with listing offers near your home neighborhood.
            </p>
          </div>

          {/* Profile Biography */}
          <div className="space-y-1.5">
            <label htmlFor="on_bio" className="text-xs font-bold text-subtle uppercase tracking-wide block">
              TELL NEIGHBORS ABOUT YOURSELF (BIO)
            </label>
            <textarea
              id="on_bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g., 'Just moved to Curtis Park. Excited to meet neighbors, reduce waste, and find warm homes for extra garden tomatoes!'"
              maxLength={500}
              className="block w-full p-3 bg-inset border border-app rounded-xl text-sm text-app placeholder:text-subtle font-medium resize-none focus:outline-hidden focus:border-[#FF4500]"
            />
            <div className="text-right text-[10px] text-subtle font-mono font-medium">
              {bio.length}/500 chars
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            id="onboarding_submit_btn"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3.5 bg-accent hover:bg-accent-hover text-on-accent rounded-xl text-sm font-bold tracking-wide transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase text-center"
          >
            {isSubmitting ? 'Joining the circle...' : 'Step into our sharing circle'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-subtle font-semibold border-t border-app pt-6">
          <Heart className="w-3.5 h-3.5 text-accent animate-pulse" />
          <span>{SITE.tagline}</span>
        </div>
      </div>
    </div>
  );
}
