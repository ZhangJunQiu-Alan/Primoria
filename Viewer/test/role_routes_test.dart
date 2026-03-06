import 'package:flutter_test/flutter_test.dart';
import 'package:primoria/utils/role_routes.dart';

void main() {
  group('RoleRoutes', () {
    test('maps parent role to parent dashboard', () {
      expect(
        RoleRoutes.authenticatedHomeForRole('parent'),
        RoleRoutes.parentDashboard,
      );
    });

    test('maps non-parent roles to learner home', () {
      expect(RoleRoutes.authenticatedHomeForRole('user'), RoleRoutes.home);
      expect(RoleRoutes.authenticatedHomeForRole('author'), RoleRoutes.home);
      expect(RoleRoutes.authenticatedHomeForRole(null), RoleRoutes.home);
    });

    test('normalizes mixed-case parent role', () {
      expect(RoleRoutes.isParentRole(' Parent '), isTrue);
    });
  });
}
