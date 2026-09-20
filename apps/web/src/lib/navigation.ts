export interface NavigationItem {
  href: string;
  label: string;
  description: string;
}

export const navigationItems: NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Operational overview',
  },
  {
    href: '/contacts',
    label: 'Contacts',
    description: 'People and leads',
  },
  {
    href: '/conversations',
    label: 'Inbox',
    description: 'Customer conversations',
  },
  {
    href: '/appointments',
    label: 'Appointments',
    description: 'Scheduled activity',
  },
  {
    href: '/services',
    label: 'Services',
    description: 'Business offerings',
  },
  {
    href: '/staff',
    label: 'Staff',
    description: 'Team and assignments',
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Business configuration',
  },
];

export function isNavigationItemActive(
  pathname: string,
  href: string,
): boolean {
  if (pathname === href) {
    return true;
  }

  return href !== '/dashboard' && pathname.startsWith(`${href}/`);
}
