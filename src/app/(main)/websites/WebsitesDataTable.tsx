import { Icon, Row } from '@umami/react-zen';
import { useMemo } from 'react';
import { DataGrid } from '@/components/common/DataGrid';
import Link from '@/components/common/Link';
import { useLoginQuery, useNavigation, useUserWebsitesQuery } from '@/components/hooks';
import { Favicon } from '@/index';
import type { WebsiteMetric } from './WebsiteMetricCell';
import { WebsitesTable } from './WebsitesTable';
import { useWebsitesStatsMap } from './useWebsitesStatsMap';

const METRIC_SORT_KEYS = new Set<WebsiteMetric>(['visitors', 'visits', 'pageviews']);

function isMetricSortKey(key: unknown): key is WebsiteMetric {
  return typeof key === 'string' && METRIC_SORT_KEYS.has(key as WebsiteMetric);
}

export function WebsitesDataTable({
  userId,
  teamId,
  allowEdit = true,
  allowView = true,
  showActions = true,
  showMetrics = false,
}: {
  userId?: string;
  teamId?: string;
  allowEdit?: boolean;
  allowView?: boolean;
  showActions?: boolean;
  showMetrics?: boolean;
}) {
  const { user } = useLoginQuery();
  const queryResult = useUserWebsitesQuery({ userId: userId || user?.id, teamId });
  const {
    renderUrl,
    query: { orderBy, sortDescending },
  } = useNavigation();

  const renderLink = (row: any) => (
    <Row alignItems="center" gap="3">
      <Icon size="md" color="muted">
        <Favicon domain={row.domain} />
      </Icon>
      <Link href={renderUrl(`/websites/${row.id}`, false)}>{row.name}</Link>
    </Row>
  );

  const rows: any[] = queryResult.data?.data ?? [];
  const websiteIds = useMemo(() => rows.map(r => r.id), [rows]);

  // Subscribe to the same query cache entries the cells populate. This does not
  // issue new requests — the cells still own the fetches.
  const metricSortActive = showMetrics && isMetricSortKey(orderBy);
  const statsMap = useWebsitesStatsMap(metricSortActive ? websiteIds : []);

  const sortedRows = useMemo(() => {
    if (!metricSortActive) {
      return rows;
    }
    const metric = orderBy as WebsiteMetric;
    const descending = sortDescending === 'true';
    // Original API order is used as a stable tiebreaker so rows without values
    // yet keep a deterministic layout while data streams in.
    const withIndex = rows.map((row, index) => {
      const entry = statsMap[row.id];
      const hasValue = entry && !entry.isLoading && !entry.isError && entry.data != null;
      const value = hasValue ? Number(entry.data?.[metric] ?? 0) : null;
      return { row, index, value };
    });

    withIndex.sort((a, b) => {
      // Rows without a resolved value (loading or errored) always sort to the
      // end regardless of sort direction. This keeps the resolved values
      // grouped together at the "leading" side of the table.
      if (a.value === null && b.value === null) return a.index - b.index;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      if (a.value === b.value) return a.index - b.index;
      return descending ? b.value - a.value : a.value - b.value;
    });

    return withIndex.map(x => x.row);
  }, [rows, statsMap, metricSortActive, orderBy, sortDescending]);

  // Present the sorted rows to DataGrid without disturbing pagination/search metadata.
  const decoratedQuery = useMemo(() => {
    if (!metricSortActive || !queryResult.data) {
      return queryResult;
    }
    return {
      ...queryResult,
      data: { ...queryResult.data, data: sortedRows },
    } as typeof queryResult;
  }, [metricSortActive, queryResult, sortedRows]);

  return (
    <DataGrid query={decoratedQuery} allowSearch allowPaging>
      {({ data }) => (
        <WebsitesTable
          data={data}
          showActions={showActions}
          showMetrics={showMetrics}
          allowEdit={allowEdit}
          allowView={allowView}
          renderLink={renderLink}
        />
      )}
    </DataGrid>
  );
}
