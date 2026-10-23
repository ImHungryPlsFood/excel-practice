import { useId, useRef, useState, type KeyboardEvent } from 'react';

/*
 * 시트 탭 (CARD-02D, R-04.49, R-08.12): 시트 전환, 추가, 이름 변경, 삭제.
 * 탭 상태(시트 목록·활성 시트)는 통합 문서(useWorkbook)가 가지고, 여기서는 동작만 알린다.
 * 시트 추가·이름 변경·삭제는 모두 실행 취소할 수 있다. 값이 있는 시트를 지울 때는 한 번 더 확인한다(MASTER_PROMPT §9.2).
 */

interface SheetTabsProps {
  sheets: readonly string[];
  activeSheet: string;
  onSelect: (name: string) => void;
  /** 거부되면 안내 문장 */
  onAdd: () => string | null;
  /** 거부되면 안내 문장 */
  onRename: (oldName: string, newName: string) => string | null;
  /** 거부되면 안내 문장 */
  onDelete: (name: string) => string | null;
  /** 시트에 값이 있는지(삭제 확인 여부) */
  hasData: (name: string) => boolean;
  /** 탭 작업이 끝나면 그리드로 포커스를 돌려준다. */
  onDone?: () => void;
}

const TAB_BASE =
  'max-w-40 truncate border-r border-line px-3 py-1 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus';
const ACTION =
  'rounded-sm px-2 py-0.5 text-xs text-fg-secondary hover:bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-50';

export function SheetTabs({
  sheets,
  activeSheet,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  hasData,
  onDone,
}: SheetTabsProps) {
  const messageId = useId();
  const [renaming, setRenamingState] = useState<{ name: string; draft: string } | null>(null);
  // Enter·Esc로 끝낸 뒤 그리드로 포커스가 옮겨 가며 생기는 blur가 지난 상태로 한 번 더 처리하지 않도록
  // 최신 편집 상태를 ref에도 둔다.
  const renamingRef = useRef(renaming);
  const setRenaming = (next: { name: string; draft: string } | null) => {
    renamingRef.current = next;
    setRenamingState(next);
  };
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const startRename = (name: string) => {
    setConfirmingDelete(null);
    setMessage(null);
    setRenaming({ name, draft: name });
  };

  /** 이름 변경을 확정한다. 거부되면 편집을 이어 가고 이유를 보여 준다. */
  const commitRename = (): boolean => {
    const current = renamingRef.current;
    if (current === null) return true;
    const refusal = onRename(current.name, current.draft);
    if (refusal !== null) {
      setMessage(refusal);
      return false;
    }
    setRenaming(null);
    setMessage(null);
    return true;
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (commitRename()) onDone?.();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setRenaming(null);
      setMessage(null);
      onDone?.();
    }
  };

  const report = (refusal: string | null) => {
    setMessage(refusal);
    if (refusal === null) onDone?.();
  };

  const requestDelete = (name: string) => {
    setRenaming(null);
    if (hasData(name)) {
      setConfirmingDelete(name);
      setMessage(null);
    } else {
      report(onDelete(name));
    }
  };

  return (
    <div className="flex flex-col border-t border-line bg-surface">
      <div className="flex min-h-8 items-stretch overflow-x-auto">
        <div role="tablist" aria-label="시트" className="flex items-stretch">
          {sheets.map((name) =>
            renaming?.name === name ? (
              <input
                key={name}
                aria-label={`${name} 시트 새 이름`}
                aria-describedby={message === null ? undefined : messageId}
                aria-invalid={message === null ? undefined : true}
                autoFocus
                value={renaming.draft}
                onChange={(event) => setRenaming({ name, draft: event.target.value })}
                onKeyDown={handleRenameKeyDown}
                onBlur={() => {
                  // 포커스를 잃었을 때 이름이 규칙에 맞지 않으면 원래 이름으로 둔다.
                  if (!commitRename()) {
                    setRenaming(null);
                    setMessage(null);
                  }
                }}
                className="w-32 border-r border-line bg-cell px-2 text-sm outline-2 -outline-offset-2 outline-focus"
              />
            ) : (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={name === activeSheet}
                title="두 번 클릭하면 이름을 바꿀 수 있습니다"
                onClick={() => {
                  setConfirmingDelete(null);
                  setMessage(null);
                  if (name !== activeSheet) onSelect(name);
                  onDone?.();
                }}
                onDoubleClick={() => startRename(name)}
                className={[
                  TAB_BASE,
                  name === activeSheet
                    ? 'bg-cell font-semibold text-brand'
                    : 'text-fg-secondary hover:bg-subtle',
                ].join(' ')}
              >
                {name}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          aria-label="시트 추가"
          title="시트 추가"
          onClick={() => {
            setRenaming(null);
            setConfirmingDelete(null);
            report(onAdd());
          }}
          className="px-3 text-base text-fg-secondary hover:bg-subtle hover:text-fg"
        >
          +
        </button>
        <div className="ml-auto flex items-center gap-1 px-2">
          <button type="button" className={ACTION} onClick={() => startRename(activeSheet)}>
            이름 바꾸기
          </button>
          <button
            type="button"
            className={ACTION}
            disabled={sheets.length <= 1}
            title={sheets.length <= 1 ? '마지막 시트는 삭제할 수 없습니다' : undefined}
            onClick={() => requestDelete(activeSheet)}
          >
            시트 삭제
          </button>
        </div>
      </div>
      {confirmingDelete !== null && (
        <div
          role="alertdialog"
          aria-label="시트 삭제 확인"
          className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-1.5 text-sm"
        >
          <span>
            {confirmingDelete} 시트에 입력한 값이 있습니다. 삭제할까요? 삭제한 뒤에도 실행
            취소(Ctrl+Z)로 되돌릴 수 있습니다.
          </span>
          <button
            type="button"
            className="rounded-md border border-error px-2 py-0.5 text-error hover:bg-subtle"
            onClick={() => {
              const name = confirmingDelete;
              setConfirmingDelete(null);
              report(onDelete(name));
            }}
          >
            삭제
          </button>
          <button
            type="button"
            className="rounded-md border border-line px-2 py-0.5 hover:bg-subtle"
            onClick={() => {
              setConfirmingDelete(null);
              onDone?.();
            }}
          >
            취소
          </button>
        </div>
      )}
      {message !== null && (
        <p
          id={messageId}
          role="alert"
          className="border-t border-line px-3 py-1 text-sm text-error"
        >
          {message}
        </p>
      )}
    </div>
  );
}
