import { Suspense } from 'react';
import { DigestContent } from './digest-content';
import { StarField } from '@/components/star-field';
import { Nav } from '@/components/nav';
import { getCompanies, getSectorSummary, getWeekNumber } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function DigestData() {
  const [companies, sectorSummary] = await Promise.all([
    getCompanies(),
    getSectorSummary().catch(() => null),
  ]);

  return (
    <DigestContent
      companies={companies}
      sectorSummary={sectorSummary}
      weekNumber={getWeekNumber()}
    />
  );
}

function LoadingSkeleton() {
  return (
    <main className="px-10 py-10 max-w-[900px] mx-auto relative z-10">
      <div className="mb-8">
        <div className="h-3 w-24 bg-border rounded mb-3 animate-pulse" />
        <div className="h-8 w-72 bg-border rounded animate-pulse" />
      </div>
      <div className="glass rounded-xl p-8 animate-pulse">
        <div className="h-4 w-full bg-border rounded mb-4" />
        <div className="h-4 w-3/4 bg-border rounded mb-4" />
        <div className="h-4 w-5/6 bg-border rounded" />
      </div>
    </main>
  );
}

export default function DigestPage() {
  return (
    <div className="min-h-screen relative">
      <StarField count={60} />
      <Nav />
      <Suspense fallback={<LoadingSkeleton />}>
        <DigestData />
      </Suspense>
    </div>
  );
}
