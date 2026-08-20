import { lazy } from 'react';

// Staff/moderation panels are only ever rendered for staff-role accounts, so
// they're split out of the shared Mobile/Tablet/Desktop shell bundle and
// fetched on demand the first time a staff member opens a staff tab.
export const StaffOverviewView = lazy(() => import('./StaffOverviewView'));
export const StaffUsersView = lazy(() => import('./StaffUsersView'));
export const StaffPostsView = lazy(() => import('./StaffPostsView'));
export const StaffMessagesView = lazy(() => import('./StaffMessagesView'));
export const StaffMeetsView = lazy(() => import('./StaffMeetsView'));
export const StaffViolationsView = lazy(() => import('./StaffViolationsView'));
export const StaffAuditView = lazy(() => import('./StaffAuditView'));
export const StaffWelcomeView = lazy(() => import('./StaffWelcomeView'));
export const StaffTeamView = lazy(() => import('./StaffTeamView'));
