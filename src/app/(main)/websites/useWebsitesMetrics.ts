import { useQueries } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '@/components/hooks/useFilterParameters';
import {
  getWebsiteStatsQueryOptions,
  type WebsiteStatsData,
} from '@/components/hooks/queries/useWebsiteStatsQuery';

export type MetricStatus = 'loading' | 'error' | 'success';

export interface WebsiteMetricsResult {
  status: MetricStatus;
  data?: WebsiteStatsData;
}

/**
 * Reads per-website stats for the current page using the SAME query options as
 * useWebsiteStatsQuery, so it shares React Query's cache with the per-row cells
 * (no extra requests — React Query dedupes by key). Returns a map keyed by
 * websiteId, used to drive client-side metric sorting.
 */
export function useWebsitesMetrics(websiteIds: string[]): Record<string, WebsiteMetricsResult> {
  const { get } = useApi();
  const { startAt, endAt } = useDateParameters();
  const filters = useFilterParameters();

  const results = useQueries({
    queries: websiteIds.map(websiteId =>
      getWebsiteStatsQueryOptions({ websiteId, startAt, endAt, filters, get }),
    ),
  });

  return websiteIds.reduce<Record<string, WebsiteMetricsResult>>((acc, websiteId, i) => {
    const r = results[i];
    acc[websiteId] = {
      status: r.isLoading ? 'loading' : r.isError ? 'error' : 'success',
      data: r.data as WebsiteStatsData | undefined,
    };
    return acc;
  }, {});
}
