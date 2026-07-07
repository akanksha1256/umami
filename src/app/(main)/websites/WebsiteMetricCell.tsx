import { Column, Loading, Row, Text } from '@umami/react-zen';
import { useDateRange, useMessages } from '@/components/hooks';
import { useWebsiteStatsQuery } from '@/components/hooks/queries/useWebsiteStatsQuery';
import { ChangeLabel } from '@/components/metrics/ChangeLabel';
import { formatLongNumber } from '@/lib/format';

export type WebsiteMetric = 'visitors' | 'visits' | 'pageviews';

export interface WebsiteMetricCellProps {
  websiteId: string;
  metric: WebsiteMetric;
}

export function WebsiteMetricCell({ websiteId, metric }: WebsiteMetricCellProps) {
  const { t, labels, getErrorMessage } = useMessages();
  const { isAllTime } = useDateRange();
  const { data, isLoading, error } = useWebsiteStatsQuery({ websiteId, compare: 'prev' });

  if (isLoading) {
    return <Loading size="sm" placement="inline" icon="dots" />;
  }

  if (error) {
    return (
      <Text color="muted" title={getErrorMessage(error) || t(labels.unknown)}>
        —
      </Text>
    );
  }

  const value = data?.[metric] ?? 0;
  const previousValue = data?.comparison?.[metric];
  const change = previousValue !== undefined ? value - previousValue : 0;
  const pct =
    previousValue && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : value !== 0
        ? 100
        : 0;

  return (
    <Column gap="1" alignItems="flex-start">
      <Text>{formatLongNumber(value)}</Text>
      {!isAllTime && previousValue !== undefined && (
        <Row title={String(change)}>
          <ChangeLabel value={change} size="xs">
            {`${Math.abs(Math.trunc(pct))}%`}
          </ChangeLabel>
        </Row>
      )}
    </Column>
  );
}
