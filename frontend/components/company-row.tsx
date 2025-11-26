'use client';

import type { VelocityLevel } from '@/lib/types';

interface CompanyRowProps {
  company: string;
  jobs: number;
  change: number;
  velocity: VelocityLevel;
  focus: string[];
  selected?: boolean;
  onClick?: () => void;
}

export function CompanyRow({
  company,
  jobs,
  change,
  velocity,
  focus,
  selected,
  onClick,
}: CompanyRowProps) {
  return (
    <div
      onClick={onClick}
      className={`grid grid-cols-[180px_100px_100px_120px_1fr] items-center px-5 py-4 border-b border-border cursor-pointer transition-colors ${
        selected ? 'bg-gold-muted' : 'hover:bg-navy/50'
      }`}
    >
      <span className="text-cream text-sm font-medium">{company}</span>
      <span className="text-cream text-sm font-mono">{jobs}</span>
      <span
        className={`text-[13px] font-mono ${
          change > 0
            ? 'text-success'
            : change < 0
            ? 'text-danger'
            : 'text-cream-dim'
        }`}
      >
        {change > 0 ? '+' : ''}
        {change}
      </span>
      <span
        className={`text-[11px] tracking-wider uppercase ${
          velocity === 'high'
            ? 'text-gold'
            : velocity === 'medium'
            ? 'text-blue'
            : 'text-cream-dim'
        }`}
      >
        {velocity}
      </span>
      <div className="flex gap-2 flex-wrap">
        {focus.map((tag) => (
          <span
            key={tag}
            className="bg-blue-muted text-cream text-[11px] px-2 py-1 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CompanyRowHeader() {
  return (
    <div className="grid grid-cols-[180px_100px_100px_120px_1fr] px-5 py-3 border-b border-border label-caps">
      <span>Company</span>
      <span>Positions</span>
      <span>Week Delta</span>
      <span>Velocity</span>
      <span>Focus Areas</span>
    </div>
  );
}
