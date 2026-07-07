'use client';
import { Column, Row } from '@umami/react-zen';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useLoginQuery, useMessages, useNavigation, useTeamMembersQuery } from '@/components/hooks';
import { WebsiteDateFilter } from '@/components/input/WebsiteDateFilter';
import { ROLES } from '@/lib/constants';
import { WebsiteAddButton } from './WebsiteAddButton';
import { WebsitesDataTable } from './WebsitesDataTable';

export function WebsitesPage() {
  const { user } = useLoginQuery();
  const { teamId } = useNavigation();
  const { t, labels } = useMessages();
  const { data } = useTeamMembersQuery(teamId);

  const showActions =
    (teamId &&
      data?.data.filter(team => team.userId === user.id && team.role !== ROLES.teamViewOnly)
        .length > 0) ||
    (!teamId && user.role !== ROLES.viewOnly);

  return (
    <PageBody>
      <Column gap="6" margin="2">
        <PageHeader title={t(labels.websites)}>
          <Row alignItems="center" justifyContent="flex-end" gap wrap="wrap">
            <WebsiteDateFilter showAllTime={false} allowCompare={false} />
            {showActions && <WebsiteAddButton teamId={teamId} />}
          </Row>
        </PageHeader>
        <Panel>
          <WebsitesDataTable teamId={teamId} showActions={showActions} showMetrics />
        </Panel>
      </Column>
    </PageBody>
  );
}
