export type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'client_viewer'

export const RolePermissions: Record<Role, string[]> = {
  owner: [
    'workspace.manage',
    'workspace.delete',
    'billing.manage',
    'members.invite',
    'members.remove',
    'projects.create',
    'projects.edit',
    'projects.delete',
    'projects.view',
    'audits.run',
    'reports.view',
    'reports.share',
    'reports.export',
    'clients.manage',
    'agency.branding.manage',
    'rum.manage',
    'rum.view',
    'deployment_guard.manage',
    'cicd_tokens.manage',
    'api_tokens.manage'
  ],
  admin: [
    'members.invite',
    'projects.create',
    'projects.edit',
    'projects.delete',
    'projects.view',
    'audits.run',
    'reports.view',
    'reports.share',
    'reports.export',
    'clients.manage',
    'rum.manage',
    'rum.view',
    'deployment_guard.manage'
  ],
  member: [
    'projects.view',
    'audits.run',
    'reports.view',
    'reports.share',
    'rum.view'
  ],
  viewer: [
    'projects.view',
    'reports.view',
    'rum.view'
  ],
  client_viewer: [
    'reports.view'
  ]
}

export function hasPermission(role: Role, action: string): boolean {
  if (!RolePermissions[role]) return false
  return RolePermissions[role].includes(action)
}
