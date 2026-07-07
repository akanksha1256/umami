import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '@/components/hooks/useFilterParameters';
import type { WebsiteStatsData } from '@/components/hooks/queries/useWebsiteStatsQuery';

export interface WebsitesStatsMapEntry {
  data?: WebsiteStatsData;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Reads per-website stats from the shared React Query cache using the exact same
 * query key that `useWebsiteStatsQuery` produces. No extra network requests are
 * issued — each row's WebsiteMetricCell still owns the fetch; this hook simply
 * subscribes to the cache entries so the parent can sort by metric value.
 */
export function useWebsitesStatsMap(websiteIds: string[]): Record<string, WebsitesStatsMapEntry> {
  const { get } = useApi();
  const { startAt, endAt } = useDateParameters();
  const filters = useFilterParameters();
  const compare = 'prev';

  const queries = useQueries({
    queries: websiteIds.map(websiteId => ({
      queryKey: ['websites:stats', { websiteId, compare, startAt, endAt, ...filters }] as const,
      queryFn: () => get(`/websites/${websiteId}/stats`, { compare, startAt, endAt, ...filters }),
      enabled: !!websiteId,
    })),
  });

  return useMemo(() => {
    const map: Record<string, WebsitesStatsMapEntry> = {};
    websiteIds.forEach((id, i) => {
      const q = queries[i];
      map[id] = {
        data: q?.data as WebsiteStatsData | undefined,
        isLoading: !!q?.isLoading,
        isError: !!q?.isError,
      };
    });
    return map;
  }, [websiteIds, queries]);
}
