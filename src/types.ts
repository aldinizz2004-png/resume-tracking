export const POSITIONS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'QA Engineer',
  'UI/UX Designer',
  'DevOps Engineer',
] as const;

export const STATUSES = ['Submitted', 'UnderReview', 'Interview', 'Accepted', 'Rejected'] as const;

export type Position = (typeof POSITIONS)[number];
export type StatusName = (typeof STATUSES)[number];

export type ApplicationStatus =
  | { name: 'Submitted' }
  | { name: 'UnderReview' }
  | { name: 'Interview'; interviewDate: string }
  | { name: 'Accepted' }
  | { name: 'Rejected'; reason?: string };

export interface Entity {
  readonly id: number;
}

export interface Candidate extends Entity {
  fullName: string;
  email: string;
  phone: string;
  position: Position;
  appliedAt: string;
  status: ApplicationStatus;
  notes?: string;
}

export type CandidateInput = Omit<Candidate, 'id'>;
export type CandidateUpdate = Partial<CandidateInput>;
export type CandidateSummary = Pick<Candidate, 'id' | 'fullName' | 'email' | 'position' | 'appliedAt' | 'status'>;

export type SortOrder = 'newest' | 'oldest';

export interface CandidateFilters {
  search: string;
  position: Position | 'all';
  status: StatusName | 'all';
  sort: SortOrder;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number | null };

export interface CandidateDraft {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  appliedAt: string;
  notes: string;
}

export type FieldName = 'fullName' | 'email' | 'phone' | 'position' | 'appliedAt';
export type FieldErrors = Partial<Record<FieldName, string>>;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

export type StatusChangeHandler = (status: ApplicationStatus) => void;
export type MessageKind = 'success' | 'danger';
