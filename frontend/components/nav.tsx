'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Companies', href: '/companies' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Digest', href: '/digest' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex justify-between items-center px-10 py-5 border-b border-border glass-strong sticky top-0 z-50">
      <Link href="/" className="heading-serif text-[22px] text-cream tracking-wide">
        openroles.dev
      </Link>

      <div className="flex gap-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                isActive ? 'text-gold' : 'text-cream-muted hover:text-cream'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

    </nav>
  );
}
