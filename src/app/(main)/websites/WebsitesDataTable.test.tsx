import { describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@/test/render';
import { WebsitesDataTable } from './WebsitesDataTable';

// Mock the query hooks so we can control the row list and each row's stats
// state deterministically without spinning up MSW handlers.
vi.mock('@/components/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/components/hooks')>('@/components/hooks');
  return {
    ...actual,
    useLoginQuery: vi.fn(() => ({ user: { id: 'user-1' } })),
    useUserWebsitesQuery: vi.fn(),
  };
});

// Favicon (rendered next to the website name) reads useConfig directly, which
// would otherwise fire a real /api/config request under jsdom.
vi.mock('@/components/hooks/useConfig', () => ({
  useConfig: () => ({
    cloudMode: false,
    privateMode: false,
    telemetryDisabled: true,
    updatesDisabled: true,
  }),
}));

vi.mock('./useWebsitesStatsMap', () => ({
  useWebsitesStatsMap: vi.fn(),
}));

// The cells call useWebsiteStatsQuery directly. We stub it to a stable empty
// state so the table renders without kicking off real fetches — the sort
// under test reads from useWebsitesStatsMap, not the cell's own query.
vi.mock('@/components/hooks/queries/useWebsiteStatsQuery', () => ({
  useWebsiteStatsQuery: () => ({ data: undefined, isLoading: true, error: null }),
}));

const { useUserWebsitesQuery } = await import('@/components/hooks');
const { useWebsitesStatsMap } = await import('./useWebsitesStatsMap');

const mockedWebsitesQuery = useUserWebsitesQuery as unknown as ReturnType<typeof vi.fn>;
const mockedStatsMap = useWebsitesStatsMap as unknown as ReturnType<typeof vi.fn>;

const ROWS = [
  { id: 'a', name: 'Alpha', domain: 'alpha.example', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'b', name: 'Bravo', domain: 'bravo.example', createdAt: '2024-01-02T00:00:00Z' },
  { id: 'c', name: 'Charlie', domain: 'charlie.example', createdAt: '2024-01-03T00:00:00Z' },
];

function setRows(data = ROWS) {
  mockedWebsitesQuery.mockReturnValue({
    data: { data, count: data.length, page: 1, pageSize: 10, isCapped: false },
    isLoading: false,
    isFetching: false,
    error: null,
  });
}

function makeStatsEntry(value?: number, opts: { isLoading?: boolean; isError?: boolean } = {}) {
  return {
    data: value !== undefined ? { visitors: value, comparison: { visitors: 0 } } : undefined,
    isLoading: opts.isLoading ?? false,
    isError: opts.isError ?? false,
  };
}

function getRowOrder(): string[] {
  // DataTable renders rows in table mode as table rows; the name is a link.
  return screen
    .getAllByRole('link')
    .map(el => el.textContent?.trim() ?? '')
    .filter(Boolean);
}

