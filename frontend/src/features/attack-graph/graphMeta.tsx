import React from 'react';
import {
  User, Laptop, Mail, MailQuestion, Paperclip, Globe, Network, Radio, Terminal, Code,
  KeyRound, Cog, Clock, Bug, ShieldAlert, FileText, FileDown, Hash, Server, Building,
  AlertTriangle, HelpCircle, Wrench, Crosshair, ArrowRightLeft, Target, Send, Play,
  Anchor, CircleArrowUp, EyeOff, Radar, RadioTower, Move, Database, Upload, Flame,
  FileArchive, Link2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  KILL-CHAIN STAGES — each stage gets its own logo + colour          */
/* ------------------------------------------------------------------ */
export interface StageMeta {
  key: string;
  short: string;
  color: string;
  Icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
}

export const STAGES: StageMeta[] = [
  { key: 'Initial access', short: 'Initial Access', color: '#38BDF8', Icon: Target },
  { key: 'Delivery', short: 'Delivery', color: '#22D3EE', Icon: Send },
  { key: 'Execution', short: 'Execution', color: '#A78BFA', Icon: Play },
  { key: 'Persistence', short: 'Persistence', color: '#FBBF24', Icon: Anchor },
  { key: 'Privilege escalation', short: 'Priv. Esc.', color: '#FB923C', Icon: CircleArrowUp },
  { key: 'Defense evasion', short: 'Evasion', color: '#F472B6', Icon: EyeOff },
  { key: 'Discovery', short: 'Discovery', color: '#2DD4BF', Icon: Radar },
  { key: 'Command and control', short: 'C2', color: '#F87171', Icon: RadioTower },
  { key: 'Lateral movement', short: 'Lateral', color: '#C084FC', Icon: Move },
  { key: 'Collection', short: 'Collection', color: '#34D399', Icon: Database },
  { key: 'Exfiltration', short: 'Exfiltration', color: '#FB7185', Icon: Upload },
  { key: 'Impact', short: 'Impact', color: '#EF4444', Icon: Flame },
];

const STAGE_LOOKUP = new Map(STAGES.map((s) => [s.key.toLowerCase(), s]));
export const getStage = (name?: string): StageMeta =>
  STAGE_LOOKUP.get((name || '').toLowerCase()) ?? STAGES[2];

/* ------------------------------------------------------------------ */
/*  ENTITY TYPES — distinct colour families so the graph reads at a    */
/*  glance: identity=blue, delivery=cyan, exec=violet, persist=amber,  */
/*  files=emerald, malicious=red                                       */
/* ------------------------------------------------------------------ */
type IconC = React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;

export const ICON_MAP: Record<string, IconC> = {
  User, Laptop, Mail, MailQuestion, Paperclip, Globe, Network, Radio, Terminal, Code,
  KeyRound, Cog, Clock, Bug, ShieldAlert, FileText, FileDown, Hash, Server, Building,
  AlertTriangle, Wrench, Crosshair, ArrowRightLeft, HelpCircle, FileArchive, Link2,
};

export interface EntityStyle {
  color: string;
  label: string;
  Icon?: IconC;
}

export const ENTITY_STYLES: Record<string, EntityStyle> = {
  USER: { color: '#60A5FA', label: 'User', Icon: User },
  HOST: { color: '#94A3B8', label: 'Host', Icon: Laptop },
  EMAIL_ADDRESS: { color: '#38BDF8', label: 'Email', Icon: Mail },
  EMAIL_SUBJECT: { color: '#22D3EE', label: 'Subject', Icon: MailQuestion },
  ATTACHMENT: { color: '#2DD4BF', label: 'Attachment', Icon: Paperclip },
  URL: { color: '#06B6D4', label: 'URL', Icon: Link2 },
  DOMAIN: { color: '#0EA5E9', label: 'Domain', Icon: Globe },
  IP_ADDRESS: { color: '#3B82F6', label: 'IP', Icon: Network },
  PROCESS: { color: '#A78BFA', label: 'Process', Icon: Terminal },
  COMMAND: { color: '#C084FC', label: 'Command', Icon: Code },
  REGISTRY_KEY: { color: '#FBBF24', label: 'Registry', Icon: KeyRound },
  SCHEDULED_TASK: { color: '#F59E0B', label: 'Sched. Task', Icon: Clock },
  SERVICE: { color: '#94A3B8', label: 'Service', Icon: Cog },
  FILE: { color: '#34D399', label: 'File', Icon: FileText },
  DROPPED_FILE: { color: '#10B981', label: 'Dropped File', Icon: FileDown },
  FILE_HASH: { color: '#64748B', label: 'Hash', Icon: Hash },
  MALWARE: { color: '#F43F5E', label: 'Malware', Icon: Bug },
  RANSOMWARE: { color: '#E11D48', label: 'Ransomware', Icon: ShieldAlert },
  C2_SERVER: { color: '#EF4444', label: 'C2 Server', Icon: Server },
  VULNERABILITY: { color: '#F97316', label: 'Vulnerability', Icon: AlertTriangle },
  ATTACK_TECHNIQUE: { color: '#F43F5E', label: 'Technique', Icon: Crosshair },
  TOOL: { color: '#84CC16', label: 'Tool', Icon: Wrench },
  ORGANIZATION: { color: '#94A3B8', label: 'Org', Icon: Building },
  NETWORK_CONNECTION: { color: '#0EA5E9', label: 'Connection', Icon: ArrowRightLeft },
};

export const DEFAULT_ENTITY_STYLE: EntityStyle = { color: '#22D3EE', label: 'Entity' };

export const getEntityStyle = (type: string, backendIcon?: string): Required<EntityStyle> => {
  const s = ENTITY_STYLES[type] ?? DEFAULT_ENTITY_STYLE;
  return {
    color: s.color,
    label: s.label,
    Icon: s.Icon ?? (backendIcon ? ICON_MAP[backendIcon] : undefined) ?? HelpCircle,
  };
};
