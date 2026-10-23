import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';

import { SampleDataPicker } from '@/components/sandbox/SampleDataPicker';
import { Spreadsheet, type SpreadsheetHandle } from '@/components/spreadsheet/Spreadsheet';
import { useWorkbook } from '@/components/spreadsheet/hooks/useWorkbook';
import { snapshotFromRows, type WorkbookSnapshot } from '@/components/spreadsheet/workbookModel';
import { Button } from '@/components/ui/Button';
import { sampleCells, type SampleDataset } from '@/content/sandbox/sampleDatasets';
import { ENGINE_LIMITS } from '@/engine/spreadsheet/FormulaEngineAdapter';
import {
  deleteFromStorage,
  downloadFileName,
  listSavedFiles,
  loadFromStorage,
  MAX_FILE_BYTES,
  parseSandboxFile,
  saveToStorage,
  serializeSandboxFile,
  validateFileName,
  type SandboxStorage,
  type SandboxFile,
} from '@/services/sandbox/sandboxFileStore';

/*
 * 연습실 (/sandbox, CARD-02D, MASTER_PROMPT §4.5).
 * 빈 스프레드시트 만들기(R-04.45), 샘플 데이터 불러오기(R-04.46), 셀 편집·수식 입력(R-04.47·48, 02B·02C 구현),
 * 여러 시트(R-04.49), 실행 취소·다시 실행(R-04.51), 학습 파일 저장(R-04.52: 브라우저 저장 + JSON 파일, 사용자 결정 2026-10-23).
 *
 * 학습 모드와 분리: 이 화면은 자체 통합 문서(useWorkbook)와 연습실 전용 저장소 키만 쓰고 학습 진도·채점 상태를 건드리지 않는다.
 * 지금 내용을 바꾸는 동작(빈 시트·샘플·불러오기)은 모두 실행 취소할 수 있고(§9.2),
 * 저장하지 않은 작업이 있으면 한 번 더 확인한다.
 */

const BLANK: WorkbookSnapshot = snapshotFromRows([]);

/** 접근 자체가 예외를 던질 수 있어(사생활 보호 모드 등) 매번 저장소 함수 안에서 읽는다. */
const browserStorage: SandboxStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

type Panel = 'samples' | 'save' | 'open' | null;

interface Feedback {
  tone: 'info' | 'error';
  text: string;
}

interface PendingAction {
  message: string;
  confirmLabel: string;
  run: () => void;
}

const sheetsKey = (snapshot: WorkbookSnapshot | null) =>
  snapshot === null ? '' : JSON.stringify(snapshot.sheets);

const hasAnyData = (snapshot: WorkbookSnapshot | null) =>
  snapshot !== null && snapshot.sheets.some((sheet) => Object.keys(sheet.cells).length > 0);

