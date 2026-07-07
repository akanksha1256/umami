'use client';

import { Icon } from '@umami/react-zen';
import type { ReactNode } from 'react';
import { useNavigation } from '@/components/hooks';
import { ChevronDown, ChevronUp } from '@/components/icons';

type SortDirection = 'asc' | 'desc';

export interface MetricSortableLabelProps {
  label: ReactNode;
  sortKey: string;
  defaultDirection?: SortDirection;
}

/**
 * Header control for client-side metric sorting. Uses dedicated URL params
 * (`metricSort` / `metricSortDesc`) so it never collides with the server-side
 * `orderBy` / `sortDescending` used by name/domain/created. Activating a metric
 * sort clears the server sort, and vice-versa is handled by SortableLabel.
 */
export function MetricSortableLabel({
  label,
  sortKey,
  defaultDirection = 'desc',
}: MetricSortableLabelProps) {
  const { router, query, updateParams } = useNavigation();
  const isActive = query.metricSort === sortKey;
  const isDescending = query.metricSortDesc === 'true';
  const direction = isActive ? (isDescending ? 'desc' : 'asc') : undefined;
  const activeColor = 'var(--text-primary)';

  const getNextDirection = (): SortDirection => {
    if (!isActive) {
      return defaultDirection;
    }
    return direction === 'desc' ? 'asc' : 'desc';
  };

  const handleSort = () => {
    const nextDirection = getNextDirection();

    router.push(
      updateParams({
        metricSort: sortKey,
        metricSortDesc: nextDirection === 'desc' ? 'true' : undefined,
        // Clear server-side sort so the two systems never fight.
        orderBy: undefined,
        sortDescending: undefined,
      }),
    );
  };

  return (
    <button
      type="button"
      onClick={handleSort}
      className="inline-flex appearance-none items-center gap-1 border-0 bg-transparent p-0 text-inherit"
      aria-pressed={isActive}
    >
      <span>{label}</span>
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          gap: 0,
          lineHeight: 0,
          color: 'var(--text-muted)',
          opacity: 0.8,
        }}
      >
        <span
          style={{
            color: direction === 'asc' ? activeColor : undefined,
            opacity: direction === 'asc' ? 1 : 0.55,
            transform: 'scale(0.9)',
            transformOrigin: 'center',
          }}
        >
          <Icon size="sm" color={direction === 'asc' ? undefined : 'muted'}>
            <ChevronUp />
          </Icon>
        </span>
        <span
          style={{
            color: direction === 'desc' ? activeColor : undefined,
            opacity: direction === 'desc' ? 1 : 0.55,
            marginTop: '-6px',
            transform: 'scale(0.9)',
            transformOrigin: 'center',
          }}
        >
          <Icon size="sm" color={direction === 'desc' ? undefined : 'muted'}>
            <ChevronDown />
          </Icon>
        </span>
      </span>
    </button>
  );
}
