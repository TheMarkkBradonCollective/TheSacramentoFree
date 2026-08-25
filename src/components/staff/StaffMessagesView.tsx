import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Flag,
  Globe,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Shield,
  Users,
} from 'lucide-react';
import type { Chat, ItemComment, Message, SupportTicket, SupportTicketMessage, UserProfile, UserReport } from '../../types';
import {
  getStaffUserReports,
  getSupportTicketMessages,
  getSupportTicketsForStaff,
  getSupabaseMessages,
  markUserReportReviewed,
  staffGetAllDirectChats,
  staffGetRecentComments,
  getUserDisplayInfoByIds,
} from '../../supabase';
import { isStaffRole } from '../../lib/roles';
import RoleBadge from '../RoleBadge';
import ListingImage from '../ListingImage';

type MessagesSection = 'community' | 'reports' | 'tickets' | 'comments' | 'dms';

interface StaffMessagesViewProps {
  actor: UserProfile;
  onViewProfile: (userId: string) => void;
  onOpenChat?: (chatId: string) => void;
  onOpenTicket?: (ticketId: string) => void;
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

function ExpandPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 rounded-xl border border-app bg-inset/60 p-3 space-y-2 max-h-72 overflow-y-auto">
      {children}
    </div>
  );
}

function ExpandButton({
  expanded,
  onClick,
  label = 'Read',
}: {
  expanded: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button type="button" onClick={onClick} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      {expanded ? 'Hide' : label}
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
  onOpenTicket,
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Message[]>([]);
  const [expandedTicketMessages, setExpandedTicketMessages] = useState<SupportTicketMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
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

  useEffect(() => {
    setExpandedId(null);
    setExpandedMessages([]);
    setExpandedTicketMessages([]);
    void loadSection(section);
  }, [section]);

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

  const collapseExpanded = () => {
    setExpandedId(null);
    setExpandedMessages([]);
    setExpandedTicketMessages([]);
  };

  const toggleExpanded = async (id: string, loader?: () => Promise<void>) => {
    if (expandedId === id) {
      collapseExpanded();
      return;
    }

    setExpandedId(id);
    setExpandedMessages([]);
    setExpandedTicketMessages([]);

    if (!loader) return;

    setDetailLoading(true);
    try {
      await loader();
    } catch {
      setErr('Could not load details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleReport = (reportId: string) => {
    void toggleExpanded(`report:${reportId}`);
  };

  const toggleTicket = (ticket: SupportTicket) => {
    void toggleExpanded(`ticket:${ticket.id}`, async () => {
      const messages = await getSupportTicketMessages(ticket.id);
      setExpandedTicketMessages(messages);
    });
  };

  const toggleComment = (commentId: string) => {
    void toggleExpanded(`comment:${commentId}`);
  };

  const toggleChatMessages = (chat: Chat) => {
    void toggleExpanded(`chat:${chat.id}`, async () => {
      const messages = await getSupabaseMessages(chat.id);
      setExpandedMessages(messages);
    });
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

  const isExpanded = (id: string) => expandedId === id;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 pt-4 pb-0 border-b border-app shrink-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-role-accent font-mono pb-0.5">Staff Panel</p>
        <h2 className="font-display font-bold text-app text-lg">Message Management</h2>
        <p className="text-xs text-muted mt-0.5 pb-3">
          Oversight of reports, support tickets, listing comments, community channels, and neighbor DMs.
        </p>

        <div className="flex overflow-x-auto -mx-0 gap-0 border-t border-app">
          <SectionTab id="reports" active={section === 'reports'} icon={Flag} label="Reports" badge={newReportCount} onClick={() => setSection('reports')} />
          <SectionTab id="tickets" active={section === 'tickets'} icon={LifeBuoy} label="Support" badge={openTicketCount} onClick={() => setSection('tickets')} />
          <SectionTab id="comments" active={section === 'comments'} icon={MessageSquare} label="Comments" onClick={() => setSection('comments')} />
          <SectionTab id="dms" active={section === 'dms'} icon={Users} label="DMs" badge={directChats.length || undefined} onClick={() => setSection('dms')} />
          <SectionTab id="community" active={section === 'community'} icon={Globe} label="Community Chats" onClick={() => setSection('community')} />
        </div>
      </div>

      {err && <p className="px-4 py-2 text-xs font-semibold text-red-400 shrink-0">{err}</p>}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">

          {section === 'reports' && (
            <div className="divide-y divide-app">
              {reports.length === 0 && (
                <div className="p-8 text-center text-sm text-muted">
                  <Flag className="w-8 h-8 mx-auto mb-2 text-subtle" />
                  No user reports.
                </div>
              )}
              {reports.map((report) => {
                const expanded = isExpanded(`report:${report.id}`);
                return (
                  <div key={report.id} className={`p-4 space-y-2 ${report.status === 'new' ? 'bg-accent/5' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleReport(report.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${report.status === 'new' ? 'bg-accent/15 text-accent' : 'bg-zinc-500/15 text-zinc-400'}`}>
                            {report.status === 'new' ? 'New' : 'Reviewed'}
                          </span>
                          <span className="text-xs font-semibold text-app">{report.subject || 'User report'}</span>
                        </div>
                        <p className="text-[10px] text-muted mt-1">
                          From {report.reporterName}
                          {report.reportedUserName ? ` about ${report.reportedUserName}` : ''}
                          {' · '}{formatDate(report.createdAt)}
                        </p>
                        {report.body && !expanded && (
                          <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">{report.body}</p>
                        )}
                      </button>
                      <div className="flex flex-col gap-1 shrink-0">
                        <ExpandButton expanded={expanded} onClick={() => toggleReport(report.id)} />
                        {report.status === 'new' && (
                          <button
                            type="button"
                            disabled={busyId === report.id}
                            onClick={() => void handleMarkReviewed(report.id)}
                            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                          >
                            {busyId === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Reviewed
                          </button>
                        )}
                      </div>
                    </div>

                    {expanded && (
                      <ExpandPanel>
                        <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{report.body || 'No details provided.'}</p>
                        <div className="text-[10px] text-subtle space-y-1 pt-1">
                          <p>
                            Reporter:{' '}
                            <button type="button" onClick={() => onViewProfile(report.reporterUserId)} className="font-semibold text-accent hover:underline">
                              {report.reporterName}
                            </button>
                          </p>
                          {report.reportedUserId && report.reportedUserName && (
                            <p>
                              Reported neighbor:{' '}
                              <button type="button" onClick={() => onViewProfile(report.reportedUserId!)} className="font-semibold text-accent hover:underline">
                                {report.reportedUserName}
                              </button>
                            </p>
                          )}
                          {report.source && <p>Source: {report.source}</p>}
                          <p>Submitted: {formatDate(report.createdAt)}</p>
                        </div>
                        {report.proofImageUrl && (
                          <ListingImage
                            src={report.proofImageUrl}
                            alt="Report proof"
                            width={320}
                            className="max-w-xs rounded-lg border border-app"
                          />
                        )}
                      </ExpandPanel>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {section === 'tickets' && (
            <div className="divide-y divide-app">
              {tickets.length === 0 && (
                <div className="p-8 text-center text-sm text-muted">
                  <LifeBuoy className="w-8 h-8 mx-auto mb-2 text-subtle" />
                  No support tickets.
                </div>
              )}
              {tickets.map((ticket) => {
                const expanded = isExpanded(`ticket:${ticket.id}`);
                return (
                  <div key={ticket.id} className={`p-4 space-y-2 ${ticket.status === 'open' ? 'bg-accent/5' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTicket(ticket)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.status === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-500/15 text-zinc-400'}`}>
                            {ticket.status}
                          </span>
                          <span className="text-xs font-semibold text-app truncate">{ticket.subject}</span>
                        </div>
                        <p className="text-[10px] text-muted mt-0.5">
                          From {ticket.openerName} · {formatDate(ticket.updatedAt)}
                        </p>
                      </button>
                      <div className="flex flex-col gap-1 shrink-0">
                        <ExpandButton expanded={expanded} onClick={() => toggleTicket(ticket)} />
                        {onOpenTicket && (
                          <button
                            type="button"
                            onClick={() => onOpenTicket(ticket.id)}
                            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open
                          </button>
                        )}
                      </div>
                    </div>

                    {expanded && (
                      <ExpandPanel>
                        {detailLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                          </div>
                        ) : expandedTicketMessages.length === 0 ? (
                          <p className="text-xs text-muted text-center py-2">No messages in this ticket.</p>
                        ) : (
                          expandedTicketMessages.map((msg) => (
                            <div key={msg.id} className="text-xs">
                              <p className="font-semibold text-app">
                                {msg.senderName}
                                <span className="text-subtle font-normal"> · {formatDate(msg.createdAt)}</span>
                              </p>
                              <p className="text-muted mt-0.5 whitespace-pre-wrap break-words">{msg.text}</p>
                              {msg.imageUrl && (
                                <ListingImage
                                  src={msg.imageUrl}
                                  alt="Attachment"
                                  width={240}
                                  className="mt-2 max-w-xs rounded-lg border border-app"
                                />
                              )}
                            </div>
                          ))
                        )}
                      </ExpandPanel>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
                const expanded = isExpanded(`comment:${comment.id}`);
                const openingListing = listingBusyId === comment.itemId;

                return (
                  <div key={comment.id} className={`p-4 space-y-2 ${commenterIsStaff ? 'bg-accent/5' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleComment(comment.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-app">{comment.userName}</span>
                          {commenterIsStaff && commenterRole && (
                            <span className="scale-[0.8] origin-left inline-block">
                              <RoleBadge role={commenterRole} />
                            </span>
                          )}
                          {!commenterIsStaff && (
                            <span className="text-[10px] text-accent">{comment.userNeighborhood}</span>
                          )}
                        </div>
                        <p className={`text-sm text-muted leading-relaxed mt-1 ${expanded ? '' : 'line-clamp-2'}`}>
                          {comment.text}
                        </p>
                        <p className="text-[10px] text-subtle mt-1">{formatDate(comment.createdAt)}</p>
                      </button>
                      <div className="flex flex-col gap-1 shrink-0">
                        <ExpandButton expanded={expanded} onClick={() => toggleComment(comment.id)} />
                        {onViewListing && (
                          <button
                            type="button"
                            disabled={openingListing}
                            onClick={() => void handleViewCommentListing(comment.itemId)}
                            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                          >
                            {openingListing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                            Listing
                          </button>
                        )}
                      </div>
                    </div>

                    {expanded && (
                      <ExpandPanel>
                        <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                        <div className="text-[10px] text-subtle space-y-1">
                          <p>
                            Author:{' '}
                            <button type="button" onClick={() => onViewProfile(comment.userId)} className="font-semibold text-accent hover:underline">
                              {comment.userName}
                            </button>
                          </p>
                          <p>Posted: {formatDate(comment.createdAt)}</p>
                        </div>
                        {onViewListing && (
                          <button
                            type="button"
                            disabled={openingListing}
                            onClick={() => void handleViewCommentListing(comment.itemId)}
                            className="sbn-btn sbn-btn-secondary sbn-btn-sm w-fit"
                          >
                            {openingListing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                            View on listing
                          </button>
                        )}
                      </ExpandPanel>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {section === 'dms' && (
            <div className="divide-y divide-app">
              {directChats.length === 0 && (
                <div className="p-8 text-center text-sm text-muted">
                  <Users className="w-8 h-8 mx-auto mb-2 text-subtle" />
                  No direct or listing chats yet.
                </div>
              )}
              {directChats.map((chat) => {
                const expanded = isExpanded(`chat:${chat.id}`);
                const linkedListing = chat.itemTitle?.trim();
                return (
                  <div key={chat.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleChatMessages(chat)}
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
                        <ExpandButton expanded={expanded} onClick={() => toggleChatMessages(chat)} />
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

                    {expanded && (
                      <ExpandPanel>
                        {detailLoading ? (
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
                      </ExpandPanel>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
              <div className="mt-4 p-3 bg-accent/5 border border-accent/20 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-accent leading-relaxed">
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
