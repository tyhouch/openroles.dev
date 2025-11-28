'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Companies', href: '/companies' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Digest', href: '/digest' },
];

export function Nav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="flex justify-between items-center px-4 md:px-10 py-4 md:py-5 border-b border-border glass-strong sticky top-0 z-50">
      <Link href="/" className="heading-serif text-lg md:text-[22px] text-cream tracking-wide">
        openroles.dev
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex gap-8">
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

      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-10 h-10 flex items-center justify-center text-cream-muted hover:text-cream transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile nav overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-deep z-40">
          <div className="flex flex-col p-6 gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-lg font-medium py-3 px-4 rounded-lg transition-colors ${
                    isActive
                      ? 'text-gold bg-gold-muted'
                      : 'text-cream-muted hover:text-cream hover:bg-navy/50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
