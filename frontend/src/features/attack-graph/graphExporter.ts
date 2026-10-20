import { Node, Edge } from '@xyflow/react';
import { AttackGraphNodeData, AttackGraphEdgeData } from '../../types';
import { ENTITY_STYLES, DEFAULT_ENTITY_STYLE, getStage } from './graphMeta';
import { NODE_WIDTH, NODE_HEIGHT } from './dagreLayout';

/** Standalone SVG exporter matching the on-screen left-to-right design. */
export function generateGraphSvg(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#001314"/><text x="400" y="200" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#9CBFC2">No graph elements to display</text></svg>`;
  }
  const W = NODE_WIDTH, H = NODE_HEIGHT;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + W); maxY = Math.max(maxY, n.position.y + H);
  });
  const pad = 70, titleH = 56;
  const vx = minX - pad, vy = minY - pad - titleH;
  const width = Math.max(500, maxX - minX + pad * 2);
  const height = Math.max(300, maxY - minY + pad * 2 + titleH);

  const colorOf = (n: Node) => (ENTITY_STYLES[(n.data as unknown as AttackGraphNodeData)?.entity_type] ?? DEFAULT_ENTITY_STYLE).color;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${vx} ${vy} ${width} ${height}">
<defs>
  <radialGradient id="bg" cx="50%" cy="40%" r="80%"><stop offset="0%" stop-color="#002A2E"/><stop offset="100%" stop-color="#000F11"/></radialGradient>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1L10 5L0 9z" fill="#22D3EE"/></marker>
  <marker id="arrow-inferred" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1L10 5L0 9z" fill="#F59E0B"/></marker>
  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect x="${vx}" y="${vy}" width="${width}" height="${height}" fill="url(#bg)"/>
<g fill="#0E7490" fill-opacity="0.35">`;
  for (let x = Math.floor(vx / 28) * 28; x < vx + width; x += 28)
    for (let y = Math.floor(vy / 28) * 28; y < vy + height; y += 28) svg += `<circle cx="${x}" cy="${y}" r="1"/>`;
  svg += `</g>
<text x="${vx + 28}" y="${vy + 38}" font-family="system-ui,sans-serif" font-size="22" font-weight="800" fill="#E6FFFF">CTI Attack-Chain</text>
<text x="${vx + 28 + 168}" y="${vy + 38}" font-family="system-ui,sans-serif" font-size="13" fill="#22D3EE">${nodes.length} entities &#183; ${edges.length} relationships</text>
<g fill="none">\n`;

  edges.forEach((e) => {
    const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
    if (!a || !b) return;
    const d = e.data as unknown as AttackGraphEdgeData;
    const inferred = d?.classification === 'inferred';
    const col = inferred ? '#F59E0B' : '#22D3EE';
    const x1 = a.position.x + W, y1 = a.position.y + H / 2;
    const x2 = b.position.x, y2 = b.position.y + H / 2;
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.4);
    const path = `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    svg += `<path d="${path}" stroke="${col}" stroke-opacity="0.15" stroke-width="6"/>`;
    svg += `<path d="${path}" stroke="${col}" stroke-width="2" ${inferred ? 'stroke-dasharray="7 5"' : ''} marker-end="url(#${inferred ? 'arrow-inferred' : 'arrow'})"/>\n`;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const label = String(d?.label || (typeof e.label === 'string' ? e.label : 'related'));
    const lw = Math.max(54, label.length * 6.3 + 18);
    svg += `<rect x="${mx - lw / 2}" y="${my - 10}" width="${lw}" height="20" rx="10" fill="#00171A" stroke="${col}" stroke-opacity="0.7"/>`;
    svg += `<text x="${mx}" y="${my + 3.5}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#E6FFFF">${escapeXml(label)}</text>\n`;
  });
  svg += `</g>\n<g>\n`;

  nodes.forEach((n) => {
    const d = n.data as unknown as AttackGraphNodeData & { step?: number };
    const c = colorOf(n);
    const st = getStage(d?.stage);
    const ent = (ENTITY_STYLES[d?.entity_type] ?? DEFAULT_ENTITY_STYLE).label;
    const x = n.position.x, y = n.position.y;
    const conf = Math.round((d?.confidence ?? 1) * 100);
    svg += `<g transform="translate(${x},${y})">
  <rect width="${W}" height="${H}" rx="16" fill="#00171A" stroke="${c}" stroke-opacity="0.75" stroke-width="1.5" filter="url(#glow)" fill-opacity="0.96"/>
  <rect width="${W}" height="${H}" rx="16" fill="${c}" fill-opacity="0.08"/>
  <rect x="16" y="22" width="48" height="48" rx="14" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-opacity="0.6"/>
  <text x="40" y="54" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="800" fill="${c}">${escapeXml(ent.charAt(0))}</text>
  <text x="78" y="26" font-family="system-ui,sans-serif" font-size="9" font-weight="800" letter-spacing="1.3" fill="${c}">${escapeXml(ent.toUpperCase())}</text>
  <rect x="${W - 112}" y="14" width="100" height="16" rx="8" fill="${st.color}" fill-opacity="0.15" stroke="${st.color}" stroke-opacity="0.5"/>
  <text x="${W - 62}" y="25.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" font-weight="700" fill="${st.color}">${escapeXml(st.short)}</text>
  <text x="78" y="50" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#fff">${escapeXml(truncate(d?.label || n.id, 24))}</text>
  <rect x="78" y="62" width="${W - 130}" height="3" rx="1.5" fill="#fff" fill-opacity="0.1"/>
  <rect x="78" y="62" width="${(W - 130) * conf / 100}" height="3" rx="1.5" fill="${c}"/>
  <text x="${W - 14}" y="67" text-anchor="end" font-family="monospace" font-size="9" fill="#9CBFC2">${conf}%</text>
  <circle cx="0" cy="0" r="13" fill="${c}"/>
  <text x="0" y="3.5" text-anchor="middle" font-family="monospace" font-size="10" font-weight="900" fill="#001314">${String(d?.step ?? '').padStart(2, '0')}</text>
</g>\n`;
  });
  svg += `</g>\n</svg>`;
  return svg;
}

function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadSvgFile(svgString: string, filename = 'attack_chain.svg') {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPngFromSvg(svgString: string, filename = 'attack_chain.png'): Promise<void> {
  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement;

    const width = parseFloat(svgElement.getAttribute('width') || '1200');
    const height = parseFloat(svgElement.getAttribute('height') || '800');

    // Scale up for high DPI sharpness
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context unavailable'));
      return;
    }

    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.fillStyle = '#001314';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error('Failed to generate PNG blob'));
          return;
        }
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}
