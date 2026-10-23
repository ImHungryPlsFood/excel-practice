/// <reference types="node" />
/*
 * 테스트 전용 최소 xlsx 읽기 도구 (CARD-02B, Q-01).
 * 새 패키지 없이 Node 내장 zlib과 jsdom의 DOMParser로 골든 통합 문서의 수식(<f>)과 Excel이 저장한 값(<v>)을 읽는다.
 * 지원 범위: 저장 방식 0(무압축)·8(deflate), 공유 문자열, 인라인 문자열, 숫자·논리·오류·수식 문자열 값.
 * 다른 셀 수식을 빌려 쓰는 공유 수식(<f t="shared">)은 참조 이동 계산이 필요해 지원하지 않고 오류로 알린다.
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

export type XlsxCellValue =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'error'; value: string }
  | { kind: 'empty' };

export interface XlsxCell {
  ref: string;
  row: number; // 0부터
  col: number; // 0부터
  /** '='를 붙인 수식. Excel 파일 형식의 _xlfn. 같은 접두사는 떼어 낸다. */
  formula?: string;
  /** 배열 수식(<f t="array">)이면 결과가 채워지는 범위. 예: 'A2:A4'. */
  arrayRef?: string;
  /** 파일에 저장된 값. 수식 셀이면 Excel이 계산해 둔 결과. */
  cached: XlsxCellValue;
}

export interface XlsxSheet {
  name: string;
  cells: XlsxCell[];
}

export interface XlsxWorkbook {
  sheets: XlsxSheet[];
  fullCalcOnLoad: boolean;
}

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function unzip(buffer: Buffer): Map<string, Buffer> {
  // 중앙 디렉터리 끝(EOCD) 레코드를 뒤에서부터 찾는다.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 0xffff); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error('zip 형식이 아닙니다(중앙 디렉터리 끝을 찾지 못함).');
  }
  const count = buffer.readUInt16LE(eocd + 10);
  let pointer = buffer.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) {
      throw new Error('zip 중앙 디렉터리 항목이 손상되었습니다.');
    }
    const method = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString('utf8', pointer + 46, pointer + 46 + nameLength);

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(start, start + compressedSize);
    if (method === 0) {
      files.set(name, Buffer.from(data));
    } else if (method === 8) {
      files.set(name, inflateRawSync(data));
    } else {
      throw new Error(`지원하지 않는 zip 압축 방식 ${method}: ${name}`);
    }
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function parseXml(files: Map<string, Buffer>, path: string): Document {
  const data = files.get(path);
  if (!data) {
    throw new Error(`통합 문서에 ${path}가 없습니다.`);
  }
  const doc = new DOMParser().parseFromString(data.toString('utf8'), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error(`${path} XML을 해석하지 못했습니다.`);
  }
  return doc;
}

function children(parent: Element | Document, localName: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS(NS_MAIN, localName));
}

/** <si>나 <is> 안의 모든 <t> 텍스트를 이어 붙인다(서식 있는 텍스트 run 포함, 발음 표기 rPh 제외). */
function richText(element: Element): string {
  return children(element, 't')
    .filter((t) => t.parentElement?.localName !== 'rPh')
    .map((t) => t.textContent ?? '')
    .join('');
}

function parseRef(ref: string): { row: number; col: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!match?.[1] || !match[2]) {
    throw new Error(`셀 주소를 해석하지 못했습니다: ${ref}`);
  }
  const col = [...match[1]].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { row: Number(match[2]) - 1, col };
}

function resolveTarget(target: string): string {
  return target.startsWith('/') ? target.slice(1) : `xl/${target}`;
}

export function readXlsx(path: string): XlsxWorkbook {
  const files = unzip(readFileSync(path));
  const workbook = parseXml(files, 'xl/workbook.xml');
  const rels = parseXml(files, 'xl/_rels/workbook.xml.rels');

  const targets = new Map<string, string>();
  for (const rel of Array.from(rels.getElementsByTagName('Relationship'))) {
    targets.set(rel.getAttribute('Id') ?? '', rel.getAttribute('Target') ?? '');
  }

  const sharedStrings = files.has('xl/sharedStrings.xml')
    ? children(parseXml(files, 'xl/sharedStrings.xml'), 'si').map(richText)
    : [];

  const calcPr = children(workbook, 'calcPr')[0];
  const fullCalcOnLoad = ['1', 'true'].includes(calcPr?.getAttribute('fullCalcOnLoad') ?? '');

  const sheets = children(workbook, 'sheet').map((sheetElement): XlsxSheet => {
    const name = sheetElement.getAttribute('name') ?? '';
    const relId = sheetElement.getAttributeNS(NS_REL, 'id') ?? '';
    const target = targets.get(relId);
    if (!target) {
      throw new Error(`시트 ${name}의 파일 경로를 찾지 못했습니다.`);
    }
    const doc = parseXml(files, resolveTarget(target));
    const cells = children(doc, 'c').map((c): XlsxCell => {
      const ref = c.getAttribute('r') ?? '';
      const type = c.getAttribute('t') ?? 'n';
      const f = children(c, 'f')[0];
      const v = children(c, 'v')[0];
      const raw = v?.textContent ?? null;

      let formula: string | undefined;
      let arrayRef: string | undefined;
      if (f) {
        const text = f.textContent ?? '';
        if (f.getAttribute('t') === 'shared' && text === '') {
          throw new Error(
            `${name}!${ref}: 공유 수식(t="shared")은 이 읽기 도구가 지원하지 않습니다.`,
          );
        }
        formula = `=${text.replace(/_xlfn\.|_xlws\./g, '')}`;
        if (f.getAttribute('t') === 'array') {
          arrayRef = f.getAttribute('ref') ?? undefined;
        }
      }

      let cached: XlsxCellValue = { kind: 'empty' };
      if (type === 'inlineStr') {
        const is = children(c, 'is')[0];
        cached = { kind: 'string', value: is ? richText(is) : '' };
      } else if (raw !== null) {
        if (type === 's') {
          const text = sharedStrings[Number(raw)];
          if (text === undefined) {
            throw new Error(`${name}!${ref}: 공유 문자열 ${raw}번이 없습니다.`);
          }
          cached = { kind: 'string', value: text };
        } else if (type === 'str') {
          cached = { kind: 'string', value: raw };
        } else if (type === 'b') {
          cached = { kind: 'boolean', value: raw === '1' };
        } else if (type === 'e') {
          cached = { kind: 'error', value: raw };
        } else {
          cached = { kind: 'number', value: Number(raw) };
        }
      }
      return {
        ref,
        ...parseRef(ref),
        ...(formula === undefined ? {} : { formula }),
        ...(arrayRef === undefined ? {} : { arrayRef }),
        cached,
      };
    });
    return { name, cells };
  });

  return { sheets, fullCalcOnLoad };
}
