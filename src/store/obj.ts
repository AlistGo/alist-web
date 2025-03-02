import naturalSort from "typescript-natural-sort"
import { cookieStorage, createStorageSignal } from "@solid-primitives/storage"
import { createMemo, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Obj, StoreObj } from "~/types"
import { bus, log } from "~/utils"
import { keyPressed } from "./key-event"
import { local } from "./local_settings"

export enum State {
  Initial, // Initial state
  FetchingObj,
  FetchingObjs,
  FetchingMore,
  Folder, // Folder state
  File, // File state
  NeedPassword,
}

const [objStore, setObjStore] = createStore<{
  obj: Obj
  raw_url: string
  related: Obj[]

  objs: StoreObj[]
  total: number
  write?: boolean

  readme: string
  header: string
  provider: string
  // pageIndex: number;
  // pageSize: number;
  state: State
  err: string
}>({
  obj: {} as Obj,
  raw_url: "",
  related: [],

  objs: [],
  total: 0,

  readme: "",
  header: "",
  provider: "",
  // pageIndex: 1,
  // pageSize: 50,
  state: State.Initial,
  err: "",
})

const setObjs = (objs: Obj[]) => {
  lastChecked.start = -1
  lastChecked.end = -1
  setObjStore("objs", objs)
  setObjStore("obj", "is_dir", true)
}

export const ObjStore = {
  set: (data: object) => {
    setObjStore(data)
  },
  setObj: (obj: Obj) => {
    setObjStore("obj", obj)
  },
  setRawUrl: (raw_url: string) => {
    setObjStore("raw_url", raw_url)
  },
  setProvider: (provider: string) => {
    setObjStore("provider", provider)
  },
  setObjs: setObjs,
  setTotal: (total: number) => {
    setObjStore("total", total)
  },
  setReadme: (readme: string) => setObjStore("readme", readme),
  setHeader: (header: string) => setObjStore("header", header),
  setRelated: (related: Obj[]) => setObjStore("related", related),
  setWrite: (write: boolean) => setObjStore("write", write),
  // setGetResp: (resp: FsGetResp) => {
  //   setObjStore("obj", resp.data);
  //   setObjs(resp.data.related);
  //   setObjStore("readme", resp.data.readme);
  // },
  // setListResp: (resp: FsListResp) => {
  //   setObjs(resp.data.content);
  //   setObjStore("readme", resp.data.readme);
  //   setObjStore("write", resp.data.write);
  // },
  setState: (state: State) => setObjStore("state", state),
  setErr: (err: string) => setObjStore("err", err),
}

export type OrderBy = "name" | "size" | "modified"

export const sortObjs = (orderBy: OrderBy, reverse?: boolean) => {
  log("sort:", orderBy, reverse)
  naturalSort.insensitive = true
  setObjStore(
    "objs",
    produce((objs) =>
      objs.sort((a, b) => {
        return (reverse ? -1 : 1) * naturalSort(a[orderBy], b[orderBy])
      }),
    ),
  )
}

export const appendObjs = (objs: Obj[]) => {
  setObjStore(
    "objs",
    produce((prev) => prev.push(...objs)),
  )
}

const lastChecked = {
  start: -1,
  end: -1,
}

export const selectIndex = (index: number, checked: boolean, one?: boolean) => {
  if (one) {
    selectAll(false)
  }
  if (keyPressed["Shift"]) {
    if (lastChecked.start < 0) {
      for (
        let i = 0;
        i < Math.max(index + 1, objStore.objs.length - index);
        ++i
      ) {
        if (objStore.objs[index - i]?.selected) {
          lastChecked.start = index - i
          lastChecked.end = index - i
          break
        } else if (objStore.objs[index + i]?.selected) {
          lastChecked.start = index + i
          lastChecked.end = index + i
          break
        }
      }
    }
    const countUncheck = Math.abs(lastChecked.end - lastChecked.start)
    const signUncheck = Math.sign(lastChecked.end - lastChecked.start)
    for (let i = 1; i <= countUncheck; ++i) {
      setObjStore("objs", lastChecked.start + signUncheck * i, {
        selected: false,
      })
    }
    const countCheck = Math.abs(index - lastChecked.start)
    const signCheck = Math.sign(index - lastChecked.start)
    for (let i = 0; i <= countCheck; ++i) {
      setObjStore("objs", lastChecked.start + signCheck * i, { selected: true })
    }
    lastChecked.end = index
  } else {
    setObjStore("objs", index, { selected: checked })
    if (checked) {
      lastChecked.start = index
      lastChecked.end = index
    } else {
      lastChecked.end = -1
      lastChecked.start = -1
    }
  }
}

export const selectAll = (checked: boolean) => {
  setObjStore("objs", {}, (obj) => ({ selected: checked }))
}

export const selectedObjs = () => {
  return objStore.objs.filter((obj) => obj.selected)
}

export const allChecked = () => {
  return objStore.objs.length === selectedNum()
}

export const oneChecked = () => {
  return selectedNum() === 1
}

export const haveSelected = () => {
  return selectedNum() > 0
}

export const isIndeterminate = () => {
  return selectedNum() > 0 && selectedNum() < objStore.objs.length
}

const selectedNum = createMemo(() => selectedObjs().length)

export type LayoutType = "list" | "grid" | "image"
const [pathname, setPathname] = createSignal<string>(location.pathname)
const layoutRecord: Record<string, LayoutType> = (() => {
  try {
    return JSON.parse(localStorage.getItem("layoutRecord") || "{}")
  } catch (e) {
    return {}
  }
})()

bus.on("pathname", (p) => setPathname(p))
const [_layout, _setLayout] = createSignal<LayoutType>(
  layoutRecord[pathname()] || local["global_default_layout"],
)
export const layout = () => {
  const layout = layoutRecord[pathname()]
  _setLayout(layout || local["global_default_layout"])
  return _layout()
}
export const setLayout = (layout: LayoutType) => {
  layoutRecord[pathname()] = layout
  localStorage.setItem("layoutRecord", JSON.stringify(layoutRecord))
  _setLayout(layout)
}

const [_checkboxOpen, setCheckboxOpen] = createStorageSignal<string>(
  "checkbox-open",
  "false",
)
export const checkboxOpen = () => _checkboxOpen() === "true"

export const toggleCheckbox = () => {
  setCheckboxOpen(checkboxOpen() ? "false" : "true")
}

export { objStore }
// browser password
const [_password, _setPassword] = createSignal<string>(
  cookieStorage.getItem("browser-password") || "",
)
export { _password as password }
export const setPassword = (password: string) => {
  _setPassword(password)
  cookieStorage.setItem("browser-password", password)
}
