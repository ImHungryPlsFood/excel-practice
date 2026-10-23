/*
 * 셀 의존성 DAG (CARD-02B).
 * 노드는 셀 키(예: "Sheet1!A1")이고, 간선 A → B는 "A의 수식이 B를 참조한다"는 뜻이다.
 * 계산 자체는 엔진이 하고, 이 그래프는 순환 참조 판정과 영향받는 셀(의존 셀) 조회를 엔진과 독립적으로 맡는다.
 * 모든 순회는 명시적 스택을 써서 깊은 참조 사슬에서도 호출 스택이 넘치지 않는다.
 */

export class DependencyGraph {
  /** 노드 → 그 노드가 참조하는 노드들 */
  private readonly precedents = new Map<string, Set<string>>();
  /** 노드 → 그 노드를 참조하는 노드들 (역방향 색인) */
  private readonly dependents = new Map<string, Set<string>>();

  /** node가 참조하는 대상을 통째로 바꾼다. 빈 배열이면 참조가 없는 셀(값 셀)이 된다. */
  setPrecedents(node: string, targets: Iterable<string>): void {
    this.removePrecedents(node);
    const next = new Set(targets);
    if (next.size === 0) {
      return;
    }
    this.precedents.set(node, next);
    for (const target of next) {
      let set = this.dependents.get(target);
      if (!set) {
        set = new Set();
        this.dependents.set(target, set);
      }
      set.add(node);
    }
  }

  removePrecedents(node: string): void {
    const previous = this.precedents.get(node);
    if (!previous) {
      return;
    }
    for (const target of previous) {
      const set = this.dependents.get(target);
      set?.delete(node);
      if (set?.size === 0) {
        this.dependents.delete(target);
      }
    }
    this.precedents.delete(node);
  }

  getPrecedents(node: string): string[] {
    return [...(this.precedents.get(node) ?? [])];
  }

  /** node 값이 바뀌면 다시 계산해야 하는 노드 전체 (node 자신은 순환에 걸린 경우에만 포함). */
  getTransitiveDependents(node: string): string[] {
    const seen = new Set<string>();
    const stack = [...(this.dependents.get(node) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (seen.has(current)) {
        continue;
      }
      seen.add(current);
      for (const next of this.dependents.get(current) ?? []) {
        if (!seen.has(next)) {
          stack.push(next);
        }
      }
    }
    return [...seen];
  }

  /** node에서 참조를 따라가다 node로 돌아오면 순환이다. 자기 자신 참조(A1 = A1)도 순환이다. */
  isInCycle(node: string): boolean {
    const seen = new Set<string>();
    const stack = [...(this.precedents.get(node) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (current === node) {
        return true;
      }
      if (seen.has(current)) {
        continue;
      }
      seen.add(current);
      for (const next of this.precedents.get(current) ?? []) {
        stack.push(next);
      }
    }
    return false;
  }

  /**
   * 순환이 없으면 참조 대상이 먼저 오는 계산 순서를 돌려준다(Kahn 알고리즘).
   * 순환이 있으면 순서를 정할 수 없으므로 null.
   */
  topologicalOrder(): string[] | null {
    const nodes = new Set<string>([...this.precedents.keys(), ...this.dependents.keys()]);
    const remaining = new Map<string, number>();
    for (const node of nodes) {
      remaining.set(node, this.precedents.get(node)?.size ?? 0);
    }
    const ready = [...nodes].filter((node) => remaining.get(node) === 0);
    const order: string[] = [];
    while (ready.length > 0) {
      const node = ready.pop() as string;
      order.push(node);
      for (const dependent of this.dependents.get(node) ?? []) {
        const left = (remaining.get(dependent) ?? 0) - 1;
        remaining.set(dependent, left);
        if (left === 0) {
          ready.push(dependent);
        }
      }
    }
    return order.length === nodes.size ? order : null;
  }

  clear(): void {
    this.precedents.clear();
    this.dependents.clear();
  }
}
