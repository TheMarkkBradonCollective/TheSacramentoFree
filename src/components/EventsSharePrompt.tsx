import { useState } from 'react';
import { CalendarDays, Check, Copy, Share2, Sparkles, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { AwardsUnlockStatus } from '../types';
import { getInviteShareUrl } from '../lib/communityUnlock';
import { EVENTS } from '../siteContent';

interface EventsSharePromptProps {
  unlockStatus: AwardsUnlockStatus;
  variant?: 'full' | 'compact';
}

const FLOATERS = ['📅', '🎪', '🧺', '🌳', '🤝', '✨'];

export default function EventsSharePrompt({ unlockStatus, variant = 'full' }: EventsSharePromptProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = getInviteShareUrl();
  const progress = Math.min(100, Math.round((unlockStatus.memberCount / unlockStatus.target) * 100));

  const handleCopy = async () => {
    const text = EVENTS.shareMessage.replace('{url}', shareUrl);
    try {
      if (navigator.share) {
        await navigator.share({ title: EVENTS.shareTitle, text, url: shareUrl });
        return;
      }
    } catch {
      // fall through to clipboard
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy this link and share it:', text);
    }
  };

  const progressBlock = (
    <div className="space-y-3 max-w-sm mx-auto">
      <div className="flex items-center justify-between text-xs font-bold text-app">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-inset px-3 py-1.5 border border-app text-xs font-semibold">
          <Users className="w-3.5 h-3.5 text-accent" />
          {unlockStatus.memberCount} neighbors here
        </span>
        <span className="text-muted">Goal: {unlockStatus.target.toLocaleString()}</span>
      </div>

      <div className="sbn-award-progress-track h-3 rounded-md overflow-hidden border border-app">
        <motion.div
          className="sbn-award-progress-fill h-full rounded-md"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <p className="text-sm font-semibold text-app">
        {unlockStatus.remaining === 1
          ? '🙌 Just 1 more neighbor to unlock events!'
          : `🚀 ${unlockStatus.remaining.toLocaleString()} more neighbors and events go live!`}
      </p>
    </div>
  );

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sbn-card p-4 sm:p-5 space-y-3 border-accent/20"
      >
        <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {EVENTS.unlockBadge}
        </p>
        {progressBlock}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="sbn-award-hero sbn-card p-6 sm:p-8 space-y-6 text-center border-accent/25 relative overflow-hidden"
    >
      <div className="sbn-award-confetti" aria-hidden>
        {FLOATERS.map((emoji, i) => (
          <span key={emoji} className={`sbn-award-confetti-piece sbn-award-confetti-${i + 1}`}>
            {emoji}
          </span>
        ))}
      </div>

      <div className="relative z-10 space-y-3">
        <motion.div
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-accent-soft border border-accent/30"
        >
          <CalendarDays className="w-9 h-9 text-accent" />
        </motion.div>

        <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {EVENTS.unlockBadge}
        </p>
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-app leading-tight">
          {EVENTS.unlockTitle}
        </h3>
        <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">{EVENTS.unlockBody}</p>
      </div>

      <div className="relative z-10">{progressBlock}</div>

      <div className="relative z-10 space-y-3">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="sbn-btn sbn-btn-primary w-full max-w-sm mx-auto inline-flex items-center justify-center gap-2 py-3"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              Link copied — go share it! 🎉
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              {EVENTS.shareButton}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className="sbn-btn sbn-btn-ghost sbn-btn-sm inline-flex items-center gap-1.5 mx-auto"
        >
          <Copy className="w-4 h-4" />
          Copy invite link
        </button>
      </div>

      <p className="relative z-10 text-xs text-muted leading-relaxed max-w-md mx-auto">{EVENTS.unlockNote}</p>
    </motion.div>
  );
}
