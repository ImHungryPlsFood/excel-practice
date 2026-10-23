import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { SandboxPage } from '@/pages/SandboxPage';
import { SANDBOX_STORAGE_KEY } from '@/services/sandbox/sandboxFileStore';

import { cellAt, installLayoutStubs } from '../helpers/layoutStubs';

/*
 * CARD-02D 연습실 화면 (R-04.45~R-04.49, R-04.51, R-04.52).
 * 실제 엔진·localStorage(jsdom)와 함께 그린다. 파일 내려받기와 새로고침 후 복원은 E2E(sandbox.spec.ts)가 확인한다.
 */

installLayoutStubs();

beforeEach(() => {
  window.localStorage.clear();
});

const cellInput = () => screen.getByRole<HTMLInputElement>('textbox', { name: /^연습실 시트 / });
const notice = () => screen.getByRole('status', { name: '연습실 알림' });
const toolbar = () => screen.getByRole('toolbar', { name: '연습실 도구' });
const tool = (name: string) => within(toolbar()).getByRole('button', { name });

async function setup() {
  const view = render(<SandboxPage />);
  await waitFor(() => expect(tool('빈 스프레드시트')).toBeEnabled());
  return view;
}

function type(container: HTMLElement, row: number, col: number, value: string) {
  fireEvent.mouseDown(cellAt(container, row, col), { button: 0 });
  fireEvent.change(cellInput(), { target: { value } });
  fireEvent.keyDown(cellInput(), { key: 'Enter' });
}

describe('연습실 기본 동작', () => {
  it('빈 시트에서 셀 편집과 수식 입력이 된다 (R-04.47, R-04.48)', async () => {
    const { container } = await setup();
    expect(screen.getByRole('heading', { level: 1, name: '연습실' })).toBeInTheDocument();
    type(container, 0, 0, '12');
    type(container, 0, 1, '=A1*3');
    expect(cellAt(container, 0, 1)).toHaveTextContent('36');
  });

  it('도구 모음의 실행 취소·다시 실행 (R-04.51)', async () => {
    const { container } = await setup();
    expect(tool('실행 취소')).toBeDisabled();
    type(container, 0, 0, '5');
    fireEvent.click(tool('실행 취소'));
    expect(cellAt(container, 0, 0)).toHaveTextContent('');
    fireEvent.click(tool('다시 실행'));
    expect(cellAt(container, 0, 0)).toHaveTextContent('5');
  });

  it('샘플 데이터를 지금 시트로 불러온다 (R-04.46)', async () => {
    const { container } = await setup();
    fireEvent.click(tool('샘플 데이터'));
    fireEvent.click(screen.getByRole('button', { name: '판매 내역 불러오기' }));
    expect(cellAt(container, 0, 0)).toHaveTextContent('날짜');
    expect(cellAt(container, 1, 5)).toHaveTextContent('72000');
    expect(notice()).toHaveTextContent("'판매 내역' 샘플을 불러왔습니다");
  });

  it('값이 있는 시트에 샘플을 불러오면 확인하고, 실행 취소로 원래 내용을 되찾는다 (§9.2)', async () => {
    const { container } = await setup();
    type(container, 0, 0, '내 메모');
    fireEvent.click(tool('샘플 데이터'));
    fireEvent.click(screen.getByRole('button', { name: '출석 기록 불러오기' }));
    const dialog = screen.getByRole('alertdialog', { name: '확인' });
    expect(dialog).toHaveTextContent('실행 취소');
    expect(cellAt(container, 0, 0)).toHaveTextContent('내 메모');
    fireEvent.click(within(dialog).getByRole('button', { name: '샘플로 바꾸기' }));
    expect(cellAt(container, 0, 0)).toHaveTextContent('이름');
    fireEvent.click(tool('실행 취소'));
    expect(cellAt(container, 0, 0)).toHaveTextContent('내 메모');
    expect(cellAt(container, 0, 1)).toHaveTextContent('');
  });

  it('빈 스프레드시트 만들기: 저장하지 않은 작업이 있으면 확인하고, 취소하면 그대로 둔다 (R-04.45)', async () => {
    const { container } = await setup();
    type(container, 0, 0, '작업 중');
    fireEvent.click(tool('빈 스프레드시트'));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }));
    expect(cellAt(container, 0, 0)).toHaveTextContent('작업 중');

    fireEvent.click(tool('빈 스프레드시트'));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: '빈 스프레드시트 만들기',
      }),
    );
    expect(cellAt(container, 0, 0)).toHaveTextContent('');
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    fireEvent.click(tool('실행 취소'));
    expect(cellAt(container, 0, 0)).toHaveTextContent('작업 중');
  });
});

