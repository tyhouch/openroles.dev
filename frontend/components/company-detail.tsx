'use client';

import { useState } from 'react';
import { X, ExternalLink, MapPin, Briefcase } from 'lucide-react';
import { MetricCard } from './metric-card';
import type { CompanyDetail as CompanyDetailType, CompanySummary, Job } from '@/lib/types';

interface CompanyDetailProps {
  company: CompanyDetailType | null;
  summary: CompanySummary | null;
  onClose: () => void;
}

export function CompanyDetail({ company, summary, onClose }: CompanyDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs'>('overview');
  const [jobFilter, setJobFilter] = useState<string>('all');

  if (!company) return null;

  // Extract overview from profile markdown
  const getOverview = () => {
    if (!company.profile_markdown) return 'No profile available';
    const overviewMatch = company.profile_markdown.match(/## Overview\n\n([^\n]+)/);
    return overviewMatch ? overviewMatch[1] : company.profile_markdown.slice(0, 300) + '...';
  };

  // Get focus areas from summary
  const getFocusAreas = () => {
    if (summary?.focus_areas && summary.focus_areas.length > 0) {
      return summary.focus_areas;
    }
    // Fallback to most common functions
    const functionCounts: Record<string, number> = {};
    company.jobs.forEach(job => {
      if (job.function) {
        functionCounts[job.function] = (functionCounts[job.function] || 0) + 1;
      }
    });
    return Object.entries(functionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([fn]) => fn);
  };

  // Get unique functions for filtering
  const functions = [...new Set(company.jobs.map(j => j.function).filter(Boolean))] as string[];

  // Filter jobs
  const filteredJobs = jobFilter === 'all'
    ? company.jobs
    : company.jobs.filter(j => j.function === jobFilter);

  const change = summary?.jobs_added_count ?? 0;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-deep border-l border-border z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="label-caps text-gold mb-2">Observation Target</div>
              <h2 className="heading-serif text-cream text-[28px]">{company.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-border text-cream-muted hover:text-cream hover:border-cream-muted transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricCard label="Open Roles" value={company.active_jobs_count} small />
            <MetricCard label="Week Delta" value={change > 0 ? `+${change}` : String(change)} small />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-void rounded-lg p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-4 rounded-md text-sm transition-colors ${
                activeTab === 'overview' ? 'bg-deep text-cream' : 'text-cream-muted hover:text-cream'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex-1 py-2 px-4 rounded-md text-sm transition-colors ${
                activeTab === 'jobs' ? 'bg-deep text-cream' : 'text-cream-muted hover:text-cream'
              }`}
            >
              Jobs ({company.jobs.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' ? (
            <>
              <div className="mb-6">
                <div className="label-caps mb-2">Overview</div>
                <p className="text-cream-muted text-sm leading-relaxed">{getOverview()}</p>
              </div>

              <div className="mb-6">
                <div className="label-caps mb-3">Focus Areas</div>
                <div className="flex flex-wrap gap-2">
                  {getFocusAreas().map((area) => (
                    <span
                      key={area}
                      className="bg-gold-muted border border-gold-border rounded-md px-3 py-1.5 text-cream text-[13px]"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {summary?.notable_changes && summary.notable_changes.length > 0 && (
                <div className="mb-6">
                  <div className="label-caps mb-3">Notable Changes</div>
                  <ul className="space-y-2">
                    {summary.notable_changes.map((change, i) => (
                      <li key={i} className="text-cream-muted text-sm flex gap-2">
                        <span className="text-gold">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary?.summary_text && (
                <div className="glass rounded-lg p-4">
                  <div className="label-caps text-gold mb-2">AI Analysis</div>
                  <p className="text-cream-muted text-[13px] leading-relaxed">
                    {summary.summary_text}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Job function filter */}
              {functions.length > 1 && (
                <div className="mb-4">
                  <select
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    className="w-full bg-void border border-border rounded-lg px-3 py-2 text-cream text-sm outline-none focus:border-gold-border"
                  >
                    <option value="all">All Functions ({company.jobs.length})</option>
                    {functions.map(fn => (
                      <option key={fn} value={fn}>
                        {fn} ({company.jobs.filter(j => j.function === fn).length})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Jobs list */}
              <div className="space-y-2">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
                {filteredJobs.length === 0 && (
                  <p className="text-cream-muted text-sm text-center py-8">
                    No jobs match the selected filter.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {company.careers_url && (
          <div className="p-4 border-t border-border">
            <a
              href={company.careers_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 border border-border rounded-lg text-cream-muted hover:text-cream hover:border-cream-muted transition-colors text-sm"
            >
              View Careers Page
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <a
      href={job.job_url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block glass rounded-lg p-4 hover:border-gold-border transition-colors group"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <h4 className="text-cream text-sm font-medium group-hover:text-gold transition-colors">
          {job.normalized_title || job.title_raw}
        </h4>
        <ExternalLink size={12} className="text-cream-dim flex-shrink-0 mt-1" />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-cream-muted">
        {job.function && (
          <span className="flex items-center gap-1">
            <Briefcase size={10} />
            {job.function}
          </span>
        )}
        {job.location_raw && (
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {job.location_raw}
          </span>
        )}
        {job.team_area && (
          <span className="text-cream-dim">
            {job.team_area}
          </span>
        )}
      </div>
    </a>
  );
}
