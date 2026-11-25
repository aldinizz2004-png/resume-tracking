import { POSITIONS, STATUSES } from './types.js';
import type {
  ApplicationStatus,
  Candidate,
  CandidateDraft,
  CandidateFilters,
  CandidateInput,
  FieldErrors,
  ParseResult,
  Position,
  StatusName,
} from './types.js';
import { formatDate, sortBy, todayIso } from './utils.js';

export const STATUS_LABELS: Record<StatusName, string> = {
  Submitted: 'Submitted',
  UnderReview: 'Under review',
  Interview: 'Interview',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
};

export const isPosition = (value: string): value is Position =>
  (POSITIONS as readonly string[]).includes(value);

export const isStatusName = (value: string): value is StatusName =>
  (STATUSES as readonly string[]).includes(value);

const assertNever = (value: never): never => {
  throw new Error(`Unhandled status: ${JSON.stringify(value)}`);
};

export const describeStatus = (status: ApplicationStatus): string => {
  switch (status.name) {
    case 'Submitted':
      return 'Waiting for HR to open the application.';
    case 'UnderReview':
      return 'HR is reviewing this application.';
    case 'Interview':
      return `Interview on ${formatDate(status.interviewDate)}.`;
    case 'Accepted':
      return 'The candidate was accepted.';
    case 'Rejected':
      return status.reason ? `Rejected: ${status.reason}` : 'The application was rejected.';
    default:
      return assertNever(status);
  }
};

export const isClosed = (status: ApplicationStatus): boolean =>
  status.name === 'Accepted' || status.name === 'Rejected';

export interface StatusChange {
  name: StatusName;
  interviewDate: string;
  reason: string;
}

export type StatusResult =
  | { ok: true; status: ApplicationStatus }
  | { ok: false; error: string };

export const buildStatus = ({ name, interviewDate, reason }: StatusChange): StatusResult => {
  switch (name) {
    case 'Interview':
      return interviewDate === ''
        ? { ok: false, error: 'Choose an interview date.' }
        : { ok: true, status: { name, interviewDate } };
    case 'Rejected': {
      const trimmed = reason.trim();
      return { ok: true, status: trimmed === '' ? { name } : { name, reason: trimmed } };
    }
    case 'Submitted':
    case 'UnderReview':
    case 'Accepted':
      return { ok: true, status: { name } };
    default:
      return assertNever(name);
  }
};

export const filterCandidates = (
  candidates: readonly Candidate[],
  { search, position, status, sort }: CandidateFilters,
): Candidate[] => {
  const term = search.trim().toLowerCase();
  const matches = candidates.filter(
    (candidate) =>
      (term === '' || candidate.fullName.toLowerCase().includes(term)) &&
      (position === 'all' || candidate.position === position) &&
      (status === 'all' || candidate.status.name === status),
  );
  return sortBy(matches, 'appliedAt', sort === 'newest' ? 'desc' : 'asc');
};

export interface Summary {
  total: number;
  open: number;
  interviews: number;
  accepted: number;
}

export const summarize = (candidates: readonly Candidate[]): Summary => ({
  total: candidates.length,
  open: candidates.filter(({ status }) => status.name === 'Submitted' || status.name === 'UnderReview').length,
  interviews: candidates.filter(({ status }) => status.name === 'Interview').length,
  accepted: candidates.filter(({ status }) => status.name === 'Accepted').length,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,16}$/;

export const parseDraft = (draft: CandidateDraft, current?: Candidate): ParseResult<CandidateInput> => {
  const errors: FieldErrors = {};
  const fullName = draft.fullName.trim();
  const email = draft.email.trim();
  const phone = draft.phone.trim();

  if (fullName.length < 3) errors.fullName = 'Enter the full name.';
  if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  if (!PHONE_PATTERN.test(phone)) errors.phone = 'Enter a valid phone number.';
  if (!isPosition(draft.position)) errors.position = 'Choose a position.';
  if (draft.appliedAt === '') errors.appliedAt = 'Choose the application date.';
  else if (draft.appliedAt > todayIso()) errors.appliedAt = 'The date cannot be in the future.';

  if (Object.keys(errors).length > 0 || !isPosition(draft.position)) {
    return { ok: false, errors };
  }

  const notes = draft.notes.trim();
  const value: CandidateInput = {
    fullName,
    email,
    phone,
    position: draft.position,
    appliedAt: draft.appliedAt,
    status: current?.status ?? { name: 'Submitted' },
    ...(notes !== '' && { notes }),
  };
  return { ok: true, value };
};
