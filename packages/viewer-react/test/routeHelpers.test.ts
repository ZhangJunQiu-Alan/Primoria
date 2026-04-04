import { isParentRole, learnerHomeForRole } from '@/shared/utils/routes';

describe('route helpers', () => {
  it('normalizes parent roles for redirects', () => {
    expect(isParentRole('parent')).toBe(true);
    expect(isParentRole(' Parent ')).toBe(true);
    expect(isParentRole('user')).toBe(false);
    expect(isParentRole(null)).toBe(false);
  });

  it('maps authenticated roles to the correct home route', () => {
    expect(learnerHomeForRole('parent')).toBe('/parent');
    expect(learnerHomeForRole('user')).toBe('/home');
    expect(learnerHomeForRole(undefined)).toBe('/home');
  });
});
