import { useRef, useState } from 'react';
import { UserProfile } from '../types';
import { blockUser } from '../supabase';
import { BLOCK_REASON_OPTIONS } from '../lib/blockReasons';
import { INVALID_IMAGE_FILE_MESSAGE, isLikelyImageFile } from '../lib/imageUrl';
import { Ban, Camera, X } from 'lucide-react';

interface BlockNeighborModalProps {
  blocker: UserProfile;
  blockedUserId: string;
  blockedUserName: string;
  onClose: () => void;
  onBlocked: () => void;
}

export default function BlockNeighborModal({
  blocker,
  blockedUserId,
  blockedUserName,
  onClose,
  onBlocked,
}: BlockNeighborModalProps) {
  const [reasonCode, setReasonCode] = useState('');
  const [details, setDetails] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const needsDetails = reasonCode === 'other';

  const handleProofChange = (file: File | null) => {
    if (file && !isLikelyImageFile(file)) {
      setErr(INVALID_IMAGE_FILE_MESSAGE);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(file);
    setProofPreview(file ? URL.createObjectURL(file) : null);
    if (file) setErr('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonCode) {
      setErr('Please select a reason for blocking.');
      return;
    }
    if (needsDetails && !details.trim()) {
      setErr('Please describe why you are blocking this neighbor.');
      return;
    }

    setSubmitting(true);
    setErr('');

    const result = await blockUser({
      blocker,
      blockedUserId,
      blockedUserName,
      reasonCode,
      details: details.trim(),
      proofFile,
    });

    setSubmitting(false);

    if (result.ok) {
      onBlocked();
    } else {
      setErr(result.errorMessage || 'Could not block neighbor.');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div
        className="sbn-card w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="block_neighbor_title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 id="block_neighbor_title" className="font-display font-bold text-app flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400" />
              Block {blockedUserName}
            </h4>
            <p className="text-xs text-muted mt-1 leading-snug">
              You will not see each other&apos;s posts or messages. Staff receives an automatic report with your
              reason{proofFile ? ' and screenshot' : ''}.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-inset shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted">Why are you blocking? *</span>
            <select
              className="sbn-input text-sm"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              required
            >
              <option value="">Select a reason…</option>
              {BLOCK_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted">
              {needsDetails ? 'Describe what happened *' : 'Additional details (optional)'}
            </span>
            <textarea
              className="sbn-input text-sm min-h-[5rem]"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What happened? Include dates or context if helpful for staff."
              maxLength={2000}
            />
          </label>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase text-muted block">Screenshot proof (optional)</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleProofChange(e.target.files?.[0] ?? null)}
            />
            {proofPreview ? (
              <div className="relative rounded-xl border border-app overflow-hidden bg-inset">
                <img src={proofPreview} alt="Proof preview" className="w-full max-h-40 object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    handleProofChange(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  aria-label="Remove screenshot"
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="sbn-btn sbn-btn-secondary w-full text-sm"
              >
                <Camera className="w-4 h-4" />
                Add screenshot
              </button>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="sbn-btn sbn-btn-primary flex-1">
              {submitting ? 'Blocking…' : 'Block & report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
