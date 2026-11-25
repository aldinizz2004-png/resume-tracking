import type { Entity } from './types.js';

export const findById = <T extends Entity>(items: readonly T[], id: number): T | undefined =>
  items.find((item) => item.id === id);

export const sortBy = <T, K extends keyof T>(
  items: readonly T[],
  key: K,
  direction: 'asc' | 'desc' = 'asc',
): T[] =>
  [...items].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left === right) return 0;
    const result = left < right ? -1 : 1;
    return direction === 'asc' ? result : -result;
  });

export const countBy = <T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T) => K,
): Partial<Record<K, number>> =>
  items.reduce<Partial<Record<K, number>>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

export const todayIso = (): string => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const formatDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export const paginate = <T>(items: readonly T[], page: number, pageSize: number): Page<T> => {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, pageCount, total: items.length };
};
