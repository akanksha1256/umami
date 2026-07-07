import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import type { WebsiteMetricsResult } from './useWebsitesMetrics';

// Control the per-row metric map so we can assert sort ordering deterministically.
const metricsMock = vi.fn<() => Record<string, WebsiteMetricsResult>>();

vi.mock('./useWebsitesMetrics', () => ({
  useWebsitesMetrics: () => metricsMock(),
}));

// The individual cells fetch their own data; stub them to plain text so the
// table renders without network and we can focus on row ordering.
vi.mock('./WebsiteMetricsCell', () => ({
  WebsiteMetricsCell: ({ websiteId, metric }: { websiteId: string; metric: string }) => (
    <span>{`${websiteId}:${metric}`}</span>
  ),
}));

import { WebsitesMetricsTable } from './WebsitesMetricsTable';

const ROWS = [
  { id: 'a', name: 'Alpha', domain: 'a.com', createdAt: '2020-01-01' },
  { id: 'b', name: 'Bravo', domain: 'b.com', createdAt: '2020-01-02' },
  { id: 'c', name: 'Charlie', domain: 'c.com', createdAt: '2020-01-03' },
];

function success(visitors: number): WebsiteMetricsResult {
  return {
    status: 'success',
    data: {
      pageviews: 0,
      visitors,
      visits: 0,
      bounces: 0,
      totaltime: 0,
      comparison: { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 },
    },
  };
}

function renderedNameOrder(): string[] {
  return screen
    .getAllByText(/^(Alpha|Bravo|Charlie)$/)
    .map(el => el.textContent as string);
}

afterEach(() => {
  metricsMock.mockReset();
});

describe('WebsitesMetricsTable async sorting', () => {
  test('preserves original order when no metric sort is active', () => {
    metricsMock.mockReturnValue({
      a: success(10),
      b: success(30),
      c: success(20),
    });

    render(<WebsitesMetricsTable data={ROWS} showMetrics />, { route: '/websites' });

    expect(renderedNameOrder()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  test('sorts by visitor value descending when metric sort is active', () => {
    metricsMock.mockReturnValue({
      a: success(10),
      b: success(30),
      c: success(20),
    });

    render(<WebsitesMetricsTable data={ROWS} showMetrics />, {
      route: '/websites?metricSort=visitors&metricSortDesc=true',
    });

    expect(renderedNameOrder()).toEqual(['Bravo', 'Charlie', 'Alpha']);
  });

  test('sorts ascending when descending flag is absent', () => {
    metricsMock.mockReturnValue({
      a: success(10),
      b: success(30),
      c: success(20),
    });

    render(<WebsitesMetricsTable data={ROWS} showMetrics />, {
      route: '/websites?metricSort=visitors',
    });

    expect(renderedNameOrder()).toEqual(['Alpha', 'Charlie', 'Bravo']);
  });

  test('sinks loading and error rows below resolved rows as data arrives', () => {
    // b resolved, a still loading, c errored.
    metricsMock.mockReturnValue({
      a: { status: 'loading' },
      b: success(30),
      c: { status: 'error' },
    });

    render(<WebsitesMetricsTable data={ROWS} showMetrics />, {
      route: '/websites?metricSort=visitors&metricSortDesc=true',
    });

    // success first, then loading, then error (each group stable by list order).
    expect(renderedNameOrder()).toEqual(['Bravo', 'Alpha', 'Charlie']);
  });

  test('server-side sort (orderBy) takes precedence over metric sort', () => {
    metricsMock.mockReturnValue({
      a: success(10),
      b: success(30),
      c: success(20),
    });

    // orderBy present => metric sort must not reorder; keep server order as-is.
    render(<WebsitesMetricsTable data={ROWS} showMetrics />, {
      route: '/websites?orderBy=name&metricSort=visitors&metricSortDesc=true',
    });

    expect(renderedNameOrder()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});
