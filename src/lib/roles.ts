// Admin check shared by the app and tests. The database may spell the role
// "Super Admin", "SuperAdmin", "super_admin" or "Admin"; all of these are admins.
export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const key = role.toLowerCase().replace(/[\s_-]/g, '');
  return key === 'superadmin' || key === 'admin';
}
