import axios, { CancelToken } from "axios"
import {
  PEmptyResp,
  FsGetResp,
  FsListResp,
  Obj,
  PResp,
  PPageResp,
  FsSearchResp,
  RenameObj,
  ArchiveMeta,
  ArchiveList,
  StoreObj,
  ShareItem,
  PublicShareInfo,
  PublicShareList,
  PublicShareGet,
} from "~/types"
import { r } from "."
import { me } from "~/store"
import { joinBase, pathJoin } from "~/utils"

const DEFAULT_PAGE_SIZE = 50

export const fsGet = (
  path: string = "/",
  password = "",
  cancelToken?: CancelToken,
): Promise<FsGetResp> => {
  return r.post(
    "/fs/get",
    {
      path: path,
      password: password,
    },
    {
      cancelToken: cancelToken,
    },
  )
}
export const fsList = (
  path: string = "/",
  password = "",
  page = 1,
  per_page = DEFAULT_PAGE_SIZE,
  refresh = false,
  cancelToken?: CancelToken,
): Promise<FsListResp> => {
  return r.post(
    "/fs/list",
    {
      path,
      password,
      page,
      per_page,
      refresh,
    },
    {
      cancelToken: cancelToken,
    },
  )
}

export const fsDirs = (
  path: string = "/",
  password = "",
  forceRoot = false,
): PResp<Obj[]> => {
  // 如果是强制根目录，使用原始路径，否则使用当前访问路径作为根节点
  const finalPath = path
  return r.post("/fs/dirs", {
    path: finalPath,
    password,
    force_root: forceRoot,
  })
}

export const fsMkdir = (path: string): PEmptyResp => {
  return r.post("/fs/mkdir", { path })
}

export const fsRename = (
  path: string,
  name: string,
  overwrite: boolean,
): PEmptyResp => {
  return r.post("/fs/rename", { path, name, overwrite })
}

export const fsBatchRename = (
  src_dir: string,
  rename_objects: RenameObj[],
): PEmptyResp => {
  return r.post("/fs/batch_rename", { src_dir, rename_objects })
}

export const fsMove = (
  src_dir: string,
  dst_dir: string,
  names: string[],
  overwrite: boolean,
): PEmptyResp => {
  return r.post("/fs/move", { src_dir, dst_dir, names, overwrite })
}

export const fsRecursiveMove = (
  src_dir: string,
  dst_dir: string,
  conflict_policy: boolean,
): PEmptyResp => {
  return r.post("/fs/recursive_move", { src_dir, dst_dir, conflict_policy })
}

export const fsCopy = (
  src_dir: string,
  dst_dir: string,
  names: string[],
  overwrite: boolean,
): PEmptyResp => {
  return r.post("/fs/copy", { src_dir, dst_dir, names, overwrite })
}

export const fsRemove = (dir: string, names: string[]): PEmptyResp => {
  return r.post("/fs/remove", { dir, names })
}

export const fsRemoveEmptyDirectory = (src_dir: string): PEmptyResp => {
  return r.post("/fs/remove_empty_directory", { src_dir })
}

export const fsNewFile = (
  path: string,
  password: string,
  overwrite: boolean,
): PEmptyResp => {
  return r.put("/fs/put", undefined, {
    headers: {
      "File-Path": encodeURIComponent(path),
      Password: password,
      Overwrite: overwrite.toString(),
    },
  })
}

export const fsArchiveMeta = (
  path: string = "/",
  password = "",
  archive_pass = "",
  refresh = false,
  cancelToken?: CancelToken,
): PResp<ArchiveMeta> => {
  return r.post(
    "/fs/archive/meta",
    {
      path,
      password,
      archive_pass,
      refresh,
    },
    {
      cancelToken: cancelToken,
    },
  )
}

export const fsArchiveList = (
  path: string = "/",
  password = "",
  archive_pass = "",
  inner_path = "/",
  page = 1,
  per_page = 0,
  refresh = false,
  cancelToken?: CancelToken,
): PResp<ArchiveList> => {
  return r.post(
    "/fs/archive/list",
    {
      path,
      password,
      archive_pass,
      inner_path,
      page,
      per_page,
      refresh,
    },
    {
      cancelToken: cancelToken,
    },
  )
}

