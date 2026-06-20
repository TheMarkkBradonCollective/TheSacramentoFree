import { useCallback, useEffect, useState } from 'react';
import type { UserProfile, UserReport } from '../types';
import { getStaffUserReports, markUserReportReviewed } from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

export function useStaffUserReports(enabled: boolean, actor?: UserProfile | null) {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const rows = await getStaffUserReports(150);
    setReports(rows);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled) return;

    const refresh = debounceRealtime(() => {
      void reload();
    }, 100);

    const unsub = subscribePostgresChanges(
      { channelName: 'live-staff-user-reports', table: 'user_reports', event: '*' },
      refresh,
    );

    return () => unsub();
  }, [enabled, reload]);

  const markReviewed = async (reportId: string) => {
    setErrorMessage('');
    const result = await markUserReportReviewed(reportId, actor || undefined);
    if (result.ok) {
      await reload();
    } else {
      setErrorMessage(result.errorMessage || 'Could not update report.');
    }
    return result;
  };

  return { reports, loading, errorMessage, reload, markReviewed };
}
