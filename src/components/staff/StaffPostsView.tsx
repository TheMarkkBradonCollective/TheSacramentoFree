import { useEffect, useMemo, useState } from 'react';
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
  X,
} from 'lucide-react';
import type { ItemPost, UserProfile } from '../../types';
import { staffGetAllListings, staffWithdrawListing, staffDeleteListing } from '../../supabase';
import { getPostTypeLabel } from '../../lib/postType';
import { useStaffPermission } from '../../hooks/useStaffPermission';
import NoPermissionModal from './NoPermissionModal';

type SortField = 'title' | 'type' | 'category' | 'status' | 'neighborhood' | 'poster' | 'createdAt';
type SortDir = 'asc' | 'desc';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  pending_pickup: 'bg-blue-500/15 text-blue-400',
  on_hold: 'bg-amber-500/15 text-amber-400',
  completed: 'bg-zinc-500/15 text-zinc-400',
  withdrawn: 'bg-red-500/15 text-red-400',
};

const TYPE_BADGE: Record<string, string> = {
  giveaway: 'bg-accent/15 text-accent',
  looking: 'bg-purple-500/15 text-purple-400',
  trade: 'bg-zinc-500/15 text-zinc-400',
};

interface StaffPostsViewProps {
  actor: UserProfile;
  onViewItem: (item: ItemPost) => void;
}

export default function StaffPostsView({ actor, onViewItem }: StaffPostsViewProps) {
  const [posts, setPosts] = useState<ItemPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const perm = useStaffPermission(actor);

  const load = async () => {
    setLoading(true);
    setErr('');
    const { items, errorMessage } = await staffGetAllListings();
    setPosts(items);
    if (errorMessage) setErr(errorMessage);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    let rows = posts;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.neighborhood?.toLowerCase().includes(q) ||
          p.userDisplayName.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') rows = rows.filter((p) => p.status === statusFilter);
    if (typeFilter !== 'all') rows = rows.filter((p) => p.type === typeFilter);

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'status') cmp = (a.status ?? '').localeCompare(b.status ?? '');
      else if (sortField === 'neighborhood') cmp = (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '');
      else if (sortField === 'poster') cmp = a.userDisplayName.localeCompare(b.userDisplayName);
      else if (sortField === 'createdAt') {
        const ta = typeof a.createdAt === 'object' && 'seconds' in (a.createdAt as object)
          ? ((a.createdAt as { seconds: number }).seconds)
          : new Date(a.createdAt as string ?? 0).getTime() / 1000;
        const tb = typeof b.createdAt === 'object' && 'seconds' in (b.createdAt as object)
          ? ((b.createdAt as { seconds: number }).seconds)
          : new Date(b.createdAt as string ?? 0).getTime() / 1000;
        cmp = ta - tb;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [posts, search, statusFilter, typeFilter, sortField, sortDir]);

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

  const handleWithdraw = (post: ItemPost) => {
    if (!perm.checkModeratePost()) return;
    void run(post.id, () => staffWithdrawListing(post, actor));
  };

  const handleDelete = (post: ItemPost) => {
    if (!perm.checkModeratePost()) return;
    void run(post.id, () => staffDeleteListing(post, actor));
  };

  const formatDate = (createdAt: unknown) => {
    if (!createdAt) return '—';
    const ms = typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt
      ? (createdAt as { seconds: number }).seconds * 1000
      : new Date(createdAt as string).getTime();
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <NoPermissionModal open={perm.noPermOpen} reason={perm.noPermReason} onClose={perm.closeNoPerm} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-app space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-accent font-mono">Staff Panel</p>
            <h2 className="font-display font-bold text-app text-lg">Listings Management</h2>
            <p className="text-xs text-muted mt-0.5">{posts.length} listings total</p>
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
            <option value="active">Active</option>
            <option value="pending_pickup">Pending pickup</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sbn-input text-xs w-auto">
            <option value="all">All types</option>
            <option value="giveaway">Giveaway</option>
            <option value="looking">Looking</option>
            <option value="trade">Trade</option>
          </select>
        </div>

        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
      </div>

      {/* Table */}
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
              {filtered.map((post) => {
                const isBusy = busy === post.id;
                const isExpanded = expandedRow === post.id;

                return (
                  <>
                    <tr
                      key={post.id}
                      className={`border-b border-app/50 hover:bg-inset transition-colors ${isExpanded ? 'bg-inset' : ''}`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-app truncate max-w-[180px]">{post.title}</p>
                          <p className="text-muted flex items-center gap-1 mt-0.5">
                            <Tag className="w-3 h-3 shrink-0" />
                            <span className="truncate">{post.category}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_BADGE[post.type] ?? ''}`}>
                          {getPostTypeLabel(post.type)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[post.status ?? 'active'] ?? ''}`}>
                          {(post.status ?? 'active').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-muted">{post.userDisplayName}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-muted">{post.neighborhood}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-muted">{formatDate(post.createdAt)}</td>
                      <td className="px-3 py-2.5 text-right">
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent inline" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setExpandedRow(isExpanded ? null : post.id)}
                            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                          >
                            {isExpanded ? 'Close' : 'Actions'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${post.id}-actions`} className="bg-inset border-b border-app">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex flex-wrap gap-2 items-center">
                            <button
                              type="button"
                              onClick={() => onViewItem(post)}
                              className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                            >
                              <Eye className="w-3.5 h-3.5" /> View listing
                            </button>
                            {post.status !== 'withdrawn' && (
                              <button
                                type="button"
                                onClick={() => handleWithdraw(post)}
                                className="sbn-btn sbn-btn-sm bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                              >
                                <X className="w-3.5 h-3.5" /> Withdraw
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(post)}
                              className="sbn-btn sbn-btn-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
