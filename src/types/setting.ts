import { Type } from "."

export enum Group {
  SINGLE,
  SITE,
  STYLE,
  PREVIEW,
  GLOBAL,
  ARIA2,
  INDEX,
  SSO,
  LDAP,
  S3,
  FTP,
}
export enum Flag {
  PUBLIC,
  PRIVATE,
  READONLY,
  DEPRECATED,
}

export interface SettingItem {
  key: string
  value: string
  type: Type
  help: string
  options?: string
  group: Group
  flag: Flag
}
