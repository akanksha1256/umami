import type { UseQueryOptions } from '@tanstack/react-query';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';

export interface WebsiteStatsData {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
  comparison: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
}

export function getWebsiteStatsQueryOptions({
  websiteId,
  compare,
  startAt,
  endAt,
  filters,
  get,
}: {
  websiteId: string;
  compare?: string;
  startAt: number;
  endAt: number;
  filters: Record<string, any>;
  get: (url: string, params?: object) => Promise<any>;
}) {
  return {
    queryKey: ['websites:stats', { websiteId, compare, startAt, endAt, ...filters }] as const,
    queryFn: () => get(`/websites/${websiteId}/stats`, { compare, startAt, endAt, ...filters }),
    enabled: !!websiteId,
  };
}

export function useWebsiteStatsQuery(
  { websiteId, compare }: { websiteId: string; compare?: string },
  options?: UseQueryOptions<WebsiteStatsData, Error, WebsiteStatsData>,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<WebsiteStatsData>({
    ...getWebsiteStatsQueryOptions({ websiteId, compare, startAt, endAt, filters, get }),
    ...options,
  });
}
