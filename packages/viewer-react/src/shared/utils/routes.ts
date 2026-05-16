export function learnerHomeForRole(_role: string | null | undefined) {
  return '/home';
}

export const learnerNavItems = [
  { to: '/home', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/community', label: 'Community' },
  { to: '/ai-tutor', label: 'AI Tutor' },
  { to: '/profile', label: 'Profile' },
] as const;
