import { describe, expect, it } from 'vitest';

import { DependencyGraph } from '@/engine/spreadsheet/evaluator/dependencyGraph';

describe('DependencyGraph', () => {
  it('간접 의존 셀을 모두 찾는다', () => {
    const graph = new DependencyGraph();
    graph.setPrecedents('B1', ['A1']);
    graph.setPrecedents('C1', ['B1']);
    graph.setPrecedents('D1', ['A1', 'C1']);
    expect(graph.getTransitiveDependents('A1').sort()).toEqual(['B1', 'C1', 'D1']);
    expect(graph.getTransitiveDependents('D1')).toEqual([]);
  });

  it('참조를 바꾸면 이전 간선이 지워진다', () => {
    const graph = new DependencyGraph();
    graph.setPrecedents('B1', ['A1']);
    graph.setPrecedents('B1', ['C1']);
    expect(graph.getTransitiveDependents('A1')).toEqual([]);
    expect(graph.getTransitiveDependents('C1')).toEqual(['B1']);
    graph.setPrecedents('B1', []);
    expect(graph.getPrecedents('B1')).toEqual([]);
    expect(graph.getTransitiveDependents('C1')).toEqual([]);
  });

  it('자기 참조와 여러 단계 순환을 감지한다', () => {
    const graph = new DependencyGraph();
    graph.setPrecedents('A1', ['A1']);
    expect(graph.isInCycle('A1')).toBe(true);

    graph.setPrecedents('B1', ['C1']);
    graph.setPrecedents('C1', ['D1']);
    graph.setPrecedents('D1', ['B1']);
    expect(['B1', 'C1', 'D1'].every((node) => graph.isInCycle(node))).toBe(true);
    expect(graph.topologicalOrder()).toBeNull();
  });

  it('순환에 이어진 셀이라도 스스로 돌아오지 않으면 순환이 아니다', () => {
    const graph = new DependencyGraph();
    graph.setPrecedents('A1', ['B1']);
    graph.setPrecedents('B1', ['C1']);
    graph.setPrecedents('C1', ['B1']);
    expect(graph.isInCycle('A1')).toBe(false);
    expect(graph.isInCycle('B1')).toBe(true);
  });

  it('순환이 없으면 참조 대상이 먼저 오는 순서를 만든다', () => {
    const graph = new DependencyGraph();
    graph.setPrecedents('C1', ['B1', 'A1']);
    graph.setPrecedents('B1', ['A1']);
    const order = graph.topologicalOrder();
    expect(order).not.toBeNull();
    const position = (node: string) => (order as string[]).indexOf(node);
    expect(position('A1')).toBeLessThan(position('B1'));
    expect(position('B1')).toBeLessThan(position('C1'));
  });

  it('10만 단계 사슬에서도 호출 스택이 넘치지 않는다', () => {
    const graph = new DependencyGraph();
    const length = 100_000;
    for (let i = 1; i < length; i += 1) {
      graph.setPrecedents(`N${i}`, [`N${i - 1}`]);
    }
    expect(graph.getTransitiveDependents('N0')).toHaveLength(length - 1);
    expect(graph.isInCycle(`N${length - 1}`)).toBe(false);
    graph.setPrecedents('N0', [`N${length - 1}`]);
    expect(graph.isInCycle('N0')).toBe(true);
  });
});
