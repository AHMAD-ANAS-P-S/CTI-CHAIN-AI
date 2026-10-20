import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

export const NODE_WIDTH = 270;
export const NODE_HEIGHT = 92;

/**
 * Left-to-right layered layout (reads like a timeline: attacker -> victim -> impact).
 * Uses Dagre's "tight-tree" ranker + generous rank separation so edge labels
 * never get squeezed between columns.
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
): { nodes: Node[]; edges: Edge[] } => {
  if (!nodes?.length) return { nodes: [], edges: [] };

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: direction,
    ranker: 'tight-tree',
    nodesep: 46,
    ranksep: 150,
    edgesep: 30,
    marginx: 60,
    marginy: 60,
  });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target) && e.source !== e.target) {
      g.setEdge(e.source, e.target, { minlen: 1, weight: 1 }, e.id);
    }
  });

  dagre.layout(g);

  const stepByNode = computeStepOrder(nodes, edges);

  const layoutedNodes = nodes.map((node) => {
    const p = g.node(node.id);
    if (!p) return node;
    return {
      ...node,
      position: {
        x: Math.round(p.x - NODE_WIDTH / 2),
        y: Math.round(p.y - NODE_HEIGHT / 2),
      },
      data: { ...node.data, step: stepByNode.get(node.id) },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Chronological step number for every node: topological order (Kahn),
 * ties broken by the position of the entity inside the source report.
 * Cycle-safe: leftover nodes are appended in report order.
 */
export function computeStepOrder(nodes: Node[], edges: Edge[]): Map<string, number> {
  const para = (n: Node) => Number((n.data as { paragraph_index?: number })?.paragraph_index ?? 0);
  const ids = new Set(nodes.map((n) => n.id));
  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();
  nodes.forEach((n) => { indeg.set(n.id, 0); out.set(n.id, []); });
  edges.forEach((e) => {
    if (ids.has(e.source) && ids.has(e.target) && e.source !== e.target) {
      indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
      out.get(e.source)!.push(e.target);
    }
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const cmp = (a: string, b: string) => para(byId.get(a)!) - para(byId.get(b)!);
  const ready = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id).sort(cmp);
  const order: string[] = [];
  const seen = new Set<string>();
  while (ready.length) {
    const id = ready.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    for (const t of out.get(id) ?? []) {
      indeg.set(t, (indeg.get(t) ?? 1) - 1);
      if (indeg.get(t) === 0) { ready.push(t); ready.sort(cmp); }
    }
  }
  nodes.filter((n) => !seen.has(n.id)).sort((a, b) => para(a) - para(b)).forEach((n) => order.push(n.id));
  const m = new Map<string, number>();
  order.forEach((id, i) => m.set(id, i + 1));
  return m;
}
