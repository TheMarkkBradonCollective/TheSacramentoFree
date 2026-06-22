import { useState } from 'react';
import { Check, Copy, Megaphone, Share2, Sparkles, Users } from 'lucide-react';
import { AwardsUnlockStatus } from '../types';
import { getInviteShareUrl } from '../lib/awardsApi';
import { AWARDS } from '../siteContent';

interface AwardsSharePromptProps {
  unlockStatus: AwardsUnlockStatus;
}

export default function AwardsSharePrompt({ unlockStatus }: AwardsSharePromptProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = getInviteShareUrl();
  const progress = Math.min(100, Math.round((unlockStatus.memberCount / unlockStatus.target) * 100));

  const handleCopy = async () => {
    const text = AWARDS.shareMessage.replace('{url}', shareUrl);
    try {
      if (navigator.share) {
        await navigator.share({ title: AWARDS.shareTitle, text, url: shareUrl });
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

  return (
    <div className="sbn-card p-6 space-y-5 text-center border-accent/30 bg-gradient-to-b from-accent-soft/30 to-transparent">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-soft border border-accent/30 sbn-awards-glow-btn">
        <Megaphone className="w-8 h-8 text-accent" />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {AWARDS.unlockBadge}
        </p>
        <h3 className="font-display text-2xl font-bold text-app">{AWARDS.unlockTitle}</h3>
        <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">{AWARDS.unlockBody}</p>
      </div>

      <div className="space-y-2 max-w-sm mx-auto">
        <div className="flex items-center justify-between text-xs font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-accent" />
            {unlockStatus.memberCount} neighbors
          </span>
          <span>{unlockStatus.target} to unlock</span>
        </div>
        <div className="h-3 rounded-full bg-inset border border-app overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-subtle">
          {unlockStatus.remaining === 1
            ? 'Just 1 more neighbor to unlock awards!'
            : `${unlockStatus.remaining} more neighbors to go — help us get there!`}
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="sbn-btn sbn-btn-primary w-full max-w-sm mx-auto inline-flex items-center justify-center gap-2 text-base py-3"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              Link copied — go share it!
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              {AWARDS.shareButton}
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

      <p className="text-xs text-subtle leading-relaxed max-w-md mx-auto">{AWARDS.unlockNote}</p>
    </div>
  );
}
