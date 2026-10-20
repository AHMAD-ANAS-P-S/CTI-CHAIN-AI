import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from '@xyflow/react';
import { AttackGraphEdgeData } from '../../types';

/** Short verb icons keep labels compact and recognisable. */
const VERB_GLYPH: Record<string, string> = {
  SENT_EMAIL: '✉', SENT_TO: '➜', CONTAINS_URL: '🔗', CONTAINS_ATTACHMENT: '📎',
  DOWNLOADED_FROM: '⬇', SPAWNED_PROCESS: '⚙', DROPPED_FILE: '💾', RESOLVES_TO: '🌐',
  CONNECTED_TO: '⇄', COMMUNICATED_WITH_C2: '📡', MODIFIED_REGISTRY: '🗝',
  CREATED_SCHEDULED_TASK: '⏰', EXPLOITED_VULNERABILITY: '⚠', EXFILTRATED_DATA: '⬆',
  EXECUTED_BY: '▶', ASSOCIATED_WITH: '∞',
};

export const CTIEdge: React.FC<EdgeProps> = ({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  data, selected, markerEnd,
}) => {
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature: 0.32,
  });

  const d = data as unknown as (AttackGraphEdgeData & { dim?: boolean; showLabel?: boolean }) | undefined;
  const inferred = d?.classification === 'inferred';
  const uncertain = d?.validation_status === 'uncertain';
  const dim = d?.dim;
  const showLabel = d?.showLabel !== false;
  const base = inferred ? '#F59E0B' : '#22D3EE';
  const gid = `grad-${id}`;
  const glyph = VERB_GLYPH[d?.relationship_type ?? ''] ?? '•';

  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={base} stopOpacity={0.25} />
          <stop offset="100%" stopColor={selected ? '#fff' : base} stopOpacity={1} />
        </linearGradient>
      </defs>

      {/* soft glow underlay */}
      <path d={path} fill="none" stroke={base} strokeWidth={selected ? 8 : 5} strokeOpacity={dim ? 0.02 : 0.12} />
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: `url(#${gid})`,
          strokeWidth: selected ? 3 : 2,
          opacity: dim ? 0.15 : 1,
          strokeDasharray: inferred ? '7 5' : undefined,
        }}
      />
      {/* travelling data packet */}
      {!dim && (
        <circle r={selected ? 4.5 : 3.2} fill={selected ? '#fff' : base} style={{ filter: `drop-shadow(0 0 5px ${base})` }}>
          <animateMotion dur={`${2.4 + (id.length % 5) * 0.3}s`} repeatCount="indefinite" path={path} />
        </circle>
      )}

      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: dim ? 0.2 : 1,
            }}
            className="group relative z-20"
          >
            <div
              className="flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold tracking-wide cursor-pointer backdrop-blur-md transition-all hover:scale-110"
              style={{
                background: selected ? base : '#00171Af2',
                color: selected ? '#001314' : '#E6FFFF',
                border: `1px solid ${base}${selected ? '' : '88'}`,
                boxShadow: selected ? `0 0 14px ${base}` : '0 2px 8px rgba(0,0,0,.5)',
              }}
            >
              <span style={{ color: selected ? '#001314' : base }}>{glyph}</span>
              <span>{d?.label || 'Related'}</span>
              {inferred && <span className="text-[8px] text-[#FBBF24]">hypo</span>}
              {uncertain && <span className="text-[9px] text-[#F87171]">?</span>}
            </div>

            {d?.evidence && (
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl bg-[#001B1D] border border-[#12494D] shadow-2xl text-left z-50 pointer-events-none">
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex justify-between border-b border-[#12494D] pb-1" style={{ color: base }}>
                  <span>Evidence</span>
                  <span className="font-mono font-normal">{Math.round((d.confidence ?? 1) * 100)}%</span>
                </div>
                <p className="text-[11px] text-[#E6FFFF] italic leading-snug mt-1">"{d.evidence}"</p>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
