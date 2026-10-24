import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';

import type { SpreadsheetHandle } from '@/components/spreadsheet/Spreadsheet';
import type { CellRange, ViewportRect } from '@/components/spreadsheet/types';
import { parseA1 } from '@/components/spreadsheet/workbookModel';
import { TutorialStepGuards } from '@/features/learning/components/TutorialStepGuards';
import { useTutorial } from '@/features/learning/context/useTutorial';
import type { TutorialStep } from '@/types/tutorial.schema';

import { CalloutTooltip } from './CalloutTooltip';
import { containsRect, intersectRect } from './calloutPlacement';
import { useMotionPreference } from './hooks/useMotionPreference';
import { useSpotlightPosition, type SpotlightMeasure } from './hooks/useSpotlightPosition';
import { SpotlightOverlay } from './SpotlightOverlay';

/*
 * 튜토리얼 Spotlight + 말풍선 묶음 (CARD-03C, MASTER_PROMPT §7.2).
 * 현재 단계의 highlight를 화면 위치로 바꿔 오버레이와 말풍선에 넘긴다.
 *   - CELL/RANGE: 스프레드시트 핸들의 셀 좌표 API(getRangeViewportRect)로 계산하고 셀 표시 영역(getCellAreaRect)으로 자른다.
 *     가상 스크롤로 DOM에 없는 셀도 정확히 잡힌다. 단계가 시작될 때 대상이 다 보이지 않으면 scrollToCell로 보이게 한다.
 *   - UI_ELEMENT: data-testid가 같은 요소의 경계. 다 보이지 않으면 scrollIntoView.
 *   - FORMULA_BAR: getFormulaBarRect.
 *   - 다른 시트의 셀이면 구멍 없이 말풍선에 시트 이름을 안내한다.
 *
 * 키보드 (R-07.20, R-07.22):
 *   - F6: 그리드 ↔ 말풍선 포커스 이동. 그리드의 Tab은 Excel처럼 셀 이동이라 말풍선으로 가는 별도 키가 필요하다.
 *   - Esc(말풍선 안): 그리드로 포커스만 돌려준다. 그리드 안의 Esc는 그리드 원래 동작(편집 취소, 복사 표시 해제)이다.
 *     Esc는 어떤 단계에서도 단계를 넘기거나 건너뛰지 않는다(단계 이동은 실제 조작·'다음'·건너뛰기 버튼뿐).
 *   - '다음'·이전·건너뛰기로 단계가 바뀌면 그리드로 포커스를 돌려준다(R-07.13 후속).
 */

type ResolvedTarget =
  | { kind: 'cells'; sheet: string; range: CellRange; label: string }
  | { kind: 'element'; id: string }
  | { kind: 'formulaBar' };

export function resolveHighlight(highlight: TutorialStep['highlight']): ResolvedTarget | null {
  switch (highlight.type) {
    case 'CELL':
    case 'RANGE': {
      const address = highlight.type === 'CELL' ? highlight.cell : highlight.range;
      const [from = '', to = from] = address.split(':');
      const start = parseA1(from);
      const end = parseA1(to);
      if (start === null || end === null) return null;
      return {
        kind: 'cells',
        sheet: highlight.sheetName,
        label: address,
        range: {
          startRow: Math.min(start.row, end.row),
          startCol: Math.min(start.col, end.col),
          endRow: Math.max(start.row, end.row),
          endCol: Math.max(start.col, end.col),
        },
      };
    }
    case 'UI_ELEMENT':
      return { kind: 'element', id: highlight.element };
    case 'FORMULA_BAR':
      return { kind: 'formulaBar' };
  }
}

const findElement = (id: string) =>
  document.querySelector<HTMLElement>(`[data-testid="${CSS.escape(id)}"]`);

const toRect = (rect: DOMRect): ViewportRect => ({
  top: rect.top,
  left: rect.left,
  width: rect.width,
  height: rect.height,
});

interface TutorialSpotlightProps {
  sheetRef: RefObject<SpreadsheetHandle | null>;
  /** 지금 보고 있는 시트 이름 */
  activeSheet: string;
}

