import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENGINE_LIMITS, FormulaEngineInputError } from '@/engine/spreadsheet/FormulaEngineAdapter';
import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import { INTERSECTION_UNSUPPORTED_MESSAGE } from '@/engine/spreadsheet/errorMessages';
import {
  KNOWN_UNSUPPORTED_FUNCTIONS,
  SUPPORTED_FUNCTIONS,
} from '@/engine/spreadsheet/supportedFunctions';

let engine: HyperFormulaAdapter;

beforeEach(async () => {
  engine = new HyperFormulaAdapter();
  await engine.initWorkbook({ Sheet1: [], Data: [] });
});

afterEach(() => {
  engine.destroy();
});

const value = (formula: string, sheet = 'Sheet1') => {
  engine.setCellContent(sheet, 9, 9, formula);
  return engine.getCellValue(sheet, 9, 9);
};

describe('기본 계산', () => {
  it('사칙연산과 연산자 우선순위', () => {
    expect(value('=1+2*3').value).toBe(7);
    expect(value('=(1+2)*3').value).toBe(9);
    expect(value('=2^10').value).toBe(1024);
    expect(value('=-3^2').value).toBe(9); // Excel: 단항 음수가 거듭제곱보다 먼저
    expect(value('=10/4').value).toBe(2.5);
  });

  it('셀 참조(A1+B1)와 범위 함수(SUM(A1:A5))', () => {
    [10, 20, 30, 40, 50].forEach((n, row) => engine.setCellContent('Sheet1', row, 0, n));
    engine.setCellContent('Sheet1', 0, 1, 5);
    expect(value('=A1+B1').value).toBe(15);
    expect(value('=SUM(A1:A5)').value).toBe(150);
    expect(value('=AVERAGE(A1:A5)').value).toBe(30);
  });

  it('수식과 계산 결과를 분리해 돌려준다', () => {
    engine.setCellContent('Sheet1', 0, 0, 2);
    engine.setCellContent('Sheet1', 0, 1, '=A1*3');
    expect(engine.getCellValue('Sheet1', 0, 1)).toMatchObject({
      value: 6,
      formula: '=A1*3',
      displayValue: '6',
      error: null,
    });
    expect(engine.getCellFormula('Sheet1', 0, 1)).toBe('=A1*3');
    expect(engine.getCellFormula('Sheet1', 0, 0)).toBeNull();
    expect(engine.getCellValue('Sheet1', 0, 0).formula).toBeUndefined();
  });

  it('TRUE·FALSE를 Excel처럼 상수로 쓴다', () => {
    expect(value('=IF(TRUE,1,2)').value).toBe(1);
    expect(value('=AND(TRUE,FALSE)').value).toBe(false);
    expect(value('=AND(TRUE,FALSE)').displayValue).toBe('FALSE');
  });

  it('빈 셀 참조는 0이다', () => {
    expect(value('=Z9').value).toBe(0);
  });
});

describe('참조', () => {
  it('상대·절대·혼합 참조가 같은 셀을 가리킨다', () => {
    engine.setCellContent('Sheet1', 0, 0, 7);
    for (const ref of ['A1', '$A$1', 'A$1', '$A1']) {
      expect(value(`=${ref}*2`).value).toBe(14);
    }
  });

  it('여러 시트 간 참조', () => {
    engine.setCellContent('Data', 1, 1, 100);
    engine.setCellContent('Data', 2, 1, 200);
    expect(value('=Data!B2+Data!B3').value).toBe(300);
    expect(value('=SUM(Data!B2:B3)').value).toBe(300);
  });

  it('공백이 든 시트 이름은 작은따옴표로 참조한다', () => {
    engine.addSheet('월별 매출');
    engine.setCellContent('월별 매출', 0, 0, 42);
    expect(value("='월별 매출'!A1").value).toBe(42);
  });

  it('없는 시트를 참조하면 #REF!', () => {
    expect(value('=Nope!A1').error?.code).toBe('#REF!');
  });

  it('참조하던 시트를 지우면 #REF!가 된다', () => {
    engine.setCellContent('Data', 0, 0, 1);
    engine.setCellContent('Sheet1', 0, 0, '=Data!A1');
    engine.deleteSheet('Data');
    expect(engine.getCellValue('Sheet1', 0, 0).error?.code).toBe('#REF!');
  });

  it('시트 이름을 바꾸면 수식의 참조도 따라간다', () => {
    engine.setCellContent('Data', 0, 0, 5);
    engine.setCellContent('Sheet1', 0, 0, '=Data!A1');
    engine.renameSheet('Data', '자료');
    expect(engine.getCellFormula('Sheet1', 0, 0)).toContain('자료');
    expect(engine.getCellValue('Sheet1', 0, 0).value).toBe(5);
  });
});

