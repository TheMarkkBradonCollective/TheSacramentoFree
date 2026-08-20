import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile } from '../types';
import { submitUserReport } from '../supabase';
import { INVALID_IMAGE_FILE_MESSAGE, isLikelyImageFile } from '../lib/imageUrl';
import { Camera, Flag, X } from 'lucide-react';
import { useDismissOnEscape } from '../hooks/useDismissOnEscape';

interface ReportNeighborModalProps {
  reporter: UserProfile;
  reportedUserId: string;
  reportedUserName: string;
  onClose: () => void;
  onSubmitted?: () => void;
  feedPostId?: string;
  feedCommentId?: string;
}

export default function ReportNeighborModal({
  reporter,
  reportedUserId,
  reportedUserName,
  onClose,
  onSubmitted,
  feedPostId,
  feedCommentId,
}: ReportNeighborModalProps) {
  const [subject, setSubject] = useState(`Report: ${reportedUserName}`);
  const [body, setBody] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useDismissOnEscape(onClose);

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
    if (!body.trim()) {
      setErr('Please describe what happened.');
      return;
    }

    setSubmitting(true);
    setErr('');

    const result = await submitUserReport({
      reporter,
      subject: subject.trim() || `Report: ${reportedUserName}`,
      body: body.trim(),
      reportedUserId,
      reportedUserName,
      proofFile,
      feedPostId,
      feedCommentId,
    });

    setSubmitting(false);

    if (result.ok) {
      onSubmitted?.();
      onClose();
    } else {
      setErr(result.errorMessage || 'Could not send report.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-4 sbn-mobile-prompt-offset">
      <div
        className="sbn-card w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report_neighbor_title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 id="report_neighbor_title" className="font-display font-bold text-app flex items-center gap-2">
              <Flag className="w-4 h-4 text-red-400" />
              Report neighbor
            </h4>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Staff will review your report about <strong className="text-app">{reportedUserName}</strong>. This is
              one-way — you will not get a direct reply.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-inset text-muted" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

          <div className="space-y-1.5">
            <label htmlFor="report_subject" className="text-[11px] font-bold text-muted uppercase tracking-wide">
              Subject
            </label>
            <input
              id="report_subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="sbn-input text-sm"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="report_body" className="text-[11px] font-bold text-muted uppercase tracking-wide">
              What happened?
            </label>
            <textarea
              id="report_body"
              rows={4}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the issue so staff can review…"
              className="sbn-input text-sm resize-none"
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide">Screenshot (optional)</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleProofChange(e.target.files?.[0] ?? null)}
            />
            {proofPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-app">
                <img src={proofPreview} alt="" className="w-full max-h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => handleProofChange(null)}
                  aria-label="Remove screenshot"
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-app text-xs text-muted hover:border-accent"
              >
                <Camera className="w-4 h-4" />
                Attach screenshot
              </button>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="sbn-btn sbn-btn-primary flex-1">
              {submitting ? 'Sending…' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