export const fsArchiveDecompress = (
  src_dir: string,
  dst_dir: string,
  name: string[],
  archive_pass = "",
  inner_path = "/",
  cache_full = true,
  put_into_new_dir = false,
): PEmptyResp => {
  return r.post("/fs/archive/decompress", {
    src_dir,
    dst_dir,
    name,
    archive_pass,
    inner_path,
    cache_full,
    put_into_new_dir,
  })
}

export type S3TransitionArchivePayload = {
  action: "archive"
  storage_class: string
  days?: number
}

export type S3TransitionRestorePayload = {
  action: "restore"
  days: number
  tier?: string
}

export type S3TransitionPayload =
  | S3TransitionArchivePayload
  | S3TransitionRestorePayload

export type S3TransitionResponse = {
  task_id?: number | string
}

export const fsS3Transition = (
  path: string,
  payload: S3TransitionPayload,
  password = "",
): PResp<S3TransitionResponse> => {
  const method = payload.action === "archive" ? "archive" : "thaw"
  return r.post("/fs/other", {
    path,
    password,
    method,
    data: payload,
  })
}

export const offlineDownload = (
  path: string,
  urls: string[],
  tool: string,
  delete_policy: string,
): PEmptyResp => {
  return r.post(`/fs/add_offline_download`, { path, urls, tool, delete_policy })
}

export const createShare = (payload: {
  path: string
  name?: string
  password?: string
  expire_hours?: number
  allow_preview?: boolean
  allow_download?: boolean
}): PResp<ShareItem> => {
  return r.post("/share/create", payload)
}

export const getShareList = (
  page = 1,
  per_page = 100,
): PPageResp<ShareItem> => {
  return r.get("/share/list", {
    params: {
      page,
      per_page,
    },
  })
}

export const deleteShare = (share_id: string): PEmptyResp => {
  return r.post("/share/delete", { share_id })
}

export const getPublicShareInfo = (
  share_id: string,
  token?: string,
): PResp<PublicShareInfo> => {
  return r.get("/public/share/info", {
    params: {
      share_id,
      auth: token || undefined,
    },
  })
}

export const authPublicShare = (
  share_id: string,
  password: string,
): PResp<{ token: string }> => {
  return r.post("/public/share/auth", {
    share_id,
    password,
  })
}

export const listPublicShare = (payload: {
  share_id: string
  path?: string
  token?: string
  page?: number
  per_page?: number
}): PResp<PublicShareList> => {
  return r.post("/public/share/list", payload)
}

export const getPublicShare = (payload: {
  share_id: string
  path?: string
  token?: string
}): PResp<PublicShareGet> => {
  return r.post("/public/share/get", payload)
}

export const fetchText = async (
  url: string,
  ts = true,
): Promise<{
  content: ArrayBuffer | string
  contentType?: string
}> => {
  try {
    const resp = await axios.get(url, {
      responseType: "blob",
      params: ts
        ? {
            alist_ts: new Date().getTime(),
          }
        : undefined,
    })
    const content = await resp.data.arrayBuffer()
    const contentType = resp.headers["content-type"]
    return { content, contentType }
  } catch (e) {
    return ts
      ? await fetchText(url, false)
      : {
          content: `Failed to fetch ${url}: ${e}`,
          contentType: "",
        }
  }
}

export const fsSearch = async (
  parent: string,
  keywords: string,
  password = "",
  scope = 0,
  page = 1,
  per_page = 100,
): Promise<FsSearchResp> => {
  return r.post("/fs/search", {
    parent,
    keywords,
    scope,
    page,
    per_page,
    password,
  })
}

export const buildIndex = async (paths = ["/"], max_depth = -1): PEmptyResp => {
  return r.post("/admin/index/build", {
    paths,
    max_depth,
  })
}

export const updateIndex = async (paths = [], max_depth = -1): PEmptyResp => {
  return r.post("/admin/index/update", {
    paths,
    max_depth,
  })
}

export const getLabelList = (): PResp<any> => {
  return r.get("/label/list")
}

export const createLabel = (
  name: string,
  description: string,
  bg_color: string,
): PEmptyResp => {
  return r.post("/admin/label/create", { name, description, bg_color })
}

export const updateLabel = (
  id: number,
  name: string,
  description: string,
  bg_color: string,
): PEmptyResp => {
  return r.post("/admin/label/update", { id, name, description, bg_color })
}

