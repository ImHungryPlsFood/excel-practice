import { ButtonRouterLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import type { NextAction } from '../types';

export interface NextActionCardProps {
  action: NextAction;
}

/** 대시보드 최상단. 사용자가 무엇을 해야 할지 고민하지 않도록 단 하나의 다음 행동을 제시한다 (R-04.09, R-04.17). */
export function NextActionCard({ action }: NextActionCardProps) {
  return (
    <Card
      role="region"
      aria-labelledby="next-action-title"
      className="flex flex-col gap-4 border-brand md:flex-row md:items-center md:justify-between"
    >
      <div>
        <p className="text-sm font-semibold text-brand">다음 행동</p>
        <h2 id="next-action-title" className="mt-1 text-xl font-semibold text-fg">
          {action.title}
        </h2>
        <p className="mt-1 text-fg-secondary">{action.description}</p>
      </div>
      <ButtonRouterLink to={action.to} size="lg">
        {action.label}
      </ButtonRouterLink>
    </Card>
  );
}
