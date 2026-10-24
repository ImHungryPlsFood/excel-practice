import { useCallback, useMemo, useRef, useState } from 'react';

import {
  MAX_PASTE_TEXT_LENGTH,
  parseTsv,
  pasteWrites,
  toTsv,
} from '@/engine/spreadsheet/operations/clipboard';

import type { CellRange, GridClipboard } from '../types';
import type { Workbook } from './useWorkbook';

/*
 * 복사·잘라내기·붙여넣기 연결 (CARD-02E, R-08.07, R-08.17).
 *
 * - Ctrl+C·X: 그리드 입력 상자의 copy/cut 이벤트에서 clipboardData에 표시값 TSV를 쓴다(권한 요청 없음).
 *   메뉴에서 고르면 navigator.clipboard.writeText를 쓴다(실패해도 앱 안 붙여넣기는 된다).
 * - 앱 안 클립보드: 복사한 시트·범위·원문(수식)과 그때 쓴 TSV를 기억한다. 붙여넣는 글자가 그 TSV와 같으면 앱 안 복사로 보고
 *   수식 상대 참조를 옮겨 붙인다. 다르면 다른 프로그램에서 온 TSV이므로 칸마다 직접 입력한 것처럼 넣는다.
 * - 잘라내기: 한 번 붙여넣으면 셀을 옮기고(다른 수식 참조도 따라감) 클립보드를 비운다.
 * - 복사한 범위는 점선으로 보이고 Esc로 지운다. 셀 내용을 바꾸면(실행 취소 포함) 점선이 남아도 원문은 복사할 때의 것이다.
 */

interface Copied {
  sheet: string;
  range: CellRange;
  values: string[][];
  text: string;
  cut: boolean;
}

/** 시스템 클립보드 글자의 줄바꿈 차이(\r\n, \n)를 무시하고 비교한다. */
const normalize = (text: string) => text.split('\r\n').join('\n').replace(/\n$/, '');

interface UseClipboardOptions {
  workbook: Workbook;
  /** 거부 안내를 보여 준다(null이면 지운다). */
  onNotice: (message: string | null) => void;
  /** 쓰기 전에 대상 범위를 검사한다. 안내 문장을 돌려주면 반영하지 않는다(튜토리얼 허용 입력, CARD-03D). */
  guardWrite?: (sheet: string, range: CellRange) => string | null;
}

