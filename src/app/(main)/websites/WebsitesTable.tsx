import { DataColumn, DataTable, type DataTableProps, Icon } from '@umami/react-zen';
import type { ReactNode } from 'react';
import { DateDistance } from '@/components/common/DateDistance';
import { LinkButton } from '@/components/common/LinkButton';
import { SortableLabel } from '@/components/common/SortableLabel';
import { useMessages, useNavigation } from '@/components/hooks';
import { SquarePen } from '@/components/icons';
import { MetricSortableLabel } from './MetricSortableLabel';
import { WebsiteMetricsCell } from './WebsiteMetricsCell';

export interface WebsitesTableProps extends DataTableProps {
  showActions?: boolean;
  showMetrics?: boolean;
  allowEdit?: boolean;
  allowView?: boolean;
  renderLink?: (row: any) => ReactNode;
}

export function WebsitesTable({
  showActions,
  showMetrics,
  renderLink,
  ...props
}: WebsitesTableProps) {
  const { t, labels } = useMessages();
  const { renderUrl } = useNavigation();

  return (
    <DataTable {...props}>
      <DataColumn id="name" label={<SortableLabel label={t(labels.name)} sortKey="name" />}>
        {renderLink}
      </DataColumn>
      <DataColumn id="domain" label={<SortableLabel label={t(labels.domain)} sortKey="domain" />} />
      {showMetrics && (
        <DataColumn
          id="visitors"
          label={<MetricSortableLabel label={t(labels.visitors)} sortKey="visitors" />}
          width="120px"
          align="end"
        >
          {(row: any) => <WebsiteMetricsCell websiteId={row.id} metric="visitors" />}
        </DataColumn>
      )}
      {showMetrics && (
        <DataColumn
          id="visits"
          label={<MetricSortableLabel label={t(labels.visits)} sortKey="visits" />}
          width="120px"
          align="end"
        >
          {(row: any) => <WebsiteMetricsCell websiteId={row.id} metric="visits" />}
        </DataColumn>
      )}
      {showMetrics && (
        <DataColumn
          id="views"
          label={<MetricSortableLabel label={t(labels.views)} sortKey="views" />}
          width="120px"
          align="end"
        >
          {(row: any) => <WebsiteMetricsCell websiteId={row.id} metric="pageviews" />}
        </DataColumn>
      )}
      <DataColumn
        id="created"
        label={
          <SortableLabel label={t(labels.created)} sortKey="createdAt" defaultDirection="desc" />
        }
        width="200px"
      >
        {(row: any) => <DateDistance date={new Date(row.createdAt)} />}
      </DataColumn>
      {showActions && (
        <DataColumn id="action" label=" " align="end">
          {(row: any) => {
            const websiteId = row.id;

            return (
              <LinkButton href={renderUrl(`/websites/${websiteId}/settings`)} variant="quiet">
                <Icon>
                  <SquarePen />
                </Icon>
              </LinkButton>
            );
          }}
        </DataColumn>
      )}
    </DataTable>
  );
}
