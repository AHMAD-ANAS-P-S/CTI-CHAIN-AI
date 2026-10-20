import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AttackGraphNodeData } from '../../types';
import { getEntityStyle, getStage } from './graphMeta';

export const CTINode: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as unknown as AttackGraphNodeData & { step?: number };
  const ent = getEntityStyle(d.entity_type, d.icon);
  const stage = getStage(d.stage);
  const EntIcon = ent.Icon;
  const StageIcon = stage.Icon;
  const conf = Math.round((d.confidence ?? 1) * 100);
  const c = ent.color;

  return (
    <div
      className="cti-node group relative w-[270px] h-[92px] rounded-2xl select-none cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        ['--c' as string]: c,
        background: `linear-gradient(135deg, ${c}26 0%, #001B1D 38%, #00171A 100%)`,
        border: `1.5px solid ${selected ? '#fff' : c + '99'}`,
        boxShadow: selected
          ? `0 0 0 3px ${c}55, 0 0 34px ${c}88`
          : `0 6px 22px rgba(0,0,0,.45), 0 0 18px ${c}22`,
      }}
    >
      <Handle type="target" position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-[#001314] !-left-1.5" style={{ background: c }} />

      {/* Step badge */}
      <div
        className="absolute -top-2.5 -left-2.5 min-w-[26px] h-[26px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-black font-mono text-[#001314] z-10"
        style={{ background: c, boxShadow: `0 0 12px ${c}` }}
        title={`Step ${d.step}`}
      >
        {String(d.step ?? '').padStart(2, '0')}
      </div>

      <div className="flex items-center gap-3 h-full pl-4 pr-3">
        {/* Logo */}
        <div className="relative shrink-0">
          <span className="cti-ring absolute inset-0 rounded-2xl" style={{ border: `1.5px solid ${c}` }} />
          <div
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `radial-gradient(circle at 30% 25%, ${c}55, ${c}14)`, border: `1px solid ${c}66`, color: c }}
          >
            <EntIcon size={24} strokeWidth={2.1} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em]" style={{ color: c }}>
              {ent.label}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${stage.color}22`, color: stage.color, border: `1px solid ${stage.color}55` }}
              title={`Stage: ${d.stage}`}
            >
              <StageIcon size={10} strokeWidth={2.6} />
              {stage.short}
            </span>
          </div>
          <div className="text-[13px] font-bold text-white truncate mt-1 leading-tight" title={d.full_name || d.label}>
            {d.label}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${conf}%`, background: `linear-gradient(90deg, ${c}, #fff)` }} />
            </div>
            <span className="text-[9px] font-mono text-[#9CBFC2]">{conf}%</span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right}
        className="!w-3 !h-3 !border-2 !border-[#001314] !-right-1.5" style={{ background: c }} />
    </div>
  );
};
