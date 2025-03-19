import {
  NavigateOptions,
  SetParams,
  useLocation,
  useNavigate,
  useParams,
  _mergeSearchString,
} from "@solidjs/router"
import { createMemo, untrack } from "solid-js"
import { encodePath, joinBase, log, pathDir, pathJoin, trimBase } from "~/utils"
import { clearHistory } from "~/store"

const useRouter = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const pathname = createMemo(() => {
    return trimBase(location.pathname)
  })
  return {
    to: (
      path: string,
      ignore_root?: boolean,
      options?: Partial<NavigateOptions>,
    ) => {
      if (!ignore_root && path.startsWith("/")) {
        path = joinBase(path)
      }
      log("to:", path)
      clearHistory(decodeURIComponent(path))
      navigate(path, options)
    },
    replace: (to: string) => {
      const path = encodePath(pathJoin(pathDir(location.pathname), to), true)
      clearHistory(decodeURIComponent(path))
      navigate(path)
    },
    pushHref: (to: string): string => {
      return encodePath(pathJoin(pathname(), to))
    },
    back: () => {
      navigate(-1)
    },
    forward: () => {
      navigate(1)
    },
    pathname: pathname,
    search: location.search,
    searchParams: location.query,
    setSearchParams: (
      params: SetParams,
      options?: Partial<NavigateOptions>,
    ) => {
      const searchString = untrack(() =>
        _mergeSearchString(location.search, params),
      )
      navigate(pathname() + searchString, {
        scroll: false,
        ...options,
        resolve: true,
      })
    },
    params: params,
  }
}

export { useRouter }
