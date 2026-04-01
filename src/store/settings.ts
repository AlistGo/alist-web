import { ext, recordToArray, strToRegExp } from "~/utils"

const settings: Record<string, string> = {}

export const DEFAULT_PAGE_SIZE = 200
export const MAX_PAGE_SIZE = 500

export const setSettings = (items: Record<string, string>) => {
  Object.keys(items).forEach((key) => {
    settings[key] = items[key]
  })
  const version = settings["version"] || "Unknown"
  console.log(
    `%c AList %c ${version} %c https://github.com/alist-org/alist`,
    "color: #fff; background: #5f5f5f",
    "color: #fff; background: #70c6be",
    "",
  )
}

export const getSetting = (key: string) => settings[key] ?? ""
export const getSettingBool = (key: string) => {
  const value = getSetting(key)
  return value === "true" || value === "1"
}
export const getSettingNumber = (key: string, defaultV?: number) => {
  const value = getSetting(key)
  if (value) {
    return Number(value)
  }
  return defaultV ?? 0
}
export const getMainColor = (): string => {
  if (window.ALIST.main_color) {
    return window.ALIST.main_color
  }
  return getSetting("main_color") || "#1890ff"
}

/**
 * like this:
{
  "ppt,pptx":{
    "example1":"https://example1.com/ppt?url=$url",
    "example2":"https://example2.com/ppt?url=$url"
  }
}
 */

type Previews = Record<string, Record<string, string>>
let previewsRecord: Record<string, Previews> = {}
type PreviewsType = "external_previews" | "iframe_previews"

const getPreviews = (type: PreviewsType): Previews => {
  if (!previewsRecord[type]) {
    try {
      previewsRecord[type] = JSON.parse(getSetting(type))
    } catch (e) {
      console.error(`failed parse ${type}, use default`, e)
      previewsRecord[type] = {}
    }
  }
  return previewsRecord[type]
}

const getPreviewsByName = (name: string, type: PreviewsType) => {
  const extension = ext(name).toLowerCase()
  const res: { key: string; value: string }[] = []
  for (const key in getPreviews(type)) {
    if (key.startsWith("/")) {
      const reg = strToRegExp(key)
      if (reg.test(extension)) {
        res.push(...recordToArray(getPreviews(type)[key]))
      }
    } else if (key.split(",").includes(extension)) {
      res.push(...recordToArray(getPreviews(type)[key]))
    }
  }
  return res
}

export const getExternalPreviews = (name: string) =>
  getPreviewsByName(name, "external_previews")
export const getIframePreviews = (name: string) =>
  getPreviewsByName(name, "iframe_previews")

export const getPagination = (): {
  size: number
  type: "all" | "pagination" | "load_more" | "auto_load_more"
} => {
  const rawType = (getSetting("pagination_type") || "all") as
    | "all"
    | "pagination"
    | "load_more"
    | "auto_load_more"
  const size = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, getSettingNumber("default_page_size", DEFAULT_PAGE_SIZE)),
  )
  return {
    // `all` would trigger very large payloads; fallback to pagination.
    type: rawType === "all" ? "pagination" : rawType,
    size,
  }
}

let hideFiles: RegExp[]

export const getHideFiles = () => {
  if (!hideFiles) {
    hideFiles = getSetting("hide_files")
      .split(/\n/g)
      .filter((item) => !!item.trim())
      .map((item) => {
        item = item.trim()
        let str = item.replace(/^\/(.*)\/([a-z]*)$/, "$1")
        let args = item.replace(/^\/(.*)\/([a-z]*)$/, "$2")
        return new RegExp(str, args)
      })
  }
  return hideFiles
}
