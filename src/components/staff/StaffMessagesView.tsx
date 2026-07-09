import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flag,
  Globe,
  Inbox,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Shield,
  Users,
} from 'lucide-react';
import type { Chat, ItemComment, Message, SupportTicket, UserProfile, UserReport } from '../../types';
import {
  getStaffUserReports,
  getSupportTicketsForStaff,
  getSupabaseMessages,
  markUserReportReviewed,
  staffGetAllDirectChats,
  staffGetRecentComments,
  getUserDisplayInfoByIds,
} from '../../supabase';
import { isStaffRole } from '../../lib/roles';
import RoleBadge from '../RoleBadge';

type MessagesSection = 'community' | 'reports' | 'tickets' | 'comments' | 'dms';

interface StaffMessagesViewProps {
  actor: UserProfile;
  onViewProfile: (userId: string) => void;
  onOpenChat?: (chatId: string) => void;
  onViewListing?: (itemId: string) => void | Promise<void>;
}

function SectionTab({
  id,
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  id: string;
  active: boolean;
  icon: typeof Globe;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      id={`staff_msg_tab_${id}`}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-muted hover:text-app'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
      {badge != null && badge > 0 && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-accent text-on-accent' : 'bg-red-500/15 text-red-400'}`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function chatParticipantLabel(chat: Chat): string {
  const names = Object.values(chat.participantNames ?? {}).filter(Boolean);
  if (names.length >= 2) return names.join(' ↔ ');
  if (names.length === 1) return names[0];
  return chat.participantIds.join(' ↔ ');
}

export default function StaffMessagesView({
  actor,
  onViewProfile,
  onOpenChat,
  onViewListing,
}: StaffMessagesViewProps) {
  const [section, setSection] = useState<MessagesSection>('reports');
  const [reports, setReports] = useState<UserReport[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [recentComments, setRecentComments] = useState<ItemComment[]>([]);
  const [directChats, setDirectChats] = useState<Chat[]>([]);
  const [commenterRoles, setCommenterRoles] = useState<Record<string, UserProfile['role']>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [listingBusyId, setListingBusyId] = useState<string | null>(null);

  const loadSection = async (s: MessagesSection) => {
    setLoading(true);
    setErr('');
    try {
      if (s === 'reports') {
        const rows = await getStaffUserReports(200);
        setReports(rows as UserReport[]);
      } else if (s === 'tickets') {
        const rows = await getSupportTicketsForStaff(actor);
        setTickets(rows);
      } else if (s === 'comments') {
        const rows = await staffGetRecentComments(200);
        setRecentComments(rows);
        const uids = [...new Set(rows.map((c) => c.userId))];
        const info = await getUserDisplayInfoByIds(uids);
        const roles: Record<string, UserProfile['role']> = {};
        for (const [uid, d] of Object.entries(info)) {
          if (d.role) roles[uid] = d.role;
        }
        setCommenterRoles(roles);
      } else if (s === 'dms') {
        const rows = await staffGetAllDirectChats(500);
        setDirectChats(rows);
      }
    } catch {
      setErr('Could not load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSection(section); }, [section]);

  const newReportCount = reports.filter((r) => r.status === 'new').length;
  const openTicketCount = tickets.filter((t) => t.status === 'open').length;

  const handleMarkReviewed = async (reportId: string) => {
    setBusyId(reportId);
    await markUserReportReviewed(reportId, actor);
    setBusyId(null);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: 'reviewed' } : r)),
    );
  };

  const handleViewCommentListing = async (itemId: string) => {
    if (!onViewListing) return;
    setListingBusyId(itemId);
    setErr('');
    try {
      await onViewListing(itemId);
    } catch {
      setErr('Could not open that listing.');
    } finally {
      setListingBusyId(null);
    }
  };

  const toggleChatMessages = async (chat: Chat) => {
    if (expandedChatId === chat.id) {
      setExpandedChatId(null);
      setExpandedMessages([]);
      return;
    }

    setExpandedChatId(chat.id);
    setMessagesLoading(true);
    const messages = await getSupabaseMessages(chat.id);
    setExpandedMessages(messages);
    setMessagesLoading(false);
  };

  const formatDate = (iso: unknown) => {
    if (!iso) return '';
    try {
      return new Date(iso as string).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-0 border-b border-app shrink-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-accent font-mono pb-0.5">Staff Panel</p>
        <h2 className="font-display font-bold text-app text-lg">Message Management</h2>
        <p className="text-xs text-muted mt-0.5 pb-3">
          Oversight of reports, support tickets, listing comments, community channels, and neighbor DMs.
        </p>

        {/* Section tabs */}
        <div className="flex overflow-x-auto -mx-0 gap-0 border-t border-app">
          <SectionTab id="reports" active={section === 'reports'} icon={Flag} label="Reports" badge={newReportCount} onClick={() => setSection('reports')} />
          <SectionTab id="tickets" active={section === 'tickets'} icon={LifeBuoy} label="Support" badge={openTicketCount} onClick={() => setSection('tickets')} />
          <SectionTab id="comments" active={section === 'comments'} icon={MessageSquare} label="Comments" onClick={() => setSection('comments')} />
          <SectionTab id="dms" active={section === 'dms'} icon={Users} label="DMs" badge={directChats.length || undefined} onClick={() => setSection('dms')} />
          <SectionTab id="community" active={section === 'community'} icon={Globe} label="Community Chats" onClick={() => setSection('community')} />
        </div>
      </div>

      {err && <p className="px-4 py-2 text-xs font-semibold text-red-400 shrink-0">{err}</p>}

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── User Reports ───────────────────────────────────── */}
          {section === 'reports' && (
            <div className="divide-y divide-app">
              {reports.length === 0 && (
                <div className="p-8 text-center text-sm text-muted">
                  <Flag className="w-8 h-8 mx-auto mb-2 text-subtle" />
                  No user reports.
                </div>
              )}
              {reports.map((report) => (
                <div key={report.id} className={`p-4 space-y-2 ${report.status === 'new' ? 'bg-accent/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${report.status === 'new' ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-500/15 text-zinc-400'}`}>
                          {report.status === 'new' ? 'New' : 'Reviewed'}
                        </span>
                        <span className="text-xs font-semibold text-app">{report.subject || 'User report'}</span>
                      </div>
                      <p className="text-[10px] text-muted mt-1">
                        From <button type="button" onClick={() => onViewProfile(report.reporterUserId)} className="font-semibold text-accent hover:underline">{report.reporterName}</button>
                        {' '}about <button type="button" onClick={() => onViewProfile(report.reportedUserId)} className="font-semibold text-accent hover:underline">{report.reportedUserName}</button>
                        {' · '}{formatDate(report.createdAt)}
                      </p>
                      {report.body && <p className="text-xs text-muted mt-1 line-clamp-3 leading-relaxed">{report.body}</p>}
                    </div>
                    {report.status === 'new' && (
                      <button
                        type="button"
                        disabled={busyId === report.id}
                        onClick={() => void handleMarkReviewed(report.id)}
                        className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0"
                      >
                        {busyId === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Mark reviewed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Support Tickets ─────────────────────────────────── */}
          {section === 'tickets' && (
            <div className="divide-y divide-app">
              {tickets.length === 0 && (
                <div className="p-8 text-center text-sm text-muted">
                  <LifeBuoy className="w-8 h-8 mx-auto mb-2 text-subtle" />
                  No support tickets.
                </div>
              )}
              {tickets.map((ticket) => (
                <div key={ticket.id} className={`p-4 space-y-1 ${ticket.status === 'open' ? 'bg-accent/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.status === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-500/15 text-zinc-400'}`}>
                          {ticket.status}
                        </span>
                        <span className="text-xs font-semibold text-app truncate">{ticket.subject}</span>
                      </div>
                      <p className="text-[10px] text-muted mt-0.5">
                        From <button type="button" onClick={() => onViewProfile(ticket.openerUserId)} className="font-semibold text-accent hover:underline">{ticket.openerName}</button>
                        {' · '}{formatDate(ticket.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Recent Comments ─────────────────────────────────── */}
          {section === 'comments' && (
            <div className="divide-y divide-app">
              {recentComments.length === 0 && (
                <div className="p-8 text-center text-sm text-muted">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-subtle" />
                  No comments found.
                </div>
              )}
              {recentComments.map((comment) => {
                const commenterRole = commenterRoles[comment.userId];
                const commenterIsStaff = isStaffRole(commenterRole);
                const openingListing = listingBusyId === comment.itemId;
                return (
                  <button
                    key={comment.id}
                    type="button"
                    onClick={() => void handleViewCommentListing(comment.itemId)}
                    disabled={openingListing || !onViewListing}
                    className={`w-full text-left p-4 space-y-1 transition-colors hover:bg-inset/80 ${commenterIsStaff ? 'bg-accent/5' : ''}`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        role="presentation"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProfile(comment.userId);
                        }}
                        className="text-xs font-bold text-app hover:text-accent"
                      >
                        {comment.userName}
                      </span>
                      {commenterIsStaff && commenterRole && (
                        <span className="scale-[0.8] origin-left inline-block">
                          <RoleBadge role={commenterRole} />
                        </span>
                      )}
                      {!commenterIsStaff && (
                        <span className="text-[10px] text-accent">{comment.userNeighborhood}</span>
                      )}
                      {openingListing && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />}
                    </div>
                    <p className="text-sm text-muted leading-relaxed">{comment.text}</p>
                    <p className="text-[10px] text-subtle">
                      {formatDate(comment.createdAt)}
                      {onViewListing ? ' · Tap to open listing and view in context' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Direct messages & listing chats ─────────────────── */}
          {section === 'dms' && (
            <div className="divide-y divide-app">
              {directChats.length === 0 && (
                <div className="p-8 text-center text-sm text-muted">
                  <Users className="w-8 h-8 mx-auto mb-2 text-subtle" />
                  No direct or listing chats yet.
                </div>
              )}
              {directChats.map((chat) => {
                const isExpanded = expandedChatId === chat.id;
                const linkedListing = chat.itemTitle?.trim();
                return (
                  <div key={chat.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleChatMessages(chat)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-semibold text-app">{chatParticipantLabel(chat)}</p>
                        {linkedListing && (
                          <p className="text-[10px] text-accent mt-0.5 truncate">Re: {linkedListing}</p>
                        )}
                        {chat.lastMessageText && (
                          <p className="text-xs text-muted mt-1 line-clamp-2">{chat.lastMessageText}</p>
                        )}
                        <p className="text-[10px] text-subtle mt-1">{formatDate(chat.lastMessageAt)}</p>
                      </button>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void toggleChatMessages(chat)}
                          className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? 'Hide' : 'Read'}
                        </button>
                        {onOpenChat && (
                          <button
                            type="button"
                            onClick={() => onOpenChat(chat.id)}
                            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open
                          </button>
                        )}
                        {chat.itemId && onViewListing && (
                          <button
                            type="button"
                            onClick={() => void handleViewCommentListing(chat.itemId!)}
                            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                          >
                            Listing
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 rounded-xl border border-app bg-inset/60 p-3 space-y-2 max-h-64 overflow-y-auto">
                        {messagesLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                          </div>
                        ) : expandedMessages.length === 0 ? (
                          <p className="text-xs text-muted text-center py-2">No messages in this thread.</p>
                        ) : (
                          expandedMessages.map((msg) => (
                            <div key={msg.id} className="text-xs">
                              <p className="font-semibold text-app">
                                {chat.participantNames?.[msg.senderId] ?? 'Neighbor'}
                                <span className="text-subtle font-normal"> · {formatDate(msg.createdAt)}</span>
                              </p>
                              <p className="text-muted mt-0.5 whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Community Chat Monitor ──────────────────────────── */}
          {section === 'community' && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted leading-relaxed">
                Access the live community channels directly. Staff can read, respond, and remove messages in the global community chat.
                The staff lounge is staff-only.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onOpenChat?.('community-global')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-app bg-inset hover:bg-surface-hover transition-colors text-left"
                >
                  <span className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-emerald-500" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-app">All Neighbors — Community Chat</p>
                    <p className="text-xs text-muted mt-0.5">Public channel for all neighbors. Staff can moderate messages here.</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChat?.('community-staff')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-app bg-inset hover:bg-surface-hover transition-colors text-left"
                >
                  <span className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-violet-500" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-app">Staff Lounge</p>
                    <p className="text-xs text-muted mt-0.5">Staff-only coordination channel. Not visible to regular neighbors.</p>
                  </div>
                </button>
              </div>
              <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400 leading-relaxed">
                    <strong>Staff oversight:</strong> Use the DMs tab to review neighbor direct messages and listing-linked chats.
                    Open any thread in Chats to respond or moderate when needed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
