import { learnerHomeForRole } from '@/shared/utils/routes';

describe('route helpers', () => {
  it('maps authenticated roles to the learner home route', () => {
    expect(learnerHomeForRole('user')).toBe('/home');
    expect(learnerHomeForRole('parent')).toBe('/home');
    expect(learnerHomeForRole(undefined)).toBe('/home');
  });
});
