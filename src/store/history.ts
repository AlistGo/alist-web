import { ObjStore, objStore, State } from "~/store/obj"
import { getGlobalPage, setGlobalPage } from "~/hooks"

interface History {
  obj: object
  page: number
  scroll: number
}

export const HistoryMap = new Map<string, History>()

const waitForNextFrame = () => {
  return new Promise((resolve) => setTimeout(resolve))
}

export const getHistoryKey = (path: string, page?: number) => {
  const pathname = path.split("?")[0]
  return page && page > 1 ? `${pathname}?page=${page}` : pathname
}

export const recordHistory = (path: string, page?: number) => {
  const obj = JSON.parse(JSON.stringify(objStore))
  if (
    ![State.FetchingMore, State.Folder, State.File].includes(objStore.state)
  ) {
    return
  }
  if (objStore.state === State.FetchingMore) {
    obj.state = State.Folder
  }
  const key = getHistoryKey(path, page)
  const history = {
    obj,
    page: page ?? getGlobalPage(),
    scroll: window.scrollY,
  }
  HistoryMap.set(key, history)
  console.log(`record history: [${key}]`)
}

export const recoverHistory = async (path: string, page?: number) => {
  const key = getHistoryKey(path, page)
  if (!HistoryMap.has(key)) return
  const history = HistoryMap.get(key)!
  setGlobalPage(history.page)
  ObjStore.setState(State.Initial)
  await waitForNextFrame()
  ObjStore.set(JSON.parse(JSON.stringify(history.obj)))
  await waitForNextFrame()
  window.scroll({ top: history.scroll })
}

export const hasHistory = (path: string, page?: number) => {
  const key = getHistoryKey(path, page)
  return HistoryMap.has(key)
}

export const clearHistory = (path: string, page?: number) => {
  const key = getHistoryKey(path, page)
  if (hasHistory(path, page)) {
    HistoryMap.delete(key)
    console.log(`clear history: [${key}]`)
  }
}

document.addEventListener(
  "click",
  (e) => {
    let target = e.target as HTMLElement
    let link = target.closest("a")
    let path = link?.getAttribute("href")
    if (path) {
      clearHistory(decodeURIComponent(path))
    }
  },
  true,
)
