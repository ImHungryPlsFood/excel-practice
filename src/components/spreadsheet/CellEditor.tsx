import {
  forwardRef,
  type ChangeEventHandler,
  type ClipboardEventHandler,
  type CompositionEventHandler,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type ReactEventHandler,
} from 'react';

import { KEEP_EDITING_ATTRIBUTE } from './editorFocus';

/*
 * 셀 위 인라인 편집기 (CARD-02C, CARD-02A에서 SpreadsheetGrid 안에 있던 입력 상자를 분리).
 *
 * 키보드 입력은 활성 셀 위에 겹친 이 <input> 하나가 항상 받는다. 편집 중이 아닐 때는 투명하게 두는데,
 * 이렇게 해야 셀을 고른 뒤 바로 한글을 쳐도 IME 조합이 정상으로 시작된다(div에 포커스를 두면
 * 첫 자모가 조합되지 않거나 따로 떨어진다).
 *
 * data-keep-cell-editing: 포커스가 이 요소와 수식 입력줄 사이를 오갈 때는 편집을 확정하지 않는다는 표시다.
 * CARD-02E: 커서 위치(onSelect, 포인트 모드)와 복사·잘라내기·붙여넣기 이벤트(편집 중이 아닐 때 셀 범위 복사)를 그리드에 넘긴다.
 */

interface CellEditorProps {
  label: string;
  activeDescendant: string;
  isEditing: boolean;
  value: string;
  top: number;
  left: number;
  width: number;
  height: number;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onCompositionStart: CompositionEventHandler<HTMLInputElement>;
  onCompositionEnd: CompositionEventHandler<HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLInputElement>;
  onSelect: ReactEventHandler<HTMLInputElement>;
  onCopy: ClipboardEventHandler<HTMLInputElement>;
  onCut: ClipboardEventHandler<HTMLInputElement>;
  onPaste: ClipboardEventHandler<HTMLInputElement>;
}

export const CellEditor = forwardRef<HTMLInputElement, CellEditorProps>(function CellEditor(
  { label, activeDescendant, isEditing, value, top, left, width, height, ...handlers },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-label={label}
      aria-activedescendant={activeDescendant}
      data-editing={isEditing ? 'true' : 'false'}
      {...{ [KEEP_EDITING_ATTRIBUTE]: '' }}
      autoComplete="off"
      spellCheck={false}
      value={value}
      onChange={handlers.onChange}
      onKeyDown={handlers.onKeyDown}
      onCompositionStart={handlers.onCompositionStart}
      onCompositionEnd={handlers.onCompositionEnd}
      onBlur={handlers.onBlur}
      onSelect={handlers.onSelect}
      onCopy={handlers.onCopy}
      onCut={handlers.onCut}
      onPaste={handlers.onPaste}
      className={[
        'absolute z-[5] m-0 border-0 px-1 text-sm leading-6 outline-2 -outline-offset-2',
        // 편집 중이 아닐 때는 마우스 이벤트를 아래 셀로 통과시켜 활성 셀에서도 더블클릭·드래그가 된다.
        isEditing
          ? 'bg-cell text-fg outline-editing'
          : 'pointer-events-none bg-transparent text-transparent caret-transparent outline-selected',
      ].join(' ')}
      style={{ top, left, width, height }}
    />
  );
});
