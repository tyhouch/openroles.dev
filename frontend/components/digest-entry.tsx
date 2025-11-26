interface DigestEntryProps {
  title: string;
  summary: string;
  companies: string[];
}

export function DigestEntry({ title, summary, companies }: DigestEntryProps) {
  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <h4 className="heading-serif text-cream text-lg mb-2">
        {title}
      </h4>
      <p className="text-cream-muted text-sm leading-relaxed mb-3">
        {summary}
      </p>
      <div className="flex gap-2">
        {companies.map((company) => (
          <span key={company} className="text-gold text-xs">
            {company}
          </span>
        ))}
      </div>
    </div>
  );
}
