import React, { useState, useEffect } from 'react';
import { UserProfile, SACRAMENTO_NEIGHBORHOODS } from '../types';
import { upsertSupabaseProfile } from '../supabase';
import { MapPin, User, CheckCircle, Save, AlertCircle, Download, Smartphone, Share2 } from 'lucide-react';
import CommunityFooter from './CommunityFooter';
import { IN_APP } from '../siteContent';

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

  // PWA Prompt status
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [activeManualPlatform, setActiveManualPlatform] = useState<'ios' | 'android' | 'chrome'>('ios');

  useEffect(() => {
    // 1. Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('PWA installer ready inside view! 🚀');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. Check if already running inside standalone app shell
    if (
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true
    ) {
      setIsAppInstalled(true);
    }

    // Capture install completion
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerDirectPWAInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
    }
    setDeferredPrompt(null);
  };

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
          <span className="inline-block mt-2 px-3 py-1 bg-inset border border-app text-zinc-350 text-[10px] font-bold tracking-wider uppercase rounded-full">
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
      const success = await upsertSupabaseProfile(updatedProfile);
      if (!success) {
        throw new Error('Profile save failed');
      }
      onUpdateProfile(updatedProfile);

      setSuccessMsg('Profile settings synced successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.warn('Failed to commit profile updates:', err);
      setErrorMsg('Unable to save profile to the database. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="profile_root_container">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans" id="profile_views_grid">
        {/* Short card overview */}
        <div className="md:col-span-1 bg-surface border border-app rounded-2xl p-6 h-fit shadow-md flex flex-col items-center text-center">
          <img
            src={userProfile.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile.displayName)}`}
            referrerPolicy="no-referrer"
            alt={userProfile.displayName}
            className="w-24 h-24 rounded-full border-2 border-[#FF4500] shadow-md animate-fade-in"
            id="profile_card_avatar"
          />
          <h3 className="text-xl font-bold text-app mt-4 tracking-tight">{userProfile.displayName}</h3>
          
          {getRoleBadge()}

          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-full text-xs font-bold text-[#FF4500] mt-3">
            <MapPin className="w-3.5 h-3.5 text-[#FF4500]" />
            <span>{userProfile.neighborhood} Sector</span>
          </div>

          <p className="text-xs text-muted mt-4 border-b border-app pb-4 w-full">
            Joined our sharing circle: {new Date(userProfile.createdAt?.seconds ? userProfile.createdAt.seconds * 1000 : userProfile.createdAt).toLocaleDateString()}
          </p>
          
          {userProfile.bio ? (
            <p className="mt-4 text-xs font-medium text-muted italic leading-relaxed text-left w-full bg-inset p-3 rounded-xl border border-app">
              "{userProfile.bio}"
            </p>
          ) : (
            <p className="mt-4 text-xs font-semibold text-subtle italic text-left w-full bg-inset p-3 rounded-xl border border-dashed border-app">
              No biography specified yet. Update your profile to tell neighbors what kinds of items you like to share or receive!
            </p>
          )}
        </div>

        {/* Settings Form */}
        <div className="md:col-span-2 bg-surface border border-app rounded-2xl p-6 shadow-md" id="profile_credentials_form_box">
          <h3 className="text-lg font-bold text-app tracking-tight mb-5 flex items-center space-x-2 border-b border-app pb-3 font-display">
            <User className="w-5 h-5 text-[#FF4500]" />
            <span>{IN_APP.profileTitle}</span>
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
              <label className="text-sm font-bold text-muted uppercase block">My Email Address (Private)</label>
              <input
                type="text"
                value={userProfile.email}
                disabled
                className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-xs font-mono text-subtle cursor-not-allowed opacity-60"
              />
              <p className="text-xs text-subtle leading-relaxed">Your email is kept confidential and only used for your secure sign-in.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="profile_inputs_row">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label htmlFor="pref_display_name" className="text-xs font-bold text-muted uppercase block">My Friendly Display Name</label>
                <input
                  type="text"
                  id="pref_display_name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-white text-xs font-semibold focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors focus:outline-hidden"
                />
              </div>

              {/* Neighborhood select */}
              <div className="space-y-1.5">
                <label htmlFor="pref_neighborhood" className="text-xs font-bold text-muted uppercase block">My Home Neighborhood</label>
                <select
                  id="pref_neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-white text-xs font-bold cursor-pointer focus:border-[#FF4500] focus:outline-hidden"
                >
                  {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n} className="bg-surface text-app select-dark-opt">{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bio text */}
            <div className="space-y-1.5">
              <label htmlFor="pref_bio" className="text-xs font-bold text-muted uppercase block">About Me / What I Love to Share</label>
              <textarea
                id="pref_bio"
                rows={4}
                maxLength={500}
                placeholder="Tell your neighbors who you are and why sharing matters to your household."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="block w-full p-3 bg-inset border border-app rounded-xl text-xs text-white placeholder:text-subtle font-semibold resize-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors focus:outline-hidden"
              />
              <div className="text-right text-[10px] text-subtle font-mono font-medium">{bio.length}/500 chars</div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              id="profile_save_btn"
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#FF4500] hover:bg-[#E03D00] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-app" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Modern PWA App Installation Widget */}
      <div className="bg-surface border border-app rounded-2xl p-6 shadow-lg animate-fade-in" id="pwa_installs_section">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-app/70 pb-6 mb-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-[#FF4500]" />
              <span className="text-[10px] text-[#FF4500] font-black uppercase tracking-widest font-mono">Mobile App Download Hub</span>
            </div>
            <h3 className="text-base font-bold text-app tracking-tight">Run Sacramento Buy Nothing on your Phone</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Install our Progressive Web App (PWA) directly from your browser. Enjoy full-screen viewing, faster loads with local storage caches, and easier neighborhood-level sharing.
            </p>
          </div>

          <div className="flex-shrink-0">
            {isAppInstalled ? (
              <div className="flex items-center space-x-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl" id="pwa_installed_badge">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider font-mono">MOBILE APP LOADED & RUNNING 🟢</span>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={triggerDirectPWAInstall}
                className="inline-flex items-center space-x-2 px-5 py-3.5 bg-[#FF4500] hover:bg-[#E03D00] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                id="pwa_install_direct_trigger"
              >
                <Download className="w-4 h-4" />
                <span>Download PWA App Directly</span>
              </button>
            ) : (
              <div className="text-[10px] text-subtle font-bold uppercase tracking-wider bg-surface p-2.5 border border-app rounded-xl text-center select-none" id="pwa_installed_manual_warn">
                📱 Install manually directly via your browser instructions below
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Mobile Guide Tabs */}
        {!isAppInstalled && (
          <div className="space-y-4">
            <div className="flex border-b border-app">
              <button
                onClick={() => setActiveManualPlatform('ios')}
                className={`py-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeManualPlatform === 'ios'
                    ? 'border-[#FF4500] text-white'
                    : 'border-transparent text-subtle hover:text-muted'
                }`}
              >
                 Apple iPhone (iOS)
              </button>
              <button
                onClick={() => setActiveManualPlatform('android')}
                className={`py-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeManualPlatform === 'android'
                    ? 'border-[#FF4500] text-white'
                    : 'border-transparent text-subtle hover:text-muted'
                }`}
              >
                🤖 Android / Samsung
              </button>
              <button
                onClick={() => setActiveManualPlatform('chrome')}
                className={`py-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeManualPlatform === 'chrome'
                    ? 'border-[#FF4500] text-white'
                    : 'border-transparent text-subtle hover:text-muted'
                }`}
              >
                🖥️ PC / Mac Desktop
              </button>
            </div>

            {/* Platform Guides */}
            <div className="bg-inset border border-app p-4 rounded-xl text-muted space-y-3">
              {activeManualPlatform === 'ios' && (
                <div className="space-y-3" id="guide_ios_list">
                  <p className="text-xs text-muted font-semibold uppercase tracking-wider">How to Install on Apple Safari (iPhone/iPad):</p>
                  <ol className="list-decimal list-inside space-y-2.5 text-xs text-muted leading-relaxed pl-1.5">
                    <li>Open this web-app in your premium <strong className="text-app font-bold">Safari</strong> browser.</li>
                    <li>
                      Tap the <strong className="text-app font-bold">Share</strong> button at the bottom navigation drawer
                      <span className="inline-flex mx-1.5 p-1 bg-zinc-800 rounded text-muted align-middle"><Share2 className="w-3.5 h-3.5" /></span>
                    </li>
                    <li>Scroll down and tap <strong className="text-app font-bold">Add to Home Screen</strong>.</li>
                    <li>Tap <strong className="text-app font-bold">Add</strong> in the upper right. Now launch the app directly from your standard home screen! No App Store required!</li>
                  </ol>
                </div>
              )}

              {activeManualPlatform === 'android' && (
                <div className="space-y-3" id="guide_android_list">
                  <p className="text-xs text-muted font-semibold uppercase tracking-wider">How to Install on Google Chrome/Samsung Internet for Android:</p>
                  <ol className="list-decimal list-inside space-y-2.5 text-xs text-muted leading-relaxed pl-1.5">
                    <li>Open this web-app in <strong className="text-app font-bold">Google Chrome</strong>.</li>
                    <li>Tap the standard three-dot menu icon <strong className="text-app font-bold">(⋮)</strong> in Chrome's top right corner.</li>
                    <li>Select <strong className="text-app font-bold">Install app</strong> or <strong className="text-app font-bold">Add to Home Screen</strong>.</li>
                    <li>Confirm the dialog prompt. The Sacramento Buy Nothing icon will be set up instantly on your app drawer!</li>
                  </ol>
                </div>
              )}

              {activeManualPlatform === 'chrome' && (
                <div className="space-y-3" id="guide_desktop_list">
                  <p className="text-xs text-muted font-semibold uppercase tracking-wider">How to install as a Native Desktop App (Chrome / Edge):</p>
                  <ol className="list-decimal list-inside space-y-2.5 text-xs text-muted leading-relaxed pl-1.5">
                    <li>Look at your browser's horizontal address bar (URL bar).</li>
                    <li>
                      Inside the right-side of the bar, click on the <strong className="text-app font-bold">PWA Install Monitor icon</strong>
                      (resembles a monitor with a downward arrow or an overlapped square with plus symbol).
                    </li>
                    <li>Click <strong className="text-app font-bold">Install</strong>. It creates a taskbar shortcut and opens in its own lightweight window!</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feature benefits highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-3.5 bg-inset border border-app/50 rounded-xl">
            <h4 className="text-[11px] font-black text-app uppercase tracking-widest mb-1">⚡ Instant Launch</h4>
            <p className="text-[10px] text-muted">Loads immediately from standard device caches, loading your active neighborhood grid in an instant.</p>
          </div>
          <div className="p-3.5 bg-inset border border-app/50 rounded-xl">
            <h4 className="text-[11px] font-black text-app uppercase tracking-widest mb-1">📦 Porch Syncing</h4>
            <p className="text-[10px] text-muted">Stores chats and active coordinate locations offline so you never drop your pickup coordinates.</p>
          </div>
          <div className="p-3.5 bg-inset border border-app/50 rounded-xl">
            <h4 className="text-[11px] font-black text-app uppercase tracking-widest mb-1">🎨 Borderless View</h4>
            <p className="text-[10px] text-muted">Hides browser tab clutter and URL headers to let you focus entirely on friendly neighborly exchanges.</p>
          </div>
        </div>
      </div>

      <CommunityFooter />
    </div>
  );
}

