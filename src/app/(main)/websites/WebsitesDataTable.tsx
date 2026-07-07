import { Icon, Row } from '@umami/react-zen';
import { DataGrid } from '@/components/common/DataGrid';
import Link from '@/components/common/Link';
import { useLoginQuery, useNavigation, useUserWebsitesQuery } from '@/components/hooks';
import { Favicon } from '@/index';
import { WebsitesMetricsTable } from './WebsitesMetricsTable';
import { WebsitesTable } from './WebsitesTable';

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
  const { renderUrl } = useNavigation();

  const renderLink = (row: any) => (
    <Row alignItems="center" gap="3">
      <Icon size="md" color="muted">
        <Favicon domain={row.domain} />
      </Icon>
      <Link href={renderUrl(`/websites/${row.id}`, false)}>{row.name}</Link>
    </Row>
  );

  const Table = showMetrics ? WebsitesMetricsTable : WebsitesTable;

  return (
    <DataGrid query={queryResult} allowSearch allowPaging>
      {({ data }) => (
        <Table
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
