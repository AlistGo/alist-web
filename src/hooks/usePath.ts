import axios, { Canceler } from "axios"
import {
  appendObjs,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  password,
  ObjStore,
  State,
  getPagination,
  objStore,
  getHistoryKey,
  hasHistory,
  recoverHistory,
  clearHistory,
  me,
} from "~/store"
import {
  fsGet,
  fsList,
  handleRespWithoutNotify,
  log,
  notify,
  pathJoin,
} from "~/utils"
import { useFetch } from "./useFetch"
import { useRouter } from "./useRouter"

let first_fetch = true

let cancelObj: Canceler | undefined
let cancelList: Canceler | undefined

const IsDirRecord: Record<string, boolean> = {}
let globalPage = 1
let globalHasMore = false
let globalHasMoreKnown = false
export const getGlobalPage = () => {
  return globalPage
}
export const setGlobalPage = (page: number) => {
  globalPage = page
  // console.log("setGlobalPage", globalPage)
}
export const resetGlobalPage = () => {
  setGlobalPage(1)
}
export const usePath = () => {
  const { pathname, to, searchParams } = useRouter()
  const perfEnabled = import.meta.env.DEV

  const cancelPendingObj = (reason: string) => {
    if (cancelObj) {
      cancelObj(reason)
      cancelObj = undefined
    }
  }

  const cancelPendingList = (reason: string) => {
    if (cancelList) {
      cancelList(reason)
      cancelList = undefined
    }
  }

  const perPageFromQuery = () => {
    const value = parseInt(searchParams["per_page"] || "", 10)
    if (Number.isFinite(value) && value > 0) {
      return value
    }
    return undefined
  }

  const clampPerPage = (size?: number) => {
    const querySize = perPageFromQuery()
    const raw =
      typeof size === "number" && Number.isFinite(size)
        ? size
        : pagination.type === "pagination"
          ? querySize ?? pagination.size
          : pagination.size
    const fallback = raw || DEFAULT_PAGE_SIZE
    return Math.min(MAX_PAGE_SIZE, Math.max(1, fallback))
  }

  const logListRenderPerf = (
    path: string,
    page: number,
    perPage: number,
    append: boolean,
    hasMore: boolean,
    networkMs: number,
    responseCount: number,
  ) => {
    if (!perfEnabled) return
    const renderStart = performance.now()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        log("[perf][usePath] fs/list render", {
          path,
          page,
          per_page: perPage,
          append,
          has_more: hasMore,
          network_ms: Number(networkMs.toFixed(2)),
          render_ms: Number((performance.now() - renderStart).toFixed(2)),
          received_items: responseCount,
          rendered_items: objStore.objs.length,
        })
      })
    })
  }

  // 统一的路径处理函数
  const getProcessedPath = (path: string): string => {
    if (path === "/") return "/"
    // 如果路径已经包含了权限路径，直接返回

    const userPermissions = me().permissions || []
    for (const perm of userPermissions) {
      if (path.startsWith(perm.path)) {
        return path
      }
    }

    // 查找最匹配的权限路径
    let bestMatch = userPermissions[0]
    let maxMatchLength = 0

    for (const perm of userPermissions) {
      const cleanPath = path.replace(/^\/|\/$/g, "")
      const cleanPermPath = perm.path.replace(/^\/|\/$/g, "")

      if (
        cleanPath.includes(cleanPermPath) &&
        cleanPermPath.length > maxMatchLength
      ) {
        bestMatch = perm
        maxMatchLength = cleanPermPath.length
      }
    }

    // 如果找到匹配的权限路径，返回完整路径
    if (bestMatch && maxMatchLength > 0) {
      return pathJoin(bestMatch.path, path)
    }

    // 如果没有找到匹配，使用第一个权限路径
    if (userPermissions.length > 0) {
      return pathJoin(userPermissions[0].path, path)
    }

    return path
  }

  const [, getObj] = useFetch((path: string) =>
    fsGet(
      path,
      password(),
      new axios.CancelToken((c) => {
        cancelObj = c
      }),
    ),
  )
  const pagination = getPagination()
  if (pagination.type === "pagination") {
    setGlobalPage(parseInt(searchParams["page"]) || 1)
  }
  const [, getObjs] = useFetch(
    (arg?: {
      path: string
      index?: number
      size?: number
      force?: boolean
    }) => {
      const page = {
        index: arg?.index,
        size: arg?.size,
      }
      const processedPath = getProcessedPath(arg?.path || "/")

      return fsList(
        processedPath,
        password(),
        page.index,
        page.size,
        arg?.force,
        new axios.CancelToken((c) => {
          cancelList = c
        }),
      )
    },
  )
  // set a path must be a dir
  const setPathAs = (path: string, dir = true, push = false) => {
    if (push) {
      path = pathJoin(pathname(), path)
    }
    if (dir) {
      IsDirRecord[path] = true
    } else {
      delete IsDirRecord[path]
    }
  }

  // record is second time password is wrong
  let retry_pass = false
  // handle pathname change
  // if confirm current path is dir, fetch List directly
  // if not, fetch get then determine if it is dir or file
  const handlePathChange = (
    path: string,
    index?: number,
    rp?: boolean,
    force?: boolean,
    size?: number,
  ) => {
    retry_pass = rp ?? false
    ObjStore.setErr("")
    cancelPendingObj(`path change: ${path}`)
    cancelPendingList(`path change: ${path}`)
    globalHasMore = false
    globalHasMoreKnown = false

    if (first_fetch) {
      first_fetch = false
    }

    const userPermissions = me().permissions || []
    if (path === "/") {
      // 如果有权限路径是"/"，直接获取文件列表
      if (userPermissions.some((perm) => perm.path === "/")) {
        return handleFolder("/", index, size, undefined, force)
      }
      // 否则显示权限目录列表
      if (userPermissions.length > 0) {
        const permDirs = userPermissions.map((perm) => ({
          name: perm.path.split("/").filter(Boolean).pop() || perm.path,
          size: 0,
          is_dir: true,
          modified: new Date().toISOString(),
          created: new Date().toISOString(),
          sign: "",
          thumb: "",
          type: 1, // FOLDER
          path: perm.path,
          selected: false,
        }))

        ObjStore.setObjs(permDirs)
        ObjStore.setTotal(permDirs.length)
        ObjStore.setState(State.Folder)
      } else {
        ObjStore.setState(State.Initial)
      }
      return Promise.resolve()
    }

    if (!force && hasHistory(path, index)) {
      return recoverHistory(path, index)
    }

    // 检查路径是否已知为目录
    if (IsDirRecord[path]) {
      return handleFolder(path, index, size, undefined, force)
    }

    // 如果不知道是文件还是目录，先调用fsget接口判断
    return handleObj(path, index, size)
  }

  // handle enter obj that don't know if it is dir or file
  const handleObj = async (path: string, index?: number, size?: number) => {
    cancelPendingObj(`new fs/get: ${path}`)
    ObjStore.setState(State.FetchingObj)
    const requestStart = performance.now()
    const resp = await getObj(path)
    if (perfEnabled) {
      log("[perf][usePath] fs/get network", {
        path,
        network_ms: Number((performance.now() - requestStart).toFixed(2)),
      })
    }
    if (resp.code === -1) {
      return
    }
    handleRespWithoutNotify(
      resp,
      (data) => {
        ObjStore.setObj(data)
        ObjStore.setProvider(data.provider)
        ObjStore.setWebProxy(Boolean(data.web_proxy))
        if (data.is_dir) {
          setPathAs(path)
          handleFolder(path, index, size)
        } else {
          ObjStore.setReadme(data.readme)
          ObjStore.setHeader(data.header)
          ObjStore.setRelated(data.related ?? [])
          ObjStore.setRawUrl(data.raw_url)
          ObjStore.setState(State.File)
        }
      },
      handleErr,
    )
  }

  // change enter a folder or turn page or load more
  const handleFolder = async (
    path: string,
    index?: number,
    size?: number,
    append = false,
    force?: boolean,
  ) => {
    const requestPage = index && index > 0 ? index : 1
    const requestPerPage = clampPerPage(size)
    cancelPendingList(`new fs/list: ${path}`)
    ObjStore.setState(append ? State.FetchingMore : State.FetchingObjs)
    const requestStart = performance.now()
    const resp = await getObjs({
      path,
      index: requestPage,
      size: requestPerPage,
      force,
    })
    const networkMs = performance.now() - requestStart
    if (perfEnabled) {
      log("[perf][usePath] fs/list network", {
        path,
        append,
        page: requestPage,
        per_page: requestPerPage,
        network_ms: Number(networkMs.toFixed(2)),
      })
    }
    if (resp.code === -1) {
      return
    }
    handleRespWithoutNotify(
      resp,
      (data) => {
        const responsePage =
          typeof data.page === "number" && data.page > 0
            ? data.page
            : requestPage
        const responsePerPage =
          typeof data.per_page === "number" && data.per_page > 0
            ? data.per_page
            : requestPerPage
        const filteredTotal = data.filtered_total ?? data.total ?? 0
        const hasMore =
          typeof data.has_more === "boolean"
            ? data.has_more
            : responsePage * responsePerPage < filteredTotal
        globalHasMore = hasMore
        globalHasMoreKnown = true
        if (perfEnabled) {
          log("[perf][usePath] fs/list payload", {
            path,
            page: responsePage,
            per_page: responsePerPage,
            append,
            has_more: hasMore,
            received_items: data.content?.length ?? 0,
            total: data.total,
            filtered_total: filteredTotal,
          })
        }
        setGlobalPage(responsePage)
        if (append) {
          appendObjs(data.content)
        } else {
          ObjStore.setObjs(data.content ?? [])
        }
        ObjStore.setTotal(filteredTotal)
        ObjStore.setReadme(data.readme)
        ObjStore.setHeader(data.header)
        ObjStore.setWrite(data.write)
        ObjStore.setProvider(data.provider)
        // 设置路径为目录
        setPathAs(path)
        ObjStore.setState(State.Folder)
        logListRenderPerf(
          path,
          responsePage,
          responsePerPage,
          append,
          hasMore,
          networkMs,
          data.content?.length ?? 0,
        )
      },
      handleErr,
    )
  }

  const handleErr = (msg: string, code?: number) => {
    if (code === -1) {
      return
    }
    const currentPath = pathname()
    const userPermissions = me().permissions || []
    // 如果是403权限错误，返回到根目录并显示权限目录
    if (code === 403) {
      if (currentPath === "/" || userPermissions.length === 0) {
        const permDirs = userPermissions.map((perm) => ({
          name: perm.path.split("/").filter(Boolean).pop() || perm.path,
          size: 0,
          is_dir: true,
          modified: new Date().toISOString(),
          created: new Date().toISOString(),
          sign: "",
          thumb: "",
          type: 1, // FOLDER
          path: perm.path,
          selected: false,
        }))

        ObjStore.setObjs(permDirs)
        ObjStore.setTotal(permDirs.length)
        ObjStore.setState(State.Folder)
        to("/")
      } else {
        ObjStore.setState(State.NeedPassword)
      }
      return
    }

    // 如果是存储未找到错误
    if (
      msg.includes("storage not found") ||
      msg.includes("please add a storage")
    ) {
      ObjStore.setErr(msg)
      ObjStore.setState(State.Initial)
      return
    }

    // 如果是根路径访问，显示所有权限目录
    if (currentPath === "/") {
      if (userPermissions.length > 0) {
        const permDirs = userPermissions.map((perm) => ({
          name: perm.path.split("/").filter(Boolean).pop() || perm.path,
          size: 0,
          is_dir: true,
          modified: new Date().toISOString(),
          created: new Date().toISOString(),
          sign: "",
          thumb: "",
          type: 1, // FOLDER
          path: perm.path,
          selected: false,
        }))

        ObjStore.setObjs(permDirs)
        ObjStore.setTotal(permDirs.length)
        ObjStore.setState(State.Folder)
        return
      }
    } else {
      // 检查当前路径是否是某个权限路径的子路径
      const matchedPerm = userPermissions.find((perm) => {
        // 移除开头的斜杠以便比较
        const cleanCurrentPath = currentPath.replace(/^\//, "")
        const cleanPermPath = perm.path.replace(/^\//, "")
        return (
          cleanCurrentPath.includes(cleanPermPath) ||
          cleanPermPath.includes(cleanCurrentPath)
        )
      })

      // 如果找到匹配的权限路径，重定向到正确的完整路径
      if (matchedPerm) {
        const pathParts = currentPath.split("/").filter(Boolean)
        const permParts = matchedPerm.path.split("/").filter(Boolean)

        // 如果当前路径是权限路径的一部分，重定向到完整的权限路径
        if (pathParts.some((part) => permParts.includes(part))) {
          to(matchedPerm.path)
          return
        }
      }
    }
    ObjStore.setErr(msg)
    ObjStore.setState(State.Initial)
  }

  const loadMore = () => {
    if (!globalHasMoreKnown || !globalHasMore) {
      return Promise.resolve()
    }
    return handleFolder(pathname(), globalPage + 1, undefined, true)
  }
  return {
    handlePathChange: handlePathChange,
    setPathAs: setPathAs,
    refresh: async (retry_pass?: boolean, force?: boolean) => {
      const path = pathname()
      cancelPendingObj(`refresh: ${path}`)
      cancelPendingList(`refresh: ${path}`)
      clearHistory(path, globalPage)
      globalHasMore = false
      globalHasMoreKnown = false
      resetGlobalPage()
      ObjStore.setObjs([])
      ObjStore.setTotal(0)
      const perPage = clampPerPage()
      await handlePathChange(path, 1, retry_pass, force ?? true, perPage)
      window.scroll({ top: 0, behavior: "smooth" })
    },
    loadMore: loadMore,
    allLoaded: () =>
      globalHasMoreKnown
        ? !globalHasMore
        : globalPage >= Math.ceil(objStore.total / pagination.size),
  }
}
