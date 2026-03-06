class RoleRoutes {
  static const String home = '/home';
  static const String parentDashboard = '/parent';
  static const String login = '/login';

  static String normalizeRole(String? role) {
    final normalized = role?.trim().toLowerCase();
    if (normalized == null || normalized.isEmpty) return 'user';
    return normalized;
  }

  static bool isParentRole(String? role) => normalizeRole(role) == 'parent';

  static String authenticatedHomeForRole(String? role) {
    return isParentRole(role) ? parentDashboard : home;
  }
}