export function TutorialSpotlight({ sheetRef, activeSheet }: TutorialSpotlightProps) {
  const { state, step } = useTutorial();
  const { reduced } = useMotionPreference();
  const calloutRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const highlight = step?.highlight ?? null;
  const target = useMemo(
    () => (highlight === null ? null : resolveHighlight(highlight)),
    [highlight],
  );
  const otherSheet = target?.kind === 'cells' && target.sheet !== activeSheet ? target.sheet : null;
  const active = state.status === 'active' && step !== null;
  const key = `${active ? state.stepIndex : 'none'}|${JSON.stringify(highlight)}|${activeSheet}`;

  /** 대상의 전체 화면 좌표와, 그것이 보일 수 있는 영역 */
  const locate = useCallback((): { raw: ViewportRect; clip: ViewportRect } | null => {
    const sheet = sheetRef.current;
    const screen = { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    if (target === null || otherSheet !== null) return null;
    if (target.kind === 'cells') {
      const { startRow, startCol, endRow, endCol } = target.range;
      const raw = sheet?.getRangeViewportRect(startRow, startCol, endRow, endCol) ?? null;
      const area = sheet?.getCellAreaRect() ?? null;
      const clip = area === null ? null : intersectRect(area, screen);
      return raw === null || clip === null ? null : { raw, clip };
    }
    if (target.kind === 'element') {
      const element = findElement(target.id);
      return element === null
        ? null
        : { raw: toRect(element.getBoundingClientRect()), clip: screen };
    }
    const raw = sheet?.getFormulaBarRect() ?? null;
    return raw === null ? null : { raw, clip: screen };
  }, [sheetRef, target, otherSheet]);

  const measure = (): SpotlightMeasure => {
    const anchor = sheetRef.current?.getCellAreaRect() ?? null;
    const located = locate();
    if (located === null) return { target: null, anchor, offscreen: false };
    return {
      target: intersectRect(located.raw, located.clip),
      anchor,
      offscreen: !containsRect(located.clip, located.raw),
    };
  };
  const geometry = useSpotlightPosition(measure, key, () => [
    document.body,
    target?.kind === 'element' ? findElement(target.id) : null,
  ]);

  /** 대상이 다 보이도록 스크롤한다. 범위는 끝 → 시작 순으로 불러 시작 쪽이 우선 보이게 한다. */
  const reveal = useCallback(() => {
    const located = locate();
    if (located === null || containsRect(located.clip, located.raw)) return;
    if (target?.kind === 'cells') {
      const { startRow, startCol, endRow, endCol } = target.range;
      sheetRef.current?.scrollToCell(endRow, endCol);
      sheetRef.current?.scrollToCell(startRow, startCol);
    } else if (target?.kind === 'element') {
      findElement(target.id)?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: reduced ? 'auto' : 'smooth',
      });
    }
  }, [locate, target, sheetRef, reduced]);

  // 단계(강조 대상)가 바뀌면 화면 밖 대상을 보이게 한다. 같은 단계에서 사용자가 스크롤해 벗어나는 것은 막지 않는다.
  const revealRef = useRef(reveal);
  useLayoutEffect(() => {
    revealRef.current = reveal;
  });
  useLayoutEffect(() => {
    if (active) revealRef.current();
  }, [key, active]);

  const focusGrid = useCallback(() => sheetRef.current?.focus(), [sheetRef]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F6' || event.ctrlKey || event.altKey || event.metaKey) return;
      const callout = calloutRef.current;
      if (callout === null) return;
      event.preventDefault();
      if (callout.contains(document.activeElement)) focusGrid();
      else callout.focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [active, focusGrid]);

  if (!active) return null;

  return createPortal(
    <>
      <SpotlightOverlay target={geometry.target} />
      <CalloutTooltip
        ref={calloutRef}
        target={geometry.target}
        anchor={geometry.anchor}
        viewport={geometry.viewport}
        labelledBy={titleId}
        reducedMotion={reduced}
        onEscape={focusGrid}
      >
        <TutorialStepGuards titleId={titleId} onStepChange={focusGrid} />
        {otherSheet !== null && (
          <p className="mt-2 text-sm text-warning" data-testid="tutorial-other-sheet">
            대상은 ‘{otherSheet}’ 시트에 있습니다. 아래 시트 탭에서 이동하세요.
          </p>
        )}
        {otherSheet === null && geometry.offscreen && (
          <p className="mt-2 flex items-center gap-2 text-sm text-fg-secondary">
            {geometry.target === null
              ? '강조 대상이 화면 밖에 있습니다.'
              : '강조 대상 일부가 가려져 있습니다.'}
            <button
              type="button"
              onClick={reveal}
              className="rounded-md border border-line px-2 py-0.5 text-sm hover:bg-subtle"
            >
              보기
            </button>
          </p>
        )}
        <p className="mt-3 text-xs text-fg-muted">F6: 시트 ↔ 안내 이동 · Esc: 시트로 돌아가기</p>
      </CalloutTooltip>
    </>,
    document.body,
  );
}
