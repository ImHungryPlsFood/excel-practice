import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';

import type { ActivityItem } from '../types';

export interface ActivityListCardProps {
  id: string;
  title: string;
  items: readonly ActivityItem[];
  /** 항목이 없을 때 보여 줄 안내. 다음에 무엇을 하면 되는지 알려야 한다. */
  emptyMessage: string;
}

/** 최근 학습·복습 개념·오답·도전 과제·성취처럼 목록으로 표시하는 대시보드 항목 공통 카드. */
export function ActivityListCard({ id, title, items, emptyMessage }: ActivityListCardProps) {
  const titleId = `${id}-title`;
  return (
    <Card as="article" aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-base font-semibold text-fg">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-fg-secondary">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              {item.to === undefined ? (
                <span className="text-fg">{item.title}</span>
              ) : (
                <Link
                  to={item.to}
                  className="rounded-sm text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {item.title}
                </Link>
              )}
              {item.detail === undefined ? null : (
                <span className="ml-2 text-fg-muted">{item.detail}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
