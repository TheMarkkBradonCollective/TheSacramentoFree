import { useState } from 'react';
import type { UserProfile } from '../types';
import { submitUserReport } from '../supabase';
import FullScreenPanel from './FullScreenPanel';
import ImageAttachmentPicker from './ImageAttachmentPicker';
import { useImageAttachment } from '../hooks/useImageAttachment';

interface SendUserReportPanelProps {
  user: UserProfile;
  onClose: () => void;
}

export default function SendUserReportPanel({ user, onClose }: SendUserReportPanelProps) {
  const [reportSubject, setReportSubject] = useState('');
  const [reportBody, setReportBody] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const reportProof = useImageAttachment();
  const [err, setErr] = useState('');

  const handleSubmitReport = async () => {
    setReportSending(true);
    setErr('');
    const result = await submitUserReport({
      reporter: user,
      subject: reportSubject,
      body: reportBody,
      proofFile: reportProof.file,
    });
    setReportSending(false);
    if (result.ok) {
      setReportSent(true);
      setReportSubject('');
      setReportBody('');
      reportProof.clear();
    } else {
      setErr(result.errorMessage || 'Could not send report.');
    }
  };

  const handleClose = () => {
    setErr('');
    setReportSent(false);
    reportProof.clear();
    onClose();
  };

  return (
    <FullScreenPanel title="Send a report" subtitle="No follow-up — staff will review" onClose={handleClose}>
      {reportSent ? (
        <div className="sbn-help-empty space-y-2">
          <p className="font-display font-bold text-app">Report received</p>
          <p className="text-sm text-muted">
            Thank you. Moderators will review this. You do not need to do anything else.
          </p>
          <button type="button" onClick={handleClose} className="sbn-btn sbn-btn-primary mt-2">
            Done
          </button>
        </div>
      ) : (
        <div className="sbn-help-card space-y-4">
          {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted">Subject</span>
            <input
              className="sbn-input text-sm"
              value={reportSubject}
              onChange={(e) => setReportSubject(e.target.value)}
              placeholder="Brief summary"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted">What happened?</span>
            <textarea
              className="sbn-input text-sm min-h-[8rem]"
              value={reportBody}
              onChange={(e) => setReportBody(e.target.value)}
              placeholder="Describe the issue. Include neighbor names or post details if relevant."
            />
          </label>
          <ImageAttachmentPicker
            label="Screenshot proof (optional)"
            hint="Attach a screenshot if it helps staff understand the issue."
            file={reportProof.file}
            previewUrl={reportProof.previewUrl}
            onChange={reportProof.setFile}
            onInvalidFile={setErr}
            disabled={reportSending}
          />
          <button
            type="button"
            disabled={reportSending || !reportSubject.trim() || !reportBody.trim()}
            onClick={() => void handleSubmitReport()}
            className="sbn-btn sbn-btn-primary w-full"
          >
            {reportSending ? 'Sending…' : 'Submit report'}
          </button>
        </div>
      )}
    </FullScreenPanel>
  );
}
