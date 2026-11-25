import { STATUS_LABELS, describeStatus, isClosed } from './candidates.js';
import type { Summary } from './candidates.js';
import { POSITIONS, STATUSES } from './types.js';
import type {
  Candidate,
  CandidateDraft,
  FieldErrors,
  FieldName,
  MessageKind,
  StatusName,
} from './types.js';
import type { Page } from './utils.js';
import { formatDate } from './utils.js';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
};

export const elements = {
  body: byId<HTMLTableSectionElement>('candidateBody'),
  count: byId<HTMLElement>('resultCount'),
  pager: byId<HTMLElement>('pager'),
  messages: byId<HTMLElement>('messages'),
  search: byId<HTMLInputElement>('searchInput'),
  positionFilter: byId<HTMLSelectElement>('positionFilter'),
  statusFilter: byId<HTMLSelectElement>('statusFilter'),
  sort: byId<HTMLSelectElement>('sortSelect'),
  resetFilters: byId<HTMLButtonElement>('resetFilters'),
  details: byId<HTMLElement>('details'),
  form: byId<HTMLFormElement>('candidateForm'),
  formTitle: byId<HTMLElement>('formTitle'),
  submit: byId<HTMLButtonElement>('submitButton'),
  cancel: byId<HTMLButtonElement>('cancelEdit'),
  addCandidate: byId<HTMLButtonElement>('addCandidateButton'),
  statTotal: byId<HTMLElement>('statTotal'),
  statOpen: byId<HTMLElement>('statOpen'),
  statInterviews: byId<HTMLElement>('statInterviews'),
  statAccepted: byId<HTMLElement>('statAccepted'),
};

type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const appliedAtInput = byId<HTMLInputElement>('appliedAt');

const fields: Record<FieldName | 'notes', FormField> = {
  fullName: byId<HTMLInputElement>('fullName'),
  email: byId<HTMLInputElement>('email'),
  phone: byId<HTMLInputElement>('phone'),
  position: byId<HTMLSelectElement>('position'),
  appliedAt: appliedAtInput,
  notes: byId<HTMLTextAreaElement>('notes'),
};

const fieldNames: FieldName[] = ['fullName', 'email', 'phone', 'position', 'appliedAt'];

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] ?? char;
  });

const optionsHtml = (values: readonly string[], label: (value: string) => string = (v) => v): string =>
  values.map((value) => `<option value="${value}">${escapeHtml(label(value))}</option>`).join('');

export const populateSelects = (): void => {
  const statusLabel = (value: string): string => STATUS_LABELS[value as StatusName] ?? value;
  elements.positionFilter.innerHTML = `<option value="all">All positions</option>${optionsHtml(POSITIONS)}`;
  elements.statusFilter.innerHTML = `<option value="all">All statuses</option>${optionsHtml(STATUSES, statusLabel)}`;
  fields.position.innerHTML = `<option value="">Choose a position</option>${optionsHtml(POSITIONS)}`;
};

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const statusBadge = (candidate: Candidate): string => {
  const { name } = candidate.status;
  return `<span class="status status-${name.toLowerCase()}">${STATUS_LABELS[name]}</span>`;
};

const editIcon =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.5 3.5l3 3L7 16H4v-3z"/><path d="M11.5 5.5l3 3"/></svg>';
const deleteIcon =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12"/><path d="M8 6V4h4v2"/><path d="M5.5 6l.8 10h7.4l.8-10"/></svg>';

const rowHtml = (candidate: Candidate, selectedId: number | null): string => {
  const { id, fullName, email, phone, position, appliedAt } = candidate;
  const label = escapeHtml(fullName);
  const selected = id === selectedId ? ' row-selected' : '';
  return `
    <tr class="candidate-row${selected}" data-action="view" data-id="${id}" tabindex="0"
      aria-label="View details of ${label}">
      <td>
        <div class="person">
          <span class="avatar avatar-${id % 5}" aria-hidden="true">${escapeHtml(initials(fullName))}</span>
          <span class="person-name">${label}</span>
        </div>
      </td>
      <td>
        <span class="contact-line">${escapeHtml(email)}</span>
        <span class="contact-line contact-muted">${escapeHtml(phone)}</span>
      </td>
      <td>${escapeHtml(position)}</td>
      <td class="nowrap">${formatDate(appliedAt)}</td>
      <td>${statusBadge(candidate)}</td>
      <td class="text-end">
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="edit" data-id="${id}"
            aria-label="Edit ${label}" title="Edit">${editIcon}</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${id}"
            aria-label="Delete ${label}" title="Delete">${deleteIcon}</button>
        </div>
      </td>
    </tr>`;
};

