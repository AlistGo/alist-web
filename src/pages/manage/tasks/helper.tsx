import { createSignal, JSX } from "solid-js"
import { me } from "~/store"
import { TaskNameAnalyzer } from "./Tasks"
import { useT } from "~/hooks"

export const getPath = (device: string, path: string): JSX.Element => {
  const fullPath = (device === "/" ? "" : device) + path
  const prefix = me().base_path === "/" ? "" : me().base_path
  const accessible = fullPath.startsWith(prefix)
  const [underline, setUnderline] = createSignal(false)
  return accessible ? (
    <a
      style={underline() ? "text-decoration: underline" : ""}
      onMouseOver={() => setUnderline(true)}
      onMouseOut={() => setUnderline(false)}
      href={fullPath.slice(prefix.length)}
    >
      {fullPath}
    </a>
  ) : (
    <p>{fullPath}</p>
  )
}

export const getOfflineDownloadNameAnalyzer = (): TaskNameAnalyzer => {
  const t = useT()
  const [underline, setUnderline] = createSignal(false)
  return {
    regex: /^download (.+) to \((.+)\)$/,
    title: (matches) => matches[1],
    attrs: {
      [t(`tasks.attr.offline_download.url`)]: (matches) => (
        <a
          style={underline() ? "text-decoration: underline" : ""}
          onMouseOver={() => setUnderline(true)}
          onMouseOut={() => setUnderline(false)}
          href={matches[1]}
          target="_blank"
        >
          {matches[1]}
        </a>
      ),
      [t(`tasks.attr.offline_download.path`)]: (matches) =>
        getPath("", matches[2]),
    },
  }
}

export const getOfflineDownloadTransferNameAnalyzer = (): TaskNameAnalyzer => {
  const t = useT()
  return {
    regex: /^transfer ((?:.*\/)?(.+)) to \[(.+)]$/,
    title: (matches) => matches[2],
    attrs: {
      [t(`tasks.attr.offline_download.transfer_src`)]: (matches) => (
        <p>{matches[1]}</p>
      ),
      [t(`tasks.attr.offline_download.transfer_dst`)]: (matches) =>
        getPath("", matches[3]),
    },
  }
}
