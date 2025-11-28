'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Briefcase, Zap, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Company, SectorSummary } from '@/lib/types';

interface DigestContentProps {
  companies: Company[];
  sectorHistory: SectorSummary[];
}

function formatWeekDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getWeekNumberFromDate(dateString: string): number {
  const date = new Date(dateString);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

export function DigestContent({ companies, sectorHistory }: DigestContentProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const sectorSummary = sectorHistory[selectedIndex] || null;
  const isCurrentWeek = selectedIndex === 0;
  const hasPrevWeek = selectedIndex < sectorHistory.length - 1;
  const hasNextWeek = selectedIndex > 0;

  // Current week company data (only valid for index 0)
  const totalJobsFromCompanies = companies.reduce((sum, c) => sum + c.job_count, 0);
  const totalAddedFromCompanies = companies.reduce((sum, c) => sum + (c.jobs_added_this_week || 0), 0);
  const totalRemovedFromCompanies = companies.reduce((sum, c) => sum + (c.jobs_removed_this_week || 0), 0);
  const growingCompanies = companies.filter(c => c.hiring_velocity === 'up');
  const decliningCompanies = companies.filter(c => c.hiring_velocity === 'down');
  const topGrowers = [...companies]
    .filter(c => (c.jobs_added_this_week || 0) > 0)
    .sort((a, b) => (b.jobs_added_this_week || 0) - (a.jobs_added_this_week || 0))
    .slice(0, 5);

  // Use sector summary data for historical weeks, company data for current week
  const totalJobs = isCurrentWeek ? totalJobsFromCompanies : (sectorSummary?.total_active_jobs || 0);
  const totalAdded = isCurrentWeek ? totalAddedFromCompanies : (sectorSummary?.total_jobs_added || 0);
  const totalRemoved = isCurrentWeek ? totalRemovedFromCompanies : (sectorSummary?.total_jobs_removed || 0);
  const totalCompanies = isCurrentWeek ? companies.length : (sectorSummary?.total_companies || 0);

  const weekNumber = sectorSummary ? getWeekNumberFromDate(sectorSummary.week_start) : 0;
  const weekLabel = sectorSummary ? formatWeekDate(sectorSummary.week_start) : 'No data';

  return (
    <main className="px-4 py-6 md:px-10 md:py-10 max-w-[900px] mx-auto relative z-10">
      {/* Header with Week Picker */}
      <div className="mb-8 md:mb-10">
        <div className="label-caps text-gold mb-2 md:mb-3">
          Intelligence Report
        </div>
        <h1 className="heading-serif text-2xl md:text-[36px] text-cream leading-tight mb-2 md:mb-3">
          AI Sector Weekly Digest
        </h1>
        <p className="text-cream-muted text-sm md:text-base leading-relaxed mb-4 md:mb-6">
          A synthesis of hiring patterns and signals across the frontier AI landscape.
        </p>

        {/* Week Picker */}
        {sectorHistory.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedIndex(i => i + 1)}
              disabled={!hasPrevWeek}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-deep border border-border text-cream-muted hover:text-cream hover:border-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              <span className="text-sm">Older</span>
            </button>

            <div className="flex-1 text-center">
              <span className="text-cream font-medium">Week of {weekLabel}</span>
              {isCurrentWeek && (
                <span className="ml-2 text-xs bg-gold-muted text-gold px-2 py-0.5 rounded">Current</span>
              )}
            </div>

            <button
              onClick={() => setSelectedIndex(i => i - 1)}
              disabled={!hasNextWeek}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-deep border border-border text-cream-muted hover:text-cream hover:border-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="text-sm">Newer</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Executive Summary */}
      <section className="glass rounded-xl p-6 mb-8">
        <h2 className="heading-serif text-xl text-cream mb-4 flex items-center gap-2">
          <Briefcase size={18} className="text-gold" />
          Executive Summary
        </h2>
        <div className="text-cream-muted leading-relaxed space-y-3">
          <p>
            {isCurrentWeek ? 'This week we tracked' : 'That week we tracked'}{' '}
            <span className="text-cream font-medium">{totalJobs.toLocaleString()}</span> open
            positions across <span className="text-cream font-medium">{totalCompanies}</span> frontier AI companies.
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

      {/* Key Metrics Grid - Only show for current week */}
      {isCurrentWeek && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 md:mb-8">
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
      )}

      {/* Historical week notice */}
      {!isCurrentWeek && (
        <div className="glass rounded-xl p-4 mb-8 border border-border">
          <p className="text-cream-muted text-sm text-center">
            Company-level breakdown (expanding/contracting, top movers) is only available for the current week.
          </p>
        </div>
      )}

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

      {/* Top Movers - Only show for current week */}
      {isCurrentWeek && topGrowers.length > 0 && (
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
      {sectorHistory.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-cream-muted">
            Weekly synthesis has not been generated yet. Check back after the next synthesis run.
          </p>
        </div>
      )}
    </main>
  );
}
