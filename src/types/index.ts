export * from "./obj"
export * from "./resp"
export * from "./setting"
export * from "./storage"
export * from "./user"
export * from "./driver_item"
export * from "./item_type"
export * from "./meta"
export * from "./task"
export * from "./share"

export interface StoreObj {
  name: string
  size: number
  is_dir: boolean
  modified: string
  sign?: string
  thumb?: string
  type: number
  selected?: boolean
  storage_class?: string
  label_list?: {
    id: number
    name: string
    type: number
    description: string
    bg_color: string
  }[]
}
