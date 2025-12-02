'use client';

import type { VelocityLevel } from '@/lib/types';
import { Sparkline } from '@/components/sparkline';

interface CompanyRowProps {
  company: string;
  jobs: number;
  added: number;
  removed: number;
  velocity: VelocityLevel;
  focus: string[];
  sparklineData?: number[];
  selected?: boolean;
  onClick?: () => void;
}

export function CompanyRow({
  company,
  jobs,
  added,
  removed,
  velocity,
  focus,
  sparklineData = [],
  selected,
  onClick,
}: CompanyRowProps) {
  const net = added - removed;

  return (
    <>
      {/* Desktop row */}
      <div
        onClick={onClick}
        className={`hidden md:grid grid-cols-[160px_80px_80px_100px_1fr] items-center px-5 py-4 border-b border-border cursor-pointer transition-colors ${
          selected ? 'bg-gold-muted' : 'hover:bg-navy/50'
        }`}
      >
        <span className="text-cream text-sm font-medium">{company}</span>
        <span className="text-cream text-sm font-mono">{jobs}</span>
        <div className="flex flex-col">
          <span
            className={`text-[13px] font-mono ${
              net > 0
                ? 'text-success'
                : net < 0
                ? 'text-danger'
                : 'text-cream-dim'
            }`}
          >
            {net > 0 ? '+' : ''}{net}
          </span>
          <span className="text-cream-dim text-[10px]">
            +{added}/-{removed}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkline data={sparklineData} height={18} barWidth={5} gap={1} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {focus.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="bg-blue-muted text-cream text-[11px] px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
          {focus.length > 2 && (
            <span className="text-cream-dim text-[10px]">+{focus.length - 2}</span>
          )}
        </div>
      </div>

      {/* Mobile card */}
      <div
        onClick={onClick}
        className={`md:hidden p-4 border-b border-border cursor-pointer transition-colors ${
          selected ? 'bg-gold-muted' : 'hover:bg-navy/50'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-cream text-sm font-medium">{company}</span>
          <Sparkline data={sparklineData} height={16} barWidth={4} gap={1} />
        </div>
        <div className="flex items-center gap-4 text-sm mb-2">
          <span className="text-cream-muted">
            <span className="font-mono text-cream">{jobs}</span> positions
          </span>
          <span
            className={`font-mono ${
              net > 0
                ? 'text-success'
                : net < 0
                ? 'text-danger'
                : 'text-cream-dim'
            }`}
          >
            {net > 0 ? '+' : ''}{net}
            <span className="text-cream-dim text-xs ml-1">(+{added}/-{removed})</span>
          </span>
        </div>
        {focus.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {focus.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-blue-muted text-cream text-[10px] px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {focus.length > 3 && (
              <span className="text-cream-dim text-[10px]">+{focus.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function CompanyRowHeader() {
  return (
    <div className="hidden md:grid grid-cols-[160px_80px_80px_100px_1fr] px-5 py-3 border-b border-border label-caps">
      <span>Company</span>
      <span>Roles</span>
      <span>Delta</span>
      <span>Trend</span>
      <span>Focus Areas</span>
    </div>
  );
}
