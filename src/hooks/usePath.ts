import axios, { Canceler } from "axios"
import {
  appendObjs,
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

let cancelObj: Canceler
let cancelList: Canceler

const IsDirRecord: Record<string, boolean> = {}
let globalPage = 1
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
      // setSearchParams(page);
      return fsList(
        arg?.path,
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
  ) => {
    cancelObj?.()
    cancelList?.()
    retry_pass = rp ?? false
    ObjStore.setErr("")
    if (hasHistory(path, index)) {
      log(`handle [${getHistoryKey(path, index)}] from history`)
      return recoverHistory(path, index)
    } else if (IsDirRecord[path]) {
      log(`handle [${getHistoryKey(path, index)}] as folder`)
      return handleFolder(path, index, undefined, undefined, force)
    } else {
      log(`handle [${getHistoryKey(path, index)}] as obj`)
      return handleObj(path, index)
    }
  }

  // handle enter obj that don't know if it is dir or file
  const handleObj = async (path: string, index?: number) => {
    ObjStore.setState(State.FetchingObj)
    const resp = await getObj(path)
    handleRespWithoutNotify(
      resp,
      (data) => {
        ObjStore.setObj(data)
        ObjStore.setProvider(data.provider)
        if (data.is_dir) {
          setPathAs(path)
          handleFolder(path, index)
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
    if (!size) {
      size = pagination.size
    }
    if (size !== undefined && pagination.type === "all") {
      size = undefined
    }
    ObjStore.setState(append ? State.FetchingMore : State.FetchingObjs)
    const resp = await getObjs({ path, index, size, force })
    handleRespWithoutNotify(
      resp,
      (data) => {
        setGlobalPage(index ?? 1)
        if (append) {
          appendObjs(data.content)
        } else {
          ObjStore.setObjs(data.content ?? [])
          ObjStore.setTotal(data.total)
        }
        ObjStore.setReadme(data.readme)
        ObjStore.setHeader(data.header)
        ObjStore.setWrite(data.write)
        ObjStore.setProvider(data.provider)
        ObjStore.setState(State.Folder)
      },
      handleErr,
    )
  }

  const handleErr = (msg: string, code?: number) => {
    if (code === 403) {
      ObjStore.setState(State.NeedPassword)
      if (retry_pass) {
        notify.error(msg)
      }
    } else {
      const basePath = me().base_path
      if (
        first_fetch &&
        basePath != "/" &&
        pathname().includes(basePath) &&
        msg.endsWith("object not found")
      ) {
        first_fetch = false
        to(pathname().replace(basePath, ""))
        return
      }
      if (code === undefined || code >= 0) {
        ObjStore.setErr(msg)
      }
    }
  }
  const loadMore = () => {
    return handleFolder(pathname(), globalPage + 1, undefined, true)
  }
  return {
    handlePathChange: handlePathChange,
    setPathAs: setPathAs,
    refresh: async (retry_pass?: boolean, force?: boolean) => {
      const path = pathname()
      const scroll = window.scrollY
      clearHistory(path, globalPage)
      if (
        pagination.type === "load_more" ||
        pagination.type === "auto_load_more"
      ) {
        const page = globalPage
        resetGlobalPage()
        await handlePathChange(path, globalPage, retry_pass, force)
        while (globalPage < page) {
          await loadMore()
        }
      } else {
        await handlePathChange(path, globalPage, retry_pass, force)
      }
      window.scroll({ top: scroll, behavior: "smooth" })
    },
    loadMore: loadMore,
    allLoaded: () => globalPage >= Math.ceil(objStore.total / pagination.size),
  }
}
