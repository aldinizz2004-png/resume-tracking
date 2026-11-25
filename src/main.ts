import { candidates as repository, updateStatus } from './api.js';
import {
  buildStatus,
  filterCandidates,
  isPosition,
  isStatusName,
  parseDraft,
  summarize,
} from './candidates.js';
import type { Candidate, CandidateFilters } from './types.js';
import * as ui from './ui.js';
import { findById, paginate, todayIso } from './utils.js';

const PAGE_SIZE = 8;

interface AppState {
  candidates: Candidate[];
  filters: CandidateFilters;
  page: number;
  selectedId: number | null;
  editingId: number | null;
}

const state: AppState = {
  candidates: [],
  filters: { search: '', position: 'all', status: 'all', sort: 'newest' },
  page: 1,
  selectedId: null,
  editingId: null,
};

const selected = (): Candidate | undefined =>
  state.selectedId === null ? undefined : findById(state.candidates, state.selectedId);

const render = (): void => {
  const visible = filterCandidates(state.candidates, state.filters);
  const page = paginate(visible, state.page, PAGE_SIZE);
  state.page = page.page;
  ui.renderSummary(summarize(state.candidates));
  ui.renderCandidates(page, state.candidates.length, state.selectedId);
  ui.renderDetails(selected());
};

const replaceCandidate = (updated: Candidate): void => {
  state.candidates = state.candidates.map((item) => (item.id === updated.id ? updated : item));
};

const stopEditing = (): void => {
  state.editingId = null;
  ui.resetForm(todayIso());
};

const goToFirstPage = (): void => {
  state.page = 1;
};

async function loadCandidates(): Promise<void> {
  ui.showLoading();
  const result = await repository.list();
  if (!result.ok) {
    ui.showLoadError(result.error);
    return;
  }
  state.candidates = result.data;
  render();
}

async function handleSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const editing = state.editingId === null ? undefined : findById(state.candidates, state.editingId);
  const parsed = parseDraft(ui.readDraft(), editing);
  if (!parsed.ok) {
    ui.showFieldErrors(parsed.errors);
    return;
  }

  ui.clearFieldErrors();
  ui.setSubmitting(true);
  try {
    if (editing) {
      const result = await repository.update(editing.id, parsed.value);
      if (!result.ok) {
        ui.showMessage(result.error, 'danger');
        return;
      }
      replaceCandidate(result.data);
      ui.showMessage(`${result.data.fullName} was updated.`);
    } else {
      const result = await repository.create(parsed.value);
      if (!result.ok) {
        ui.showMessage(result.error, 'danger');
        return;
      }
      state.candidates = [...state.candidates, result.data];
      state.selectedId = result.data.id;
      state.filters = { ...state.filters, search: '', position: 'all', status: 'all' };
      syncFilterControls();
      goToFirstPage();
      ui.showMessage(`${result.data.fullName} was added.`);
    }
    stopEditing();
    render();
  } finally {
    ui.setSubmitting(false);
  }
}

async function handleStatusSubmit(form: HTMLFormElement): Promise<void> {
  const candidate = selected();
  if (!candidate || Number(form.dataset['id']) !== candidate.id) return;

  const values = ui.readStatusForm();
  if (!isStatusName(values.name)) return;

  const built = buildStatus({ name: values.name, interviewDate: values.interviewDate, reason: values.reason });
  if (!built.ok) {
    ui.showStatusError(built.error);
    return;
  }

  const result = await updateStatus(candidate.id, built.status);
  if (!result.ok) {
    ui.showMessage(result.error, 'danger');
    return;
  }
  replaceCandidate(result.data);
  render();
  ui.showMessage(`${result.data.fullName} is now ${result.data.status.name === 'UnderReview' ? 'under review' : result.data.status.name.toLowerCase()}.`);
}

async function removeCandidate(candidate: Candidate): Promise<void> {
  if (!window.confirm(`Delete ${candidate.fullName} from the candidates list?`)) return;
  const result = await repository.remove(candidate.id);
  if (!result.ok) {
    ui.showMessage(result.error, 'danger');
    return;
  }
  state.candidates = state.candidates.filter((item) => item.id !== candidate.id);
  if (state.selectedId === candidate.id) state.selectedId = null;
  if (state.editingId === candidate.id) stopEditing();
  render();
  ui.showMessage(`${candidate.fullName} was deleted.`);
}

function handleClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;

  const pageButton = event.target.closest<HTMLButtonElement>('button[data-page]');
  if (pageButton && !pageButton.disabled) {
    state.page = Number(pageButton.dataset['page']);
    render();
    return;
  }

  const trigger = event.target.closest<HTMLElement>('[data-action]');
  if (!trigger) return;

  const action = trigger.dataset['action'];
  if (action === 'retry') {
    void loadCandidates();
    return;
  }

  const candidate = findById(state.candidates, Number(trigger.dataset['id']));
  if (!candidate) return;

  switch (action) {
    case 'view':
      state.selectedId = candidate.id;
      render();
      break;
    case 'edit':
      state.selectedId = candidate.id;
      state.editingId = candidate.id;
      render();
      ui.fillForm(candidate);
      break;
    case 'delete':
      void removeCandidate(candidate);
      break;
  }
}

function syncFilterControls(): void {
  ui.elements.search.value = state.filters.search;
  ui.elements.positionFilter.value = state.filters.position;
  ui.elements.statusFilter.value = state.filters.status;
  ui.elements.sort.value = state.filters.sort;
}

const bindFilters = (): void => {
  ui.elements.search.addEventListener('input', () => {
    state.filters = { ...state.filters, search: ui.elements.search.value };
    goToFirstPage();
    render();
  });

  ui.elements.positionFilter.addEventListener('change', () => {
    const value = ui.elements.positionFilter.value;
    state.filters = { ...state.filters, position: isPosition(value) ? value : 'all' };
    goToFirstPage();
    render();
  });

  ui.elements.statusFilter.addEventListener('change', () => {
    const value = ui.elements.statusFilter.value;
    state.filters = { ...state.filters, status: isStatusName(value) ? value : 'all' };
    goToFirstPage();
    render();
  });

  ui.elements.sort.addEventListener('change', () => {
    state.filters = {
      ...state.filters,
      sort: ui.elements.sort.value === 'oldest' ? 'oldest' : 'newest',
    };
    goToFirstPage();
    render();
  });

  ui.elements.resetFilters.addEventListener('click', () => {
    state.filters = { search: '', position: 'all', status: 'all', sort: 'newest' };
    syncFilterControls();
    goToFirstPage();
    render();
  });
};

const init = (): void => {
  ui.populateSelects();
  ui.resetForm(todayIso());
  bindFilters();

  document.addEventListener('click', handleClick);
  ui.elements.body.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLElement)) return;
    if (event.target.matches('tr[data-action="view"]')) event.target.click();
  });
  ui.elements.details.addEventListener('change', (event) => {
    if (event.target instanceof HTMLSelectElement && event.target.id === 'statusSelect') ui.syncStatusFields();
  });
  ui.elements.details.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target instanceof HTMLFormElement && event.target.id === 'statusForm') {
      void handleStatusSubmit(event.target);
    }
  });
  ui.elements.form.addEventListener('submit', (event) => void handleSubmit(event));
  ui.elements.cancel.addEventListener('click', stopEditing);
  ui.elements.addCandidate.addEventListener('click', () => {
    stopEditing();
    ui.focusForm();
  });

  void loadCandidates();
};

init();
