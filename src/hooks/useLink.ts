import { objStore, selectedObjs, State } from "~/store"
import { Obj } from "~/types"
import { api, encodePath, pathDir, pathJoin, standardizePath } from "~/utils"
import { useRouter, useUtil } from "."

type URLType = "preview" | "direct" | "proxy"
type LinkBuilder = (obj: Obj, encodeAll?: boolean) => string

type LinkOverride = {
  getLinkByObj?: (obj: Obj, type?: URLType, encodeAll?: boolean) => string
  rawLink?: LinkBuilder
  proxyLink?: LinkBuilder
  previewPage?: LinkBuilder
  currentObjLink?: (encodeAll?: boolean) => string
}

let linkOverride: LinkOverride | null = null

export const setLinkOverride = (override: LinkOverride | null) => {
  linkOverride = override
}

// get download url by dir and obj
export const getLinkByDirAndObj = (
  dir: string,
  obj: Obj,
  type: URLType = "direct",
  encodeAll?: boolean,
) => {
  if (type !== "preview") {
    dir = pathJoin("/", dir)
  }
  dir = standardizePath(dir, true)
  let path = `${dir}/${obj.name}`
  path = encodePath(path, encodeAll)
  let host = api
  let prefix = type === "direct" ? "/d" : "/p"
  if (type === "preview") {
    prefix = ""
    if (!api.startsWith(location.origin)) host = location.origin
  }
  let ans = `${host}${prefix}${path}`
  if (type !== "preview" && obj.sign) {
    ans += `?sign=${obj.sign}`
  }
  return ans
}

// get download link by current state and pathname
export const useLink = () => {
  const { pathname } = useRouter()
  const defaultGetLinkByObj = (
    obj: Obj,
    type?: URLType,
    encodeAll?: boolean,
  ) => {
    const dir = objStore.state !== State.File ? pathname() : pathDir(pathname())
    return getLinkByDirAndObj(dir, obj, type, encodeAll)
  }
  const getLinkByObj = (obj: Obj, type?: URLType, encodeAll?: boolean) => {
    if (linkOverride?.getLinkByObj) {
      return linkOverride.getLinkByObj(obj, type, encodeAll)
    }
    return defaultGetLinkByObj(obj, type, encodeAll)
  }
  const rawLink = (obj: Obj, encodeAll?: boolean) => {
    if (linkOverride?.rawLink) {
      return linkOverride.rawLink(obj, encodeAll)
    }
    return getLinkByObj(obj, "direct", encodeAll)
  }
  return {
    getLinkByObj: getLinkByObj,
    rawLink: rawLink,
    proxyLink: (obj: Obj, encodeAll?: boolean) => {
      if (linkOverride?.proxyLink) {
        return linkOverride.proxyLink(obj, encodeAll)
      }
      return getLinkByObj(obj, "proxy", encodeAll)
    },
    previewPage: (obj: Obj, encodeAll?: boolean) => {
      if (linkOverride?.previewPage) {
        return linkOverride.previewPage(obj, encodeAll)
      }
      return getLinkByObj(obj, "preview", encodeAll)
    },
    currentObjLink: (encodeAll?: boolean) => {
      if (linkOverride?.currentObjLink) {
        return linkOverride.currentObjLink(encodeAll)
      }
      return rawLink(objStore.obj, encodeAll)
    },
  }
}

export const useSelectedLink = () => {
  const { previewPage, rawLink: rawUrl } = useLink()
  const rawLinks = (encodeAll?: boolean) => {
    return selectedObjs()
      .filter((obj) => !obj.is_dir)
      .map((obj) => rawUrl(obj, encodeAll))
  }
  return {
    rawLinks: rawLinks,
    previewPagesText: () => {
      return selectedObjs()
        .map((obj) => previewPage(obj, true))
        .join("\n")
    },
    rawLinksText: (encodeAll?: boolean) => {
      return rawLinks(encodeAll).join("\n")
    },
  }
}

export const useCopyLink = () => {
  const { copy } = useUtil()
  const { previewPagesText, rawLinksText } = useSelectedLink()
  const { currentObjLink } = useLink()
  return {
    copySelectedPreviewPage: () => {
      copy(previewPagesText())
    },
    copySelectedRawLink: (encodeAll?: boolean) => {
      copy(rawLinksText(encodeAll))
    },
    copyCurrentRawLink: (encodeAll?: boolean) => {
      copy(currentObjLink(encodeAll))
    },
  }
}
