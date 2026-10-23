/*
 * 셀 편집기와 수식 입력줄 사이의 포커스 이동 판정 (CARD-02C).
 * 두 입력 상자는 같은 편집 상태를 공유하므로, 포커스가 둘 사이를 오갈 때는 편집을 확정하지 않는다.
 */

/** 이 속성이 있는 요소로 포커스가 옮겨 가면 편집을 이어 간다. */
export const KEEP_EDITING_ATTRIBUTE = 'data-keep-cell-editing';

/** blur의 relatedTarget이 편집을 이어 가는 요소(수식 입력줄·셀 편집기·fx 버튼)인지 */
export function movesFocusWithinEditors(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${KEEP_EDITING_ATTRIBUTE}]`) !== null;
}
