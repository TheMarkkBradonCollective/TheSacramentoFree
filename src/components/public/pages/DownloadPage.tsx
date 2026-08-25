import {
  ArrowLeft,
  Download,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Bell,
  Zap,
  Globe,
  Store,
} from 'lucide-react';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';
import TrackedDownloadLink from '../../TrackedDownloadLink';
import { useInstallVersions, type VersionStatus } from '../../../hooks/useInstallVersions';
import { apkWebsiteAccessMessage } from '../../../lib/apkWebsiteAccess';
import { isWebsiteBrowser } from '../../../lib/installContext';
import { SITE } from '../../../siteContent';
import type { UserProfile } from '../../../types';
import { useNewspaperSkin } from '../../../preview/NewspaperSkinContext';
import { NEWSPAPER } from '../../../preview/newspaperBrand';

interface DownloadPageProps {
  /** When set, show a back control for signed-in app users instead of public nav back. */
  onBack?: () => void;
  userProfile?: UserProfile | null;
}

function StatusBadge({ status, optional = false }: { status: VersionStatus; optional?: boolean }) {
  if (status === 'up-to-date') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Up to date
      </span>
    );
  }

  if (status === 'update-available') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
          optional
            ? 'bg-accent/10 text-accent border-accent/25'
            : 'bg-accent/15 text-accent border-accent/30'
        }`}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        {optional ? 'Update optional' : 'Update available'}
      </span>
    );
  }

  if (status === 'not-installed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-inset text-muted border border-app">
        Not installed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-inset text-subtle border border-app">
      <HelpCircle className="w-3.5 h-3.5" />
      Unknown
    </span>
  );
}

function formatVersion(version: string | null, fallback = '—') {
  if (!version) return fallback;
  if (/^\d{13}$/.test(version)) {
    return new Date(Number(version)).toLocaleString();
  }
  return version;
}

function ComparisonRow({
  label,
  apk,
  homeScreen,
}: {
  label: string;
  apk: string;
  homeScreen: string;
}) {
  return (
    <tr className="border-t border-app">
      <th className="text-left py-3 pr-4 text-xs font-bold text-app align-top">{label}</th>
      <td className="py-3 pr-4 text-xs text-muted align-top">{apk}</td>
      <td className="py-3 text-xs text-muted align-top">{homeScreen}</td>
    </tr>
  );
}

function DownloadPageContent({ onBack, userProfile }: DownloadPageProps) {
  const { enabled: newspaper } = useNewspaperSkin();
  const {
    installKind,
    installLabel,
    loading,
    error,
    latestWebVersion,
    currentWebVersion,
    webStatus,
    latestApk,
    apkDownloadHref,
    aabDownloadHref,
    currentApkVersionName,
    currentApkVersionCode,
    apkStatus,
    canDownloadApkFromWebsite,
    refresh,
  } = useInstallVersions(userProfile);

  const usingApk = installKind === 'android-apk';
  const usingHomeScreen = installKind === 'pwa' || installKind === 'ios-pwa';
  const isPublicDownloadPage = !onBack;
  /** APK sideload only inside the signed-in app for joiners 1–500 — never on the public /download page. */
  const showApkSection = !isPublicDownloadPage && canDownloadApkFromWebsite;
  const showApkHint =
    showApkSection &&
    !usingApk &&
    apkStatus === 'not-installed' &&
    (installKind === 'browser' || usingHomeScreen);
  const apkAccessMessage = !isPublicDownloadPage ? apkWebsiteAccessMessage(userProfile) : '';

  const shell = onBack ? (
    <div className="sbn-download-in-app min-h-screen min-h-[100dvh] overflow-y-auto overflow-x-hidden bg-app text-app">
      <div className="max-w-5xl mx-auto w-full min-w-0 px-4 py-6 md:py-12 sbn-download-in-app-inner">
        <button type="button" onClick={onBack} className="sbn-back-btn" aria-label="Go back">
          <ArrowLeft className="w-4 h-4" />
          Back to app
        </button>
        <header className="sbn-page-header">
          <h1>{newspaper ? 'Get the paper' : 'Download the app'}</h1>
          <p>
            {newspaper
              ? `Take ${NEWSPAPER.name} with you — Google Play on Android or add to your home screen.`
              : 'Install options for Google Play, home screen, or (for early joiners) APK sideload. Screenshot walkthrough lives on the home page when you visit on desktop.'}
          </p>
        </header>
        <div className="space-y-4 min-w-0">{renderBody()}</div>
      </div>
    </div>
  ) : (
    <PublicPageShell
      title={newspaper ? 'Get the paper' : 'Download the app'}
      subtitle={
        newspaper
          ? `Take ${NEWSPAPER.name} with you — Google Play on Android or add to your home screen.`
          : 'Install Google Play or add to your home screen. Full screenshot tour is on the home page (desktop).'
      }
      className="min-w-0 overflow-x-hidden"
    >
      {renderBody()}
    </PublicPageShell>
  );

  function renderBody() {
    return (
      <>
        <PublicCard>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">You are here now</p>
              <p className="text-sm font-bold text-app mt-1">{installLabel}</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {usingApk
                  ? 'You are running the installed Android app. Check below for APK updates.'
                  : usingHomeScreen
                    ? 'You are running the home screen version. It updates itself when you reopen the app.'
                    : 'You are in a browser tab. Install either option below for a better mobile experience.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-app bg-inset text-xs font-bold text-app hover:bg-surface transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Recheck versions
            </button>
          </div>
        </PublicCard>

        {error ? (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
        ) : null}

        {isPublicDownloadPage && isWebsiteBrowser() ? (
          <PublicCard>
            <p className="text-xs text-muted leading-relaxed">
              Want the full app walkthrough with screenshots? Open the{' '}
              <a href="/" className="font-bold text-accent hover:underline">
                home page on a desktop browser
              </a>{' '}
              — furniture, electronics, baby gear, Go Get pickup, and more.
            </p>
          </PublicCard>
        ) : null}

        <div id="download_install" className="space-y-4 scroll-mt-8">
        {!isPublicDownloadPage ? (
          <PublicCard>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                <Store className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-app">Google Play (Android)</h2>
                <p className="text-[11px] text-muted mt-0.5">Native app for neighbors on the invite list</p>
              </div>
            </div>

            <p className="text-xs text-muted mb-4 leading-relaxed">
              Open on your <strong className="text-app">Android phone</strong> while signed into the{' '}
              <strong className="text-app">Gmail on your tester list</strong> (if invited). Tap{' '}
              <strong className="text-app">Become a tester</strong>, then install.
            </p>

            <a
              href={SITE.playStoreBetaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black uppercase tracking-wide rounded-xl transition-colors"
            >
              <Store className="w-4 h-4" />
              Get it from Play Store
            </a>
          </PublicCard>
        ) : null}

        {!isPublicDownloadPage && !showApkSection && apkAccessMessage ? (
          <p className="text-xs text-muted bg-inset border border-app rounded-xl px-4 py-3 leading-relaxed">
            {apkAccessMessage}
          </p>
        ) : null}

        <div className={`grid gap-4 ${isPublicDownloadPage || showApkSection ? 'md:grid-cols-2' : ''}`}>
          {isPublicDownloadPage ? (
            <PublicCard className="h-full">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                  <Store className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-app">Google Play (Android)</h2>
                  <p className="text-[11px] text-muted mt-0.5">Native app — sign in with your community account after install</p>
                </div>
              </div>

              <p className="text-xs text-muted mb-4 leading-relaxed">
                On your <strong className="text-app">Android phone</strong>, open the link while signed into the{' '}
                <strong className="text-app">Gmail on your tester list</strong>. Tap{' '}
                <strong className="text-app">Become a tester</strong>, then install from Play Store.
              </p>

              <a
                href={SITE.playStoreBetaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black uppercase tracking-wide rounded-xl transition-colors"
              >
                <Store className="w-4 h-4" />
                Get it from Play Store
              </a>

              <p className="text-[11px] text-subtle mt-3 leading-relaxed">
                Free APK sideload is not offered on this public page. Sign in and open Account → Install if you joined
                in the first 500 neighbors.
              </p>
            </PublicCard>
          ) : null}

          {showApkSection ? (
          <PublicCard className="h-full">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-accent/15 border border-accent/25">
                  <Download className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-app">Android APK</h2>
                  <p className="text-[11px] text-muted">Download & install file</p>
                </div>
              </div>
              <StatusBadge status={apkStatus} />
            </div>

            <dl className="space-y-2 text-xs mb-4">
              <div className="flex justify-between gap-4">
                <dt className="text-subtle">Latest version</dt>
                <dd className="font-bold text-app text-right">
                  {loading ? '…' : latestApk?.betaLabel ?? latestApk?.versionName ?? '—'}
                  {!loading && latestApk?.betaLabel == null && latestApk?.versionCode != null
                    ? ` (build ${latestApk.versionCode})`
                    : ''}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-subtle">Your installed APK</dt>
                <dd className="font-bold text-app text-right">
                  {usingApk || currentApkVersionName
                    ? `${currentApkVersionName ?? '—'}${currentApkVersionCode != null ? ` (build ${currentApkVersionCode})` : ''}`
                    : 'Not detected on this device'}
                </dd>
              </div>
            </dl>

            {apkStatus === 'update-available' ? (
              <p className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mb-4">
                A newer APK is available. Download and install it once — after that, the app updates itself
                automatically when we deploy.
              </p>
            ) : usingApk && apkStatus === 'up-to-date' ? (
              <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2 mb-4">
                Your APK loads the live site and refreshes on its own. You should not need to download again unless we
                ship a new native build.
              </p>
            ) : null}

            {showApkHint ? (
              <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2 mb-4">
                If you already installed the APK on this phone, open this page inside the app to see your installed
                version. From a browser we can only guess from your last app visit.
              </p>
            ) : null}

            {apkDownloadHref ? (
              <TrackedDownloadLink
                href={apkDownloadHref}
                download={latestApk?.fileName || 'sac-buy-nothing.apk'}
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-hover text-on-accent text-sm font-black uppercase tracking-wide rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                {latestApk?.betaLabel ? `Download ${latestApk.betaLabel}` : 'Download APK'}
              </TrackedDownloadLink>
            ) : (
              <p className="text-xs text-muted">APK download link is not configured yet.</p>
            )}

            {aabDownloadHref ? (
              <TrackedDownloadLink
                href={aabDownloadHref}
                download={latestApk?.aabFileName || latestApk?.legacyAabFileName || 'sac-buy-nothing.aab'}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 border border-app bg-inset hover:bg-surface text-app text-xs font-bold rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download AAB (Play Store bundle)
              </TrackedDownloadLink>
            ) : null}

            <p className="text-[11px] text-subtle mt-3 leading-relaxed">
              After downloading, open the file and allow install from your browser or Files app if Android asks.
              If Google Play Protect warns about an unknown app, tap <strong className="text-app">Install anyway</strong>
              — this is normal for community apps downloaded outside the Play Store. If install fails, uninstall the old
              SacramentoBuyNothing app first, then try again.
            </p>
          </PublicCard>
          ) : null}

          <PublicCard className="h-full">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-inset border border-app">
                  <Smartphone className="w-5 h-5 text-app" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-app">Home screen app</h2>
                  <p className="text-[11px] text-muted">Add to Home Screen / Install app</p>
                </div>
              </div>
              <StatusBadge status={webStatus} optional />
            </div>

            <dl className="space-y-2 text-xs mb-4">
              <div className="flex justify-between gap-4">
                <dt className="text-subtle">Latest web version</dt>
                <dd className="font-bold text-app text-right">{loading ? '…' : formatVersion(latestWebVersion)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-subtle">Your version</dt>
                <dd className="font-bold text-app text-right">
                  {usingHomeScreen || currentWebVersion
                    ? formatVersion(currentWebVersion)
                    : 'Not installed / browser tab'}
                </dd>
              </div>
            </dl>

            {webStatus === 'update-available' ? (
              <p className="text-xs text-accent/90 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mb-4">
                A newer version is live. Home screen apps usually pick this up automatically when you close and reopen
                the app. You can also force a refresh now.
              </p>
            ) : usingHomeScreen ? (
              <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2 mb-4">
                You are on the home screen version — it refreshes itself in the background. No manual file download
                needed unless you want the benefits listed below.
              </p>
            ) : null}

            {!usingHomeScreen && !usingApk ? (
              <div className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2 mb-4 space-y-2">
                <p className="font-bold text-app">How to install</p>
                <p>
                  <strong className="text-app">iPhone:</strong> Safari → Share → Add to Home Screen.
                </p>
                <p>
                  <strong className="text-app">Android Chrome:</strong> Menu (⋮) → Install app or Add to Home Screen.
                </p>
              </div>
            ) : null}

            {usingHomeScreen ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 border border-app bg-inset hover:bg-surface text-app text-sm font-bold rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh now
              </button>
            ) : (
              <p className="text-[11px] text-subtle leading-relaxed">
                No file to download — your browser saves a shortcut that opens {SITE.shortName} like an app.
              </p>
            )}
          </PublicCard>
        </div>
        </div>

        <PublicCard>
          <h2 className="text-sm font-black text-app mb-1">Which should you use?</h2>
          <p className="text-xs text-muted mb-4 leading-relaxed">
            {isPublicDownloadPage
              ? 'Home screen is the website as an icon. Google Play adds live Go Get pickup on Android. See the desktop home page for the full screenshot tour.'
              : usingHomeScreen
                ? 'You are on the home screen app — it updates when you reopen. Google Play / APK add live Go Get pickup on Android.'
                : 'Home screen is the website as an icon. Google Play / APK add live Go Get pickup. Free APK sideload in Account is only for our first 500 neighbors.'}
          </p>

          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[32rem] text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-subtle">
                  <th className="pb-2 pr-4">Feature</th>
                  <th className="pb-2 pr-4 text-accent">{isPublicDownloadPage ? 'Google Play' : 'Play / APK'}</th>
                  <th className="pb-2">Home screen / PWA</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  label="Install"
                  apk={
                    isPublicDownloadPage
                      ? 'Get it from Play Store on Android (if invited)'
                      : showApkSection
                        ? 'Google Play or free APK sideload (first 500, in Account)'
                        : 'Get it from Play Store on Android (if invited)'
                  }
                  homeScreen="Add to Home Screen from browser"
                />
                <ComparisonRow
                  label="Updates"
                  apk="Install once — then auto-updates from the live site"
                  homeScreen="Updates automatically when you reopen the app"
                />
                <ComparisonRow
                  label="Go Get live pickup"
                  apk="Locked maps on both sides — turn-by-turn for the picker, live tracking for the poster, like Uber"
                  homeScreen="Not included. Message the neighbor and arrange pickup yourselves (same as the website)."
                />
                <ComparisonRow
                  label="Background notifications"
                  apk="Firebase push — stronger on Android when app is closed"
                  homeScreen="Web push — works when installed; iPhone needs Home Screen first"
                />
                <ComparisonRow
                  label="iPhone"
                  apk="Not available (Android only)"
                  homeScreen="Yes — Add to Home Screen in Safari"
                />
                <ComparisonRow
                  label="Offline shell"
                  apk="Bundled app opens fast; still needs internet for listings"
                  homeScreen="Cached pages; same live data when online"
                />
                <ComparisonRow
                  label="Best for"
                  apk={
                    isPublicDownloadPage
                      ? 'Android neighbors on the Play tester list'
                      : showApkSection
                        ? 'Early neighbors (APK in Account) or Play invite list'
                        : 'Android neighbors on the Play tester list'
                  }
                  homeScreen="Quick install, auto-updates, iPhone + Android"
                />
              </tbody>
            </table>
          </div>
        </PublicCard>

        <PublicCard>
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-accent shrink-0" />
              <div>
                <p className="font-bold text-app">{isPublicDownloadPage ? 'Play Store alerts' : 'Native Android alerts'}</p>
                <p className="text-muted mt-1 leading-relaxed">
                  {isPublicDownloadPage
                    ? 'Google Play installs use Firebase push — stronger when your phone is asleep or the app is swiped away.'
                    : 'Google Play or APK installs use Firebase push — stronger when your phone is asleep or the app is swiped away.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-accent shrink-0" />
              <div>
                <p className="font-bold text-app">Home screen = zero hassle</p>
                <p className="text-muted mt-1 leading-relaxed">
                  No install files to manage. Site deploys flow to you automatically — optional refresh if you are eager.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Globe className="w-5 h-5 text-accent shrink-0" />
              <div>
                <p className="font-bold text-app">Same community, extra on Android</p>
                <p className="text-muted mt-1 leading-relaxed">
                  Listings, chat, map, and events match the website. Go Get live pickup is Android Play / APK only.
                </p>
              </div>
            </div>
          </div>
        </PublicCard>
      </>
    );
  }

  return shell;
}

export default function DownloadPage(props: DownloadPageProps) {
  return <DownloadPageContent {...props} />;
}
