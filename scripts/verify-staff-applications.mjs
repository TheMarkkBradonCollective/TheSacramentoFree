import { pathToFileURL } from 'node:url';

async function main() {
  const mod = await import(pathToFileURL('/workspace/src/lib/staffApplications.ts').href);
  const {
    applicantApplyView,
    nextPendingApplication,
    canReviewStaffApplications,
    canApproveAppliedRole,
    isStaffApplyRole,
    deriveApplicantStaffApplyState,
    staffApplicationDecisionNotice,
  } = mod;

  if (!isStaffApplyRole('city_moderator')) throw new Error('moderator should be apply-able');
  if (isStaffApplyRole('user')) throw new Error('neighbor is not a staff apply role');

  const open = applicantApplyView({ role: 'user', blocked: false, pending: null });
  if (open.kind !== 'open') throw new Error(`expected open, got ${open.kind}`);

  const staff = applicantApplyView({ role: 'city_moderator', blocked: false, pending: null });
  if (staff.kind !== 'staff') throw new Error(`expected staff, got ${staff.kind}`);

  const blocked = applicantApplyView({ role: 'user', blocked: true, pending: null });
  if (blocked.kind !== 'blocked') throw new Error(`expected blocked, got ${blocked.kind}`);

  const pending = applicantApplyView({
    role: 'user',
    blocked: false,
    pending: { status: 'pending', createdAt: '2026-08-18T00:00:00.000Z', role: 'city_moderator' },
  });
  if (pending.kind !== 'pending') throw new Error(`expected pending, got ${pending.kind}`);

  const maybeDoesNotBlock = applicantApplyView({ role: 'user', blocked: false, pending: null });
  if (maybeDoesNotBlock.kind !== 'open') throw new Error('maybe should reopen apply');

  const queue = nextPendingApplication([
    { status: 'maybe', createdAt: '2026-08-18T10:00:00.000Z' },
    { status: 'pending', createdAt: '2026-08-18T12:00:00.000Z' },
    { status: 'pending', createdAt: '2026-08-18T11:00:00.000Z' },
    { status: 'no', createdAt: '2026-08-18T09:00:00.000Z' },
  ]);
  if (queue.current?.createdAt !== '2026-08-18T11:00:00.000Z') {
    throw new Error(`queue should show oldest pending, got ${queue.current?.createdAt}`);
  }
  if (queue.waiting !== 1) throw new Error(`waiting should be 1, got ${queue.waiting}`);

  if (!canReviewStaffApplications('city_administrator')) throw new Error('admin should review');
  if (canReviewStaffApplications('city_moderator')) throw new Error('moderator should not review');
  if (!canApproveAppliedRole('city_administrator', 'city_moderator')) {
    throw new Error('admin should approve moderator');
  }
  if (canApproveAppliedRole('city_administrator', 'city_administrator')) {
    throw new Error('admin should not approve same rank');
  }
  if (!canApproveAppliedRole('director', 'director')) {
    throw new Error('director should be able to approve director seat');
  }

  const derived = deriveApplicantStaffApplyState([
    {
      id: '1',
      applicantUserId: 'u1',
      applicantName: 'A',
      applicantEmail: '',
      neighborhood: '',
      role: 'city_moderator',
      statement: '',
      responseTime: '',
      otherGroups: '',
      otherInfo: '',
      status: 'maybe',
      createdAt: '2026-08-18T09:00:00.000Z',
      updatedAt: '2026-08-18T09:05:00.000Z',
      reviewedAt: '2026-08-18T09:05:00.000Z',
    },
    {
      id: '2',
      applicantUserId: 'u1',
      applicantName: 'A',
      applicantEmail: '',
      neighborhood: '',
      role: 'city_administrator',
      statement: '',
      responseTime: '',
      otherGroups: '',
      otherInfo: '',
      status: 'pending',
      createdAt: '2026-08-18T10:00:00.000Z',
      updatedAt: '2026-08-18T10:00:00.000Z',
    },
  ]);
  if (derived.blocked) throw new Error('maybe must not block');
  if (derived.pending?.id !== '2') throw new Error('pending should be the waiting request');
  if (derived.lastDecision?.status !== 'maybe') throw new Error('lastDecision should be maybe');

  const yesNotice = staffApplicationDecisionNotice({ role: 'city_moderator', status: 'yes' });
  if (!yesNotice.body.includes('City Moderator')) throw new Error('yes notice should name the role');
  const noNotice = staffApplicationDecisionNotice({ role: 'city_manager', status: 'no' });
  if (!noNotice.body.toLowerCase().includes('not approved')) throw new Error('no notice should say not approved');
  const maybeNotice = staffApplicationDecisionNotice({ role: 'city_moderator', status: 'maybe' });
  if (!maybeNotice.body.includes('maybe')) throw new Error('maybe notice should say maybe');

  console.log('staffApplications checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