describe('학습 파일 저장 (R-04.52)', () => {
  it('브라우저에 저장하고, 화면을 다시 열어 불러오면 값·수식·시트가 같다', async () => {
    const first = await setup();
    type(first.container, 0, 0, '3');
    type(first.container, 0, 1, '=A1+1');
    fireEvent.click(screen.getByRole('button', { name: '시트 추가' }));
    type(first.container, 1, 1, '=Sheet1!B1*10');
    fireEvent.click(tool('저장'));
    fireEvent.change(screen.getByRole('textbox', { name: '파일 이름' }), {
      target: { value: '내 연습' },
    });
    fireEvent.click(
      within(screen.getByRole('form', { name: '브라우저에 저장' })).getByRole('button', {
        name: '저장',
      }),
    );
    expect(notice()).toHaveTextContent("'내 연습'(으)로 브라우저에 저장했습니다");
    expect(window.localStorage.getItem(SANDBOX_STORAGE_KEY)).toContain('내 연습');
    first.unmount();

    const second = await setup();
    expect(cellAt(second.container, 0, 0)).toHaveTextContent('');
    fireEvent.click(tool('저장한 파일 열기'));
    fireEvent.click(screen.getByRole('button', { name: '내 연습 불러오기' }));
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Sheet1', 'Sheet2']);
    expect(screen.getByRole('tab', { name: 'Sheet2' })).toHaveAttribute('aria-selected', 'true');
    expect(cellAt(second.container, 1, 1)).toHaveTextContent('40');
    fireEvent.click(screen.getByRole('tab', { name: 'Sheet1' }));
    expect(cellAt(second.container, 0, 1)).toHaveTextContent('4');
    fireEvent.mouseDown(cellAt(second.container, 0, 1), { button: 0 });
    expect(screen.getByRole('textbox', { name: /^수식 입력줄/ })).toHaveValue('=A1+1');
  });

  it('같은 이름으로 저장하면 덮어쓸지 묻는다', async () => {
    const { container } = await setup();
    const saveAs = (name: string) => {
      fireEvent.click(tool('저장'));
      const form = screen.getByRole('form', { name: '브라우저에 저장' });
      fireEvent.change(within(form).getByRole('textbox', { name: '파일 이름' }), {
        target: { value: name },
      });
      fireEvent.click(within(form).getByRole('button', { name: '저장' }));
    };
    type(container, 0, 0, '1');
    saveAs('a');
    type(container, 0, 0, '2');
    saveAs('a');
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('덮어쓸까요');
    fireEvent.click(within(dialog).getByRole('button', { name: '덮어쓰기' }));
    expect(window.localStorage.getItem(SANDBOX_STORAGE_KEY)).toContain('"A1":"2"');
  });

  it('저장한 파일 삭제는 확인한다', async () => {
    const { container } = await setup();
    type(container, 0, 0, '1');
    fireEvent.click(tool('저장'));
    fireEvent.click(
      within(screen.getByRole('form', { name: '브라우저에 저장' })).getByRole('button', {
        name: '저장',
      }),
    );
    fireEvent.click(tool('저장한 파일 열기'));
    fireEvent.click(screen.getByRole('button', { name: '연습 1 삭제' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: '파일 삭제' }),
    );
    expect(screen.getByText('브라우저에 저장한 파일이 없습니다.')).toBeInTheDocument();
  });

  it('손상된 파일을 올리면 아무것도 바꾸지 않고 이유를 보여 준다', async () => {
    const { container } = await setup();
    type(container, 0, 0, '그대로');
    const input = screen.getByLabelText<HTMLInputElement>('연습실 파일 올리기');
    const bad = new File(['{"format":"cellcraft-sandbox","version":1,"sheets":"x"}'], 'bad.json', {
      type: 'application/json',
    });
    await act(async () => {
      fireEvent.change(input, { target: { files: [bad] } });
    });
    await waitFor(() => expect(notice()).toHaveTextContent('bad.json:'));
    expect(cellAt(container, 0, 0)).toHaveTextContent('그대로');
  });

  it('올바른 파일을 올리면 불러온다', async () => {
    const { container } = await setup();
    const text = JSON.stringify({
      format: 'cellcraft-sandbox',
      version: 1,
      name: '올린 파일',
      savedAt: '2026-10-23T00:00:00.000Z',
      sheets: [{ name: '자료', cells: { A1: '2', B1: '=자료!A1*21' } }],
    });
    const input = screen.getByLabelText<HTMLInputElement>('연습실 파일 올리기');
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File([text], 'ok.json')] } });
    });
    await waitFor(() => expect(cellAt(container, 0, 1)).toHaveTextContent('42'));
    expect(screen.getByRole('tab', { name: '자료' })).toBeInTheDocument();
  });
});
