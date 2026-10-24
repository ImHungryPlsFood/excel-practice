import { describe, expect, it } from 'vitest';

import { sheetContentsOf } from '@/features/learning/useProblemSession';

describe('sheetContentsOf (CARD-04D)', () => {
  it('수식이 아닌 숫자 원문은 숫자로, 수식과 글자는 그대로 넘긴다', () => {
    const contents = sheetContentsOf({
      sheets: [
        {
          name: 'Sheet1',
          cells: { A1: '1200', B1: '-3.5', C1: '=A1*2', D1: '공책', E1: '2024-01-30', F1: '1,200' },
        },
      ],
    });
    expect(contents['Sheet1']?.[0]).toEqual([1200, -3.5, '=A1*2', '공책', '2024-01-30', '1,200']);
  });
});