describe('재계산 (R-08.20)', () => {
  it('입력값을 바꾸면 직접·간접 의존 셀이 다시 계산된다', () => {
    engine.setCellContent('Sheet1', 0, 0, 1);
    engine.setCellContent('Sheet1', 0, 1, '=A1*10');
    engine.setCellContent('Sheet1', 0, 2, '=B1+1');
    expect(engine.getCellValue('Sheet1', 0, 2).value).toBe(11);
    engine.setCellContent('Sheet1', 0, 0, 5);
    expect(engine.getCellValue('Sheet1', 0, 1).value).toBe(50);
    expect(engine.getCellValue('Sheet1', 0, 2).value).toBe(51);
  });

  it('의존 관계를 조회한다', () => {
    engine.setCellContent('Sheet1', 0, 1, '=SUM(A1:A2)');
    engine.setCellContent('Sheet1', 0, 2, '=B1*2');
    expect(engine.getDependencies('Sheet1', 0, 1)).toEqual(
      expect.arrayContaining([
        { sheet: 'Sheet1', row: 0, col: 0 },
        { sheet: 'Sheet1', row: 1, col: 0 },
      ]),
    );
    expect(engine.getDependents('Sheet1', 1, 0)).toEqual(
      expect.arrayContaining([
        { sheet: 'Sheet1', row: 0, col: 1 },
        { sheet: 'Sheet1', row: 0, col: 2 },
      ]),
    );
  });

  it('수식을 값으로 덮어쓰면 의존 관계가 사라진다', () => {
    engine.setCellContent('Sheet1', 0, 1, '=A1');
    engine.setCellContent('Sheet1', 0, 1, 3);
    expect(engine.getDependencies('Sheet1', 0, 1)).toEqual([]);
    expect(engine.getDependents('Sheet1', 0, 0)).toEqual([]);
  });
});

describe('오류 처리 (R-08.19, R-08.23)', () => {
  it.each([
    ['=1/0', '#DIV/0!'],
    ['="가"+1', '#VALUE!'],
    ['=SQRT(-1)', '#NUM!'],
    ['=FOOBAR(1)', '#NAME?'],
    ['=SUM(1', '#ERROR!'],
  ])('%s → %s', (formula, code) => {
    const result = value(formula);
    expect(result.error?.code).toBe(code);
    expect(result.value).toBeNull();
    expect(result.displayValue).toBe(code);
    expect(result.error?.message).not.toBe('');
  });

  it('VLOOKUP에서 값을 못 찾으면 #N/A와 VLOOKUP 전용 안내', () => {
    engine.setCellContent('Sheet1', 0, 0, 1);
    engine.setCellContent('Sheet1', 1, 0, 2);
    const result = value('=VLOOKUP(9,A1:A2,1,FALSE)');
    expect(result.error?.code).toBe('#N/A');
    expect(result.error?.message).toContain('VLOOKUP');
  });

  it('오류는 의존 셀로 전파되고 IFERROR로 처리할 수 있다', () => {
    engine.setCellContent('Sheet1', 0, 0, '=1/0');
    expect(value('=A1+1').error?.code).toBe('#DIV/0!');
    expect(value('=IFERROR(A1,"없음")').value).toBe('없음');
  });
});

