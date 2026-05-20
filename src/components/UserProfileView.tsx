import React, { useState } from 'react';
import { UserProfile, SACRAMENTO_NEIGHBORHOODS } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { upsertSupabaseProfile } from '../supabase';
import { MapPin, User, FileText, CheckCircle, Save, AlertCircle } from 'lucide-react';

interface UserProfileViewProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export default function UserProfileView({ userProfile, onUpdateProfile }: UserProfileViewProps) {
  const [displayName, setDisplayName] = useState(userProfile.displayName);
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);
  const [bio, setBio] = useState(userProfile.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updateData = {
        displayName: displayName.trim(),
        neighborhood,
        bio: bio.trim(),
      };

      // Sync to Supabase
      try {
        await upsertSupabaseProfile({
          ...userProfile,
          ...updateData
        });
      } catch (sbErr) {
        console.warn('Supabase profile update bypassed or failed:', sbErr);
      }

      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, updateData);
      
      onUpdateProfile({
        ...userProfile,
        ...updateData
      });

      setSuccessMsg('Profile changes saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}`);
      } catch (authError: any) {
        setErrorMsg('Authorization failed. Unable to update details.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="profile_views_grid">
      {/* Short card overview */}
      <div className="md:col-span-1 glass border border-white/40 rounded-3xl p-6 h-fit shadow-md flex flex-col items-center text-center">
        <img
          src={userProfile.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile.displayName)}`}
          referrerPolicy="no-referrer"
          alt={userProfile.displayName}
          className="w-20 h-20 rounded-2xl border border-white/40 shadow-md"
          id="profile_card_avatar"
        />
        <h3 className="text-base font-bold text-slate-800 mt-4 leading-tight">{userProfile.displayName}</h3>
        
        <div className="flex items-center space-x-1 px-3 py-1 bg-white/50 border border-white/60 rounded-full text-[11px] font-bold text-slate-700 mt-2">
          <MapPin className="w-3 h-3 text-emerald-600" />
          <span>{userProfile.neighborhood}</span>
        </div>

        <p className="text-[10px] text-slate-550 mt-1.5 font-mono font-bold">Member since {new Date(userProfile.createdAt?.seconds ? userProfile.createdAt.seconds * 1000 : userProfile.createdAt).toLocaleDateString()}</p>
        
        {userProfile.bio ? (
          <p className="mt-4 text-xs font-bold text-slate-650 italic border-t border-white/30 pt-4 leading-relaxed w-full">
            "{userProfile.bio}"
          </p>
        ) : (
          <p className="mt-4 text-xs font-bold text-slate-500 italic border-t border-white/30 pt-4 w-full">
            No bio provided yet. Add one to introduce yourself to Sacramento neighbors!
          </p>
        )}
      </div>

      {/* Settings Form */}
      <div className="md:col-span-2 glass border border-white/40 rounded-3xl p-6 shadow-md" id="profile_credentials_form_box">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-5 flex items-center space-x-1.5">
          <User className="w-5 h-5 text-emerald-600" />
          <span>Edit Profile Credentials</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-5" id="profile_edit_form">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-700 text-xs font-semibold flex items-center space-x-1.5" id="profile_save_error">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-800 text-xs font-semibold flex items-center space-x-1.5 animate-bounce" id="profile_save_success">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Email PII restricted - Non Editable */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block font-sans">Email Coordinates (Private)</label>
            <input
              type="text"
              value={userProfile.email}
              disabled
              className="block w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-xs font-mono text-slate-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-550 font-bold">Your email is strictly hidden from neighboring views by default.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="profile_inputs_row">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label htmlFor="pref_display_name" className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Display Name</label>
              <input
                type="text"
                id="pref_display_name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full px-3 py-2 search-glass rounded-lg text-xs text-slate-900 font-bold focus:outline-hidden"
              />
            </div>

            {/* Neighborhood select */}
            <div className="space-y-1.5">
              <label htmlFor="pref_neighborhood" className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Sacramento Neighborhood</label>
              <select
                id="pref_neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="block w-full px-3 py-2 bg-white/45 border border-white/40 rounded-lg text-xs text-slate-900 font-bold focus:outline-hidden cursor-pointer"
              >
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} className="bg-white">{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio text */}
          <div className="space-y-1.5">
            <label htmlFor="pref_bio" className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Profile Biography</label>
            <textarea
              id="pref_bio"
              rows={4}
              maxLength={500}
              placeholder="e.g. reductionist, zero-wasters. Sharing is caring!"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="block w-full p-3 search-glass border border-white/50 rounded-lg text-xs text-slate-900 placeholder-slate-550 font-bold focus:outline-hidden resize-none"
            />
            <div className="text-right text-[10px] text-slate-500 font-mono font-bold">{bio.length}/500 chars</div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            id="profile_save_btn"
            disabled={isSaving}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
