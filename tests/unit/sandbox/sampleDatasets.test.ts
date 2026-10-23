import { afterEach, describe, expect, it } from 'vitest';

import { checkSnapshot, WorkbookModel } from '@/components/spreadsheet/workbookModel';
import { SAMPLE_DATASETS, sampleCells } from '@/content/sandbox/sampleDatasets';

/*
 * CARD-02D 연습실 샘플 데이터 (R-04.46, MASTER_PROMPT §10).
 * 스키마, 가상 데이터 점검(개인정보 형식·실존 기업명 없음), 불러온 뒤 셀 원문·계산값 확인.
 */

const allValues = SAMPLE_DATASETS.flatMap((dataset) => [
  dataset.title,
  dataset.description,
  ...dataset.rows.flat(),
]);

/** 실존 기업·브랜드 이름 일부. 샘플은 일반 명사만 쓴다. */
const REAL_COMPANIES = [
  '삼성',
  '현대',
  'LG',
  'SK',
  '롯데',
  '카카오',
  '네이버',
  '쿠팡',
  '신세계',
  '이마트',
  'CJ',
  '한화',
  'KT',
  '배민',
  '토스',
  'Apple',
  'Google',
  'Microsoft',
  'Amazon',
  'Samsung',
  'Hyundai',
  'Nike',
  'Starbucks',
  '스타벅스',
  '애플',
  '구글',
  '마이크로소프트',
  '아마존',
];

const models: WorkbookModel[] = [];
afterEach(() => {
  models.splice(0).forEach((model) => model.destroy());
});

describe('샘플 데이터 스키마', () => {
  it('판매 내역·상품 재고·출석 기록 세 가지가 있다', () => {
    expect(SAMPLE_DATASETS.map((dataset) => dataset.title)).toEqual([
      '판매 내역',
      '상품 재고',
      '출석 기록',
    ]);
  });

  it.each(SAMPLE_DATASETS.map((dataset) => [dataset.title, dataset] as const))(
    '%s: id·설명·머리글이 있고 엔진 상한 안이다',
    (_, dataset) => {
      expect(dataset.id).toMatch(/^[a-z-]+$/);
      expect(dataset.description.length).toBeGreaterThan(10);
      const header = dataset.rows[0] ?? [];
      expect(header.every((cell) => cell !== '' && !cell.startsWith('='))).toBe(true);
      expect(dataset.rows.every((row) => row.length === header.length)).toBe(true);
      expect(
        checkSnapshot({ sheets: [{ name: 'Sheet1', cells: sampleCells(dataset) }] }),
      ).toBeNull();
    },
  );

  it('id는 겹치지 않는다', () => {
    const ids = SAMPLE_DATASETS.map((dataset) => dataset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('가상 데이터만 쓴다 (MASTER_PROMPT §10)', () => {
  it('전화번호·이메일·주민등록번호·카드번호 형식의 값이 없다', () => {
    for (const value of allValues) {
      expect(value, value).not.toMatch(/\d{2,3}-\d{3,4}-\d{4}/);
      expect(value, value).not.toMatch(/@/);
      expect(value, value).not.toMatch(/\d{6}-?[1-4]\d{6}/);
      expect(value, value).not.toMatch(/\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}/);
    }
  });

  it('실존 기업·브랜드 이름이 없다', () => {
    for (const value of allValues) {
      for (const company of REAL_COMPANIES) {
        expect(value.includes(company), `${value}에 ${company}`).toBe(false);
      }
    }
  });

  it('출석 기록의 이름은 성 없이 두 글자 가상 이름이다', () => {
    const attendance = SAMPLE_DATASETS.find((dataset) => dataset.id === 'attendance');
    const names = attendance?.rows.slice(1, -1).map((row) => row[0] ?? '') ?? [];
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name).toMatch(/^[가-힣]{2}$/);
  });
});

describe('불러온 뒤 셀 값이 일치한다', () => {
  it.each(SAMPLE_DATASETS.map((dataset) => [dataset.title, dataset] as const))(
    '%s: 원문이 그대로 들어가고 수식에 오류가 없다',
    async (_, dataset) => {
      const model = await WorkbookModel.create({ sheets: [{ name: 'Sheet1', cells: {} }] });
      models.push(model);
      expect(model.replaceSheetCells('Sheet1', sampleCells(dataset))).toBeNull();
      dataset.rows.forEach((row, r) =>
        row.forEach((raw, c) => {
          expect(model.getInput('Sheet1', r, c)).toBe(raw);
          expect(model.getResult('Sheet1', r, c).error, `${dataset.id} ${r},${c}`).toBeNull();
        }),
      );
    },
  );

  it('계산 결과가 손으로 센 값과 같다', async () => {
    const model = await WorkbookModel.create({ sheets: [{ name: 'S', cells: {} }] });
    models.push(model);
    const byId = (id: string) => {
      const dataset = SAMPLE_DATASETS.find((item) => item.id === id);
      if (dataset === undefined) throw new Error(id);
      model.replaceSheetCells('S', sampleCells(dataset));
    };

    byId('sales');
    // 수량 합계 4+2+1+6+3+1+5+2 = 24, 금액 합계
    expect(model.getResult('S', 9, 3).value).toBe(24);
    expect(model.getResult('S', 9, 5).value).toBe(
      4 * 18000 + 2 * 42000 + 27000 + 6 * 18000 + 3 * 15500 + 42000 + 5 * 15500 + 2 * 18000,
    );
    expect(model.getResult('S', 1, 0).format).toBe('date');

    byId('inventory');
    // 지우개(12<15), A4 용지(8<10), 물티슈(빈 셀<30) → 3
    expect(model.getResult('S', 2, 5).value).toBe('보충 필요');
    expect(model.getResult('S', 7, 3).value).toBe(3);

    byId('attendance');
    expect(model.getResult('S', 1, 6).value).toBe(4);
    expect(model.getResult('S', 4, 6).value).toBe(5);
    expect(model.getResult('S', 6, 6).value).toBe((4 + 4 + 3 + 5 + 3) / 5);
  });
});
