'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { isNavigationItemActive, navigationItems } from '../lib/navigation';

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="app-navigation">
      {navigationItems.map((item) => {
        const active = isNavigationItemActive(pathname, item.href);

        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className="app-navigation__item"
            data-active={active ? 'true' : 'false'}
            href={item.href}
            key={item.href}
          >
            <span className="app-navigation__indicator" />
            <span>
              <span className="app-navigation__label">{item.label}</span>
              <span className="app-navigation__description">
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
