import { Suspense } from 'react';
import { JobsContent } from './jobs-content';
import { StarField } from '@/components/star-field';
import { Nav } from '@/components/nav';
import { getAllJobs, getCompanies } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function JobsData() {
  const [jobs, companies] = await Promise.all([
    getAllJobs(),
    getCompanies(),
  ]);

  return <JobsContent jobs={jobs} companies={companies} />;
}

function LoadingSkeleton() {
  return (
    <main className="px-10 py-10 max-w-[1400px] mx-auto relative z-10">
      <div className="mb-8">
        <div className="h-3 w-24 bg-border rounded mb-3 animate-pulse" />
        <div className="h-8 w-64 bg-border rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="glass rounded-lg h-20 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

export default function JobsPage() {
  return (
    <div className="min-h-screen relative">
      <StarField count={60} />
      <Nav />
      <Suspense fallback={<LoadingSkeleton />}>
        <JobsData />
      </Suspense>
    </div>
  );
}