function formatSavedAt(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function SandboxPage() {
  const workbook = useWorkbook(BLANK);
  const sheetRef = useRef<SpreadsheetHandle>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  // 마지막으로 저장·불러오기·새로 만들기를 한 시점의 내용. 이것과 다르면 저장하지 않은 작업이 있는 것이다.
  const [baseline, setBaseline] = useState(() => sheetsKey(BLANK));
  const [fileName, setFileName] = useState('연습 1');
  const [savedList, setSavedList] = useState(() => listSavedFiles(browserStorage));

  const ready = workbook.status === 'ready';

  const report = (tone: Feedback['tone'], text: string) => setFeedback({ tone, text });
  const refreshList = () => setSavedList(listSavedFiles(browserStorage));

  /** 저장하지 않은 작업이 있으면 확인을 받고, 없으면 바로 실행한다. */
  const guardUnsaved = (message: string, confirmLabel: string, run: () => void) => {
    const current = workbook.snapshot();
    if (hasAnyData(current) && sheetsKey(current) !== baseline) {
      setPending({
        message: `${message} 저장하지 않은 작업이 있습니다. 계속해도 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.`,
        confirmLabel,
        run,
      });
    } else {
      run();
    }
  };

  /** 통합 문서를 통째로 바꾸고 저장 기준점을 옮긴다. */
  const replaceAll = (snapshot: WorkbookSnapshot, label: string, done: string): boolean => {
    const refusal = workbook.replaceWorkbook(snapshot, label);
    if (refusal !== null) {
      report('error', refusal);
      return false;
    }
    setBaseline(sheetsKey(snapshot));
    report('info', done);
    setPanel(null);
    sheetRef.current?.selectCell(0, 0);
    return true;
  };

  const createBlank = () =>
    guardUnsaved('지금 통합 문서를 빈 스프레드시트로 바꿉니다.', '빈 스프레드시트 만들기', () =>
      replaceAll(BLANK, '빈 스프레드시트 만들기', '빈 스프레드시트를 만들었습니다.'),
    );

  const loadSample = (dataset: SampleDataset) => {
    const run = () => {
      const refusal = workbook.replaceActiveSheet(
        sampleCells(dataset),
        `샘플 불러오기: ${dataset.title}`,
      );
      if (refusal !== null) {
        report('error', refusal);
        return;
      }
      report('info', `${workbook.activeSheet} 시트에 '${dataset.title}' 샘플을 불러왔습니다.`);
      setPanel(null);
      sheetRef.current?.selectCell(0, 0);
    };
    if (workbook.sheetHasData(workbook.activeSheet)) {
      setPending({
        message: `${workbook.activeSheet} 시트의 내용을 '${dataset.title}' 샘플로 바꿉니다. 원래 내용은 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.`,
        confirmLabel: '샘플로 바꾸기',
        run,
      });
    } else {
      run();
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const snapshot = workbook.snapshot();
    if (snapshot === null) return;
    const name = fileName.trim();
    const problem = validateFileName(name);
    if (problem !== null) {
      report('error', problem);
      return;
    }
    const run = () => {
      const file: SandboxFile = { name, savedAt: new Date().toISOString(), workbook: snapshot };
      const refusal = saveToStorage(browserStorage, file);
      if (refusal !== null) {
        report('error', refusal);
        return;
      }
      setBaseline(sheetsKey(snapshot));
      refreshList();
      setPanel(null);
      report('info', `'${name}'(으)로 브라우저에 저장했습니다.`);
    };
    if (savedList.files.some((saved) => saved.name === name)) {
      setPending({
        message: `'${name}' 파일이 이미 있습니다. 덮어쓸까요? 덮어쓴 파일은 되돌릴 수 없습니다.`,
        confirmLabel: '덮어쓰기',
        run,
      });
    } else {
      run();
    }
  };

  const openSaved = (name: string) =>
    guardUnsaved(`'${name}' 파일을 불러옵니다.`, '불러오기', () => {
      const result = loadFromStorage(browserStorage, name);
      if (!result.ok) {
        report('error', result.error);
        return;
      }
      if (replaceAll(result.file.workbook, `불러오기: ${name}`, `'${name}' 파일을 불러왔습니다.`)) {
        setFileName(name);
      }
    });

  const deleteSaved = (name: string) =>
    setPending({
      message: `브라우저에 저장한 '${name}' 파일을 삭제합니다. 삭제한 파일은 되돌릴 수 없습니다.`,
      confirmLabel: '파일 삭제',
      run: () => {
        const refusal = deleteFromStorage(browserStorage, name);
        refreshList();
        report(refusal === null ? 'info' : 'error', refusal ?? `'${name}' 파일을 삭제했습니다.`);
      },
    });

  const download = () => {
    const snapshot = workbook.snapshot();
    if (snapshot === null) return;
    const name = fileName.trim() === '' ? '연습실' : fileName.trim();
    const text = serializeSandboxFile({
      name: name.slice(0, 60),
      savedAt: new Date().toISOString(),
      workbook: snapshot,
    });
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFileName(name);
    link.click();
    URL.revokeObjectURL(url);
    setBaseline(sheetsKey(snapshot));
    report('info', `${link.download} 파일로 내려받았습니다.`);
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // 같은 파일을 다시 고를 수 있도록 비운다.
    input.value = '';
    if (file === undefined) return;
    if (file.size > MAX_FILE_BYTES) {
      report('error', `파일이 너무 큽니다(최대 ${MAX_FILE_BYTES / 1024 / 1024}MB).`);
      return;
    }
    const result = parseSandboxFile(await file.text());
    if (!result.ok) {
      report('error', `${file.name}: ${result.error}`);
      return;
    }
    const { workbook: snapshot, name } = result.file;
    guardUnsaved(`'${file.name}' 파일을 불러옵니다.`, '불러오기', () => {
      if (replaceAll(snapshot, `파일 올리기: ${name}`, `'${file.name}' 파일을 불러왔습니다.`)) {
        setFileName(name);
      }
    });
  };

  const togglePanel = (next: Exclude<Panel, null>) => {
    setPending(null);
    if (next === 'open') refreshList();
    setPanel((current) => (current === next ? null : next));
  };

  let panelContent: ReactNode = null;
  if (panel === 'samples') {
    panelContent = <SampleDataPicker sheetName={workbook.activeSheet} onLoad={loadSample} />;
  } else if (panel === 'save') {
    panelContent = (
      <form onSubmit={save} className="flex flex-wrap items-end gap-2" aria-label="브라우저에 저장">
        <label className="flex flex-col gap-1 text-sm text-fg-secondary">
          파일 이름
          <input
            value={fileName}
            maxLength={60}
            onChange={(event) => setFileName(event.target.value)}
            className="h-(--cc-control-height-sm) w-60 rounded-md border border-line-strong bg-surface px-2 text-fg"
          />
        </label>
        <Button type="submit" size="sm">
          저장
        </Button>
        <p className="w-full text-xs text-fg-muted">
          이 브라우저에만 저장됩니다. 다른 기기로 옮기려면 &lsquo;파일로 내려받기&rsquo;를 쓰세요.
        </p>
      </form>
    );
  } else if (panel === 'open') {
    panelContent = (
      <section aria-label="저장한 파일" className="flex flex-col gap-2 text-sm">
        {savedList.error !== null && <p className="text-error">{savedList.error}</p>}
        {savedList.skipped > 0 && (
          <p className="text-warning">
            손상된 저장 항목 {savedList.skipped}개는 불러올 수 없어 목록에서 뺐습니다.
          </p>
        )}
        {savedList.files.length === 0 ? (
          <p className="text-fg-secondary">브라우저에 저장한 파일이 없습니다.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {savedList.files.map((saved) => (
              <li key={saved.name} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="font-medium text-fg">{saved.name}</span>
                <span className="text-xs text-fg-muted">
                  {formatSavedAt(saved.savedAt)} · 시트 {saved.sheetCount}개
                </span>
                <span className="ml-auto flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`${saved.name} 불러오기`}
                    onClick={() => openSaved(saved.name)}
                  >
                    불러오기
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${saved.name} 삭제`}
                    onClick={() => deleteSaved(saved.name)}
                  >
                    삭제
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="sandbox-title" className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h1 id="sandbox-title" className="text-2xl font-semibold text-fg">
          연습실
        </h1>
        <p className="text-sm text-fg-secondary">
          자유롭게 셀을 편집하고 수식을 실험하는 공간입니다. 여기서 한 작업은 학습 진도와 채점에
          영향을 주지 않습니다.
        </p>
      </header>

      <div role="toolbar" aria-label="연습실 도구" className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!ready} onClick={createBlank}>
          빈 스프레드시트
        </Button>
        <Button
          variant={panel === 'samples' ? 'primary' : 'secondary'}
          size="sm"
          aria-expanded={panel === 'samples'}
          disabled={!ready}
          onClick={() => togglePanel('samples')}
        >
          샘플 데이터
        </Button>
        <span className="mx-1 h-5 border-l border-line" aria-hidden="true" />
        <Button
          variant={panel === 'save' ? 'primary' : 'secondary'}
          size="sm"
          aria-expanded={panel === 'save'}
          disabled={!ready}
          onClick={() => togglePanel('save')}
        >
          저장
        </Button>
        <Button
          variant={panel === 'open' ? 'primary' : 'secondary'}
          size="sm"
          aria-expanded={panel === 'open'}
          disabled={!ready}
          onClick={() => togglePanel('open')}
        >
          저장한 파일 열기
        </Button>
        <Button variant="secondary" size="sm" disabled={!ready} onClick={download}>
          파일로 내려받기
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!ready}
          onClick={() => uploadRef.current?.click()}
        >
          파일 올리기
        </Button>
        <input
          ref={uploadRef}
          type="file"
          accept=".json,application/json"
          aria-label="연습실 파일 올리기"
          className="hidden"
          onChange={(event) => void upload(event)}
        />
        <span className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!workbook.canUndo}
            title={workbook.undoLabel === null ? undefined : `실행 취소: ${workbook.undoLabel}`}
            onClick={workbook.undo}
          >
            실행 취소
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!workbook.canRedo}
            title={workbook.redoLabel === null ? undefined : `다시 실행: ${workbook.redoLabel}`}
            onClick={workbook.redo}
          >
            다시 실행
          </Button>
        </span>
      </div>

      {pending !== null && (
        <div
          role="alertdialog"
          aria-label="확인"
          className="flex flex-wrap items-center gap-2 rounded-md border border-warning bg-warning-bg px-3 py-2 text-sm text-fg"
        >
          <span className="flex-1">{pending.message}</span>
          <Button
            size="sm"
            onClick={() => {
              const { run } = pending;
              setPending(null);
              run();
            }}
          >
            {pending.confirmLabel}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPending(null)}>
            취소
          </Button>
        </div>
      )}

      {panelContent !== null && (
        <div className="rounded-md border border-line bg-canvas p-3">{panelContent}</div>
      )}

      <p
        role="status"
        aria-label="연습실 알림"
        className={[
          'min-h-5 text-sm',
          feedback?.tone === 'error' ? 'text-error' : 'text-fg-secondary',
        ].join(' ')}
      >
        {feedback?.text ?? ''}
      </p>

      <div className="flex h-[calc(100vh-20rem)] min-h-[420px] flex-col overflow-hidden rounded-md border border-line">
        <Spreadsheet
          ref={sheetRef}
          workbook={workbook}
          label="연습실 시트"
          rowCount={ENGINE_LIMITS.maxRows}
          colCount={ENGINE_LIMITS.maxColumns}
          className="min-h-0 flex-1"
        />
      </div>
    </section>
  );
}
