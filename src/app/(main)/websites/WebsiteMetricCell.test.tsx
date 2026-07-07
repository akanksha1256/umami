import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import { WebsiteMetricCell } from './WebsiteMetricCell';

// The tests below mock the two hooks that WebsiteMetricCell reads from directly.
// This keeps the tests focused on rendering/formatting/trend logic without
// bringing in date, timezone, and API plumbing.
vi.mock('@/components/hooks/queries/useWebsiteStatsQuery', () => ({
  useWebsiteStatsQuery: vi.fn(),
}));

vi.mock('@/components/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/components/hooks')>('@/components/hooks');
  return {
    ...actual,
    useDateRange: vi.fn(),
  };
});

const { useWebsiteStatsQuery } = await import('@/components/hooks/queries/useWebsiteStatsQuery');
const { useDateRange } = await import('@/components/hooks');

const mockedStatsQuery = useWebsiteStatsQuery as unknown as ReturnType<typeof vi.fn>;
const mockedDateRange = useDateRange as unknown as ReturnType<typeof vi.fn>;

function setStats(state: { data?: any; isLoading?: boolean; error?: Error | null }) {
  mockedStatsQuery.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
  });
}

function setDateRange({ isAllTime = false }: { isAllTime?: boolean } = {}) {
  mockedDateRange.mockReturnValue({ isAllTime });
}

describe('WebsiteMetricCell', () => {
  test('formats the visitors metric using formatLongNumber', () => {
    setDateRange();
    setStats({
      data: {
        visitors: 1200,
        visits: 900,
        pageviews: 4200,
        bounces: 0,
        totaltime: 0,
        comparison: {
          visitors: 1000,
          visits: 800,
          pageviews: 4000,
          bounces: 0,
          totaltime: 0,
        },
      },
    });

    render(<WebsiteMetricCell websiteId="w1" metric="visitors" />);

    // formatLongNumber(1200) === '1.20k'
    expect(screen.getByText('1.20k')).toBeInTheDocument();
  });

  test('formats views using the pageviews field', () => {
    setDateRange();
    setStats({
      data: {
        visitors: 0,
        visits: 0,
        pageviews: 10500,
        bounces: 0,
        totaltime: 0,
        comparison: {
          visitors: 0,
          visits: 0,
          pageviews: 5000,
          bounces: 0,
          totaltime: 0,
        },
      },
    });

    render(<WebsiteMetricCell websiteId="w1" metric="pageviews" />);

    // formatLongNumber(10500) === '10.5k'
    expect(screen.getByText('10.5k')).toBeInTheDocument();
  });

  test('renders 0 when the current period value is missing', () => {
    setDateRange();
    setStats({ data: { comparison: {} } });

    render(<WebsiteMetricCell websiteId="w1" metric="visits" />);

    // formatLongNumber(0) === '0'
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('shows a percentage trend when comparison data is present', () => {
    setDateRange();
    setStats({
      data: {
        visitors: 1500,
        visits: 900,
        pageviews: 4200,
        bounces: 0,
        totaltime: 0,
        comparison: {
          visitors: 1000, // (1500-1000)/1000 * 100 = 50%
          visits: 900,
          pageviews: 4200,
          bounces: 0,
          totaltime: 0,
        },
      },
    });

    render(<WebsiteMetricCell websiteId="w1" metric="visitors" />);

    expect(screen.getByText('1.50k')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('hides the trend when the range is All time', () => {
    setDateRange({ isAllTime: true });
    setStats({
      data: {
        visitors: 1500,
        visits: 900,
        pageviews: 4200,
        bounces: 0,
        totaltime: 0,
        comparison: {
          visitors: 1000,
          visits: 800,
          pageviews: 4000,
          bounces: 0,
          totaltime: 0,
        },
      },
    });

    render(<WebsiteMetricCell websiteId="w1" metric="visitors" />);

    expect(screen.getByText('1.50k')).toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  test('hides the trend when the comparison block is missing', () => {
    setDateRange();
    setStats({
      data: {
        visitors: 1500,
        visits: 900,
        pageviews: 4200,
        bounces: 0,
        totaltime: 0,
        // no comparison field at all
      },
    });

    render(<WebsiteMetricCell websiteId="w1" metric="visitors" />);

    expect(screen.getByText('1.50k')).toBeInTheDocument();
    // No percentage should render, and no arrow icon either.
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  test('shows a 100% trend when the previous value is 0 but the current value is not', () => {
    setDateRange();
    setStats({
      data: {
        visitors: 42,
        visits: 0,
        pageviews: 0,
        bounces: 0,
        totaltime: 0,
        comparison: {
          visitors: 0,
          visits: 0,
          pageviews: 0,
          bounces: 0,
          totaltime: 0,
        },
      },
    });

    render(<WebsiteMetricCell websiteId="w1" metric="visitors" />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('renders a muted em-dash on error', () => {
    setDateRange();
    setStats({ error: new Error('nope') });

    render(<WebsiteMetricCell websiteId="w1" metric="visitors" />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
