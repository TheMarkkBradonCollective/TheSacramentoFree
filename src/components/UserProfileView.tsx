import React, { useState, useEffect } from 'react';
import { UserProfile, SACRAMENTO_NEIGHBORHOODS, ItemPost } from '../types';
import { isStaffRole } from '../lib/roles';
import {
  getNeighborStats,
  NeighborStats,
  upsertSupabaseProfile,
  uploadProfilePhoto,
  getSupabaseProfile,
} from '../supabase';
import { isLikelyImageFile, INVALID_IMAGE_FILE_MESSAGE } from '../lib/imageUrl';
import RoleBadge from './RoleBadge';
import {
  MapPin,
  User,
  CheckCircle,
  Save,
  AlertCircle,
  Trash2,
  Download,
  LogOut,
  Smartphone,
  Share2,
  Store,
  Gift,
  Package,
  Repeat2,
  ChevronUp,
  ChevronDown,
  Camera,
  Shield,
  FileText,
} from 'lucide-react';
import ProfilePostList from './ProfilePostList';
import ProfileAwardsRow from './ProfileAwardsRow';
import ProfileAwardsSection from './ProfileAwardsSection';
import UserAvatar from './UserAvatar';
import { formatLastActive } from '../lib/presence';
import ThemeSettings from './ThemeSettings';
import SystemPermissionsSettings from './SystemPermissionsSettings';
import GoGetSettings from './GoGetSettings';
import CommunityMenuView from './CommunityMenuView';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfUseModal from './TermsOfUseModal';
import { IN_APP, PRIVACY, TERMS } from '../siteContent';
import { isPrivacyAccepted } from '../lib/privacyPolicyPrompt';
import { isTermsAccepted } from '../lib/termsPolicyPrompt';
import { getNeighborAwardClaims } from '../supabase';
import { buildNeighborAwardSummary, type NeighborAwardSummary } from '../lib/neighborAwards';
import GoGetRecordSection from './goget/GoGetRecordSection';
import { openStaffApplyPanel } from '../lib/staffApplyOpen';
import { useInstallVersions } from '../hooks/useInstallVersions';
import { apkWebsiteAccessMessage, canDownloadApkFromWebsite } from '../lib/apkWebsiteAccess';
import { SITE } from '../siteContent';
import { detectInstallKind } from '../lib/installContext';
import TrackedDownloadLink from './TrackedDownloadLink';

