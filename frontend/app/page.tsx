import { Suspense } from 'react';
import { DashboardContent } from './dashboard-content';
import { StarField } from '@/components/star-field';
import { Nav } from '@/components/nav';
import { getCompanies, getSectorSummary } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function DashboardData() {
  const [companies, sectorSummary] = await Promise.all([
    getCompanies(),
    getSectorSummary().catch(() => null),
  ]);

  return (
    <DashboardContent
      companies={companies}
      sectorSummary={sectorSummary}
    />
  );
}

function LoadingSkeleton() {
  return (
    <main className="px-10 py-10 max-w-[1400px] mx-auto relative z-10">
      <div className="mb-12">
        <div className="h-3 w-32 bg-border rounded mb-3 animate-pulse" />
        <div className="h-10 w-96 bg-border rounded mb-3 animate-pulse" />
        <div className="h-4 w-64 bg-border rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-4 gap-5 mb-12">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-lg p-6 h-24 animate-pulse" />
        ))}
      </div>
      <div className="glass rounded-xl h-96 animate-pulse" />
    </main>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen relative">
      <StarField count={100} />
      <Nav />
      <Suspense fallback={<LoadingSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}
