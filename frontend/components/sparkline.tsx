'use client';

interface SparklineProps {
  /** Array of net changes (jobs_added - jobs_removed) for each week, oldest first */
  data: number[];
  /** Height of the sparkline in pixels */
  height?: number;
  /** Width of each bar in pixels */
  barWidth?: number;
  /** Gap between bars in pixels */
  gap?: number;
}

export function Sparkline({
  data,
  height = 24,
  barWidth = 8,
  gap = 2,
}: SparklineProps) {
  if (!data || data.length === 0) {
    return <div className="text-cream-dim text-xs">No history</div>;
  }

  // Find max absolute value for scaling
  const maxAbs = Math.max(...data.map(Math.abs), 1);
  const maxBarHeight = height - 4; // Leave some padding

  return (
    <div
      className="flex items-center"
      style={{ height: `${height}px`, gap: `${gap}px` }}
    >
      {data.map((value, i) => {
        const barHeight = Math.max(2, (Math.abs(value) / maxAbs) * maxBarHeight);
        const isZero = value === 0;
        const isPositive = value > 0;

        return (
          <div
            key={i}
            className={`rounded-sm transition-opacity ${
              isZero
                ? 'bg-cream-dim/40'
                : isPositive
                ? 'bg-green-500'
                : 'bg-red-500'
            }`}
            style={{
              width: `${barWidth}px`,
              height: isZero ? '2px' : `${barHeight}px`,
              opacity: i === data.length - 1 ? 1 : 0.6,
            }}
            title={`${value > 0 ? '+' : ''}${value}`}
          />
        );
      })}
    </div>
  );
}

interface WeeklyChangeProps {
  added: number;
  removed: number;
}

export function WeeklyChange({ added, removed }: WeeklyChangeProps) {
  const net = added - removed;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`font-mono text-sm font-medium ${
          net > 0 ? 'text-green-400' : net < 0 ? 'text-red-400' : 'text-cream-muted'
        }`}
      >
        {net > 0 ? '+' : ''}
        {net}
      </span>
      <span className="text-cream-dim text-xs">
        (+{added} / -{removed})
      </span>
    </div>
  );
}
