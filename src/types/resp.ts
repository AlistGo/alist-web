import { Obj } from "."

export interface Resp<T> {
  code: number
  message: string
  data: T
}

export type PageResp<T> = Resp<{
  content: T[]
  total: number
}>

export type FsListResp = Resp<{
  content: Obj[]
  total: number
  filtered_total?: number
  page?: number
  per_page?: number
  has_more?: boolean
  pages_total?: number
  readme: string
  header: string
  write: boolean
  provider: string
}>

export type SearchNode = {
  parent: string
  name: string
  is_dir: boolean
  size: number
  path: string
  type: number
}

export type FsSearchResp = PageResp<SearchNode>

export type FsGetResp = Resp<
  Obj & {
    raw_url: string
    readme: string
    header: string
    provider: string
    related: Obj[]
  }
>

export type EmptyResp = Resp<{}>

export type PResp<T> = Promise<Resp<T>>
export type PPageResp<T> = Promise<PageResp<T>>
export type PEmptyResp = Promise<EmptyResp>