describe('조건 함수의 문자열 비교', () => {
  beforeEach(() => {
    ['영업', '개발', '인사', '개발'].forEach((text, row) =>
      engine.setCellContent('Sheet1', row, 0, text),
    );
  });

  it('와일드카드 ?는 한글 한 음절과 맞는다', () => {
    expect(value('=COUNTIF(A1:A4,"?발")').value).toBe(2);
    expect(value('=COUNTIF(A1:A4,"개?")').value).toBe(2);
    expect(value('=COUNTIF(A1:A4,"??")').value).toBe(4);
  });

  it('Excel처럼 대소문자는 무시하고 악센트는 구분한다', () => {
    engine.setCellContent('Sheet1', 5, 0, 'Café');
    expect(value('=COUNTIF(A6,"café")').value).toBe(1);
    expect(value('=COUNTIF(A6,"cafe")').value).toBe(0);
  });
});

describe('지원하지 않는 함수 (R-08.25)', () => {
  it('모르는 함수는 임의 값 없이 #NAME?과 함수 이름을 알린다', () => {
    const result = value('=FOOBAR(1)');
    expect(result.value).toBeNull();
    expect(result.error?.message).toContain('FOOBAR');
  });

  it.each(Object.keys(KNOWN_UNSUPPORTED_FUNCTIONS))(
    'Excel에는 있지만 엔진에 없는 %s는 대체 방법을 안내한다',
    (name) => {
      const result = value(`=${name}(1,A1:A3)`);
      expect(result.error?.code).toBe('#NAME?');
      expect(result.error?.message).toBe(KNOWN_UNSUPPORTED_FUNCTIONS[name]);
    },
  );

  it('문자열 안의 함수 모양 글자는 함수로 보지 않는다', () => {
    expect(value('=LEN("FOOBAR(1)")').value).toBe(9);
  });
});

// CONCAT은 HyperFormula에 없어 excelCompatPlugin.ts에서 구현했다.
// 기대값은 Microsoft 지원 문서 "CONCAT 함수"의 동작이다: 범위는 행 우선으로 펼치고, 빈 셀은 건너뛰며(빈 문자열),
// 숫자는 '일반' 서식(유효 숫자 15자리), 논리값은 TRUE/FALSE, 오류 인수는 그 오류, 결과가 32,767자를 넘으면 #VALUE!.
// 기본 동작(셀·문자열 인수)은 골든 대조 CoreFunctions!C28에서 Excel 값과 일치함을 확인했다.
describe('CONCAT (Excel 2019+)', () => {
  beforeEach(() => {
    // A1:B2 = 가 나 / 1.5 TRUE, A3은 빈 셀, B3 = 다
    engine.setCellContent('Sheet1', 0, 0, '가');
    engine.setCellContent('Sheet1', 0, 1, '나');
    engine.setCellContent('Sheet1', 1, 0, 1.5);
    engine.setCellContent('Sheet1', 1, 1, true);
    engine.setCellContent('Sheet1', 2, 1, '다');
  });

  it('범위 인수를 행 우선으로 잇는다', () => {
    expect(value('=CONCAT(A1:B2)').value).toBe('가나1.5TRUE');
  });

  it('빈 셀은 빈 문자열로 건너뛴다', () => {
    expect(value('=CONCAT(A3:B3)').value).toBe('다');
    expect(value('=CONCAT(A3,"-",A3)').value).toBe('-');
  });

  it('숫자는 일반 서식(유효 숫자 15자리)으로 바꾼다', () => {
    expect(value('=CONCAT(0.1+0.2)').value).toBe('0.3');
    expect(value('=CONCAT(1000000,"원")').value).toBe('1000000원');
    expect(value('=CONCAT(-2.5)').value).toBe('-2.5');
  });

  it('날짜·백분율 값은 서식 없이 일련번호·소수로 잇는다', () => {
    expect(value('=CONCAT(DATE(2024,3,15))').value).toBe('45366');
    expect(value('=CONCAT(10%)').value).toBe('0.1');
  });

  it('논리값은 TRUE/FALSE', () => {
    expect(value('=CONCAT(TRUE,FALSE,1>2)').value).toBe('TRUEFALSEFALSE');
  });

  it('인수 중 오류가 있으면 그 오류를 돌려준다', () => {
    engine.setCellContent('Sheet1', 3, 0, '=1/0');
    expect(value('=CONCAT("a",A4)').error?.code).toBe('#DIV/0!');
    expect(value('=CONCAT(A1:A4)').error?.code).toBe('#DIV/0!');
  });

  it('결과가 32,767자를 넘으면 #VALUE!', () => {
    engine.setCellContent('Sheet1', 4, 0, '=REPT("가",32767)');
    expect(value('=LEN(CONCAT(A5))').value).toBe(32767);
    expect(value('=CONCAT(A5,"나")').error?.code).toBe('#VALUE!');
  });
});

