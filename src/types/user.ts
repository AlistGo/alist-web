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
  role: UserRole
  permission: number
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
] as const

export const UserMethods = {
  is_guest: (user: User) => user.role === UserRole.GUEST,
  is_admin: (user: User) => user.role === UserRole.ADMIN,
  is_general: (user: User) => user.role === UserRole.GENERAL,
  can: (user: User, permission: number) => {
    let adminPrivilege = UserMethods.is_admin(user) && permission < 10
    return adminPrivilege || ((user.permission >> permission) & 1) == 1
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
