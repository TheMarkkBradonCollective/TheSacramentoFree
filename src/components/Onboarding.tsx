import React, { useState } from 'react';
import { SACRAMENTO_NEIGHBORHOODS } from '../types';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { upsertSupabaseProfile } from '../supabase';
import { MapPin, User, Heart, Sparkles } from 'lucide-react';
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
      createdAt: new Date()
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
    <div id="onboarding_viewport" className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-none border border-zinc-200 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-zinc-100 border border-zinc-200 rounded-none text-[#276EF1] mb-4" id="onboarding_icon_wrapper">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-black tracking-tight uppercase font-display">
            INITIALIZE ACCOUNT
          </h2>
          <p className="mt-2 text-xs font-semibold text-zinc-500 leading-relaxed">
            Specify your Sacramento routing sector and identifier profile to connect to high-efficiency logistics pipelines.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" id="onboarding_form">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-none border border-red-200" id="onboarding_error">
              {errorMsg}
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-1.5">
            <label htmlFor="on_display_name" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
              IDENTIFIER / NAME
            </label>
            <div className="relative rounded-none shadow-3xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="text"
                id="on_display_name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should neighbors call you?"
                className="block w-full pl-11 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black placeholder-zinc-400 font-semibold focus:bg-white"
              />
            </div>
          </div>

          {/* Neighborhood Selector */}
          <div className="space-y-1.5">
            <label htmlFor="on_neighborhood" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
              SACRAMENTO NEIGHBORHOOD SECTOR
            </label>
            <div className="relative rounded-none shadow-3xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-[#276EF1]" />
              </div>
              <select
                id="on_neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="block w-full pl-11 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs font-bold text-black appearance-none cursor-pointer focus:bg-white"
              >
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} className="bg-white">
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-zinc-450 font-semibold leading-relaxed">
              We route items to local hubs coordinates relative to this zone.
            </p>
          </div>

          {/* Profile Biography */}
          <div className="space-y-1.5">
            <label htmlFor="on_bio" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
              BIOGRAPHY (OPTIONAL)
            </label>
            <textarea
              id="on_bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Introduce yourself. e.g., 'Moving into East Sac area, hoping to reduce municipal waste!' "
              maxLength={500}
              className="block w-full p-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black placeholder-zinc-400 font-semibold resize-none focus:bg-white"
            />
            <div className="text-right text-[10px] text-zinc-400 font-mono font-medium">
              {bio.length}/500 chars
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            id="onboarding_submit_btn"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 bg-black hover:bg-zinc-800 text-white rounded-none text-xs font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'JOINING REGISTER...' : 'JOIN LOCAL COOPERATIVE'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-2 text-[10px] text-zinc-400 font-black uppercase tracking-wider border-t border-zinc-100 pt-6">
          <Heart className="w-3.5 h-3.5 text-[#276EF1]" />
          <span>ESTABLISHING LOGISTIC HARMONY</span>
        </div>
      </div>
    </div>
  );
}
