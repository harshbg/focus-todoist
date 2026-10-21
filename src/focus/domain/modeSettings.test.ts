import { describe, expect, it } from 'vitest';
import type { Project } from '@/domain/types';
import {
  clampDailyTarget,
  clampRunThreshold,
  clampWeeklyTarget,
  filterTopLevelProjects,
  isBuiltInWorkProject,
  parseLanesInput,
  removeLane,
  toggleWorkday,
  toggleWorkProject,
} from './modeSettings';

const makeProject = (id: string, name: string, extra: Partial<Project> = {}): Project => ({
  id,
  name,
  color: 'charcoal',
  parent_id: null,
  child_order: 1,
  is_archived: false,
  is_deleted: false,
  is_favorite: false,
  ...extra,
});

describe('filterTopLevelProjects', () => {
  it('keeps only top-level, active, non-inbox projects sorted by child_order then name', () => {
    const projects: Record<string, Project> = {
      inbox: makeProject('inbox', 'Inbox', { inbox_project: true }),
      p1: makeProject('p1', 'Beta Project', { child_order: 2 }),
      p2: makeProject('p2', 'Alpha Project', { child_order: 1 }),
      child: makeProject('child', 'Child Project', { parent_id: 'p1', child_order: 1 }),
      archived: makeProject('archived', 'Archived Project', { is_archived: true }),
      deleted: makeProject('deleted', 'Deleted Project', { is_deleted: true }),
      userInbox: makeProject('u-inbox', 'Personal Inbox'),
    };

    const result = filterTopLevelProjects(projects, 'u-inbox');
    expect(result.map((p) => p.id)).toEqual(['p2', 'p1']);
  });
});

describe('isBuiltInWorkProject', () => {
  it('matches WORK_PROJECT_NAME case-insensitively and trimmed', () => {
    expect(isBuiltInWorkProject(makeProject('1', 'Work'))).toBe(true);
    expect(isBuiltInWorkProject(makeProject('2', '  work  '))).toBe(true);
    expect(isBuiltInWorkProject(makeProject('3', 'WORK'))).toBe(true);
    expect(isBuiltInWorkProject(makeProject('4', 'Personal Work'))).toBe(false);
    expect(isBuiltInWorkProject(makeProject('5', 'Home'))).toBe(false);
  });
});

describe('toggleWorkProject', () => {
  it('adds project id when checked and deduplicates', () => {
    expect(toggleWorkProject(['p1'], 'p2', true)).toEqual(['p1', 'p2']);
    expect(toggleWorkProject(['p1'], 'p1', true)).toEqual(['p1']);
    expect(toggleWorkProject(['p1', '  '], '  ', true)).toEqual(['p1']);
    expect(toggleWorkProject(['  p1  '], '  p2  ', true)).toEqual(['p1', 'p2']);
  });

  it('removes project id when unchecked', () => {
    expect(toggleWorkProject(['p1', 'p2', 'p3'], 'p2', false)).toEqual(['p1', 'p3']);
    expect(toggleWorkProject(['p1'], 'p2', false)).toEqual(['p1']);
    expect(toggleWorkProject(['p1', '  '], '  ', false)).toEqual(['p1']);
    expect(toggleWorkProject(['  p1  ', 'p2'], '  p2  ', false)).toEqual(['p1']);
  });
});

describe('clamp functions', () => {
  it('clamps daily target to [15, 1440]', () => {
    expect(clampDailyTarget(10)).toBe(15);
    expect(clampDailyTarget(15)).toBe(15);
    expect(clampDailyTarget(120)).toBe(120);
    expect(clampDailyTarget(1440)).toBe(1440);
    expect(clampDailyTarget(2000)).toBe(1440);
    expect(clampDailyTarget(60.4)).toBe(60);
  });

  it('clamps weekly target to [60, 10080]', () => {
    expect(clampWeeklyTarget(50)).toBe(60);
    expect(clampWeeklyTarget(60)).toBe(60);
    expect(clampWeeklyTarget(600)).toBe(600);
    expect(clampWeeklyTarget(10080)).toBe(10080);
    expect(clampWeeklyTarget(15000)).toBe(10080);
  });

  it('clamps run threshold to [1, 480]', () => {
    expect(clampRunThreshold(0)).toBe(1);
    expect(clampRunThreshold(1)).toBe(1);
    expect(clampRunThreshold(15)).toBe(15);
    expect(clampRunThreshold(480)).toBe(480);
    expect(clampRunThreshold(500)).toBe(480);
  });
});

describe('toggleWorkday', () => {
  it('adds an unselected workday and sorts ascending', () => {
    expect(toggleWorkday([1, 2, 3], 5)).toEqual([1, 2, 3, 5]);
    expect(toggleWorkday([5, 2], 1)).toEqual([1, 2, 5]);
  });

  it('removes a selected workday as long as at least one remains', () => {
    expect(toggleWorkday([1, 2, 3], 2)).toEqual([1, 3]);
    expect(toggleWorkday([4], 4)).toEqual([4]); // preserves last workday
  });

  it('ignores invalid workday numbers', () => {
    expect(toggleWorkday([1, 2], 0)).toEqual([1, 2]);
    expect(toggleWorkday([1, 2], 8)).toEqual([1, 2]);
    expect(toggleWorkday([1, 2], 2.5)).toEqual([1, 2]);
  });
});

describe('parseLanesInput', () => {
  it('parses comma-separated string, trimming, deduplicating case-insensitively, and capping at 12', () => {
    const raw = ' Reading , Learning, reading, Writing , , Health, Home ';
    expect(parseLanesInput(raw)).toEqual(['Reading', 'Learning', 'Writing', 'Health', 'Home']);
  });

  it('caps at 12 lanes', () => {
    const raw = Array.from({ length: 15 }, (_, i) => `Lane ${i + 1}`).join(', ');
    const result = parseLanesInput(raw);
    expect(result).toHaveLength(12);
    expect(result[0]).toBe('Lane 1');
    expect(result[11]).toBe('Lane 12');
  });

  it('handles empty input', () => {
    expect(parseLanesInput('')).toEqual([]);
    expect(parseLanesInput('   , , ')).toEqual([]);
  });
});

describe('removeLane', () => {
  it('removes matching lane case-insensitively', () => {
    expect(removeLane(['Reading', 'Learning', 'Writing'], 'learning')).toEqual(['Reading', 'Writing']);
    expect(removeLane(['Reading', 'Writing'], 'NonExistent')).toEqual(['Reading', 'Writing']);
  });
});