interface UserProfileViewProps {
  userProfile: UserProfile;
  userPosts?: ItemPost[];
  onViewPost?: (post: ItemPost) => void;
  onRepostPost?: (post: ItemPost) => void;
  onDeletePost?: (post: ItemPost) => void;
  onUpdateProfile: (updated: UserProfile) => void;
  /** Refresh feed/listings after avatar is saved */
  onProfilePhotoSaved?: () => void;
  onDeleteAccount?: () => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
  onViewProfile?: (userId: string) => void;
  onOpenAwards?: () => void;
  onOpenDownload?: () => void;
  scrollToDirectorOverview?: boolean;
  onClearScrollToDirectorOverview?: () => void;
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
  onViewPost,
  onRepostPost,
  onDeletePost,
  onUpdateProfile,
  onProfilePhotoSaved,
  onDeleteAccount,
  onLogout,
  onViewProfile,
  onOpenAwards,
  onOpenDownload,
  scrollToDirectorOverview,
  onClearScrollToDirectorOverview,
  fullBleed = false,
}: UserProfileViewProps) {
  const [displayName, setDisplayName] = useState(userProfile.displayName);
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);
  const [bio, setBio] = useState(userProfile.bio || '');
  const [photoURL, setPhotoURL] = useState(
    userProfile.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile.uid)}`,
  );
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<NeighborStats | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [awardSummary, setAwardSummary] = useState<NeighborAwardSummary | null>(null);
  const [awardsLoading, setAwardsLoading] = useState(!!onOpenAwards);
  const { apkDownloadHref, latestApk, apkStatus, loading: apkVersionLoading } = useInstallVersions(userProfile);
  const installKind = typeof window !== 'undefined' ? detectInstallKind() : 'browser';
  const usingApk = installKind === 'android-apk';
  const canDownloadApk = canDownloadApkFromWebsite(userProfile);
  const apkAccessMessage = apkWebsiteAccessMessage(userProfile);

  const openDownloadPage = (event?: React.MouseEvent) => {
    event?.preventDefault();
    if (onOpenDownload) {
      onOpenDownload();
      return;
    }
    window.location.assign('/download');
  };

  useEffect(() => {
    getNeighborStats(userProfile.uid).then(setStats);
  }, [userProfile.uid]);

  useEffect(() => {
    if (!onOpenAwards) return;
    let cancelled = false;
    setAwardsLoading(true);
    void Promise.all([getNeighborStats(userProfile.uid), getNeighborAwardClaims(userProfile.uid)]).then(
      ([nextStats, claims]) => {
        if (cancelled) return;
        setAwardSummary(
          buildNeighborAwardSummary({
            userId: userProfile.uid,
            posts: userPosts,
            claims,
            stats: nextStats,
          }),
        );
        setAwardsLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [onOpenAwards, userProfile.uid, userPosts]);

  useEffect(() => {
    if (isPhotoUploading) return;
    setPhotoURL(
      userProfile.photoURL ||
        `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile.uid)}`,
    );
  }, [userProfile.photoURL, userProfile.uid, isPhotoUploading]);

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

    if (!isLikelyImageFile(file)) {
      setErrorMsg(INVALID_IMAGE_FILE_MESSAGE);
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
    : 'sbn-section';

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
          <UserAvatar
            src={photoURL}
            name={userProfile.displayName}
            size="xl"
            lastActiveAt={userProfile.lastActiveAt}
            borderClassName="border-accent"
            imgClassName="animate-fade-in"
          />
          <p className="text-[10px] font-semibold text-emerald-400 mt-2">
            {formatLastActive(userProfile.lastActiveAt)}
          </p>
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

          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-xs font-bold text-accent mt-3">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            <span>{userProfile.neighborhood} Sector</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 w-full">
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
              <Repeat2 className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="font-display text-lg font-bold text-app">{stats?.tradesCompleted ?? '—'}</p>
              <p className="text-[10px] text-muted">Trades</p>
            </div>
            <div className="bg-inset border border-app rounded-xl p-3 text-center">
              <ChevronUp className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="font-display text-lg font-bold text-app">{stats?.upvotesReceived ?? '—'}</p>
              <p className="text-[10px] text-muted">Upvotes received</p>
            </div>
            <div className="bg-inset border border-app rounded-xl p-3 text-center sm:col-span-2">
              <ChevronDown className="w-5 h-5 text-muted mx-auto mb-1" />
              <p className="font-display text-lg font-bold text-app">{stats?.downvotesReceived ?? '—'}</p>
              <p className="text-[10px] text-muted">Downvotes received</p>
            </div>
          </div>

          <ProfileAwardsRow
            userId={userProfile.uid}
            onOpenAwards={onOpenAwards}
            viewerIsStaff={Boolean(userProfile.role && userProfile.role !== 'user')}
          />

          <p className="text-xs text-muted mt-4 border-b border-app pb-4 w-full">
            Joined our sharing circle:{' '}
            {(() => {
              const raw = userProfile.createdAt;
              const ms =
                raw && typeof raw === 'object' && 'seconds' in raw
                  ? Number((raw as { seconds: number }).seconds) * 1000
                  : new Date(raw as string | number | Date).getTime();
              const date = new Date(ms);
              return Number.isNaN(date.getTime()) ? 'recently' : date.toLocaleDateString();
            })()}
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
                  className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-app text-xs font-semibold focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors focus:outline-hidden"
                />
              </div>

              {/* Neighborhood select */}
              <div className="space-y-1.5">
                <label htmlFor="pref_neighborhood" className="text-xs font-bold text-muted uppercase block">My Home Neighborhood</label>
                <select
                  id="pref_neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-app text-xs font-bold cursor-pointer focus:border-accent focus:outline-hidden"
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
                className="block w-full p-3 bg-inset border border-app rounded-xl text-xs text-app placeholder:text-subtle font-semibold resize-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors focus:outline-hidden"
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

          <SystemPermissionsSettings />
          <ThemeSettings />
          <GoGetSettings userProfile={userProfile} onUpdateProfile={onUpdateProfile} />
        </div>
      </div>

      {/* ── Activity ─────────────────────────────────────────── */}
      <GoGetRecordSection userProfile={userProfile} className={fullBleed ? sectionShell : 'sbn-section'} />

      {/* ── Awards ───────────────────────────────────────────── */}
      {onOpenAwards && (
        <div className={fullBleed ? sectionShell : ''}>
          <ProfileAwardsSection
            summary={awardSummary}
            loading={awardsLoading}
            onOpenAwards={onOpenAwards}
          />
        </div>
      )}

      {/* ── Your posts ───────────────────────────────────────── */}
      <div className={fullBleed ? sectionShell : 'sbn-section'}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-app uppercase tracking-wider">Your posts</h3>
          <span className="text-xs text-muted">{userPosts.length}</span>
        </div>
        <ProfilePostList
          posts={userPosts
            .slice()
            .sort((a, b) => new Date(b.updatedAt as any).getTime() - new Date(a.updatedAt as any).getTime())}
          emptyMessage="You have not posted anything yet."
          onViewPost={onViewPost}
          onRepostPost={onRepostPost}
          onDeletePost={onDeletePost}
        />
      </div>

      {/* ── Staff tools — only shown on account page for non-staff users or
           when the sidebar is unavailable. Staff with the sidebar see all
           moderation tools there instead. ────────────────────────────── */}
      {onViewProfile && !isStaffRole(userProfile.role) ? (
        <CommunityMenuView
          userProfile={userProfile}
          onViewProfile={onViewProfile}
          scrollToDirectorOverview={scrollToDirectorOverview}
          onClearScrollToDirectorOverview={onClearScrollToDirectorOverview}
          fullBleed={fullBleed}
        />
      ) : null}

      {/* ── Install app ──────────────────────────────────────── */}
      <div
        className={`${fullBleed ? `${sectionShell} shadow-none` : 'sbn-section'} animate-fade-in min-w-0 overflow-hidden`}
        id="pwa_installs_section"
      >
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-app uppercase tracking-wider">Install app</h3>
        </div>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          Install Sacramento Buy Nothing as an app for faster loads, push notifications, and a full-screen experience.
          Home screen install is free for everyone; Google Play is for native Android; free APK sideload is only for our
          first 500 neighbors.
        </p>

        <div className="flex flex-col gap-2 mb-4 min-w-0">
          <a
            href={SITE.playStoreBetaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-colors"
          >
            <Store className="w-4 h-4 shrink-0" />
            <span>Get it from Play Store</span>
          </a>

          <button
            type="button"
            onClick={openDownloadPage}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 border border-accent/40 bg-accent/10 hover:bg-accent/15 text-accent rounded-xl text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{canDownloadApk ? 'Compare Play, APK & home screen' : 'Compare Play & home screen'}</span>
          </button>

          {canDownloadApk && apkDownloadHref ? (
            <TrackedDownloadLink
              href={apkDownloadHref}
              download={latestApk?.fileName || 'sac-buy-nothing.apk'}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-on-accent rounded-xl text-xs font-bold uppercase tracking-wide transition-colors"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>
                {apkVersionLoading
                  ? 'Loading APK…'
                  : latestApk?.betaLabel
                    ? usingApk && apkStatus === 'update-available'
                      ? `Update to ${latestApk.betaLabel}`
                      : `Download ${latestApk.betaLabel}`
                    : 'Download latest APK'}
              </span>
            </TrackedDownloadLink>
          ) : null}
        </div>

        {!canDownloadApk && apkAccessMessage ? (
          <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2 mb-4 leading-relaxed">
            {apkAccessMessage}
          </p>
        ) : null}

        {isAppInstalled ? (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl" id="pwa_installed_badge">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-emerald-400">App installed on this device</span>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={triggerDirectPWAInstall}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-on-accent rounded-xl text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer"
            id="pwa_install_direct_trigger"
          >
            <Download className="w-4 h-4" />
            <span>Install app</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex border-b border-app overflow-x-auto gap-0">
              {(['ios', 'android', 'chrome'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setActiveManualPlatform(p)}
                  className={`shrink-0 py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    activeManualPlatform === p
                      ? 'border-accent text-accent'
                      : 'border-transparent text-subtle hover:text-muted'
                  }`}
                >
                  {p === 'ios' ? 'iPhone' : p === 'android' ? 'Android' : 'Desktop'}
                </button>
              ))}
            </div>
            <div className="bg-inset border border-app p-4 rounded-xl text-xs text-muted space-y-2 leading-relaxed">
              {activeManualPlatform === 'ios' && (
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>Open in <strong className="text-app">Safari</strong>.</li>
                  <li>Tap the <strong className="text-app">Share</strong> button <Share2 className="inline w-3.5 h-3.5 mx-1" />.</li>
                  <li>Tap <strong className="text-app">Add to Home Screen</strong>, then <strong className="text-app">Add</strong>.</li>
                </ol>
              )}
              {activeManualPlatform === 'android' && (
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  {canDownloadApk ? (
                    <li>
                      <strong className="text-app">APK (first 500 neighbors):</strong> open{' '}
                      <button
                        type="button"
                        onClick={openDownloadPage}
                        className="text-accent font-bold underline underline-offset-2 cursor-pointer"
                      >
                        download page
                      </button>{' '}
                      or use the APK button above.
                    </li>
                  ) : (
                    <li>
                      <strong className="text-app">Google Play:</strong> use{' '}
                      <strong className="text-app">Download from Play Store</strong> above if you are on the invite list.
                    </li>
                  )}
                  <li>
                    <strong className="text-app">Or Chrome home screen:</strong> tap the three-dot menu{' '}
                    <strong className="text-app">(⋮)</strong> → <strong className="text-app">Install app</strong> or{' '}
                    <strong className="text-app">Add to Home Screen</strong>.
                  </li>
                </ol>
              )}
              {activeManualPlatform === 'chrome' && (
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>Look for the install icon in your browser's address bar.</li>
                  <li>Click it and select <strong className="text-app">Install</strong>.</li>
                </ol>
              )}
            </div>
          </div>
        )}
      </div>

      {showPrivacyModal && (
        <PrivacyPolicyModal
          userId={userProfile.uid}
          required={!isPrivacyAccepted(userProfile.uid)}
          onAccepted={() => setShowPrivacyModal(false)}
          onClose={() => setShowPrivacyModal(false)}
        />
      )}

      {showTermsModal && (
        <TermsOfUseModal
          userId={userProfile.uid}
          required={!isTermsAccepted(userProfile.uid)}
          onAccepted={() => setShowTermsModal(false)}
          onClose={() => setShowTermsModal(false)}
        />
      )}

      {!isStaffRole(userProfile.role) ? (
        <div className={fullBleed ? sectionShell : 'sbn-section'} id="account_staff_apply_section">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-app uppercase tracking-wider">Join the staff team</h3>
          </div>
          <p className="text-xs text-muted leading-relaxed mb-4">
            Read what each role actually does, then apply for one. Tell us how fast you can respond
            and if you've been a mod elsewhere. Staff see one request at a time.
          </p>
          <button
            type="button"
            onClick={() => openStaffApplyPanel()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-accent/40 bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider hover:bg-accent/15 transition-colors"
          >
            View roles & apply
          </button>
        </div>
      ) : null}

      {/* ── Privacy & legal ──────────────────────────────────── */}
      <div className={fullBleed ? sectionShell : 'sbn-section'} id="account_privacy_section">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-app uppercase tracking-wider">Privacy & legal</h3>
        </div>
        <div className="space-y-1 mb-4">
          <p className="text-[10px] text-subtle font-semibold">
            {isPrivacyAccepted(userProfile.uid)
              ? `Privacy policy accepted (${PRIVACY.lastUpdated}).`
              : 'Privacy policy not yet accepted — please review.'}
          </p>
          <p className="text-[10px] text-subtle font-semibold">
            {isTermsAccepted(userProfile.uid)
              ? `Terms of use accepted (${TERMS.lastUpdated}).`
              : 'Terms of use not yet accepted — please review.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-app text-xs font-bold text-accent hover:bg-inset transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            {PRIVACY.shortTitle}
          </button>
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-app text-xs font-bold text-accent hover:bg-inset transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {TERMS.shortTitle}
          </button>
        </div>
      </div>

      {/* ── Sign out ─────────────────────────────── (near bottom) */}
      {onLogout ? (
        <div className={fullBleed ? sectionShell : 'sbn-section'} id="account_sign_out_section">
          <h3 className="text-sm font-bold text-app uppercase tracking-wider mb-2">Sign out</h3>
          <p className="text-xs text-muted leading-relaxed mb-4">
            Sign out of Sacramento Buy Nothing on this device. You can sign back in anytime.
          </p>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-app text-app text-xs font-bold uppercase tracking-wider hover:bg-inset transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      ) : null}

      {/* ── Delete account ──────────────────────── (absolute bottom) */}
      {onDeleteAccount && (
        <div
          className={fullBleed ? sectionShell : 'sbn-section border-red-900/40'}
          id="account_delete_section"
        >
          <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-2">Delete account</h3>
          <p className="text-xs text-muted leading-relaxed mb-4">
            Permanently remove your profile, listings, comments, messages, and sign-in access.
            This cannot be undone.
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
    </div>
  );
}

