export enum UserRole {
  GENERAL,
  GUEST,
  ADMIN,
}

export interface User {
  id: number
  username: string
  password: string
  base_path: string
  role: number[]
  role_info: number[]
  permission: number
  permissions: {
    path: string
    permission: number
  }[]
  sso_id: string
  disabled: boolean
  // otp: boolean;
}

export const UserPermissions = [
  "see_hides",
  "access_without_password",
  "offline_download",
  "write",
  "rename",
  "move",
  "copy",
  "delete",
  "webdav_read",
  "webdav_manage",
  "ftp_read",
  "ftp_manage",
  "read_archives",
  "decompress",
] as const

export const UserMethods = {
  is_guest: (user: User) => user.role.includes(UserRole.GUEST),
  is_admin: (user: User) => user.role.includes(UserRole.ADMIN),
  is_general: (user: User) => user.role.includes(UserRole.GENERAL),
  can: (user: User, permission: number, path?: string) => {
    // 如果是管理员，直接返回true
    if (UserMethods.is_admin(user)) return true

    // 如果没有提供路径，检查所有权限
    if (!path) {
      return user.permissions.some(
        (p) => ((p.permission >> permission) & 1) === 1,
      )
    }

    // 如果提供了路径，检查指定路径的权限
    // 找到最匹配的路径权限
    const matchedPermission = user.permissions
      .filter((p) => path.startsWith(p.path))
      .sort((a, b) => b.path.length - a.path.length)[0]

    if (!matchedPermission) return false
    return ((matchedPermission.permission >> permission) & 1) === 1
  },
  // can_see_hides: (user: User) =>
  //   UserMethods.is_admin(user) || (user.permission & 1) == 1,
  // can_access_without_password: (user: User) =>
  //   UserMethods.is_admin(user) || ((user.permission >> 1) & 1) == 1,
  // can_offline_download_tasks: (user: User) =>
  //   UserMethods.is_admin(user) || ((user.permission >> 2) & 1) == 1,
  // can_write: (user: User) =>
  //   UserMethods.is_admin(user) || ((user.permission >> 3) & 1) == 1,
  // can_rename: (user: User) =>
  //   UserMethods.is_admin(user) || ((user.permission >> 4) & 1) == 1,
  // can_move: (user: User) =>
  //   UserMethods.is_admin(user) || ((user.permission >> 5) & 1) == 1,
  // can_copy: (user: User) =>
  //   UserMethods.is_admin(user) || ((user.permission >> 6) & 1) == 1,
  // can_remove: (user: User) =>
  //   UserMethods.is_admin(user) || ((user.permission >> 7) & 1) == 1,
  // can_webdav_read: (user: User) =>
  //   UserMethods.is_admin(user) || ((user.permission >> 8) & 1) == 1,
  // can_webdav_manage: (user: User) =>
  //   UserMethods.is_admin(user) || ((user.permission >> 9) & 1) == 1,
}
