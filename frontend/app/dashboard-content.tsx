'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/metric-card';
import { CompanyRow, CompanyRowHeader } from '@/components/company-row';
import { Alert } from '@/components/alert';
import { CompanyDetail } from '@/components/company-detail';
import { getCompany, getCompanySummary } from '@/lib/api';
import type { Company, CompanyDetail as CompanyDetailType, CompanySummary, SectorSummary } from '@/lib/types';
import { mapHiringVelocity } from '@/lib/types';

interface DashboardContentProps {
  companies: Company[];
  sectorSummary: SectorSummary | null;
}

export function DashboardContent({ companies, sectorSummary }: DashboardContentProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<CompanyDetailType | null>(null);
  const [companySummary, setCompanySummary] = useState<CompanySummary | null>(null);

  // Calculate totals
  const totalJobs = companies.reduce((sum, c) => sum + c.job_count, 0);
  const totalAdded = companies.reduce((sum, c) => sum + (c.jobs_added_this_week || 0), 0);
  const totalRemoved = companies.reduce((sum, c) => sum + (c.jobs_removed_this_week || 0), 0);
  const weeklyDelta = totalAdded - totalRemoved;

  // Get companies with LLM-detected anomalies (sorted for consistent hydration)
  const companiesWithAnomalies = companies
    .filter(c => c.anomalies && c.anomalies.length > 0)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  // Count total signals
  const sectorSignalCount = sectorSummary?.sector_signals?.length || 0;
  const companyAnomalyCount = companiesWithAnomalies.reduce((sum, c) => sum + (c.anomalies?.length || 0), 0);

  // Load company detail when selected
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

  // LLM-generated sector signals
  const sectorSignals = sectorSummary?.sector_signals || [];

  return (
    <main className="px-10 py-10 max-w-[1400px] mx-auto relative z-10">
      {/* Header */}
      <div className="mb-12">
        <h1 className="heading-serif text-[42px] text-cream leading-tight">
          AI Sector Intelligence
        </h1>
        <p className="text-cream-muted text-base mt-3 max-w-xl leading-relaxed">
          Tracking hiring patterns across {companies.length} frontier AI companies.{' '}
          {totalJobs.toLocaleString()} active positions observed.
        </p>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-5 mb-12">
        <MetricCard
          label="Total Positions"
          value={totalJobs.toLocaleString()}
          change={sectorSummary ? Math.round((totalAdded / Math.max(totalJobs - totalAdded, 1)) * 100) : undefined}
        />
        <MetricCard label="Weekly Delta" value={weeklyDelta > 0 ? `+${weeklyDelta}` : String(weeklyDelta)} />
        <MetricCard label="Companies Tracked" value={companies.length} />
        <MetricCard label="Signals Detected" value={sectorSignalCount + companyAnomalyCount} />
      </div>

      {/* Trending Roles & In-Demand Skills */}
      {((sectorSummary?.trending_roles && sectorSummary.trending_roles.length > 0) ||
        (sectorSummary?.trending_skills && sectorSummary.trending_skills.length > 0)) && (
        <div className="glass rounded-xl p-5 mb-10">
          <div className="flex flex-wrap gap-8">
            {sectorSummary?.trending_roles && sectorSummary.trending_roles.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <div className="label-caps text-gold mb-3">Trending Roles</div>
                <div className="flex flex-wrap gap-2">
                  {sectorSummary.trending_roles.map((role, i) => (
                    <span key={i} className="bg-gold-muted border border-gold-border rounded px-2 py-1 text-cream text-xs">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {sectorSummary?.trending_skills && sectorSummary.trending_skills.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <div className="label-caps text-blue mb-3">In-Demand Skills</div>
                <div className="flex flex-wrap gap-2">
                  {sectorSummary.trending_skills.map((skill, i) => (
                    <span key={i} className="bg-blue-muted border border-blue-border rounded px-2 py-1 text-cream text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_380px] gap-10">
        {/* Companies table */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-serif text-xl text-cream">
              Active Observations
            </h2>
            <span className="text-cream-dim text-xs">
              Click row for details
            </span>
          </div>

          <div className="glass rounded-xl overflow-hidden">
            <CompanyRowHeader />
            {companies
              .sort((a, b) => b.job_count - a.job_count)
              .map((company) => (
                <CompanyRow
                  key={company.slug}
                  company={company.name}
                  jobs={company.job_count}
                  change={company.jobs_added_this_week || 0}
                  velocity={mapHiringVelocity(company.hiring_velocity)}
                  focus={company.focus_areas || []}
                  selected={selectedSlug === company.slug}
                  onClick={() => setSelectedSlug(company.slug)}
                />
              ))}
          </div>
        </div>

        {/* Right column: Signals & Synthesis */}
        <div>
          {/* LLM-Generated Sector Signals */}
          <div className="mb-8">
            <h2 className="heading-serif text-xl text-cream mb-4">
              Sector Signals
            </h2>
            <div className="flex flex-col gap-3">
              {sectorSignals.map((signal, i) => (
                <Alert
                  key={i}
                  type="signal"
                  company="Sector"
                  message={signal}
                />
              ))}
              {companiesWithAnomalies.slice(0, 2).map((company) => (
                company.anomalies?.map((anomaly, i) => (
                  <Alert
                    key={`${company.slug}-${i}`}
                    type="anomaly"
                    company={company.name}
                    message={anomaly}
                  />
                ))
              ))}
              {sectorSignals.length === 0 && companiesWithAnomalies.length === 0 && (
                <p className="text-cream-muted text-sm">No signals detected this week.</p>
              )}
            </div>
          </div>

          {/* AI Synthesis */}
          <div>
            <h2 className="heading-serif text-xl text-cream mb-4">
              Weekly Synthesis
            </h2>
            <div className="glass rounded-xl p-5">
              {sectorSummary?.summary_text ? (
                <p className="text-cream-muted text-sm leading-relaxed">
                  {sectorSummary.summary_text}
                </p>
              ) : (
                <p className="text-cream-muted text-sm">No synthesis available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

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
