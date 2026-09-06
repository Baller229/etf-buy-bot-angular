import { describe, expect, it } from 'vitest';
import { selectLatestSelectedTimeLocal } from './table.selectors';
import type { TableColumn, TableRow } from '../../core/ws/ws.types';

const columns: TableColumn[] = [
  { key: 'yyyy_MM_dd_HH_mm_ss', label: 'yyyy.MM.dd_HH:mm:ss' },
  { key: 'name', label: 'name' },
];

const row = (id: string, time: string): TableRow => ({ id, name: id, yyyy_MM_dd_HH_mm_ss: time });

const rows: TableRow[] = [
  row('Spain', '2026.05.15_17:36:11'),
  row('Canada', '2026.05.15_17:36:00'),
  row('Japan', '2026.05.15_17:35:56'),
];

const latest = selectLatestSelectedTimeLocal.projector;

describe('selectLatestSelectedTimeLocal', () => {
  it('takes the newest time across the selected rows', () => {
    expect(latest(columns, rows, ['Canada', 'Japan'])).toBe('2026-05-15T17:36');
  });

  it('picks the overall newest when Spain is in the selection', () => {
    expect(latest(columns, rows, ['Spain', 'Canada'])).toBe('2026-05-15T17:36');
  });

  it('falls back to all rows when nothing is selected', () => {
    expect(latest(columns, rows, [])).toBe('2026-05-15T17:36');
  });

  it('compares across days, not just clock time', () => {
    const mixed = [row('A', '2026.05.16_09:01:00'), row('B', '2026.05.15_17:36:11')];
    expect(latest(columns, mixed, ['A', 'B'])).toBe('2026-05-16T09:01');
  });

  it('ignores rows with an unparsable timestamp', () => {
    const dirty = [row('A', ''), row('B', 'n/a'), row('C', '2026.05.15_10:00:00')];
    expect(latest(columns, dirty, ['A', 'B', 'C'])).toBe('2026-05-15T10:00');
  });

  it('returns null when the table has no time column', () => {
    expect(latest([{ key: 'name', label: 'name' }], rows, ['Spain'])).toBeNull();
  });
});
