/*
 * 실행 취소·다시 실행 스택 (CARD-02D, R-04.51, R-08.08, MASTER_PROMPT §9.2).
 * Command 패턴: 변경 하나를 apply/revert 쌍으로 기록한다. 통합 문서 명령은 workbookModel.ts가 만든다.
 *
 * §9.2 "사용자가 원하지 않는 한 작성한 데이터를 무조건 삭제하지 않는다"에 따라
 * - 기록 상한을 넘으면 가장 오래된 '기록'만 버린다. 셀 데이터는 그대로다.
 * - apply가 실패한 명령은 기록하지 않고 오류를 호출한 쪽에 그대로 알린다.
 */

export interface Command {
  /** 사용자에게 보여 줄 짧은 설명 (예: "B2 입력", "시트 추가") */
  readonly label: string;
  apply(): void;
  revert(): void;
}

export const HISTORY_LIMIT = 100;

export class HistoryManager<C extends Command = Command> {
  private readonly undoStack: C[] = [];
  private redoStack: C[] = [];

  constructor(private readonly limit: number = HISTORY_LIMIT) {}

  /** 명령을 실행하고 기록한다. 새 명령이 들어오면 다시 실행할 기록은 사라진다(일반적인 편집기 동작). */
  execute(command: C): void {
    command.apply();
    this.record(command);
  }

  /** 이미 적용된 변경을 기록만 한다(일부만 반영된 입력처럼 적용과 기록을 나눠야 할 때). */
  record(command: C): void {
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  /** 마지막 명령을 되돌린다. 되돌린 명령을 돌려주고, 없으면 null. */
  undo(): C | null {
    const command = this.undoStack.pop();
    if (command === undefined) return null;
    command.revert();
    this.redoStack.push(command);
    return command;
  }

  /** 마지막으로 되돌린 명령을 다시 실행한다. */
  redo(): C | null {
    const command = this.redoStack.pop();
    if (command === undefined) return null;
    command.apply();
    this.undoStack.push(command);
    return command;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoLabel(): string | null {
    return this.undoStack.at(-1)?.label ?? null;
  }

  get redoLabel(): string | null {
    return this.redoStack.at(-1)?.label ?? null;
  }

  get size(): number {
    return this.undoStack.length;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack = [];
  }
}
