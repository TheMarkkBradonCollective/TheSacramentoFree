import { useState } from 'react';
import { X } from 'lucide-react';
import { AppUpdateInput } from '../types';

interface AppUpdateEditModalProps {
  editTitle: string;
  values: AppUpdateInput;
  onClose: () => void;
  onSave: (next: AppUpdateInput) => Promise<{ ok: boolean; errorMessage?: string }>;
}

export default function AppUpdateEditModal({
  editTitle,
  values,
  onClose,
  onSave,
}: AppUpdateEditModalProps) {
  const [form, setForm] = useState({
    date: values.date,
    title: values.title,
    body: values.body,
    detail: values.detail || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const result = await onSave({
      date: form.date,
      title: form.title.trim(),
      body: form.body.trim(),
      detail: form.detail.trim() || null,
    });

    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.errorMessage || 'Could not save.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-surface border border-app rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-app bg-surface/95">
          <h2 className="font-display font-bold text-app">{editTitle}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-inset text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase">Date</span>
            <input
              type="date"
              className="sbn-input w-full text-sm"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase">Title</span>
            <input
              className="sbn-input w-full text-sm"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Short headline"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase">Summary</span>
            <p className="text-[10px] text-muted">
              Short read — one or two sentences that make the point before someone taps to expand.
            </p>
            <textarea
              className="sbn-input w-full min-h-[5rem] text-sm"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="What neighbors see before they tap to read more"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase">Full story</span>
            <p className="text-[10px] text-muted">
              Long read — break it down so neighbors understand: what changed, how to use it, why you built it, and what to do if it still looks broken.
            </p>
            <textarea
              className="sbn-input w-full min-h-[16rem] text-sm leading-relaxed"
              value={form.detail}
              onChange={(e) => setForm((prev) => ({ ...prev, detail: e.target.value }))}
              placeholder="What you'll notice… How to use it… Why I changed it… (Optional: SQL, files, staff notes.)"
            />
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="sbn-btn sbn-btn-primary flex-1">
              {saving ? 'Saving…' : 'Save announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