export function useClipboard({
  workbook,
  onNotice,
  guardWrite,
}: UseClipboardOptions): GridClipboard {
  const [copied, setCopiedState] = useState<Copied | null>(null);
  const copiedRef = useRef<Copied | null>(null);
  const setCopied = useCallback((next: Copied | null) => {
    copiedRef.current = next;
    setCopiedState(next);
  }, []);

  const copy = useCallback(
    (range: CellRange, cut: boolean, data: DataTransfer | null) => {
      const values: string[][] = [];
      const shown: string[][] = [];
      for (let row = range.startRow; row <= range.endRow; row += 1) {
        const rawRow: string[] = [];
        const shownRow: string[] = [];
        for (let col = range.startCol; col <= range.endCol; col += 1) {
          rawRow.push(workbook.getInput(row, col));
          shownRow.push(workbook.getResult(row, col).displayValue);
        }
        values.push(rawRow);
        shown.push(shownRow);
      }
      const text = toTsv(shown);
      setCopied({ sheet: workbook.activeSheet, range, values, text, cut });
      onNotice(null);
      if (data !== null) {
        data.setData('text/plain', text);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
        navigator.clipboard.writeText(text).catch(() => {
          onNotice('시스템 클립보드에 쓰지 못했습니다. 이 화면 안에서는 붙여넣을 수 있습니다.');
        });
      }
    },
    [workbook, onNotice, setCopied],
  );

  /** 붙여넣기가 쓸 범위가 허용 셀 밖이면 안내 문장. 범위를 못 정하는 경우(거부 사유)는 붙여넣기 본 경로가 안내한다. */
  const blockedPaste = useCallback(
    (source: Parameters<typeof pasteWrites>[0], target: CellRange): string | null => {
      if (guardWrite === undefined) return null;
      const planned = pasteWrites(source, target);
      return 'error' in planned ? null : guardWrite(workbook.activeSheet, planned.rect);
    },
    [guardWrite, workbook.activeSheet],
  );

  const pasteInternal = useCallback(
    (item: Copied, target: CellRange): CellRange | null => {
      if (item.cut) {
        const moved = {
          startRow: target.startRow,
          startCol: target.startCol,
          endRow: target.startRow + item.range.endRow - item.range.startRow,
          endCol: target.startCol + item.range.endCol - item.range.startCol,
        };
        const blocked =
          guardWrite?.(item.sheet, item.range) ?? guardWrite?.(workbook.activeSheet, moved) ?? null;
        if (blocked !== null) {
          onNotice(blocked);
          return null;
        }
        const refusal = workbook.moveCells({
          fromSheet: item.sheet,
          rect: item.range,
          toSheet: workbook.activeSheet,
          dRow: target.startRow - item.range.startRow,
          dCol: target.startCol - item.range.startCol,
        });
        onNotice(refusal);
        if (refusal !== null) return null;
        setCopied(null);
        return {
          startRow: target.startRow,
          startCol: target.startCol,
          endRow: target.startRow + item.range.endRow - item.range.startRow,
          endCol: target.startCol + item.range.endCol - item.range.startCol,
        };
      }
      const source = {
        values: item.values,
        origin: { row: item.range.startRow, col: item.range.startCol },
      };
      const blocked = blockedPaste(source, target);
      if (blocked !== null) {
        onNotice(blocked);
        return null;
      }
      const result = workbook.paste(source, target);
      if ('error' in result) {
        onNotice(result.error);
        return null;
      }
      onNotice(null);
      return result.rect;
    },
    [workbook, onNotice, setCopied, guardWrite, blockedPaste],
  );

  const pasteText = useCallback(
    (text: string, target: CellRange): CellRange | null => {
      if (text.length > MAX_PASTE_TEXT_LENGTH) {
        onNotice('붙여넣을 내용이 너무 큽니다.');
        return null;
      }
      const source = { values: parseTsv(text), origin: null };
      const blocked = blockedPaste(source, target);
      if (blocked !== null) {
        onNotice(blocked);
        return null;
      }
      const result = workbook.paste(source, target);
      if ('error' in result) {
        onNotice(result.error);
        return null;
      }
      onNotice(null);
      return result.rect;
    },
    [workbook, onNotice, blockedPaste],
  );

  const paste = useCallback(
    (target: CellRange, text: string | null): CellRange | null => {
      const item = copiedRef.current;
      if (text === null) {
        // 메뉴의 붙여넣기: 앱 안 복사가 있으면 그것을, 없으면 시스템 클립보드를 읽는다(권한을 물을 수 있다).
        if (item !== null) return pasteInternal(item, target);
        if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
          onNotice('이 브라우저에서는 메뉴로 붙여넣을 수 없습니다. Ctrl+V를 사용하세요.');
          return null;
        }
        navigator.clipboard
          .readText()
          .then((read) => pasteText(read, target))
          .catch(() => onNotice('클립보드를 읽지 못했습니다. Ctrl+V를 사용하세요.'));
        return null;
      }
      if (item !== null && normalize(text) === normalize(item.text)) {
        return pasteInternal(item, target);
      }
      return pasteText(text, target);
    },
    [pasteInternal, pasteText, onNotice],
  );

  const clear = useCallback(() => {
    if (copiedRef.current === null) return false;
    setCopied(null);
    return true;
  }, [setCopied]);

  const marquee = copied !== null && copied.sheet === workbook.activeSheet ? copied.range : null;

  return useMemo(() => ({ marquee, copy, paste, clear }), [marquee, copy, paste, clear]);
}
