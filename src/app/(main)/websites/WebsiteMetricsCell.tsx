import { Column, Spinner, Text } from '@umami/react-zen';
import { useDateRange, useMessages } from '@/components/hooks';
import { useWebsiteStatsQuery } from '@/components/hooks/queries/useWebsiteStatsQuery';
import { ChangeLabel } from '@/components/metrics/ChangeLabel';
import { formatLongNumber } from '@/lib/format';

type MetricKey = 'visitors' | 'visits' | 'pageviews';

export interface WebsiteMetricsCellProps {
  websiteId: string;
  metric: MetricKey;
}

export function WebsiteMetricsCell({ websiteId, metric }: WebsiteMetricsCellProps) {
  const { t, labels } = useMessages();
  const { isAllTime } = useDateRange();
  const { data, isLoading, error } = useWebsiteStatsQuery({ websiteId });

  if (isLoading) {
    return <Spinner size="sm" />;
  }

  if (error) {
    return (
      <Text color="muted" title={t(labels.error)}>
        —
      </Text>
    );
  }

  const value = data?.[metric] ?? 0;
  const prev = data?.comparison?.[metric] ?? 0;
  const change = value - prev;

  // Match MetricCard's percentage computation.
  const diff = value - change;
  const pct = diff !== 0 ? ((value - diff) / diff) * 100 : value !== 0 ? 100 : 0;

  return (
    <Column alignItems="flex-end" gap="1">
      <Text>{formatLongNumber(value)}</Text>
      {!isAllTime && (
        <ChangeLabel value={change} size="xs" title={formatLongNumber(change)}>
          {`${Math.abs(~~pct)}%`}
        </ChangeLabel>
      )}
    </Column>
  );
}
