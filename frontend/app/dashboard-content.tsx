'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, BarChart3, FileText } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'intelligence' | 'report'>('intelligence');
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);

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

  // Roles and skills with expand/collapse
  const allRoles = sectorSummary?.trending_roles || [];
  const allSkills = sectorSummary?.trending_skills || [];
  const visibleRoles = showAllRoles ? allRoles : allRoles.slice(0, 10);
  const visibleSkills = showAllSkills ? allSkills : allSkills.slice(0, 10);

  return (
    <main className="px-4 py-6 md:px-10 md:py-10 max-w-[1400px] mx-auto relative z-10">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="heading-serif text-2xl md:text-[42px] text-cream leading-tight">
          AI Sector Intelligence
        </h1>
        <p className="text-cream-muted text-sm md:text-base mt-2 md:mt-3 max-w-2xl leading-relaxed">
          Tracking hiring patterns across {companies.length} frontier AI companies.{' '}
          <span className="text-cream">{totalJobs.toLocaleString()}</span> active positions
          {weeklyDelta !== 0 && (
            <span className={`whitespace-nowrap ${weeklyDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {' '}({weeklyDelta > 0 ? '+' : ''}{weeklyDelta.toLocaleString()} this week)
            </span>
          )}
          .
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'intelligence'
              ? 'bg-gold text-void'
              : 'glass text-cream-muted hover:text-cream'
          }`}
        >
          <BarChart3 size={16} />
          Intelligence
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'report'
              ? 'bg-gold text-void'
              : 'glass text-cream-muted hover:text-cream'
          }`}
        >
          <FileText size={16} />
          Weekly Report
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'intelligence' ? (
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-10">
          {/* Companies table */}
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <h2 className="heading-serif text-lg md:text-xl text-cream">
                Active Observations{' '}
                <span className="text-cream-muted font-normal">
                  (Week of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                </span>
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

          {/* Right column: Signals - on mobile, show above table */}
          <div className="order-first lg:order-none">
            <h2 className="heading-serif text-lg md:text-xl text-cream mb-4">
              Sector Signals
            </h2>
            <div className="flex flex-col gap-3">
              {companiesWithAnomalies.slice(0, 3).map((company) => (
                company.anomalies?.map((anomaly, i) => (
                  <Alert
                    key={`${company.slug}-${i}`}
                    type="anomaly"
                    company={company.name}
                    message={anomaly}
                  />
                ))
              ))}
              {sectorSignals.map((signal, i) => (
                <Alert
                  key={i}
                  type="signal"
                  company="Sector"
                  message={signal}
                />
              ))}
              {sectorSignals.length === 0 && companiesWithAnomalies.length === 0 && (
                <p className="text-cream-muted text-sm">No signals detected this week.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Weekly Synthesis */}
          <div className="glass rounded-xl p-6">
            <h2 className="heading-serif text-xl text-cream mb-4">
              Weekly Synthesis
            </h2>
            {sectorSummary?.summary_text ? (
              <p className="text-cream-muted text-sm leading-relaxed whitespace-pre-wrap">
                {sectorSummary.summary_text}
              </p>
            ) : (
              <p className="text-cream-muted text-sm">No synthesis available yet.</p>
            )}
          </div>

          {/* Trending Roles & In-Demand Skills */}
          {(allRoles.length > 0 || allSkills.length > 0) && (
            <div className="glass rounded-xl p-6">
              <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8">
                {allRoles.length > 0 && (
                  <div>
                    <div className="label-caps text-gold mb-4">Trending Roles</div>
                    <div className="flex flex-wrap gap-2">
                      {visibleRoles.map((role, i) => (
                        <span key={i} className="bg-gold-muted border border-gold-border rounded px-2.5 py-1.5 text-cream text-xs">
                          {role}
                        </span>
                      ))}
                    </div>
                    {allRoles.length > 10 && (
                      <button
                        onClick={() => setShowAllRoles(!showAllRoles)}
                        className="mt-4 flex items-center gap-1 text-gold text-xs hover:text-cream transition-colors"
                      >
                        {showAllRoles ? (
                          <>Show less <ChevronUp size={14} /></>
                        ) : (
                          <>Show all {allRoles.length} <ChevronDown size={14} /></>
                        )}
                      </button>
                    )}
                  </div>
                )}
                {allSkills.length > 0 && (
                  <div>
                    <div className="label-caps text-blue mb-4">In-Demand Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {visibleSkills.map((skill, i) => (
                        <span key={i} className="bg-blue-muted border border-blue-border rounded px-2.5 py-1.5 text-cream text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                    {allSkills.length > 10 && (
                      <button
                        onClick={() => setShowAllSkills(!showAllSkills)}
                        className="mt-4 flex items-center gap-1 text-blue text-xs hover:text-cream transition-colors"
                      >
                        {showAllSkills ? (
                          <>Show less <ChevronUp size={14} /></>
                        ) : (
                          <>Show all {allSkills.length} <ChevronDown size={14} /></>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
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