// INDEX는 범위 밖 번호에 Excel처럼 #REF!를 돌려주도록 excelCompatPlugin.ts에서 교체했다(D-2, Microsoft "INDEX 함수").
describe('INDEX', () => {
  beforeEach(() => {
    [
      [1, 2, 3],
      [4, 5, 6],
    ].forEach((cells, row) =>
      cells.forEach((n, col) => engine.setCellContent('Sheet1', row, col, n)),
    );
  });

  it('행·열 번호로 값을 찾는다', () => {
    expect(value('=INDEX(A1:C2,2,3)').value).toBe(6);
    expect(value('=INDEX(A1:A2,2)').value).toBe(4);
  });

  it('한 행짜리 범위에 번호 하나면 열 번호로 쓴다', () => {
    expect(value('=INDEX(A1:C1,3)').value).toBe(3);
  });

  it('범위를 벗어나면 #REF!와 INDEX 전용 안내', () => {
    for (const formula of ['=INDEX(A1:A2,5)', '=INDEX(A1:C2,1,4)', '=INDEX(A1:C1,4)']) {
      const result = value(formula);
      expect(result.error?.code, formula).toBe('#REF!');
      expect(result.error?.message).toContain('INDEX');
    }
  });

  it('0 이하 번호는 #VALUE!와 INDEX 전용 안내', () => {
    expect(value('=INDEX(A1:A2,-1)').error?.code).toBe('#VALUE!');
    expect(value('=INDEX(A1:A2,0)').error?.message).toContain('INDEX');
  });

  it('MATCH와 함께 쓴다', () => {
    expect(value('=INDEX(B1:B2,MATCH(4,A1:A2,0))').value).toBe(5);
  });
});

describe('교집합 연산자 안내 (R-08.25)', () => {
  it.each(['=SUM(A1:A2 B1:B2)', '=A1 B1', '=SUM(Data!A1:A2 Data!B1:B2)', "='월'!A1 B2"])(
    '%s → 교집합 미지원 안내',
    (formula) => {
      if (formula.includes("'월'")) {
        engine.addSheet('월');
      }
      const result = value(formula);
      expect(result.error?.code).toBe('#ERROR!');
      expect(result.error?.message).toBe(INTERSECTION_UNSUPPORTED_MESSAGE);
    },
  );

  it.each(['=SUM(1', '=1+', '=SUM(A1:A2 B1:B2', '=SUM((A1)', '="A1 B1"&'])(
    '%s 같은 다른 문법 오류는 일반 문법 안내를 유지한다',
    (formula) => {
      const result = value(formula);
      expect(result.error?.code).toBe('#ERROR!');
      expect(result.error?.message).not.toBe(INTERSECTION_UNSUPPORTED_MESSAGE);
    },
  );

  it('문자열 안의 공백은 연산자로 보지 않는다', () => {
    expect(value('=LEN("A1 B1")')).toMatchObject({ value: 5, error: null });
  });
});

describe('지원 함수 목록 (R-08.21)', () => {
  it('목록의 모든 함수를 엔진이 실제로 등록하고 있다', () => {
    const missing = SUPPORTED_FUNCTIONS.filter(({ name }) => !engine.isFunctionSupported(name));
    expect(missing).toEqual([]);
  });

  it('미지원으로 표시한 함수는 실제로 엔진에 없다', () => {
    for (const name of Object.keys(KNOWN_UNSUPPORTED_FUNCTIONS)) {
      expect(engine.isFunctionSupported(name)).toBe(false);
    }
  });

  it('이름은 대소문자를 가리지 않는다', () => {
    expect(engine.isFunctionSupported('sum')).toBe(true);
  });
});

