interface AlertProps {
  type: 'anomaly' | 'signal';
  company: string;
  message: string;
}

export function Alert({ type, company, message }: AlertProps) {
  const isAnomaly = type === 'anomaly';

  return (
    <div
      className={`flex gap-4 p-4 rounded-lg items-start ${
        isAnomaly
          ? 'bg-gold-muted border border-gold-border'
          : 'glass'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
          isAnomaly ? 'bg-gold animate-pulse-gold' : 'bg-blue'
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-cream text-sm mb-1">
          <strong>{company}</strong>
        </div>
        <div className="text-cream-muted text-[13px] leading-relaxed">
          {message}
        </div>
      </div>
      <span
        className={`text-[10px] tracking-wider uppercase flex-shrink-0 ${
          isAnomaly ? 'text-gold' : 'text-cream-dim'
        }`}
      >
        {type}
      </span>
    </div>
  );
}
