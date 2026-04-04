export function isParentRole(role: string | null | undefined) {
  return (role ?? '').trim().toLowerCase() === 'parent';
}

export function learnerHomeForRole(role: string | null | undefined) {
  return isParentRole(role) ? '/parent' : '/home';
}

export const learnerNavItems = [
  { to: '/home', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/community', label: 'Community' },
  { to: '/ai-tutor', label: 'AI Tutor' },
  { to: '/profile', label: 'Profile' },
] as const;

