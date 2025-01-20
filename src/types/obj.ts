export enum ObjType {
  UNKNOWN,
  FOLDER,
  // OFFICE,
  VIDEO,
  AUDIO,
  TEXT,
  IMAGE,
}

export interface Obj {
  name: string
  size: number
  is_dir: boolean
  modified: string
  sign?: string
  thumb: string
  type: ObjType
  path: string
}

export type StoreObj = Obj & {
  selected?: boolean
}

export type RenameObj = {
  src_name: string
  new_name: string
}

export type ObjTree = Obj & {
  children?: ObjTree[]
}

export type ArchiveMeta = {
  content: ObjTree[] | null
  encrypted: boolean
  comment: string
  sort?: {
    order_by: "" | "name" | "size" | "modified"
    order_direction: "" | "asc" | "desc"
    extract_folder: "" | "front" | "back"
  }
  raw_url: string
  sign: string
}

export type ArchiveList = {
  content: Obj[]
  total: number
}