export const getLabelDetail = (id: number): PResp<any> => {
  return r.get(`/label/get?id=${id}`)
}

export const getFilesByLabel = (label_id: number): PResp<any> => {
  return r.get(`/label_file_binding/get_file_by_label?label_id=${label_id}`)
}

export const createLabelFileBinding = (
  label_ids: string,
  obj: StoreObj & Obj,
): PEmptyResp => {
  return r.post("/admin/label_file_binding/create", {
    label_ids,
    name: obj.name,
    id: obj.id,
    path: obj.path,
    size: obj.size,
    is_dir: obj.is_dir,
    modified: obj.modified,
    created: obj.created,
    sign: obj.sign,
    thumb: obj.thumb,
    type: obj.type,
    hashinfo: obj.hashinfo,
  })
}
// 批量打标签
export const createLabelFileBindingBatch = (
  labelIds: string[],
  items: StoreObj[],
): PEmptyResp => {
  const requestData = {
    items: items.map((obj) => ({
      path: (obj as any).path || "",
      name: obj.name,
      isDir: obj.is_dir,
      labelIdList: labelIds.map((id) => parseInt(id)),
      size: obj.size || 0,
      type: obj.type || 0,
      modified: obj.modified || "2025-08-15T00:00:00Z",
      created: (obj as any).created || "2025-08-15T00:00:00Z",
      sign: obj.sign || "",
      thumb: obj.thumb || "",
      hashInfoStr: (obj as any).hashinfo || "",
    })),
  }

  return r.post("/admin/label_file_binding/create_batch", requestData)
}

export const getLabelFileBinding = (file_name?: string): PResp<any> => {
  return r.post("/label_file_binding/get", { file_name })
}

export const getRoleList = (): PResp<any> => {
  return r.get("/admin/role/list")
}

export interface Role {
  id: number
  name: string
  description: string
  permission_scopes: {
    path: string
    permission: number
  }[]
}

export const getRoleDetail = (id: number): PResp<Role> => {
  return r.get(`/admin/role/get`, { params: { id } })
}

export interface Permission {
  id: number
  name: string
  description: string
  permission: number
  path_pattern: string
  allow_op: string[]
  allow_op_info: null
  created_at: string
  updated_at: string
}

export const getPermissionDetail = (id: number): PResp<Permission> => {
  return r.get(`/permission/${id}`)
}

interface PermissionResponse {
  content: Permission[]
}

export const getPermissionList = (): PResp<PermissionResponse> => {
  return r.get("/permission")
}

interface PermissionRequest {
  id?: number
  name: string
  description: string
  path_pattern: string
  permission: number
}

export const createPermission = (data: PermissionRequest): PEmptyResp => {
  return r.post("/permission", data)
}

export const updatePermission = (data: PermissionRequest): PEmptyResp => {
  return r.put("/permission", data)
}

export const deletePermission = (id: number): PEmptyResp => {
  return r.delete(`/permission/${id}`)
}

interface RoleRequest {
  id?: number
  name: string
  description: string
  permission_scopes: {
    path: string
    permission: number
  }[]
}

export const createRole = (data: RoleRequest): PEmptyResp => {
  return r.post("/admin/role/create", data)
}

export const updateRole = (data: RoleRequest): PEmptyResp => {
  return r.post("/admin/role/update", data)
}

export const deleteRole = (id: number): PEmptyResp => {
  return r.post(`/admin/role/delete?id=${id}`)
}

interface RegisterRequest {
  username: string
  password: string
}

// 用户注册
export const register = (data: RegisterRequest): PEmptyResp => {
  return r.post("/auth/register", data)
}
// 当前用户活跃会话
export const getMySession = (): PResp<any> => {
  return r.get("/me/sessions")
}
// 踢出我的某个会话
export const evictMySession = (session_id: string): PEmptyResp => {
  return r.post("/me/sessions/evict", { session_id })
}
// 列出全站会话（管理员）
export const getSessionList = (): PResp<any> => {
  return r.get("/admin/session/list")
}

// 踢出指定会话（管理员）
export const evictSession = (session_id: string): PEmptyResp => {
  return r.post("/admin/session/evict", { session_id })
}

export const cleanSessions = (data?: {
  user_id?: number
  session_id?: string
}): PEmptyResp => {
  return r.post("/admin/session/clean", data || {})
}
