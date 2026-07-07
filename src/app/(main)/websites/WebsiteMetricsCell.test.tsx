import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import type { WebsiteStatsData } from '@/components/hooks/queries/useWebsiteStatsQuery';

// Drive the component deterministically by mocking the data + date-range hooks.
const statsMock = vi.fn();
const dateRangeMock = vi.fn();

vi.mock('@/components/hooks/queries/useWebsiteStatsQuery', () => ({
  useWebsiteStatsQuery: (args: any) => statsMock(args),
}));

vi.mock('@/components/hooks', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/hooks')>();
  return {
    ...actual,
    useDateRange: () => dateRangeMock(),
  };
});

import { WebsiteMetricsCell } from './WebsiteMetricsCell';

function makeStats(overrides: Partial<WebsiteStatsData> = {}): WebsiteStatsData {
  return {
    pageviews: 900,
    visitors: 500,
    visits: 700,
    bounces: 0,
    totaltime: 0,
    comparison: { pageviews: 450, visitors: 250, visits: 350, bounces: 0, totaltime: 0 },
    ...overrides,
  };
}

afterEach(() => {
  statsMock.mockReset();
  dateRangeMock.mockReset();
});

describe('WebsiteMetricsCell', () => {
  test('renders and formats each metric value', () => {
    dateRangeMock.mockReturnValue({ isAllTime: false });
    statsMock.mockReturnValue({
      data: makeStats({ visitors: 500, visits: 700, pageviews: 1234 }),
      isLoading: false,
      error: null,
    });

    const { rerender } = render(<WebsiteMetricsCell websiteId="w1" metric="visitors" />);
    expect(screen.getByText('500')).toBeInTheDocument();

    rerender(<WebsiteMetricsCell websiteId="w1" metric="visits" />);
    expect(screen.getByText('700')).toBeInTheDocument();

    // pageviews maps to the "Views" column; 1234 -> "1.23k"
    rerender(<WebsiteMetricsCell websiteId="w1" metric="pageviews" />);
    expect(screen.getByText('1.23k')).toBeInTheDocument();
  });

  test('shows a trend indicator with the percentage change', () => {
    dateRangeMock.mockReturnValue({ isAllTime: false });
    // visitors 500 vs previous 250 => +100%
    statsMock.mockReturnValue({ data: makeStats(), isLoading: false, error: null });

    render(<WebsiteMetricsCell websiteId="w1" metric="visitors" />);

    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('hides the trend indicator for the All time range', () => {
    dateRangeMock.mockReturnValue({ isAllTime: true });
    statsMock.mockReturnValue({ data: makeStats(), isLoading: false, error: null });

    render(<WebsiteMetricsCell websiteId="w1" metric="visitors" />);

    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });

  test('renders a neutral 0% trend when there is no prior-period data', () => {
    dateRangeMock.mockReturnValue({ isAllTime: false });
    // comparison all zeros and value 0 => change 0 => neutral 0%
    statsMock.mockReturnValue({
      data: makeStats({
        visitors: 0,
        comparison: { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 },
      }),
      isLoading: false,
      error: null,
    });

    render(<WebsiteMetricsCell websiteId="w1" metric="visitors" />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test('shows a loading state while metrics are fetching', () => {
    dateRangeMock.mockReturnValue({ isAllTime: false });
    statsMock.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { container } = render(<WebsiteMetricsCell websiteId="w1" metric="visitors" />);

    expect(screen.queryByText('500')).not.toBeInTheDocument();
    // Spinner renders but no metric value.
    expect(container.textContent).not.toContain('%');
  });

  test('shows an error fallback when the metrics request fails', () => {
    dateRangeMock.mockReturnValue({ isAllTime: false });
    statsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    render(<WebsiteMetricsCell websiteId="w1" metric="visitors" />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
