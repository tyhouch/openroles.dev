import { Suspense } from 'react';
import { CompaniesContent } from './companies-content';
import { StarField } from '@/components/star-field';
import { Nav } from '@/components/nav';
import { getCompanies, getSectorSummary } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function CompaniesData() {
  const [companies, sectorSummary] = await Promise.all([
    getCompanies(),
    getSectorSummary().catch(() => null),
  ]);

  return (
    <CompaniesContent
      companies={companies}
      sectorSummary={sectorSummary}
    />
  );
}

function LoadingSkeleton() {
  return (
    <main className="px-10 py-10 max-w-[1400px] mx-auto relative z-10">
      <div className="mb-8">
        <div className="h-3 w-24 bg-border rounded mb-3 animate-pulse" />
        <div className="h-8 w-64 bg-border rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="glass rounded-xl h-48 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

export default function CompaniesPage() {
  return (
    <div className="min-h-screen relative">
      <StarField count={80} />
      <Nav />
      <Suspense fallback={<LoadingSkeleton />}>
        <CompaniesData />
      </Suspense>
    </div>
  );
}
