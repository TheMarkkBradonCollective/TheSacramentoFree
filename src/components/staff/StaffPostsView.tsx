import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  CircleOff,
  Eye,
  Loader2,
  Search,
  Tag,
  Trash2,
  CheckCircle,
  X,
} from 'lucide-react';
import type { CommunityEvent, ItemPost, UserProfile } from '../../types';
import {
  getAppClaimsForItem,
  staffCancelEvent,
  staffCompleteListingWithoutClaimer,
  staffDeleteEvent,
  staffDeleteListing,
  staffGetAllEvents,
  staffGetAllListings,
  staffWithdrawListing,
} from '../../supabase';
import { getPostTypeLabel } from '../../lib/postType';
import { resolveEventStatus } from '../../lib/eventRsvp';
import { useConfirm } from '../../contexts/ConfirmContext';
import {
  confirmStaffCancelEvent,
  confirmStaffDeleteEvent,
  confirmStaffDeleteListing,
  confirmStaffWithdrawListing,
} from '../../lib/destructiveConfirm';
import { useStaffPermission } from '../../hooks/useStaffPermission';
import NoPermissionModal from './NoPermissionModal';

type ContentKind = 'item' | 'event';
type ContentType = 'giveaway' | 'looking' | 'trade' | 'event';
type SortField = 'title' | 'type' | 'category' | 'status' | 'neighborhood' | 'poster' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface StaffContentRow {
  id: string;
  kind: ContentKind;
  type: ContentType;
  title: string;
  category: string;
  status: string;
  neighborhood: string;
  userDisplayName: string;
  createdAt: unknown;
  item?: ItemPost;
  event?: CommunityEvent;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  pending_pickup: 'bg-blue-500/15 text-blue-400',
  on_hold: 'bg-accent/15 text-accent',
  completed: 'bg-zinc-500/15 text-zinc-400',
  withdrawn: 'bg-red-500/15 text-red-400',
  upcoming: 'bg-sky-500/15 text-sky-400',
  past: 'bg-zinc-500/15 text-zinc-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

const TYPE_BADGE: Record<string, string> = {
  giveaway: 'bg-accent/15 text-accent',
  looking: 'bg-purple-500/15 text-purple-400',
  trade: 'bg-zinc-500/15 text-zinc-400',
  event: 'bg-sky-500/15 text-sky-400',
};

const ITEM_STATUSES = ['active', 'pending_pickup', 'on_hold', 'completed', 'withdrawn'] as const;
const EVENT_STATUSES = ['upcoming', 'past', 'cancelled'] as const;

function toTimestamp(createdAt: unknown): number {
  if (!createdAt) return 0;
  if (typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt) {
    return (createdAt as { seconds: number }).seconds;
  }
  return new Date(createdAt as string).getTime() / 1000;
}

function itemToRow(item: ItemPost): StaffContentRow {
  return {
    id: item.id,
    kind: 'item',
    type: item.type,
    title: item.title,
    category: item.category,
    status: item.status ?? 'active',
    neighborhood: item.neighborhood ?? '',
    userDisplayName: item.userDisplayName,
    createdAt: item.createdAt,
    item,
  };
}

function eventToRow(event: CommunityEvent): StaffContentRow {
  return {
    id: event.id,
    kind: 'event',
    type: 'event',
    title: event.title,
    category: event.location || 'Community event',
    status: resolveEventStatus(event),
    neighborhood: event.neighborhood ?? '',
    userDisplayName: event.userDisplayName,
    createdAt: event.createdAt,
    event,
  };
}

function getTypeLabel(type: ContentType): string {
  if (type === 'event') return 'Event';
  return getPostTypeLabel(type);
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

interface StaffPostsViewProps {
  actor: UserProfile;
  onViewItem: (item: ItemPost) => void;
  onViewEvent: (event: CommunityEvent) => void;
}

export default function StaffPostsView({ actor, onViewItem, onViewEvent }: StaffPostsViewProps) {
  const [rows, setRows] = useState<StaffContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [claimRecords, setClaimRecords] = useState<
    Record<string, { claimerUserId: string; giverUserId: string; kind: string }[]>
  >({});

  const perm = useStaffPermission(actor);
  const { confirm } = useConfirm();

  const loadClaimsForItem = async (itemId: string) => {
    const claims = await getAppClaimsForItem(itemId);
    setClaimRecords((prev) => ({ ...prev, [itemId]: claims }));
  };

  const load = async () => {
    setLoading(true);
    setErr('');
    const [listingsResult, eventsResult] = await Promise.all([
      staffGetAllListings(),
      staffGetAllEvents(),
    ]);

    const merged = [
      ...listingsResult.items.map(itemToRow),
      ...eventsResult.events.map(eventToRow),
    ].sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));

    setRows(merged);

    const errors = [listingsResult.errorMessage, eventsResult.errorMessage].filter(Boolean);
    if (errors.length > 0) setErr(errors.join(' '));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const itemCount = useMemo(() => rows.filter((row) => row.kind === 'item').length, [rows]);
  const eventCount = useMemo(() => rows.filter((row) => row.kind === 'event').length, [rows]);

  const filtered = useMemo(() => {
    let next = rows;

    if (search.trim()) {
      const q = search.toLowerCase();
      next = next.filter(
        (row) =>
          row.title.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q) ||
          row.neighborhood.toLowerCase().includes(q) ||
          row.userDisplayName.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== 'all') {
      next = next.filter((row) => row.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      next = next.filter((row) => row.type === typeFilter);
    }

    next = [...next].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'neighborhood') cmp = a.neighborhood.localeCompare(b.neighborhood);
      else if (sortField === 'poster') cmp = a.userDisplayName.localeCompare(b.userDisplayName);
      else if (sortField === 'createdAt') cmp = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return next;
  }, [rows, search, statusFilter, typeFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-subtle" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-accent" />
      : <ChevronDown className="w-3.5 h-3.5 text-accent" />;
  };

  const run = async (
    id: string,
    fn: () => Promise<{ ok: boolean; errorMessage?: string }>,
  ) => {
    setBusy(id); setErr('');
    const result = await fn();
    setBusy(null);
    if (!result.ok) setErr(result.errorMessage ?? 'Something went wrong.');
    else { void load(); setExpandedRow(null); }
  };

  const handleWithdraw = async (row: StaffContentRow) => {
    if (!row.item || !perm.checkModeratePost()) return;
    const ok = await confirmStaffWithdrawListing(confirm, row.title);
    if (!ok) return;
    void run(row.id, () => staffWithdrawListing(row.item!, actor));
  };

  const handleDeleteItem = async (row: StaffContentRow) => {
    if (!row.item || !perm.checkModeratePost()) return;
    const ok = await confirmStaffDeleteListing(confirm, row.title);
    if (!ok) return;
    void run(row.id, () => staffDeleteListing(row.item!, actor));
  };

  const handleCancelEvent = async (row: StaffContentRow) => {
    if (!row.event || !perm.checkModeratePost()) return;
    const ok = await confirmStaffCancelEvent(confirm, row.title);
    if (!ok) return;
    void run(row.id, () => staffCancelEvent(row.event!, actor));
  };

  const handleDeleteEvent = async (row: StaffContentRow) => {
    if (!row.event || !perm.checkModeratePost()) return;
    const ok = await confirmStaffDeleteEvent(confirm, row.title);
    if (!ok) return;
    void run(row.id, () => staffDeleteEvent(row.event!, actor));
  };

  const handleStaffCompleteListing = async (row: StaffContentRow) => {
    if (!row.item || !perm.checkModeratePost()) return;
    const ok = await confirm({
      title: 'Mark completed?',
      message: `Mark "${row.title}" completed without naming a neighbor? Use when pickup happened off-app or the wrong claimer was recorded.`,
      confirmLabel: 'Mark completed',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;
    void run(row.id, () => staffCompleteListingWithoutClaimer(row.item!, actor));
  };

  const toggleExpandedRow = (row: StaffContentRow) => {
    const next = expandedRow === row.id ? null : row.id;
    setExpandedRow(next);
    if (next && row.kind === 'item' && row.item) {
      void loadClaimsForItem(row.item.id);
    }
  };

  const formatDate = (createdAt: unknown) => {
    const ts = toTimestamp(createdAt);
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <NoPermissionModal open={perm.noPermOpen} reason={perm.noPermReason} onClose={perm.closeNoPerm} />

      <div className="px-4 pt-4 pb-3 border-b border-app space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-role-accent font-mono">Staff Panel</p>
            <h2 className="font-display font-bold text-app text-lg">Listings Management</h2>
            <p className="text-xs text-muted mt-0.5">
              {rows.length} total ({itemCount} listings, {eventCount} events)
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, poster, category…"
              className="sbn-input text-xs pl-8"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-app">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sbn-input text-xs w-auto">
            <option value="all">All statuses</option>
            <optgroup label="Listings">
              {ITEM_STATUSES.map((status) => (
                <option key={status} value={status}>{formatStatusLabel(status)}</option>
              ))}
            </optgroup>
            <optgroup label="Events">
              {EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>{formatStatusLabel(status)}</option>
              ))}
            </optgroup>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sbn-input text-xs w-auto">
            <option value="all">All types</option>
            <option value="giveaway">Giveaway</option>
            <option value="looking">Looking</option>
            <option value="trade">Trade</option>
            <option value="event">Event</option>
          </select>
        </div>

        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-xs border-collapse min-w-[600px]">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-app">
                <th className="text-left px-3 py-2.5 font-semibold text-muted w-[200px]">
                  <button type="button" onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-app">
                    Title <SortIcon field="title" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted">
                  <button type="button" onClick={() => toggleSort('type')} className="flex items-center gap-1 hover:text-app">
                    Type <SortIcon field="type" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted hidden sm:table-cell">
                  <button type="button" onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-app">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted hidden md:table-cell">
                  <button type="button" onClick={() => toggleSort('poster')} className="flex items-center gap-1 hover:text-app">
                    Poster <SortIcon field="poster" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted hidden lg:table-cell">
                  <button type="button" onClick={() => toggleSort('neighborhood')} className="flex items-center gap-1 hover:text-app">
                    Area <SortIcon field="neighborhood" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted hidden lg:table-cell">
                  <button type="button" onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-app">
                    Posted <SortIcon field="createdAt" />
                  </button>
                </th>
                <th className="text-right px-3 py-2.5 font-semibold text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isBusy = busy === row.id;
                const isExpanded = expandedRow === row.id;

                return (
                  <Fragment key={row.id}>
                    <tr className={`border-b border-app/50 hover:bg-inset transition-colors ${isExpanded ? 'bg-inset' : ''}`}>
                      <td className="px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-app truncate max-w-[180px]">{row.title}</p>
                          <p className="text-muted flex items-center gap-1 mt-0.5">
                            <Tag className="w-3 h-3 shrink-0" />
                            <span className="truncate">{row.category}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_BADGE[row.type] ?? ''}`}>
                          {getTypeLabel(row.type)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[row.status] ?? ''}`}>
                          {formatStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-muted">{row.userDisplayName}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-muted">{row.neighborhood || '—'}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-muted">{formatDate(row.createdAt)}</td>
                      <td className="px-3 py-2.5 text-right">
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent inline" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleExpandedRow(row)}
                            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                          >
                            {isExpanded ? 'Close' : 'Actions'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-inset border-b border-app">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex flex-wrap gap-2 items-center">
                            {row.kind === 'item' && row.item && (
                              <>
                                {claimRecords[row.item.id]?.length ? (
                                  <p className="text-xs text-muted w-full mb-1">
                                    In-app claims:{' '}
                                    {claimRecords[row.item.id]
                                      .map((c) => `${c.claimerUserId.slice(0, 8)}… (${c.kind})`)
                                      .join(', ')}
                                  </p>
                                ) : row.status === 'active' || row.status === 'pending_pickup' ? (
                                  <p className="text-xs text-muted w-full mb-1">No in-app claim record yet.</p>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => onViewItem(row.item!)}
                                  className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View listing
                                </button>
                                {(row.status === 'active' || row.status === 'pending_pickup') && (
                                  <button
                                    type="button"
                                    onClick={() => handleStaffCompleteListing(row)}
                                    className="sbn-btn sbn-btn-sm bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Mark completed (no neighbor)
                                  </button>
                                )}
                                {row.status !== 'withdrawn' && (
                                  <button
                                    type="button"
                                    onClick={() => handleWithdraw(row)}
                                    className="sbn-btn sbn-btn-sm bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20"
                                  >
                                    <X className="w-3.5 h-3.5" /> Withdraw
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(row)}
                                  className="sbn-btn sbn-btn-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </>
                            )}
                            {row.kind === 'event' && row.event && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onViewEvent(row.event!)}
                                  className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View event
                                </button>
                                {row.status === 'upcoming' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelEvent(row)}
                                    className="sbn-btn sbn-btn-sm bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20"
                                  >
                                    <X className="w-3.5 h-3.5" /> Cancel
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEvent(row)}
                                  className="sbn-btn sbn-btn-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted text-sm">
                    <CircleOff className="w-8 h-8 mx-auto mb-2 text-subtle" />
                    No listings match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
