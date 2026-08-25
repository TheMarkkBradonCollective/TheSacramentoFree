import FullScreenPanel from './FullScreenPanel';
import ListingImage from './ListingImage';
import type { UserProfile } from '../types';
import { useStaffUserReports } from '../hooks/useStaffUserReports';

interface StaffUserReportsPanelProps {
  onClose: () => void;
  viewer: UserProfile;
}

export default function StaffUserReportsPanel({ onClose, viewer }: StaffUserReportsPanelProps) {
  const { reports, loading, errorMessage, markReviewed } = useStaffUserReports(true, viewer);

  return (
    <FullScreenPanel wide title="User reports" subtitle="One-way submissions from neighbors" onClose={onClose}>
      {errorMessage ? (
        <p className="text-xs font-semibold text-red-400 mb-3">{errorMessage}</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted sbn-help-empty">Loading reports…</p>
      ) : reports.length === 0 ? (
        <div className="sbn-help-empty">
          <p className="text-sm text-muted">No reports yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {reports.map((report) => (
            <li key={report.id} className="sbn-help-card text-sm space-y-2">
              <div className="flex flex-wrap justify-between gap-1">
                <span className="font-semibold text-app">{report.subject}</span>
                <div className="flex flex-wrap gap-1">
                  {report.source === 'block' && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                      Block report
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      report.status === 'new'
                        ? 'bg-accent/15 text-accent'
                        : 'bg-muted/20 text-muted'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted">
                From {report.reporterName} · {new Date(report.createdAt).toLocaleString()}
              </p>
              {report.reportedUserName && (
                <p className="text-xs text-muted">
                  About: <span className="text-app font-medium">{report.reportedUserName}</span>
                </p>
              )}
              <p className="text-xs text-subtle leading-snug whitespace-pre-wrap">{report.body}</p>
              {report.proofImageUrl && (
                <a
                  href={report.proofImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-app overflow-hidden bg-inset max-w-xs"
                >
                  <ListingImage
                    src={report.proofImageUrl}
                    alt="Report proof"
                    width={480}
                    className="w-full max-h-48 object-contain"
                  />
                  <span className="text-[10px] text-accent font-semibold px-2 py-1 block">
                    View screenshot proof
                  </span>
                </a>
              )}
              {report.status === 'new' && (
                <button
                  type="button"
                  onClick={() => void markReviewed(report.id)}
                  className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                >
                  Mark reviewed
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </FullScreenPanel>
  );
}
