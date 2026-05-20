import React, { useState } from 'react';
import { UserProfile, SACRAMENTO_NEIGHBORHOODS } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { upsertSupabaseProfile } from '../supabase';
import { MapPin, User, CheckCircle, Save, AlertCircle } from 'lucide-react';

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

      setSuccessMsg('Profile settings synced successfully.');
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans" id="profile_views_grid">
      {/* Short card overview */}
      <div className="md:col-span-1 bg-white border border-zinc-200 rounded-none p-6 h-fit shadow-xs flex flex-col items-center text-center">
        <img
          src={userProfile.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile.displayName)}`}
          referrerPolicy="no-referrer"
          alt={userProfile.displayName}
          className="w-20 h-20 rounded-none border border-zinc-200"
          id="profile_card_avatar"
        />
        <h3 className="text-sm font-black text-black mt-4 uppercase tracking-wider">{userProfile.displayName}</h3>
        
        <div className="flex items-center space-x-1.5 px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-none text-[9px] font-black text-zinc-700 mt-2.5 uppercase tracking-widest">
          <MapPin className="w-3 h-3 text-[#276EF1]" />
          <span>{userProfile.neighborhood} Sector</span>
        </div>

        <p className="text-[9.5px] text-zinc-400 mt-2 font-mono font-semibold uppercase tracking-wider border-b border-zinc-100 pb-3.5 w-full">
          LEDGER ENTRY: {new Date(userProfile.createdAt?.seconds ? userProfile.createdAt.seconds * 1000 : userProfile.createdAt).toLocaleDateString()}
        </p>
        
        {userProfile.bio ? (
          <p className="mt-4 text-xs font-semibold text-zinc-500 italic leading-relaxed text-left w-full">
            "{userProfile.bio}"
          </p>
        ) : (
          <p className="mt-4 text-xs font-semibold text-zinc-400 italic text-left w-full">
            No professional bio specified. Update credentials to communicate your core interests to neighboring routers.
          </p>
        )}
      </div>

      {/* Settings Form */}
      <div className="md:col-span-2 bg-white border border-zinc-200 rounded-none p-6 shadow-xs" id="profile_credentials_form_box">
        <h3 className="text-xs font-black text-black tracking-widest uppercase mb-5 flex items-center space-x-2 border-b border-zinc-150 pb-3">
          <User className="w-4 h-4 text-[#276EF1]" />
          <span>PROFILED CREDENTIALS MANAGEMENT</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-5" id="profile_edit_form">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-none flex items-center space-x-1.5" id="profile_save_error">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-[#276EF1] text-xs font-black uppercase tracking-wider rounded-none flex items-center space-x-1.5" id="profile_save_success">
              <CheckCircle className="w-4 h-4 text-[#276EF1]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Email PII restricted - Non Editable */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-sans">SECURITY ENDPOINT (PRIVATE)</label>
            <input
              type="text"
              value={userProfile.email}
              disabled
              className="block w-full px-3.5 py-3 bg-zinc-55 border border-zinc-200 rounded-none text-xs font-mono text-zinc-400 cursor-not-allowed bg-zinc-100"
            />
            <p className="text-[9.5px] text-zinc-450 font-semibold leading-relaxed">Account communication endpoints are kept confidential behind routing shields.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="profile_inputs_row">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label htmlFor="pref_display_name" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">IDENTIFIER NAME</label>
              <input
                type="text"
                id="pref_display_name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full px-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black font-semibold focus:bg-white"
              />
            </div>

            {/* Neighborhood select */}
            <div className="space-y-1.5">
              <label htmlFor="pref_neighborhood" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">REGIONAL ROUTING SECTOR</label>
              <select
                id="pref_neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="block w-full px-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black font-bold focus:bg-white cursor-pointer uppercase"
              >
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} className="bg-white">{n.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio text */}
          <div className="space-y-1.5">
            <label htmlFor="pref_bio" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">PUBLIC BIOGRAPHY STATEMENT</label>
            <textarea
              id="pref_bio"
              rows={4}
              maxLength={500}
              placeholder="Tell your neighbors who you are and why sharing matters to your household."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="block w-full p-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black placeholder-zinc-400 font-semibold resize-none focus:bg-white"
            />
            <div className="text-right text-[10px] text-zinc-400 font-mono font-medium">{bio.length}/500 chars</div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            id="profile_save_btn"
            disabled={isSaving}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-black hover:bg-zinc-800 text-white rounded-none text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'PENDING DISPATCH...' : 'UPDATE SYSTEM DETAILS'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
