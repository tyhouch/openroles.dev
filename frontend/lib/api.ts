import type {
  Company,
  CompanyDetail,
  CompanySummary,
  Job,
  JobFeedItem,
  SectorSummary,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100';

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Companies
export async function getCompanies(): Promise<Company[]> {
  return fetchApi<Company[]>('/api/companies');
}

export async function getCompany(slug: string): Promise<CompanyDetail> {
  return fetchApi<CompanyDetail>(`/api/companies/${slug}`);
}

// Jobs
interface JobsResponse {
  total: number;
  limit: number;
  offset: number;
  jobs: Job[];
}

export async function getJobs(params?: {
  company?: string;
  function?: string;
  seniority?: string;
  status?: 'active' | 'removed' | 'added_this_week';
  limit?: number;
  offset?: number;
}): Promise<Job[]> {
  const searchParams = new URLSearchParams();
  if (params?.company) searchParams.set('company', params.company);
  if (params?.function) searchParams.set('function', params.function);
  if (params?.seniority) searchParams.set('seniority', params.seniority);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  const response = await fetchApi<JobsResponse>(`/api/jobs${query ? `?${query}` : ''}`);
  return response.jobs;
}

export async function getJobsPaginated(params?: {
  company?: string;
  function?: string;
  seniority?: string;
  status?: 'active' | 'removed' | 'added_this_week';
  limit?: number;
  offset?: number;
}): Promise<JobsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.company) searchParams.set('company', params.company);
  if (params?.function) searchParams.set('function', params.function);
  if (params?.seniority) searchParams.set('seniority', params.seniority);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchApi<JobsResponse>(`/api/jobs${query ? `?${query}` : ''}`);
}

export async function getAllJobs(params?: {
  company?: string;
  function?: string;
  seniority?: string;
  status?: 'active' | 'removed' | 'added_this_week';
}): Promise<Job[]> {
  const allJobs: Job[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const response = await getJobsPaginated({ ...params, limit, offset });
    allJobs.push(...response.jobs);

    if (allJobs.length >= response.total || response.jobs.length < limit) {
      break;
    }
    offset += limit;
  }

  return allJobs;
}

export async function getJobsFeed(limit: number = 50): Promise<JobFeedItem[]> {
  return fetchApi<JobFeedItem[]>(`/api/jobs/feed?limit=${limit}`);
}

// Summaries
export async function getSectorSummary(): Promise<SectorSummary> {
  return fetchApi<SectorSummary>('/api/summaries/sector');
}

export async function getSectorHistory(limit: number = 10): Promise<SectorSummary[]> {
  return fetchApi<SectorSummary[]>(`/api/summaries/sector/history?limit=${limit}`);
}

export async function getCompanySummary(slug: string): Promise<CompanySummary> {
  return fetchApi<CompanySummary>(`/api/summaries/company/${slug}`);
}

export async function getCompanySummaryHistory(
  slug: string,
  limit: number = 10
): Promise<CompanySummary[]> {
  return fetchApi<CompanySummary[]>(`/api/summaries/company/${slug}/history?limit=${limit}`);
}

// Utility to get current week number
export function getWeekNumber(date: Date = new Date()): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

export function formatWeekLabel(date: Date = new Date()): string {
  return `Week ${getWeekNumber(date)}, ${date.getFullYear()}`;
}
