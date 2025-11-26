interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  small?: boolean;
}

export function MetricCard({ label, value, change, small }: MetricCardProps) {
  return (
    <div className={`glass rounded-lg ${small ? 'p-4' : 'p-6'}`}>
      <div className="label-caps mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-3">
        <span className={`heading-serif text-cream ${small ? 'text-[28px]' : 'text-[36px]'}`}>
          {value}
        </span>
        {change !== undefined && (
          <span
            className={`text-[13px] ${
              change > 0
                ? 'text-success'
                : change < 0
                ? 'text-danger'
                : 'text-cream-dim'
            }`}
          >
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        )}
      </div>
    </div>
  );
}