const messageRow = (text: string, extra = ''): string =>
  `<tr><td colspan="6" class="empty-row">${text}${extra}</td></tr>`;

export const renderCandidates = (page: Page<Candidate>, total: number, selectedId: number | null): void => {
  elements.count.textContent = page.total === total ? `${total} candidates` : `${page.total} of ${total} candidates`;
  if (page.items.length === 0) {
    elements.body.innerHTML = messageRow(
      total === 0 ? 'No candidates yet. Add the first one using the form.' : 'No candidates match these filters.',
    );
  } else {
    elements.body.innerHTML = page.items.map((candidate) => rowHtml(candidate, selectedId)).join('');
  }

  elements.pager.hidden = page.pageCount <= 1;
  elements.pager.innerHTML = `
    <button type="button" class="pager-btn" data-page="${page.page - 1}" ${page.page === 1 ? 'disabled' : ''}
      aria-label="Previous page">Previous</button>
    <span class="pager-info">Page ${page.page} of ${page.pageCount}</span>
    <button type="button" class="pager-btn" data-page="${page.page + 1}" ${page.page === page.pageCount ? 'disabled' : ''}
      aria-label="Next page">Next</button>`;
};

export const showLoading = (): void => {
  elements.count.textContent = 'Loading...';
  elements.body.innerHTML = messageRow(
    '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading candidates...',
  );
};

export const showLoadError = (message: string): void => {
  elements.count.textContent = '';
  elements.pager.hidden = true;
  elements.body.innerHTML = messageRow(
    `<span class="d-block mb-2 text-danger" role="alert">${escapeHtml(message)}</span>`,
    '<button type="button" class="btn-soft" data-action="retry">Try again</button>',
  );
};

export const renderSummary = (summary: Summary): void => {
  elements.statTotal.textContent = String(summary.total);
  elements.statOpen.textContent = String(summary.open);
  elements.statInterviews.textContent = String(summary.interviews);
  elements.statAccepted.textContent = String(summary.accepted);
};

const statusOptions = (current: StatusName): string =>
  STATUSES.map(
    (name) => `<option value="${name}" ${name === current ? 'selected' : ''}>${STATUS_LABELS[name]}</option>`,
  ).join('');

export const renderDetails = (candidate: Candidate | undefined): void => {
  if (!candidate) {
    elements.details.innerHTML = `
      <p class="details-empty">Select a candidate from the table to see the application and change its status.</p>`;
    return;
  }

  const { id, fullName, email, phone, position, appliedAt, status, notes } = candidate;
  const label = escapeHtml(fullName);
  const interviewDate = status.name === 'Interview' ? status.interviewDate : '';
  const reason = status.name === 'Rejected' ? (status.reason ?? '') : '';
  const closed = isClosed(status);

  elements.details.innerHTML = `
    <div class="details-head">
      <span class="avatar avatar-lg avatar-${id % 5}" aria-hidden="true">${escapeHtml(initials(fullName))}</span>
      <div>
        <h3 class="details-name">${label}</h3>
        <p class="details-position">${escapeHtml(position)}</p>
      </div>
    </div>

    <dl class="details-list">
      <div><dt>Email</dt><dd><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></dd></div>
      <div><dt>Phone</dt><dd>${escapeHtml(phone)}</dd></div>
      <div><dt>Applied</dt><dd>${formatDate(appliedAt)}</dd></div>
      ${notes ? `<div><dt>Notes</dt><dd>${escapeHtml(notes)}</dd></div>` : ''}
    </dl>

    <div class="status-box status-box-${status.name.toLowerCase()}">
      <div class="d-flex align-items-center justify-content-between gap-2 mb-1">
        <span class="status-box-title">Application status</span>
        ${statusBadge(candidate)}
      </div>
      <p class="status-box-text">${escapeHtml(describeStatus(status))}</p>
    </div>

    <form id="statusForm" class="status-form" data-id="${id}" novalidate>
      <label for="statusSelect" class="form-label">Change status</label>
      <select id="statusSelect" class="form-select" aria-label="New status for ${label}">${statusOptions(status.name)}</select>
      <div id="interviewField" class="mt-2" ${status.name === 'Interview' ? '' : 'hidden'}>
        <label for="interviewDate" class="form-label">Interview date</label>
        <input type="date" id="interviewDate" class="form-control" value="${escapeHtml(interviewDate)}">
      </div>
      <div id="reasonField" class="mt-2" ${status.name === 'Rejected' ? '' : 'hidden'}>
        <label for="rejectReason" class="form-label">Reason <span class="optional">optional</span></label>
        <input type="text" id="rejectReason" class="form-control" maxlength="120" value="${escapeHtml(reason)}">
      </div>
      <div id="statusError" class="field-error" role="alert"></div>
      <button type="submit" class="btn btn-primary w-100 mt-3">Update status</button>
      ${closed ? '<p class="status-hint">This application is closed. You can still reopen it.</p>' : ''}
    </form>

    <div class="details-actions">
      <button type="button" class="btn-soft" data-action="edit" data-id="${id}">Edit candidate</button>
      <button type="button" class="btn-soft btn-soft-danger" data-action="delete" data-id="${id}">Delete</button>
    </div>`;
};