describe('WebsitesDataTable metric sorting', () => {
  test('does not reorder rows when the active sort is not a metric', () => {
    setRows();
    mockedStatsMap.mockReturnValue({});

    render(<WebsitesDataTable showMetrics />, { route: '/websites?orderBy=name' });

    // Empty stats-map subscription was requested (no metric sort active).
    expect(mockedStatsMap).toHaveBeenLastCalledWith([]);
    expect(getRowOrder()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  test('subscribes to per-row stats when sorting by a metric', () => {
    setRows();
    mockedStatsMap.mockReturnValue({});

    render(<WebsitesDataTable showMetrics />, {
      route: '/websites?orderBy=visitors&sortDescending=true',
    });

    expect(mockedStatsMap).toHaveBeenLastCalledWith(['a', 'b', 'c']);
  });

  test('sorts by visitors descending as resolved values arrive', () => {
    setRows();
    // All three rows resolved with values that need to reorder.
    mockedStatsMap.mockReturnValue({
      a: makeStatsEntry(10),
      b: makeStatsEntry(500),
      c: makeStatsEntry(100),
    });

    render(<WebsitesDataTable showMetrics />, {
      route: '/websites?orderBy=visitors&sortDescending=true',
    });

    expect(getRowOrder()).toEqual(['Bravo', 'Charlie', 'Alpha']);
  });

  test('sorts by visitors ascending', () => {
    setRows();
    mockedStatsMap.mockReturnValue({
      a: makeStatsEntry(10),
      b: makeStatsEntry(500),
      c: makeStatsEntry(100),
    });

    render(<WebsitesDataTable showMetrics />, { route: '/websites?orderBy=visitors' });

    expect(getRowOrder()).toEqual(['Alpha', 'Charlie', 'Bravo']);
  });

  test('sinks loading and errored rows to the bottom regardless of direction', () => {
    setRows();
    mockedStatsMap.mockReturnValue({
      a: makeStatsEntry(undefined, { isLoading: true }),
      b: makeStatsEntry(50),
      c: makeStatsEntry(undefined, { isError: true }),
    });

    // Ascending: resolved Bravo first, then Alpha (loading) and Charlie (error)
    // in their original API order as a stable tiebreaker.
    const asc = render(<WebsitesDataTable showMetrics />, {
      route: '/websites?orderBy=visitors',
    });
    expect(getRowOrder()).toEqual(['Bravo', 'Alpha', 'Charlie']);
    asc.unmount();

    // Descending: resolved Bravo still first; unresolved rows still at the end.
    render(<WebsitesDataTable showMetrics />, {
      route: '/websites?orderBy=visitors&sortDescending=true',
    });
    expect(getRowOrder()).toEqual(['Bravo', 'Alpha', 'Charlie']);
  });

  test('re-sorts when the stats map updates (simulated async arrival)', async () => {
    setRows();

    // Initial render: only one row has a resolved value.
    mockedStatsMap.mockReturnValue({
      a: makeStatsEntry(undefined, { isLoading: true }),
      b: makeStatsEntry(10),
      c: makeStatsEntry(undefined, { isLoading: true }),
    });

    const { rerender } = render(<WebsitesDataTable showMetrics />, {
      route: '/websites?orderBy=visitors&sortDescending=true',
    });

    // Bravo is the only resolved value → it should lead.
    expect(getRowOrder()).toEqual(['Bravo', 'Alpha', 'Charlie']);

    // Now Charlie's stats arrive with a bigger value than Bravo.
    mockedStatsMap.mockReturnValue({
      a: makeStatsEntry(undefined, { isLoading: true }),
      b: makeStatsEntry(10),
      c: makeStatsEntry(999),
    });
    rerender(<WebsitesDataTable showMetrics />);

    await waitFor(() => {
      expect(getRowOrder()).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });

    // Finally Alpha arrives with a middle value.
    mockedStatsMap.mockReturnValue({
      a: makeStatsEntry(100),
      b: makeStatsEntry(10),
      c: makeStatsEntry(999),
    });
    rerender(<WebsitesDataTable showMetrics />);

    await waitFor(() => {
      expect(getRowOrder()).toEqual(['Charlie', 'Alpha', 'Bravo']);
    });
  });

  test('sorts by views (pageviews field) when orderBy=pageviews', () => {
    setRows();
    mockedStatsMap.mockReturnValue({
      a: { data: { pageviews: 200, comparison: {} }, isLoading: false, isError: false },
      b: { data: { pageviews: 50, comparison: {} }, isLoading: false, isError: false },
      c: { data: { pageviews: 5000, comparison: {} }, isLoading: false, isError: false },
    });

    render(<WebsitesDataTable showMetrics />, {
      route: '/websites?orderBy=pageviews&sortDescending=true',
    });

    expect(getRowOrder()).toEqual(['Charlie', 'Alpha', 'Bravo']);
  });

  test('preserves original API order as a stable tiebreaker on equal values', () => {
    setRows();
    mockedStatsMap.mockReturnValue({
      a: makeStatsEntry(42),
      b: makeStatsEntry(42),
      c: makeStatsEntry(42),
    });

    render(<WebsitesDataTable showMetrics />, {
      route: '/websites?orderBy=visitors&sortDescending=true',
    });

    expect(getRowOrder()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  test('still renders the name/domain columns for every row while metrics are loading', () => {
    setRows();
    mockedStatsMap.mockReturnValue({
      a: makeStatsEntry(undefined, { isLoading: true }),
      b: makeStatsEntry(undefined, { isLoading: true }),
      c: makeStatsEntry(undefined, { isLoading: true }),
    });

    render(<WebsitesDataTable showMetrics />, {
      route: '/websites?orderBy=visitors&sortDescending=true',
    });

    // The table body never blocks on stats — non-metric cells should render.
    expect(within(document.body).getByText('alpha.example')).toBeInTheDocument();
    expect(within(document.body).getByText('bravo.example')).toBeInTheDocument();
    expect(within(document.body).getByText('charlie.example')).toBeInTheDocument();
  });
});
