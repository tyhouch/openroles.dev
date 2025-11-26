// API Response Types

export interface Company {
  id: string;
  name: string;
  slug: string;
  ats_type: string;
  tier: string;
  last_scraped_at: string | null;
  job_count: number;
  jobs_added_this_week: number | null;
  jobs_removed_this_week: number | null;
  hiring_velocity: 'up' | 'stable' | 'down' | null;
  focus_areas: string[] | null;
  summary_text: string | null;
  anomalies: string[] | null;
}

export interface CompanyDetail extends Company {
  website_url: string | null;
  careers_url: string | null;
  profile_markdown: string | null;
  active_jobs_count: number;
  jobs: Job[];
}

export interface Job {
  id: string;
  company_slug: string;
  company_name: string;
  title_raw: string;
  normalized_title: string | null;
  location_raw: string | null;
  function: string | null;
  seniority: string | null;
  team_area: string | null;
  remote_policy: string | null;
  job_url: string | null;
  first_seen_at: string;
  removed_at: string | null;
}

export interface JobFeedItem {
  event_type: 'added' | 'removed';
  event_time: string;
  job: Job;
}

export interface SectorSummary {
  id: string;
  week_start: string;
  total_companies: number;
  total_active_jobs: number;
  total_jobs_added: number;
  total_jobs_removed: number;
  summary_text: string | null;
  trending_roles: string[] | null;
  trending_skills: string[] | null;
  sector_signals: string[] | null;
  created_at: string;
}

export interface CompanySummary {
  id: string;
  company_slug: string;
  company_name: string;
  week_start: string;
  jobs_added_count: number | null;
  jobs_removed_count: number | null;
  total_active_jobs: number | null;
  summary_text: string | null;
  hiring_velocity: 'up' | 'stable' | 'down' | null;
  focus_areas: string[] | null;
  notable_changes: string[] | null;
  anomalies: string[] | null;
  created_at: string;
}

// UI Types
export type VelocityLevel = 'high' | 'medium' | 'low';

export function mapHiringVelocity(velocity: 'up' | 'stable' | 'down' | null): VelocityLevel {
  switch (velocity) {
    case 'up': return 'high';
    case 'stable': return 'medium';
    case 'down': return 'low';
    default: return 'medium';
  }
}
