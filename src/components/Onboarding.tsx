import React, { useState } from 'react';
import { SACRAMENTO_NEIGHBORHOODS } from '../types';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { upsertSupabaseProfile } from '../supabase';
import { MapPin, Sparkles, User, Heart } from 'lucide-react';
import { UserProfile } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const currentUser = auth.currentUser;
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [neighborhood, setNeighborhood] = useState(SACRAMENTO_NEIGHBORHOODS[0]);
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!displayName.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const newProfile: UserProfile = {
      uid: currentUser.uid,
      displayName: displayName.trim(),
      photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(displayName)}`,
      email: currentUser.email || '',
      neighborhood,
      bio: bio.trim(),
      createdAt: new Date() // Firestore rules will expect request.time
    };

    try {
      // Upsert profile in Supabase
      try {
        await upsertSupabaseProfile(newProfile);
      } catch (sbErr) {
        console.warn('Supabase onboarding profile upsert bypassed or failed:', sbErr);
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        ...newProfile,
        // Since rules require exact request.time match for server timestamps,
        // we can set standard fields, but also use standard JS dates which Firestore converts perfectly
        createdAt: new Date(),
      });
      onComplete(newProfile);
    } catch (error) {
      setIsSubmitting(false);
      try {
        handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}`);
      } catch (err: any) {
        setErrorMsg('Failed to create community profile. Security verification failed.');
        console.error(err);
      }
    }
  };

  return (
    <div id="onboarding_viewport" className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-md w-full glass p-8 rounded-3xl border border-white/40 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-white/70 border border-white/50 rounded-2xl text-emerald-600 mb-4 shadow-sm" id="onboarding_icon_wrapper">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-850 tracking-tight">
            Welcome to Sacramento BuyNothing!
          </h2>
          <p className="mt-2 text-xs font-bold text-slate-600">
            Let's finish setting up your community profile so you can start giving, asking, and messaging.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" id="onboarding_form">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 text-red-700 text-xs font-semibold rounded-xl border border-red-500/20" id="onboarding_error">
              {errorMsg}
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-1.5">
            <label htmlFor="on_display_name" className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">
              Display Name
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                id="on_display_name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should neighbors call you?"
                className="block w-full pl-10 pr-3 py-2.5 search-glass rounded-xl text-xs placeholder-slate-500 font-bold focus:outline-hidden text-slate-900"
              />
            </div>
          </div>

          {/* Neighborhood Selector */}
          <div className="space-y-1.5">
            <label htmlFor="on_neighborhood" className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">
              Your Sacramento Neighborhood
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-emerald-650" />
              </div>
              <select
                id="on_neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-white/45 border border-white/40 rounded-xl text-xs focus:outline-hidden font-bold text-slate-900 appearance-none cursor-pointer"
              >
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} className="bg-white">
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-slate-500 font-bold">
              We look up neighbor proximity based on this selection. Choose where you reside!
            </p>
          </div>

          {/* Profile Biography */}
          <div className="space-y-1.5">
            <label htmlFor="on_bio" className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">
              Short Bio (Optional)
            </label>
            <textarea
              id="on_bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Introduce yourself to the neighborhood! e.g., 'Moving around, looking to share extra home items and reduce waste.'"
              maxLength={500}
              className="block w-full p-3 search-glass rounded-xl text-xs placeholder-slate-500 font-bold focus:outline-hidden text-slate-900 resize-none"
            />
            <div className="text-right text-[10px] text-slate-500 font-mono font-bold">
              {bio.length}/500 chars
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            id="onboarding_submit_btn"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? 'Registering...' : 'Join the Sacramento Neighborhood'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-2 text-[10px] text-slate-500 font-bold border-t border-white/30 pt-6">
          <Heart className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>Building zero-waste communities together.</span>
        </div>
      </div>
    </div>
  );
}
