import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { FillDirection } from '@/engine/spreadsheet/operations/autoFill';

import type { CellPosition, CellRange } from '../types';

/*
 * 채우기 핸들 끌기 (CARD-02E, R-08.10).
 * 선택 범위 오른쪽 아래 핸들을 누른 채 셀 위로 움직이면, 범위 밖으로 더 멀리 나간 쪽(위·아래 또는 왼쪽·오른쪽)으로
 * 넓힌 미리보기를 보여 주고, 놓으면 그 방향·칸 수로 onFill을 부른다. 원본 안에서 놓으면 아무것도 하지 않는다.
 * Ctrl+D·Ctrl+R은 SpreadsheetGrid 키 처리에서 바로 onFillFromEdge를 부른다.
 */

export interface FillTarget {
  direction: FillDirection;
  count: number;
  preview: CellRange;
}

/** 원본 범위와 마우스가 있는 셀로 채울 방향·칸 수를 정한다. 원본 안이면 null. */
export function fillTargetFor(source: CellRange, position: CellPosition): FillTarget | null {
  const below = position.row - source.endRow;
  const above = source.startRow - position.row;
  const right = position.col - source.endCol;
  const left = source.startCol - position.col;
  const vertical = Math.max(below, above, 0);
  const horizontal = Math.max(right, left, 0);
  if (vertical === 0 && horizontal === 0) return null;
  if (vertical >= horizontal) {
    return below > 0
      ? { direction: 'down', count: below, preview: { ...source, endRow: position.row } }
      : { direction: 'up', count: above, preview: { ...source, startRow: position.row } };
  }
  return right > 0
    ? { direction: 'right', count: right, preview: { ...source, endCol: position.col } }
    : { direction: 'left', count: left, preview: { ...source, startCol: position.col } };
}

interface UseFillHandleOptions {
  onFill?: (source: CellRange, direction: FillDirection, count: number) => void;
}

export function useFillHandle({ onFill }: UseFillHandleOptions) {
  const sourceRef = useRef<CellRange | null>(null);
  const targetRef = useRef<FillTarget | null>(null);
  const [preview, setPreview] = useState<CellRange | null>(null);
  const onFillRef = useRef(onFill);
  // useLayoutEffect로 맞춘다. 의존성 없는 useEffect(passive effect)는 커밋마다 React가 따로 비우는 작업을 예약하므로
  // 스크롤 프레임마다 커밋하는 그리드에서 프레임마다 작업이 하나씩 늘어난다(CARD-02E P-06 재측정에서 확인).
  useLayoutEffect(() => {
    onFillRef.current = onFill;
  });

  const begin = useCallback((source: CellRange) => {
    sourceRef.current = source;
    targetRef.current = null;
    setPreview(null);
  }, []);

  /** 끄는 중이면 미리보기를 갱신하고 true */
  const hover = useCallback((position: CellPosition): boolean => {
    const source = sourceRef.current;
    if (source === null) return false;
    const target = fillTargetFor(source, position);
    targetRef.current = target;
    setPreview(target?.preview ?? null);
    return true;
  }, []);

  const end = useCallback(() => {
    const source = sourceRef.current;
    const target = targetRef.current;
    sourceRef.current = null;
    targetRef.current = null;
    setPreview(null);
    if (source !== null && target !== null)
      onFillRef.current?.(source, target.direction, target.count);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', end);
    return () => window.removeEventListener('mouseup', end);
  }, [end]);

  return { preview, begin, hover, isFilling: () => sourceRef.current !== null };
}
