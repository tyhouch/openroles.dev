'use client';

import { TrendingUp, TrendingDown, Briefcase, Zap, AlertTriangle } from 'lucide-react';
import type { Company, SectorSummary } from '@/lib/types';

interface DigestContentProps {
  companies: Company[];
  sectorSummary: SectorSummary | null;
  weekNumber: number;
}

export function DigestContent({ companies, sectorSummary, weekNumber }: DigestContentProps) {
  const totalJobs = companies.reduce((sum, c) => sum + c.job_count, 0);
  const totalAdded = companies.reduce((sum, c) => sum + (c.jobs_added_this_week || 0), 0);
  const totalRemoved = companies.reduce((sum, c) => sum + (c.jobs_removed_this_week || 0), 0);

  const growingCompanies = companies.filter(c => c.hiring_velocity === 'up');
  const decliningCompanies = companies.filter(c => c.hiring_velocity === 'down');

  // Top movers
  const topGrowers = [...companies]
    .filter(c => (c.jobs_added_this_week || 0) > 0)
    .sort((a, b) => (b.jobs_added_this_week || 0) - (a.jobs_added_this_week || 0))
    .slice(0, 5);

  return (
    <main className="px-10 py-10 max-w-[900px] mx-auto relative z-10">
      {/* Header */}
      <div className="mb-10">
        <div className="label-caps text-gold mb-3">
          Week {weekNumber} Intelligence Report
        </div>
        <h1 className="heading-serif text-[36px] text-cream leading-tight mb-3">
          AI Sector Weekly Digest
        </h1>
        <p className="text-cream-muted text-base leading-relaxed">
          A synthesis of hiring patterns and signals across the frontier AI landscape.
        </p>
      </div>

      {/* Executive Summary */}
      <section className="glass rounded-xl p-6 mb-8">
        <h2 className="heading-serif text-xl text-cream mb-4 flex items-center gap-2">
          <Briefcase size={18} className="text-gold" />
          Executive Summary
        </h2>
        <div className="text-cream-muted leading-relaxed space-y-3">
          <p>
            This week we tracked <span className="text-cream font-medium">{totalJobs.toLocaleString()}</span> open
            positions across <span className="text-cream font-medium">{companies.length}</span> frontier AI companies.
          </p>
          <p>
            Net change: <span className={totalAdded - totalRemoved >= 0 ? 'text-green-400' : 'text-red-400'}>
              {totalAdded - totalRemoved >= 0 ? '+' : ''}{totalAdded - totalRemoved}
            </span> positions
            (<span className="text-green-400">+{totalAdded}</span> added,{' '}
            <span className="text-red-400">-{totalRemoved}</span> removed).
          </p>
          {sectorSummary?.sector_signals && sectorSummary.sector_signals.length > 0 && (
            <p className="pt-2 border-t border-border mt-4">
              {sectorSummary.sector_signals[0]}
            </p>
          )}
        </div>
      </section>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-green-400" />
            <span className="label-caps">Expanding</span>
          </div>
          <div className="text-cream text-3xl font-medium mb-1">{growingCompanies.length}</div>
          <div className="text-cream-dim text-sm">Companies with increased hiring velocity</div>
          {growingCompanies.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-cream-muted text-sm">
                {growingCompanies.slice(0, 3).map(c => c.name).join(', ')}
                {growingCompanies.length > 3 && ` +${growingCompanies.length - 3} more`}
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-red-400" />
            <span className="label-caps">Contracting</span>
          </div>
          <div className="text-cream text-3xl font-medium mb-1">{decliningCompanies.length}</div>
          <div className="text-cream-dim text-sm">Companies with slowing hiring</div>
          {decliningCompanies.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-cream-muted text-sm">
                {decliningCompanies.slice(0, 3).map(c => c.name).join(', ')}
                {decliningCompanies.length > 3 && ` +${decliningCompanies.length - 3} more`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trending Roles */}
      {sectorSummary?.trending_roles && sectorSummary.trending_roles.length > 0 && (
        <section className="glass rounded-xl p-6 mb-8">
          <h2 className="heading-serif text-xl text-cream mb-4 flex items-center gap-2">
            <Zap size={18} className="text-gold" />
            Trending Roles
          </h2>
          <div className="flex flex-wrap gap-2">
            {sectorSummary.trending_roles.map((role, i) => (
              <span
                key={i}
                className="bg-gold-muted border border-gold-border rounded-md px-3 py-1.5 text-cream text-sm"
              >
                {role}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Skills in Demand */}
      {sectorSummary?.trending_skills && sectorSummary.trending_skills.length > 0 && (
        <section className="glass rounded-xl p-6 mb-8">
          <h2 className="heading-serif text-xl text-cream mb-4">
            Skills in Demand
          </h2>
          <div className="flex flex-wrap gap-2">
            {sectorSummary.trending_skills.map((skill, i) => (
              <span
                key={i}
                className="bg-blue-muted border border-blue-border rounded-md px-3 py-1.5 text-cream text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Top Movers */}
      {topGrowers.length > 0 && (
        <section className="glass rounded-xl p-6 mb-8">
          <h2 className="heading-serif text-xl text-cream mb-4">
            Top Movers This Week
          </h2>
          <div className="space-y-3">
            {topGrowers.map((company, i) => (
              <div
                key={company.slug}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gold text-sm font-medium w-5">{i + 1}.</span>
                  <span className="text-cream">{company.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-cream-muted">{company.job_count} roles</span>
                  <span className="text-green-400">+{company.jobs_added_this_week}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sector Signals */}
      {sectorSummary?.sector_signals && sectorSummary.sector_signals.length > 1 && (
        <section className="glass rounded-xl p-6">
          <h2 className="heading-serif text-xl text-cream mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-gold" />
            Sector Signals
          </h2>
          <ul className="space-y-3">
            {sectorSummary.sector_signals.slice(1).map((signal, i) => (
              <li key={i} className="text-cream-muted flex gap-3">
                <span className="text-gold">•</span>
                {signal}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* No Data State */}
      {!sectorSummary && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-cream-muted">
            Weekly synthesis has not been generated yet. Check back after the next synthesis run.
          </p>
        </div>
      )}
    </main>
  );
}
