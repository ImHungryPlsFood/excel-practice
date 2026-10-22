import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SpreadsheetPreviewMock } from '@/components/landing/SpreadsheetPreviewMock';
import { LandingPage } from '@/pages/LandingPage';

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage — MASTER_PROMPT §4.1 7대 필수 요소', () => {
  it('1. 서비스 이름과 독자적인 로고', () => {
    renderLanding();

    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('img', { name: 'CELLCRAFT 로고' })).toBeInTheDocument();
    expect(banner).toHaveTextContent('CELLCRAFT');
  });

  it('2. 한눈에 이해되는 서비스 소개', () => {
    renderLanding();

    const hero = screen.getByRole('region', { name: /직접 셀을 다루며 배우는 스프레드시트/ });
    expect(within(hero).getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(hero).toHaveTextContent('채점기');
  });

  it('3. 실제 스프레드시트가 보이는 미리보기', () => {
    renderLanding();

    const grid = screen.getByRole('grid', { name: '스프레드시트 미리보기' });
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(screen.getByRole('status', { name: '수식 입력줄' })).toBeInTheDocument();
  });

  it('4. 학습 시작 버튼', () => {
    renderLanding();

    expect(screen.getByRole('link', { name: '무료로 학습 시작하기' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('5. 학습 과정 소개', () => {
    renderLanding();

    const course = screen.getByRole('region', { name: /설명을 읽는 것만으로는 끝나지 않는/ });
    expect(within(course).getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });

  it('6. 초급부터 고급까지의 성장 경로 (Level 0~10)', () => {
    renderLanding();

    const roadmap = screen.getByRole('region', { name: /성장 경로/ });
    for (let level = 0; level <= 10; level += 1) {
      expect(within(roadmap).getByText(`L${level}`)).toBeInTheDocument();
    }
  });

  it('7. 자격증과 실무 학습 안내', () => {
    renderLanding();

    const certification = screen.getByRole('region', { name: /시험 준비와 실제 업무/ });
    expect(
      within(certification).getByRole('heading', { name: /컴퓨터활용능력 1·2급/ }),
    ).toBeInTheDocument();
    expect(
      within(certification).getByRole('heading', { name: /실무 프로젝트/ }),
    ).toBeInTheDocument();
  });

  it('GPLv3 의무: 푸터에 소스 코드 저장소 링크를 제공한다', () => {
    renderLanding();

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: /소스 코드 저장소/ })).toHaveAttribute(
      'href',
      'https://github.com/ImHungryPlsFood/excel-practice',
    );
  });
});

describe('SpreadsheetPreviewMock', () => {
  const nameBox = () => screen.getByRole('status', { name: '이름 상자' });
  const formulaBar = () => screen.getByRole('status', { name: '수식 입력줄' });
  const cell = (address: string) => {
    const grid = screen.getByRole('grid');
    const cells = within(grid).getAllByRole('gridcell');
    const match = cells.find((element) => element.id.endsWith(`-${address}`));
    if (match === undefined) throw new Error(`셀 ${address}를 찾을 수 없습니다.`);
    return match;
  };
  const numeric = (text: string | null) => Number((text ?? '').replace(/,/g, ''));

  it('starts with E2 selected and shows its formula', () => {
    render(<SpreadsheetPreviewMock />);

    expect(nameBox()).toHaveTextContent('E2');
    expect(formulaBar()).toHaveTextContent('=SUM(B2:D2)');
    expect(cell('E2')).toHaveAttribute('aria-selected', 'true');
  });

  it('selects a cell on click and shows its value when it has no formula', () => {
    render(<SpreadsheetPreviewMock />);

    fireEvent.click(cell('B3'));

    expect(nameBox()).toHaveTextContent('B3');
    expect(formulaBar()).toHaveTextContent(cell('B3').textContent ?? '');
    expect(cell('B3')).toHaveAttribute('aria-selected', 'true');
    expect(cell('E2')).toHaveAttribute('aria-selected', 'false');
  });

  it('moves the selection with arrow keys and stops at the edges', () => {
    render(<SpreadsheetPreviewMock />);
    const grid = screen.getByRole('grid');

    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    expect(nameBox()).toHaveTextContent('E3');

    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    expect(nameBox()).toHaveTextContent('E3');

    fireEvent.keyDown(grid, { key: 'ArrowLeft' });
    fireEvent.keyDown(grid, { key: 'ArrowUp' });
    fireEvent.keyDown(grid, { key: 'ArrowUp' });
    fireEvent.keyDown(grid, { key: 'ArrowUp' });
    expect(nameBox()).toHaveTextContent('D1');
    expect(grid).toHaveAttribute('aria-activedescendant', cell('D1').id);
  });

  it('shows totals that match the displayed data', () => {
    render(<SpreadsheetPreviewMock />);

    for (let row = 2; row <= 5; row += 1) {
      const rowSum = ['B', 'C', 'D'].reduce(
        (acc, col) => acc + numeric(cell(`${col}${row}`).textContent),
        0,
      );
      expect(numeric(cell(`E${row}`).textContent)).toBe(rowSum);
    }

    for (const col of ['B', 'C', 'D', 'E']) {
      const colSum = [2, 3, 4, 5].reduce(
        (acc, row) => acc + numeric(cell(`${col}${row}`).textContent),
        0,
      );
      expect(numeric(cell(`${col}6`).textContent)).toBe(colSum);
    }

    fireEvent.click(cell('E6'));
    expect(formulaBar()).toHaveTextContent('=SUM(E2:E5)');
  });
});
