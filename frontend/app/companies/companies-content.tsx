'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CompanyDetail } from '@/components/company-detail';
import { getCompany, getCompanySummary } from '@/lib/api';
import type { Company, CompanyDetail as CompanyDetailType, CompanySummary, SectorSummary } from '@/lib/types';

interface CompaniesContentProps {
  companies: Company[];
  sectorSummary: SectorSummary | null;
}

type VelocityFilter = 'all' | 'up' | 'down' | 'stable';

function VelocityIcon({ velocity }: { velocity: 'up' | 'down' | 'stable' }) {
  if (velocity === 'up') return <TrendingUp size={14} className="text-green-400" />;
  if (velocity === 'down') return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-cream-muted" />;
}

export function CompaniesContent({ companies }: CompaniesContentProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<CompanyDetailType | null>(null);
  const [companySummary, setCompanySummary] = useState<CompanySummary | null>(null);
  const [filter, setFilter] = useState<VelocityFilter>('all');
  const [sortBy, setSortBy] = useState<'jobs' | 'delta' | 'name'>('jobs');

  useEffect(() => {
    if (!selectedSlug) {
      setCompanyDetail(null);
      setCompanySummary(null);
      return;
    }

    Promise.all([
      getCompany(selectedSlug),
      getCompanySummary(selectedSlug).catch(() => null),
    ])
      .then(([detail, summary]) => {
        setCompanyDetail(detail);
        setCompanySummary(summary);
      })
      .catch(console.error);
  }, [selectedSlug]);

  // Filter and sort companies
  const filteredCompanies = companies
    .filter(c => {
      if (filter === 'all') return true;
      return c.hiring_velocity === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'jobs') return b.job_count - a.job_count;
      if (sortBy === 'delta') return (b.jobs_added_this_week || 0) - (a.jobs_added_this_week || 0);
      return a.name.localeCompare(b.name);
    });

  const totalJobs = companies.reduce((sum, c) => sum + c.job_count, 0);

  return (
    <main className="px-4 py-6 md:px-10 md:py-10 max-w-[1400px] mx-auto relative z-10">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="label-caps text-gold mb-2 md:mb-3">Company Directory</div>
        <h1 className="heading-serif text-2xl md:text-[36px] text-cream leading-tight">
          Tracked Organizations
        </h1>
        <p className="text-cream-muted text-sm md:text-base mt-2 md:mt-3 max-w-xl leading-relaxed">
          {companies.length} frontier AI companies under observation.
          {totalJobs.toLocaleString()} total positions tracked.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 md:mb-8">
        <div className="glass rounded-lg px-3 py-2 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              filter === 'all' ? 'bg-gold text-void' : 'text-cream-muted hover:text-cream'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('up')}
            className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1.5 ${
              filter === 'up' ? 'bg-gold text-void' : 'text-cream-muted hover:text-cream'
            }`}
          >
            <TrendingUp size={12} /> Growing
          </button>
          <button
            onClick={() => setFilter('down')}
            className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1.5 ${
              filter === 'down' ? 'bg-gold text-void' : 'text-cream-muted hover:text-cream'
            }`}
          >
            <TrendingDown size={12} /> Declining
          </button>
          <button
            onClick={() => setFilter('stable')}
            className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1.5 ${
              filter === 'stable' ? 'bg-gold text-void' : 'text-cream-muted hover:text-cream'
            }`}
          >
            <Minus size={12} /> Stable
          </button>
        </div>

        <div className="glass rounded-lg px-3 py-2 flex gap-2 items-center">
          <span className="text-cream-muted text-sm">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'jobs' | 'delta' | 'name')}
            className="bg-transparent text-cream text-sm border-none outline-none cursor-pointer"
          >
            <option value="jobs" className="bg-deep">Open Roles</option>
            <option value="delta" className="bg-deep">Weekly Change</option>
            <option value="name" className="bg-deep">Name</option>
          </select>
        </div>
      </div>

      {/* Company Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredCompanies.map((company) => {
          const velocity = company.hiring_velocity || 'stable';
          const delta = company.jobs_added_this_week || 0;

          return (
            <div
              key={company.slug}
              onClick={() => setSelectedSlug(company.slug)}
              className="glass rounded-xl p-5 cursor-pointer hover:border-gold-border transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="heading-serif text-cream text-xl group-hover:text-gold transition-colors">
                  {company.name}
                </h3>
                <ArrowUpRight size={16} className="text-cream-muted group-hover:text-gold transition-colors" />
              </div>

              <div className="flex gap-6 mb-4">
                <div>
                  <div className="text-cream text-2xl font-medium">{company.job_count}</div>
                  <div className="text-cream-dim text-xs">Open Roles</div>
                </div>
                <div>
                  <div className={`text-2xl font-medium ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-cream-muted'}`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </div>
                  <div className="text-cream-dim text-xs">This Week</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <VelocityIcon velocity={velocity} />
                <span className="text-cream-muted text-sm capitalize">
                  {velocity === 'up' ? 'Hiring velocity up' : velocity === 'down' ? 'Hiring slowing' : 'Stable hiring'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-16 text-cream-muted">
          No companies match the selected filter.
        </div>
      )}

      {/* Company detail panel */}
      {selectedSlug && (
        <CompanyDetail
          company={companyDetail}
          summary={companySummary}
          onClose={() => setSelectedSlug(null)}
        />
      )}
    </main>
  );
}
