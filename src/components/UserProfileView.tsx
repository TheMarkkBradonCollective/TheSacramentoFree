import React, { useState } from 'react';
import { UserProfile, SACRAMENTO_NEIGHBORHOODS } from '../types';
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

  const getRoleBadge = () => {
    const role = userProfile.role || 'user';
    switch (role) {
      case 'director':
        return (
          <span className="inline-block mt-2 px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold tracking-wider uppercase rounded-full">
            🌻 Sunflower Director
          </span>
        );
      case 'admin':
        return (
          <span className="inline-block mt-2 px-3 py-1 bg-[#FF4500] text-white text-[10px] font-bold tracking-wider uppercase rounded-full">
            🛡️ Circle Admin
          </span>
        );
      case 'moderator':
        return (
          <span className="inline-block mt-2 px-3 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-bold tracking-wider uppercase rounded-full">
            🤝 Friendly Moderator
          </span>
        );
      default:
        return (
          <span className="inline-block mt-2 px-3 py-1 bg-[#0F0F0F] border border-[#343536] text-zinc-350 text-[10px] font-bold tracking-wider uppercase rounded-full">
            🏡 Local Neighbor
          </span>
        );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const updateData = {
      displayName: displayName.trim(),
      neighborhood,
      bio: bio.trim(),
    };

    try {
      const updatedProfile = {
        ...userProfile,
        ...updateData
      };

      // Sync to Supabase
      await upsertSupabaseProfile(updatedProfile);
      
      // Set in cache
      localStorage.setItem(`profile_${userProfile.uid}`, JSON.stringify(updatedProfile));
      onUpdateProfile(updatedProfile);

      setSuccessMsg('Profile settings synced successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.warn('Failed to commit profile updates:', err);
      // Still update local state so they see the change
      const updatedProfile = {
        ...userProfile,
        ...updateData
      };
      localStorage.setItem(`profile_${userProfile.uid}`, JSON.stringify(updatedProfile));
      onUpdateProfile(updatedProfile);
      setSuccessMsg('Profile settings updated locally (offline mode).');
      setTimeout(() => setSuccessMsg(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans" id="profile_views_grid">
      {/* Short card overview */}
      <div className="md:col-span-1 bg-[#1A1A1B] border border-[#343536] rounded-2xl p-6 h-fit shadow-md flex flex-col items-center text-center">
        <img
          src={userProfile.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile.displayName)}`}
          referrerPolicy="no-referrer"
          alt={userProfile.displayName}
          className="w-24 h-24 rounded-full border-2 border-[#FF4500] shadow-md animate-fade-in"
          id="profile_card_avatar"
        />
        <h3 className="text-xl font-bold text-white mt-4 tracking-tight">{userProfile.displayName}</h3>
        
        {getRoleBadge()}

        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-full text-xs font-bold text-[#FF4500] mt-3">
          <MapPin className="w-3.5 h-3.5 text-[#FF4500]" />
          <span>{userProfile.neighborhood} Sector</span>
        </div>

        <p className="text-xs text-zinc-400 mt-4 border-b border-[#343536] pb-4 w-full">
          Joined our sharing circle: {new Date(userProfile.createdAt?.seconds ? userProfile.createdAt.seconds * 1000 : userProfile.createdAt).toLocaleDateString()}
        </p>
        
        {userProfile.bio ? (
          <p className="mt-4 text-xs font-medium text-zinc-300 italic leading-relaxed text-left w-full bg-[#0F0F0F] p-3 rounded-xl border border-[#343536]">
            "{userProfile.bio}"
          </p>
        ) : (
          <p className="mt-4 text-xs font-semibold text-zinc-500 italic text-left w-full bg-[#0F0F0F] p-3 rounded-xl border border-dashed border-[#343536]">
            No biography specified yet. Update your profile to tell neighbors what kinds of items you like to share or receive!
          </p>
        )}
      </div>

      {/* Settings Form */}
      <div className="md:col-span-2 bg-[#1A1A1B] border border-[#343536] rounded-2xl p-6 shadow-md" id="profile_credentials_form_box">
        <h3 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center space-x-2 border-b border-[#343536] pb-3 font-display">
          <User className="w-5 h-5 text-[#FF4500]" />
          <span>My Community Profile Settings</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-5" id="profile_edit_form">
          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-900 text-red-400 text-xs font-bold rounded-xl flex items-center space-x-1.5" id="profile_save_error">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-950/50 border border-green-900 text-green-400 text-xs font-bold rounded-xl flex items-center space-x-1.5" id="profile_save_success">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Email PII restricted - Non Editable */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-400 uppercase block">My Email Address (Private)</label>
            <input
              type="text"
              value={userProfile.email}
              disabled
              className="block w-full px-3.5 py-3 bg-[#0F0F0F] border border-[#343536] rounded-xl text-xs font-mono text-zinc-500 cursor-not-allowed opacity-60"
            />
            <p className="text-xs text-zinc-500 leading-relaxed">Your email is kept confidential and only used for your secure sign-in.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="profile_inputs_row">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label htmlFor="pref_display_name" className="text-xs font-bold text-zinc-400 uppercase block">My Friendly Display Name</label>
              <input
                type="text"
                id="pref_display_name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full px-3.5 py-3 bg-[#0F0F0F] border border-[#343536] rounded-xl text-white text-xs font-semibold focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors focus:outline-hidden"
              />
            </div>

            {/* Neighborhood select */}
            <div className="space-y-1.5">
              <label htmlFor="pref_neighborhood" className="text-xs font-bold text-zinc-400 uppercase block">My Home Neighborhood</label>
              <select
                id="pref_neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="block w-full px-3.5 py-3 bg-[#0F0F0F] border border-[#343536] rounded-xl text-white text-xs font-bold cursor-pointer focus:border-[#FF4500] focus:outline-hidden"
              >
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} className="bg-[#1A1A1B] text-white select-dark-opt">{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio text */}
          <div className="space-y-1.5">
            <label htmlFor="pref_bio" className="text-xs font-bold text-zinc-400 uppercase block">About Me / What I Love to Share</label>
            <textarea
              id="pref_bio"
              rows={4}
              maxLength={500}
              placeholder="Tell your neighbors who you are and why sharing matters to your household."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="block w-full p-3 bg-[#0F0F0F] border border-[#343536] rounded-xl text-xs text-white placeholder-zinc-500 font-semibold resize-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors focus:outline-hidden"
            />
            <div className="text-right text-[10px] text-zinc-500 font-mono font-medium">{bio.length}/500 chars</div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            id="profile_save_btn"
            disabled={isSaving}
            className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#FF4500] hover:bg-[#E03D00] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-white" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
