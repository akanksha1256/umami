import { useMemo } from 'react';
import { useNavigation } from '@/components/hooks';
import { useWebsitesMetrics } from './useWebsitesMetrics';
import { WebsitesTable, type WebsitesTableProps } from './WebsitesTable';

type MetricKey = 'visitors' | 'visits' | 'pageviews';

const METRIC_KEYS: Record<string, MetricKey> = {
  visitors: 'visitors',
  visits: 'visits',
  views: 'pageviews',
};

// Ordering rank for non-success rows: successful rows first (0), then loading
// (1), then error (2). Within a group, original list order is preserved (stable).
const STATUS_RANK = { success: 0, loading: 1, error: 2 } as const;

export function WebsitesMetricsTable({ data = [], ...props }: WebsitesTableProps) {
  const { query } = useNavigation();
  const rows: any[] = data;

  const websiteIds = useMemo(() => rows.map(row => row.id), [rows]);
  const metrics = useWebsitesMetrics(websiteIds);

  // Metric sort is active only when a metric column is selected AND the
  // server-side sort (orderBy) is not — clicking a name/domain/created header
  // sets orderBy and cleanly takes precedence.
  const metricSortKey = !query.orderBy ? (query.metricSort as string | undefined) : undefined;
  const metricKey = metricSortKey ? METRIC_KEYS[metricSortKey] : undefined;
  const descending = query.metricSortDesc === 'true';

  const sortedData = useMemo(() => {
    if (!metricKey) {
      return rows;
    }

    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const ra = metrics[a.row.id];
        const rb = metrics[b.row.id];

        const rankA = STATUS_RANK[ra?.status ?? 'loading'];
        const rankB = STATUS_RANK[rb?.status ?? 'loading'];

        // Loading/error rows always sink to the bottom regardless of direction.
        if (rankA !== rankB) {
          return rankA - rankB;
        }

        // Same non-success group: keep original order for stability.
        if (rankA !== STATUS_RANK.success) {
          return a.index - b.index;
        }

        const va = ra?.data?.[metricKey] ?? 0;
        const vb = rb?.data?.[metricKey] ?? 0;

        if (va === vb) {
          return a.index - b.index;
        }

        return descending ? vb - va : va - vb;
      })
      .map(({ row }) => row);
  }, [rows, metrics, metricKey, descending]);

  return <WebsitesTable {...props} data={sortedData} />;
}
