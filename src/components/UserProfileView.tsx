import React, { useState, useEffect } from 'react';
import { UserProfile, SACRAMENTO_NEIGHBORHOODS, ItemPost } from '../types';
import {
  getNeighborStats,
  NeighborStats,
  upsertSupabaseProfile,
  uploadProfilePhoto,
  getSupabaseProfile,
} from '../supabase';
import RoleBadge from './RoleBadge';
import {
  MapPin,
  User,
  CheckCircle,
  Save,
  AlertCircle,
  Trash2,
  Download,
  Smartphone,
  Share2,
  Gift,
  Package,
  ChevronUp,
  ChevronDown,
  Camera,
} from 'lucide-react';
import NotificationSettings from './NotificationSettings';
import { IN_APP } from '../siteContent';

interface UserProfileViewProps {
  userProfile: UserProfile;
  userPosts?: ItemPost[];
  onUpdateProfile: (updated: UserProfile) => void;
  /** Refresh feed/listings after avatar is saved */
  onProfilePhotoSaved?: () => void;
  onDeleteAccount?: () => void | Promise<void>;
  /** Edge-to-edge sections (mobile tab) — no nested card frames */
  fullBleed?: boolean;
}

function sanitizeRemotePhoto(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return undefined;
}

export default function UserProfileView({
  userProfile,
  userPosts = [],
  onUpdateProfile,
  onProfilePhotoSaved,
  onDeleteAccount,
  fullBleed = false,
}: UserProfileViewProps) {
  const [displayName, setDisplayName] = useState(userProfile.displayName);
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);
  const [bio, setBio] = useState(userProfile.bio || '');
  const [photoURL, setPhotoURL] = useState(
    userProfile.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile.displayName)}`,
  );
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<NeighborStats | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    getNeighborStats(userProfile.uid).then(setStats);
  }, [userProfile.uid]);

  useEffect(() => {
    if (isPhotoUploading) return;
    setPhotoURL(
      userProfile.photoURL ||
        `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile.displayName)}`,
    );
  }, [userProfile.photoURL, userProfile.displayName, isPhotoUploading]);

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


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const photoForSave =
      photoURL.startsWith('data:') || photoURL.startsWith('blob:')
        ? (sanitizeRemotePhoto(userProfile.photoURL) ?? undefined)
        : photoURL;

    const updateData = {
      displayName: displayName.trim(),
      neighborhood,
      bio: bio.trim(),
      photoURL: photoForSave,
    };

    try {
      const updatedProfile = {
        ...userProfile,
        ...updateData
      };

      // Sync to Supabase
      const { ok, errorMessage } = await upsertSupabaseProfile(updatedProfile);
      if (!ok) {
        throw new Error(errorMessage || 'Profile save failed');
      }
      onUpdateProfile(updatedProfile);
      setErrorMsg('');
      setSuccessMsg('Profile settings synced successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.warn('Failed to commit profile updates:', err);
      const detail = err instanceof Error ? err.message : '';
      setErrorMsg(
        detail && detail !== 'Profile save failed'
          ? detail
          : 'Unable to save profile to the database. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.');
      event.target.value = '';
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setErrorMsg('Image is too large. Please use a file under 6MB.');
      event.target.value = '';
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsPhotoUploading(true);

    const previousPhoto = photoURL;
    const previewUrl = URL.createObjectURL(file);
    setPhotoURL(previewUrl);

    try {
      const uploadedUrl = await uploadProfilePhoto(file, userProfile.uid);
      if (!uploadedUrl) {
        setPhotoURL(previousPhoto);
        setErrorMsg(
          'Could not upload profile photo. Check your connection and Supabase storage (items bucket), then try again.',
        );
        return;
      }

      setPhotoURL(uploadedUrl);

      const updatedProfile = {
        ...userProfile,
        photoURL: uploadedUrl,
      };

      const { ok, errorMessage } = await upsertSupabaseProfile(updatedProfile);
      if (!ok) {
        setPhotoURL(previousPhoto);
        throw new Error(errorMessage || 'Profile photo could not be saved.');
      }

      const refreshed = await getSupabaseProfile(userProfile.uid);
      const profileToApply = refreshed?.photoURL
        ? { ...updatedProfile, photoURL: refreshed.photoURL }
        : updatedProfile;

      onUpdateProfile(profileToApply);
      if (profileToApply.photoURL) {
        setPhotoURL(profileToApply.photoURL);
      }
      onProfilePhotoSaved?.();
      setSuccessMsg('Profile photo saved.');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.warn('Profile photo save failed:', err);
      const detail = err instanceof Error ? err.message : '';
      setErrorMsg(detail || 'Could not save profile photo. Please try again.');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsPhotoUploading(false);
      event.target.value = '';
    }
  };

  const sectionShell = fullBleed
    ? 'border-b border-app px-4 py-6 bg-surface'
    : 'bg-surface border border-app rounded-2xl p-6 shadow-md';

  return (
    <div
      className={`${fullBleed ? 'font-sans' : 'space-y-6'} w-full max-w-full min-w-0 overflow-x-hidden`}
      id="profile_root_container"
    >
      <div
        className={
          fullBleed
            ? 'flex flex-col font-sans min-w-0 w-full'
            : 'grid grid-cols-1 md:grid-cols-3 gap-6 font-sans min-w-0 w-full'
        }
        id="profile_views_grid"
      >
        {/* Profile overview */}
        <div
          className={`${fullBleed ? sectionShell : 'md:col-span-1'} flex flex-col items-center text-center h-fit`}
        >
          <img
            src={photoURL}
            referrerPolicy="no-referrer"
            alt={userProfile.displayName}
            className="w-24 h-24 rounded-full border-2 border-[#FF4500] shadow-md animate-fade-in"
            id="profile_card_avatar"
          />
          <label
            htmlFor="profile_photo_upload"
            className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
              isPhotoUploading
                ? 'bg-accent text-on-accent border-accent'
                : 'bg-inset text-app border-app hover:bg-surface-hover cursor-pointer'
            }`}
          >
            <Camera className={`w-3.5 h-3.5 ${isPhotoUploading ? 'animate-pulse' : ''}`} />
            {isPhotoUploading ? 'Saving photo…' : 'Change photo'}
          </label>
          <input
            id="profile_photo_upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoPick}
            className="hidden"
          />
          <h3 className="text-xl font-bold text-app mt-4 tracking-tight">{userProfile.displayName}</h3>
          
          <RoleBadge role={userProfile.role} showForUser />

          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-full text-xs font-bold text-accent mt-3">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            <span>{userProfile.neighborhood} Sector</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 w-full">
            <div className="bg-inset border border-app rounded-xl p-3 text-center">
              <Gift className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="font-display text-lg font-bold text-app">{stats?.itemsGiven ?? '—'}</p>
              <p className="text-[10px] text-muted">Items given</p>
            </div>
            <div className="bg-inset border border-app rounded-xl p-3 text-center">
              <Package className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="font-display text-lg font-bold text-app">{stats?.itemsClaimed ?? '—'}</p>
              <p className="text-[10px] text-muted">Items claimed</p>
            </div>
            <div className="bg-inset border border-app rounded-xl p-3 text-center">
              <ChevronUp className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="font-display text-lg font-bold text-app">{stats?.upvotesReceived ?? '—'}</p>
              <p className="text-[10px] text-muted">Upvotes received</p>
            </div>
            <div className="bg-inset border border-app rounded-xl p-3 text-center">
              <ChevronDown className="w-5 h-5 text-muted mx-auto mb-1" />
              <p className="font-display text-lg font-bold text-app">{stats?.downvotesReceived ?? '—'}</p>
              <p className="text-[10px] text-muted">Downvotes received</p>
            </div>
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
        <div
          className={fullBleed ? sectionShell : `md:col-span-2 ${sectionShell}`}
          id="profile_credentials_form_box"
        >
          <h3 className="text-lg font-bold text-app tracking-tight mb-5 flex items-center space-x-2 border-b border-app pb-3 font-display">
            <User className="w-5 h-5 text-accent" />
            <span>{IN_APP.profileTitle}</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-5" id="profile_edit_form">
            {errorMsg && (
              <div className="p-3 bg-red-950/50 border border-red-900 text-red-400 text-xs font-bold rounded-xl flex items-start gap-1.5 min-w-0" id="profile_save_error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="min-w-0 break-words">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-950/50 border border-green-900 text-green-400 text-xs font-bold rounded-xl flex items-start gap-1.5 min-w-0" id="profile_save_success">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <span className="min-w-0 break-words">{successMsg}</span>
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
                  className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-app text-xs font-semibold focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors focus:outline-hidden"
                />
              </div>

              {/* Neighborhood select */}
              <div className="space-y-1.5">
                <label htmlFor="pref_neighborhood" className="text-xs font-bold text-muted uppercase block">My Home Neighborhood</label>
                <select
                  id="pref_neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-app text-xs font-bold cursor-pointer focus:border-[#FF4500] focus:outline-hidden"
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
                className="block w-full p-3 bg-inset border border-app rounded-xl text-xs text-app placeholder:text-subtle font-semibold resize-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors focus:outline-hidden"
              />
              <div className="text-right text-[10px] text-subtle font-mono font-medium">{bio.length}/500 chars</div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              id="profile_save_btn"
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-accent hover:bg-accent-hover text-on-accent rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-app" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </form>
        </div>
      </div>

      <NotificationSettings userId={userProfile.uid} userRole={userProfile.role} fullBleed={fullBleed} />

      {/* Modern PWA App Installation Widget */}
      <div
        className={`${fullBleed ? `${sectionShell} shadow-none` : 'bg-surface border border-app rounded-2xl p-6 shadow-lg'} animate-fade-in min-w-0 overflow-hidden`}
        id="pwa_installs_section"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-app/70 pb-6 mb-6 min-w-0">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-accent" />
              <span className="text-[10px] text-accent font-black uppercase tracking-widest font-mono">Mobile App Download Hub</span>
            </div>
            <h3 className="text-base font-bold text-app tracking-tight">Run Sacramento Buy Nothing on your Phone</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Install our Progressive Web App (PWA) directly from your browser. Enjoy full-screen viewing, faster loads with local storage caches, and easier neighborhood-level sharing.
            </p>
          </div>

          <div className="flex-shrink-0">
            {isAppInstalled ? (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl max-w-full" id="pwa_installed_badge">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider font-mono break-words">
                  App installed on this device
                </span>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={triggerDirectPWAInstall}
                className="inline-flex items-center space-x-2 px-5 py-3.5 bg-accent hover:bg-accent-hover text-on-accent rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] cursor-pointer"
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
            <div className="flex border-b border-app overflow-x-auto max-w-full -mx-1 px-1">
              <button
                onClick={() => setActiveManualPlatform('ios')}
                className={`shrink-0 py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeManualPlatform === 'ios'
                    ? 'bg-accent border-accent text-on-accent'
                    : 'border-transparent text-subtle hover:text-muted'
                }`}
              >
                iPhone
              </button>
              <button
                onClick={() => setActiveManualPlatform('android')}
                className={`shrink-0 py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeManualPlatform === 'android'
                    ? 'bg-accent border-accent text-on-accent'
                    : 'border-transparent text-subtle hover:text-muted'
                }`}
              >
                Android
              </button>
              <button
                onClick={() => setActiveManualPlatform('chrome')}
                className={`shrink-0 py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeManualPlatform === 'chrome'
                    ? 'bg-accent border-accent text-on-accent'
                    : 'border-transparent text-subtle hover:text-muted'
                }`}
              >
                Desktop
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

      {onDeleteAccount && (
        <div
          className={
            fullBleed
              ? sectionShell
              : 'bg-surface border border-red-900/40 rounded-2xl p-6 shadow-md'
          }
          id="account_delete_section"
        >
          <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-2">Delete account</h3>
          <p className="text-xs text-muted leading-relaxed mb-4">
            Permanently remove your profile, listings, comments, messages, and sign-in access.
          </p>
          <button
            type="button"
            disabled={isDeletingAccount}
            onClick={async () => {
              setIsDeletingAccount(true);
              setErrorMsg('');
              try {
                await onDeleteAccount();
              } catch {
                setErrorMsg('Could not delete account. Please try again.');
              } finally {
                setIsDeletingAccount(false);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-900/50 text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeletingAccount ? 'Deleting…' : 'Delete my account'}</span>
          </button>
        </div>
      )}

      <div className={fullBleed ? sectionShell : 'bg-surface border border-app rounded-2xl p-6 shadow-md'}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-app uppercase tracking-wider">Your posts</h3>
          <span className="text-xs text-muted">{userPosts.length}</span>
        </div>
        {userPosts.length === 0 ? (
          <p className="text-xs text-muted">You have not posted anything yet.</p>
        ) : (
          <div className="space-y-2">
            {userPosts
              .slice()
              .sort((a, b) => new Date(b.updatedAt as any).getTime() - new Date(a.updatedAt as any).getTime())
              .map((post) => (
                <div key={post.id} className="rounded-xl border border-app bg-inset p-3">
                  <p className="text-sm font-semibold text-app">{post.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {post.category} · {post.status.replace('_', ' ')}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