describe('순환 참조', () => {
  it('자기 자신 참조와 여러 셀을 거친 순환은 무한 루프 없이 #CYCLE!', () => {
    engine.setCellContent('Sheet1', 0, 0, '=A1+1');
    expect(engine.getCellValue('Sheet1', 0, 0).error?.code).toBe('#CYCLE!');

    engine.setCellContent('Sheet1', 1, 0, '=B2');
    engine.setCellContent('Sheet1', 1, 1, '=C2');
    engine.setCellContent('Sheet1', 1, 2, '=A2');
    for (const col of [0, 1, 2]) {
      expect(engine.getCellValue('Sheet1', 1, col).error?.code).toBe('#CYCLE!');
    }
  });

  it('순환을 끊으면 정상 값으로 돌아온다', () => {
    engine.setCellContent('Sheet1', 0, 0, '=B1');
    engine.setCellContent('Sheet1', 0, 1, '=A1');
    engine.setCellContent('Sheet1', 0, 1, 4);
    expect(engine.getCellValue('Sheet1', 0, 0)).toMatchObject({ value: 4, error: null });
  });
});

describe('표시 값 (R-08.22)', () => {
  it('날짜 함수 결과는 날짜로, 백분율은 %로 표시한다', () => {
    expect(value('=DATE(2024,3,15)')).toMatchObject({ displayValue: '2024-03-15', format: 'date' });
    expect(value('=10%')).toMatchObject({ value: 0.1, displayValue: '10%', format: 'percent' });
  });

  it('부동소수 오차는 값에 남기고 표시는 15자리로 정리한다', () => {
    const result = value('=0.1+0.2');
    expect(result.value).toBe(0.1 + 0.2);
    expect(result.displayValue).toBe('0.3');
  });

  it('문자열 연결', () => {
    expect(value('="합계: "&10').displayValue).toBe('합계: 10');
  });
});

describe('입력 제한 (S-09)', () => {
  it(`${ENGINE_LIMITS.maxFormulaLength}자를 넘는 수식은 거부한다`, () => {
    const atLimit = `=${'1+'.repeat((ENGINE_LIMITS.maxFormulaLength - 2) / 2)}1`;
    expect(atLimit).toHaveLength(ENGINE_LIMITS.maxFormulaLength);
    expect(() => engine.setCellContent('Sheet1', 0, 0, atLimit)).not.toThrow();
    expect(() => engine.setCellContent('Sheet1', 0, 0, `${atLimit}1`)).toThrow(
      FormulaEngineInputError,
    );
  });

  it('시트 상한을 벗어난 셀은 거부한다', () => {
    expect(() => engine.setCellContent('Sheet1', ENGINE_LIMITS.maxRows, 0, 1)).toThrow(
      FormulaEngineInputError,
    );
    expect(() => engine.setCellContent('Sheet1', 0, ENGINE_LIMITS.maxColumns, 1)).toThrow(
      FormulaEngineInputError,
    );
    expect(() => engine.setCellContent('Sheet1', -1, 0, 1)).toThrow(FormulaEngineInputError);
  });

  it('상한을 넘는 통합 문서는 기존 상태를 지우지 않고 거부한다', async () => {
    engine.setCellContent('Sheet1', 0, 0, 3);
    const tooWide = [Array.from({ length: ENGINE_LIMITS.maxColumns + 1 }, () => 1)];
    await expect(engine.initWorkbook({ Big: tooWide })).rejects.toThrow(FormulaEngineInputError);
    expect(engine.getCellValue('Sheet1', 0, 0).value).toBe(3);
  });

  it('없는 시트는 오류로 알린다', () => {
    expect(() => engine.getCellValue('없는시트', 0, 0)).toThrow(FormulaEngineInputError);
  });
});

describe('엔진 설정 (ADR-001)', () => {
  it('HyperFormula를 GPLv3 라이선스 키로 사용한다', () => {
    expect(engine.id).toBe('hyperformula');
    // 라이선스 키가 잘못되면 HyperFormula는 모든 수식 결과를 #LIC! 오류로 돌려준다.
    expect(value('=1+1')).toMatchObject({ value: 2, error: null });
  });
});
