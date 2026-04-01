export interface ShareItem {
  id: number
  share_id: string
  name: string
  root_path: string
  is_dir: boolean
  has_password: boolean
  burn_after_read: boolean
  access_limit: number
  access_count: number
  remaining_accesses: number
  allow_preview: boolean
  allow_download: boolean
  enabled: boolean
  view_count: number
  download_count: number
  last_access_at?: string | null
  consumed_at?: string | null
  expires_at?: string | null
  created_at: string
  updated_at: string
  url: string
}

export interface PublicShareInfo {
  share_id: string
  name: string
  is_dir: boolean
  has_password: boolean
  burn_after_read: boolean
  access_limit: number
  access_count: number
  remaining_accesses: number
  allow_preview: boolean
  allow_download: boolean
  authed: boolean
  consumed_at?: string | null
  expires_at?: string | null
  created_at: string
}

export interface PublicShareObj {
  name: string
  size: number
  is_dir: boolean
  modified: string
  created: string
  thumb: string
  type: number
  path: string
  storage_class?: string
  download_url?: string
  preview_url?: string
}

export interface PublicShareList {
  content: PublicShareObj[]
  total: number
  page: number
  per_page: number
  has_more: boolean
  pages_total: number
}

export interface PublicShareGet {
  item: PublicShareObj
  provider: string
}
