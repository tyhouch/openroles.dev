'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, MapPin, Briefcase, Building2, Search } from 'lucide-react';
import type { Job, Company } from '@/lib/types';

interface JobsContentProps {
  jobs: Job[];
  companies: Company[];
}

export function JobsContent({ jobs, companies }: JobsContentProps) {
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [functionFilter, setFunctionFilter] = useState<string>('all');

  // Get unique functions
  const functions = useMemo(() => {
    const fns = [...new Set(jobs.map(j => j.function).filter(Boolean))] as string[];
    return fns.sort();
  }, [jobs]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesTitle = (job.normalized_title || job.title_raw).toLowerCase().includes(searchLower);
        const matchesCompany = job.company_name?.toLowerCase().includes(searchLower);
        const matchesLocation = job.location_raw?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesCompany && !matchesLocation) return false;
      }

      // Company filter
      if (companyFilter !== 'all' && job.company_slug !== companyFilter) return false;

      // Function filter
      if (functionFilter !== 'all' && job.function !== functionFilter) return false;

      return true;
    });
  }, [jobs, search, companyFilter, functionFilter]);

  // Group jobs by company for display
  const jobsByCompany = useMemo(() => {
    const grouped: Record<string, Job[]> = {};
    filteredJobs.forEach(job => {
      const key = job.company_name || job.company_slug;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(job);
    });
    return grouped;
  }, [filteredJobs]);

  return (
    <main className="px-10 py-10 max-w-[1400px] mx-auto relative z-10">
      {/* Header */}
      <div className="mb-8">
        <div className="label-caps text-gold mb-3">Job Directory</div>
        <h1 className="heading-serif text-[36px] text-cream leading-tight">
          Open Positions
        </h1>
        <p className="text-cream-muted text-base mt-3 max-w-xl leading-relaxed">
          {jobs.length.toLocaleString()} active roles across {companies.length} companies.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-void border border-border rounded-lg pl-10 pr-4 py-2.5 text-cream text-sm outline-none focus:border-gold-border placeholder:text-cream-dim"
          />
        </div>

        {/* Company filter */}
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="bg-void border border-border rounded-lg px-4 py-2.5 text-cream text-sm outline-none focus:border-gold-border min-w-[180px]"
        >
          <option value="all">All Companies</option>
          {companies.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>

        {/* Function filter */}
        <select
          value={functionFilter}
          onChange={(e) => setFunctionFilter(e.target.value)}
          className="bg-void border border-border rounded-lg px-4 py-2.5 text-cream text-sm outline-none focus:border-gold-border min-w-[180px]"
        >
          <option value="all">All Functions</option>
          {functions.map(fn => (
            <option key={fn} value={fn}>{fn}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-cream-muted text-sm mb-6">
        Showing {filteredJobs.length.toLocaleString()} of {jobs.length.toLocaleString()} jobs
      </div>

      {/* Jobs list */}
      {companyFilter === 'all' ? (
        // Grouped by company view
        <div className="space-y-8">
          {Object.entries(jobsByCompany)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([companyName, companyJobs]) => (
              <div key={companyName}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={16} className="text-gold" />
                  <h2 className="heading-serif text-lg text-cream">{companyName}</h2>
                  <span className="text-cream-muted text-sm">({companyJobs.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {companyJobs.slice(0, 6).map(job => (
                    <JobCard key={job.id} job={job} showCompany={false} />
                  ))}
                </div>
                {companyJobs.length > 6 && (
                  <button
                    onClick={() => setCompanyFilter(companyJobs[0].company_slug)}
                    className="mt-3 text-gold text-sm hover:underline"
                  >
                    View all {companyJobs.length} jobs at {companyName} →
                  </button>
                )}
              </div>
            ))}
        </div>
      ) : (
        // Flat list view for single company
        <div className="grid grid-cols-2 gap-3">
          {filteredJobs.map(job => (
            <JobCard key={job.id} job={job} showCompany={false} />
          ))}
        </div>
      )}

      {filteredJobs.length === 0 && (
        <div className="text-center py-16 text-cream-muted">
          No jobs match your filters.
        </div>
      )}
    </main>
  );
}

function JobCard({ job, showCompany = true }: { job: Job; showCompany?: boolean }) {
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
        {showCompany && job.company_name && (
          <span className="flex items-center gap-1">
            <Building2 size={10} />
            {job.company_name}
          </span>
        )}
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
      </div>
    </a>
  );
}
