import { Progress, ProgressIndicator } from "@hope-ui/solid"
import { Route, Routes, useIsRouting } from "@solidjs/router"
import {
  Component,
  createEffect,
  createSignal,
  lazy,
  Match,
  onCleanup,
  Switch,
} from "solid-js"
import { Portal } from "solid-js/web"
import { useLoading, useRouter, useT } from "~/hooks"
import { globalStyles } from "./theme"
import { bus, r, handleRespWithoutAuthAndNotify, base_path } from "~/utils"
import { setSettings } from "~/store"
import { Error, FullScreenLoading } from "~/components"
import { MustUser } from "./MustUser"
import "./index.css"
import { useI18n } from "@solid-primitives/i18n"
import { initialLang, langMap, loadedLangs } from "./i18n"
import { Resp } from "~/types"
import { setArchiveExtensions } from "~/store/archive"
import "~/utils/custom-icons"

const Home = lazy(() => import("~/pages/home/Layout"))
const Manage = lazy(() => import("~/pages/manage"))
const Login = lazy(() => import("~/pages/login"))
const Test = lazy(() => import("~/pages/test"))
const SharePage = lazy(() => import("~/pages/share"))

const App: Component = () => {
  const t = useT()
  globalStyles()
  const [, { add }] = useI18n()
  const isRouting = useIsRouting()
  const { to, pathname } = useRouter()
  const onTo = (path: string) => {
    to(path)
  }
  bus.on("to", onTo)
  onCleanup(() => {
    bus.off("to", onTo)
  })

  createEffect(() => {
    bus.emit("pathname", pathname())
  })

  const [err, setErr] = createSignal<string[]>([])
  const [loading, data] = useLoading(() =>
    Promise.all([
      (async () => {
        add(initialLang, (await langMap[initialLang]()).default)
        loadedLangs.add(initialLang)
      })(),
      (async () => {
        handleRespWithoutAuthAndNotify(
          (await r.get("/public/settings")) as Resp<Record<string, string>>,
          setSettings,
          (e) => setErr(err().concat(e)),
        )
      })(),
      (async () => {
        handleRespWithoutAuthAndNotify(
          (await r.get("/public/archive_extensions")) as Resp<string[]>,
          setArchiveExtensions,
          (e) => setErr(err().concat(e)),
        )
      })(),
    ]),
  )
  data()
  return (
    <>
      <Portal>
        <Progress
          indeterminate
          size="xs"
          position="fixed"
          top="0"
          left="0"
          right="0"
          zIndex="$banner"
          d={isRouting() ? "block" : "none"}
        >
          <ProgressIndicator />
        </Progress>
      </Portal>
      <Switch
        fallback={
          <Routes base={base_path}>
            <Route path="/@test" component={Test} />
            <Route path="/@login" component={Login} />
            <Route path="/s/*share_path" component={SharePage} />
            <Route
              path="/@manage/*"
              element={
                <MustUser>
                  <Manage />
                </MustUser>
              }
            />
            <Route
              path="*"
              element={
                <MustUser>
                  <Home />
                </MustUser>
              }
            />
          </Routes>
        }
      >
        <Match when={err().length > 0}>
          <Error
            h="100vh"
            msg={
              t("home.fetching_settings_failed") +
              err()
                .map((e) => t("home." + e))
                .join(", ")
            }
          />
        </Match>
        <Match when={loading()}>
          <FullScreenLoading />
        </Match>
      </Switch>
    </>
  )
}

export default App
