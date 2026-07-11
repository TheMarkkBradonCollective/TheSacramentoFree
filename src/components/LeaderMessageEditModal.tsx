import { useState } from 'react';
import { X } from 'lucide-react';

export interface LeaderMessageFormValues {
  name: string;
  title: string;
  headline: string;
  goal: string;
  promises: string[];
  closing: string;
}

interface LeaderMessageEditModalProps {
  editTitle: string;
  values: LeaderMessageFormValues;
  onClose: () => void;
  onSave: (next: LeaderMessageFormValues) => Promise<{ ok: boolean; errorMessage?: string }>;
}

export default function LeaderMessageEditModal({
  editTitle,
  values,
  onClose,
  onSave,
}: LeaderMessageEditModalProps) {
  const [form, setForm] = useState({
    name: values.name,
    title: values.title,
    headline: values.headline,
    goal: values.goal,
    promisesText: values.promises.join('\n'),
    closing: values.closing,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const result = await onSave({
      name: form.name.trim(),
      title: form.title.trim(),
      headline: form.headline.trim(),
      goal: form.goal.trim(),
      promises: form.promisesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      closing: form.closing.trim(),
    });

    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.errorMessage || 'Could not save.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
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
            <span className="text-xs font-semibold text-muted uppercase">Name</span>
            <input
              className="sbn-input w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase">Title</span>
            <input
              className="sbn-input w-full"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase">Headline</span>
            <input
              className="sbn-input w-full"
              value={form.headline}
              onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase">Goal / main message</span>
            <textarea
              className="sbn-input w-full min-h-[88px]"
              value={form.goal}
              onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase">Promises (one per line)</span>
            <textarea
              className="sbn-input w-full min-h-[100px]"
              value={form.promisesText}
              onChange={(e) => setForm((f) => ({ ...f, promisesText: e.target.value }))}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase">Closing line</span>
            <input
              className="sbn-input w-full"
              value={form.closing}
              onChange={(e) => setForm((f) => ({ ...f, closing: e.target.value }))}
              required
            />
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="sbn-btn sbn-btn-primary flex-1">
              {saving ? 'Saving…' : 'Save message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
