import { useEffect, useMemo, useState } from 'react';
import { Search, Users, X } from 'lucide-react';
import { UserProfile } from '../types';
import { getAllCommunityUsers } from '../supabase';
import RoleBadge from './RoleBadge';
import { roleLabel } from '../lib/roles';

interface TeamDirectoryPanelProps {
  currentUserId: string;
  onClose: () => void;
  onViewMember: (userId: string) => void;
}

export default function TeamDirectoryPanel({
  currentUserId,
  onClose,
  onViewMember,
}: TeamDirectoryPanelProps) {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    void getAllCommunityUsers().then((list) => {
      if (active) {
        setMembers(list);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => {
      const haystack = `${member.displayName} ${member.neighborhood} ${member.email} ${roleLabel(member.role)}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [members, search]);

  const handleSelect = (uid: string) => {
    onClose();
    onViewMember(uid);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-app text-app font-sans"
      id="team_directory_panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team_directory_title"
    >
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-app sbn-glass-nav">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full text-muted hover:bg-inset hover:text-app"
          aria-label="Close member list"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 id="team_directory_title" className="font-display font-bold text-base text-app">
            Community members
          </h2>
          <p className="text-xs text-muted truncate">
            {loading ? 'Loading…' : `${filtered.length} neighbor${filtered.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Users className="w-5 h-5 text-accent shrink-0" />
      </header>

      <div className="shrink-0 px-4 py-3 border-b border-app">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, neighborhood, or role…"
            className="sbn-input pl-10 text-sm"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="text-center text-sm text-muted py-12">Loading members…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted py-12">No members match your search.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((member) => {
              const photo =
                member.photoURL ||
                `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(member.displayName)}`;
              const isSelf = member.uid === currentUserId;
              return (
                <li key={member.uid}>
                  <button
                    type="button"
                    onClick={() => handleSelect(member.uid)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-app bg-surface hover:bg-surface-hover text-left transition-colors"
                  >
                    <img
                      src={photo}
                      referrerPolicy="no-referrer"
                      alt=""
                      className="w-11 h-11 rounded-full border border-app object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-app truncate">
                        {member.displayName}
                        {isSelf ? ' (you)' : ''}
                      </p>
                      <p className="text-xs text-muted truncate">{member.neighborhood}</p>
                    </div>
                    <RoleBadge role={member.role} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
