import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, UserMinus, UserPlus, X } from 'lucide-react';
import {
  AwardCategory,
  AwardDefinition,
  AwardDefinitionInput,
  AwardTriggerType,
  UserProfile,
} from '../types';
import { useAwards } from '../hooks/useAwards';
import { AWARDS_UNLOCK_TARGET } from '../lib/awardsApi';
import AwardCard from './AwardCard';

const CATEGORIES: AwardCategory[] = [
  'milestone',
  'giving',
  'community',
  'recognition',
  'events',
  'profile',
  'staff',
];

interface StaffAwardsAdminProps {
  userProfile: UserProfile;
}

function emptyDraft(): AwardDefinitionInput {
  return {
    slug: '',
    title: '',
    description: '',
    icon: 'award',
    category: 'staff',
    triggerType: 'manual',
    sortOrder: 1000,
    requiresUnlock: false,
  };
}

export default function StaffAwardsAdmin({ userProfile }: StaffAwardsAdminProps) {
  const {
    definitions,
    createDefinition,
    updateDefinition,
    grantAward,
    revokeAward,
    earnedSlugs,
  } = useAwards(userProfile);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AwardDefinition | null>(null);
  const [grantUid, setGrantUid] = useState('');
  const [grantSlug, setGrantSlug] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const manualAwards = useMemo(
    () => definitions.filter((d) => d.triggerType === 'manual'),
    [definitions],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return definitions;
    return definitions.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    );
  }, [definitions, search]);

  const handleSave = async (input: AwardDefinitionInput) => {
    setBusy(true);
    setErr('');
    setMsg('');
    const result = editing
      ? await updateDefinition(editing.id, input)
      : await createDefinition(input);
    setBusy(false);
    if (result.ok) {
      setMsg(editing ? 'Award updated.' : 'Award created.');
      setCreating(false);
      setEditing(null);
    } else {
      setErr(result.errorMessage || 'Could not save award.');
    }
  };

  const handleGrant = async () => {
    if (!grantUid.trim() || !grantSlug.trim()) {
      setErr('Enter a neighbor UID and award slug.');
      return;
    }
    setBusy(true);
    setErr('');
    setMsg('');
    const result = await grantAward(grantUid.trim(), grantSlug.trim());
    setBusy(false);
    if (result.ok) {
      setMsg(`Granted "${grantSlug}" to neighbor.`);
      setGrantUid('');
      setGrantSlug('');
    } else {
      setErr(result.errorMessage || 'Could not grant award.');
    }
  };

  const handleRevoke = async () => {
    if (!grantUid.trim() || !grantSlug.trim()) {
      setErr('Enter a neighbor UID and award slug.');
      return;
    }
    setBusy(true);
    setErr('');
    setMsg('');
    const result = await revokeAward(grantUid.trim(), grantSlug.trim());
    setBusy(false);
    if (result.ok) {
      setMsg(`Revoked "${grantSlug}" from neighbor.`);
    } else {
      setErr(result.errorMessage || 'Could not revoke award.');
    }
  };

  const modalDraft = editing
    ? {
        slug: editing.slug,
        title: editing.title,
        description: editing.description,
        icon: editing.icon,
        category: editing.category,
        triggerType: editing.triggerType,
        sortOrder: editing.sortOrder,
        requiresUnlock: editing.requiresUnlock,
      }
    : emptyDraft();

  return (
    <div className="space-y-6 border-t border-app pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-app uppercase tracking-wide">Staff awards admin</h3>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="sbn-btn sbn-btn-primary sbn-btn-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create award
        </button>
      </div>

      {msg && <p className="text-sm text-green-400 font-medium">{msg}</p>}
      {err && <p className="text-sm text-red-400 font-medium">{err}</p>}

      <div className="sbn-card p-4 space-y-3">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Give or take awards</h4>
        <input
          type="text"
          value={grantUid}
          onChange={(e) => setGrantUid(e.target.value)}
          placeholder="Neighbor UID"
          className="sbn-input w-full"
        />
        <select
          value={grantSlug}
          onChange={(e) => setGrantSlug(e.target.value)}
          className="sbn-input w-full"
        >
          <option value="">Select award…</option>
          {manualAwards.map((a) => (
            <option key={a.id} value={a.slug}>
              {a.title} ({a.slug})
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGrant()}
            className="sbn-btn sbn-btn-primary sbn-btn-sm inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Give award
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRevoke()}
            className="sbn-btn sbn-btn-ghost sbn-btn-sm inline-flex items-center gap-1.5"
          >
            <UserMinus className="w-4 h-4" />
            Take award
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search award definitions…"
          className="sbn-input w-full pl-9"
        />
      </div>

      <ul className="space-y-2">
        {filtered.map((award) => (
          <li key={award.id} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <AwardCard award={award} earned={earnedSlugs.has(award.slug)} compact />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditing(award);
                setCreating(false);
              }}
              className="sbn-btn sbn-btn-ghost sbn-btn-sm shrink-0 mt-3"
              title="Edit award"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      {(creating || editing) && (
        <AwardEditModal
          draft={modalDraft}
          busy={busy}
          isEdit={Boolean(editing)}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

interface AwardEditModalProps {
  draft: AwardDefinitionInput;
  busy: boolean;
  isEdit: boolean;
  onClose: () => void;
  onSave: (input: AwardDefinitionInput) => Promise<void>;
}

function AwardEditModal({ draft, busy, isEdit, onClose, onSave }: AwardEditModalProps) {
  const [slug, setSlug] = useState(draft.slug);
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [icon, setIcon] = useState(draft.icon);
  const [category, setCategory] = useState<AwardCategory>(draft.category);
  const [triggerType, setTriggerType] = useState<AwardTriggerType>(draft.triggerType);
  const [sortOrder, setSortOrder] = useState(String(draft.sortOrder));
  const [requiresUnlock, setRequiresUnlock] = useState(draft.requiresUnlock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      slug,
      title,
      description,
      icon,
      category,
      triggerType,
      sortOrder: Number(sortOrder) || 0,
      requiresUnlock,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-surface border border-app rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-app bg-surface/95">
          <h2 className="font-display font-bold text-app">{isEdit ? 'Edit award' : 'Create award'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-inset text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-4 space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted">Slug</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="sbn-input w-full"
              placeholder="community-hero"
              disabled={isEdit}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sbn-input w-full"
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="sbn-input w-full min-h-[80px]"
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted">Icon (lucide name)</span>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} className="sbn-input w-full" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AwardCategory)}
                className="sbn-input w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">Type</span>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as AwardTriggerType)}
                className="sbn-input w-full"
              >
                <option value="manual">Manual (staff)</option>
                <option value="auto">Auto</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted">Sort order</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="sbn-input w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={requiresUnlock}
              onChange={(e) => setRequiresUnlock(e.target.checked)}
            />
            Requires {AWARDS_UNLOCK_TARGET}-neighbor unlock to display
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="sbn-btn sbn-btn-primary flex-1">
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create award'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