export const syncStatusFields = (): void => {
  const select = document.getElementById('statusSelect');
  if (!(select instanceof HTMLSelectElement)) return;
  const interview = document.getElementById('interviewField');
  const reason = document.getElementById('reasonField');
  if (interview) interview.hidden = select.value !== 'Interview';
  if (reason) reason.hidden = select.value !== 'Rejected';
};

export const readStatusForm = (): { name: string; interviewDate: string; reason: string } => {
  const value = (id: string): string => {
    const element = document.getElementById(id);
    return element instanceof HTMLInputElement || element instanceof HTMLSelectElement ? element.value : '';
  };
  return { name: value('statusSelect'), interviewDate: value('interviewDate'), reason: value('rejectReason') };
};

export const showStatusError = (message: string): void => {
  const target = document.getElementById('statusError');
  if (target) target.textContent = message;
};

let messageTimer: number | undefined;

export const showMessage = (text: string, kind: MessageKind = 'success'): void => {
  window.clearTimeout(messageTimer);
  const toast = document.createElement('div');
  toast.className = kind === 'danger' ? 'toast-msg toast-danger' : 'toast-msg';
  toast.setAttribute('role', kind === 'danger' ? 'alert' : 'status');
  toast.textContent = text;
  elements.messages.replaceChildren(toast);
  messageTimer = window.setTimeout(() => elements.messages.replaceChildren(), 4000);
};

export const readDraft = (): CandidateDraft => ({
  fullName: fields.fullName.value,
  email: fields.email.value,
  phone: fields.phone.value,
  position: fields.position.value,
  appliedAt: fields.appliedAt.value,
  notes: fields.notes.value,
});

export const clearFieldErrors = (): void => {
  for (const name of fieldNames) {
    fields[name].classList.remove('is-invalid');
    fields[name].removeAttribute('aria-invalid');
    byId<HTMLElement>(`${name}Error`).textContent = '';
  }
};

export const showFieldErrors = (errors: FieldErrors): void => {
  clearFieldErrors();
  let firstInvalid: HTMLElement | null = null;
  for (const name of fieldNames) {
    const message = errors[name];
    if (!message) continue;
    fields[name].classList.add('is-invalid');
    fields[name].setAttribute('aria-invalid', 'true');
    byId<HTMLElement>(`${name}Error`).textContent = message;
    firstInvalid ??= fields[name];
  }
  firstInvalid?.focus();
};

export const resetForm = (today: string): void => {
  elements.form.reset();
  appliedAtInput.value = today;
  appliedAtInput.max = today;
  clearFieldErrors();
  elements.formTitle.textContent = 'Add candidate';
  elements.submit.textContent = 'Add candidate';
  elements.cancel.classList.add('d-none');
};

export const fillForm = (candidate: Candidate): void => {
  clearFieldErrors();
  fields.fullName.value = candidate.fullName;
  fields.email.value = candidate.email;
  fields.phone.value = candidate.phone;
  fields.position.value = candidate.position;
  fields.appliedAt.value = candidate.appliedAt;
  fields.notes.value = candidate.notes ?? '';
  elements.formTitle.textContent = `Edit ${candidate.fullName}`;
  elements.submit.textContent = 'Save changes';
  elements.cancel.classList.remove('d-none');
  fields.fullName.scrollIntoView({ behavior: 'smooth', block: 'center' });
  fields.fullName.focus({ preventScroll: true });
};

export const focusForm = (): void => {
  fields.fullName.scrollIntoView({ behavior: 'smooth', block: 'center' });
  fields.fullName.focus({ preventScroll: true });
};

export const setSubmitting = (busy: boolean): void => {
  elements.submit.disabled = busy;
};
