// npm 의존성 라이선스 감사 (ADR-001 §4.2, THREAT_MODEL S-10, CARD-01A).
// 본 프로젝트는 HyperFormula 채택으로 GPL-3.0-or-later로 배포된다.
//   - production 의존성: 빌드 산출물에 결합·배포되므로 GPLv3 호환 라이선스만 허용한다.
//   - development 의존성: 배포물에 포함되지 않는 도구이므로 허용 목록을 넓히되, 목록 밖이면 실패한다.
// 참고: https://www.gnu.org/licenses/license-list.html (법률 자문이 아님)
import { init } from 'license-checker-rseidelsohn';

const GPL3_COMPATIBLE = [
  'MIT',
  'MIT-0',
  'ISC',
  '0BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'CC0-1.0',
  'Unlicense',
  'Python-2.0',
  'MPL-2.0',
  'LGPL-2.1-or-later',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
];

// 배포되지 않는 개발 도구에만 추가로 허용하는 라이선스.
const DEV_ONLY_EXTRA = ['BlueOak-1.0.0', 'CC-BY-3.0', 'CC-BY-4.0'];

const PRODUCTION_ALLOWED = new Set(GPL3_COMPATIBLE);
const DEVELOPMENT_ALLOWED = new Set([...GPL3_COMPATIBLE, ...DEV_ONLY_EXTRA]);

function collect(production) {
  return new Promise((resolve, reject) => {
    init(
      {
        start: process.cwd(),
        production,
        development: !production,
        excludePrivatePackages: true,
      },
      (error, packages) => {
        if (error) {
          reject(error);
        } else {
          resolve(packages);
        }
      },
    );
  });
}

// 단순 SPDX 표현식 평가: "A OR B"는 하나라도 허용되면 통과, "A AND B"는 모두 허용되어야 통과.
// 라이선스 추정값(끝에 '*')이나 OR/AND 혼합식은 수동 검토 대상으로 보고 실패 처리한다.
function isAllowed(license, allowed) {
  if (license.endsWith('*')) {
    return false;
  }
  const expression = license.replace(/[()]/g, '').trim();
  const hasOr = expression.includes(' OR ');
  const hasAnd = expression.includes(' AND ');
  if (hasOr && hasAnd) {
    return false;
  }
  if (hasOr) {
    return expression.split(' OR ').some((part) => allowed.has(part.trim()));
  }
  if (hasAnd) {
    return expression.split(' AND ').every((part) => allowed.has(part.trim()));
  }
  return allowed.has(expression);
}

function audit(label, packages, allowed) {
  const violations = [];
  for (const [name, info] of Object.entries(packages)) {
    const licenses = Array.isArray(info.licenses) ? info.licenses : [info.licenses ?? 'UNKNOWN'];
    // 배열로 나열된 경우 모두 적용되는 것으로 보고 전부 허용되어야 한다.
    if (!licenses.every((license) => isAllowed(String(license), allowed))) {
      violations.push(`${name}: ${licenses.join(', ')}`);
    }
  }
  const total = Object.keys(packages).length;
  console.log(`[${label}] ${total}개 패키지 검사, 위반 ${violations.length}건`);
  for (const violation of violations) {
    console.error(`  ✗ ${violation}`);
  }
  return violations.length;
}

const productionViolations = audit('production', await collect(true), PRODUCTION_ALLOWED);
const developmentViolations = audit('development', await collect(false), DEVELOPMENT_ALLOWED);

if (productionViolations + developmentViolations > 0) {
  console.error('라이선스 감사 실패: 허용 목록 밖의 라이선스가 있습니다.');
  process.exitCode = 1;
} else {
  console.log('라이선스 감사 통과');
}
