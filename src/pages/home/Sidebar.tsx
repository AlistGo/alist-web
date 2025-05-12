import { Box } from "@hope-ui/solid"
import { Motion } from "solid-motionone"
import { useLocation } from "@solidjs/router"
import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"
import { FolderTree, FolderTreeHandler } from "~/components"
import { useRouter } from "~/hooks"
import { local, objStore } from "~/store"
import { objBoxRef } from "./Obj"

function SidebarPannel() {
  const { to } = useRouter()
  const location = useLocation()

  const [folderTreeHandler, setFolderTreeHandler] =
    createSignal<FolderTreeHandler>()
  const [sideBarRef, setSideBarRef] = createSignal<HTMLDivElement>()
  const [offsetX, setOffsetX] = createSignal<number | string>(-999)

  const showFullSidebar = () => setOffsetX(0)
  const resetSidebar = () => {
    const $objBox = objBoxRef()
    const $sideBar = sideBarRef()
    if (!$objBox || !$sideBar) return
    const gap = $objBox.offsetLeft > 50 ? 16 : 0
    if ($sideBar.clientWidth < $objBox.offsetLeft - gap) {
      setOffsetX(0)
    } else {
      setOffsetX(`calc(-100% + ${$objBox.offsetLeft}px - ${gap}px)`)
    }
  }

  let rafId: number

  onMount(() => {
    const handler = folderTreeHandler()
    handler?.setPath(location.pathname)
    rafId = requestAnimationFrame(resetSidebar)
    window.addEventListener("resize", resetSidebar)
    onCleanup(() => window.removeEventListener("resize", resetSidebar))
  })

  createEffect(
    on(
      () => objStore.state,
      () => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(resetSidebar)
      },
    ),
  )

  createEffect(
    on(
      () => location.pathname,
      () => {
        const handler = folderTreeHandler()
        handler?.setPath(location.pathname)
      },
    ),
  )

  return (
    <Box
      as={Motion.div}
      initial={{ x: -999 }}
      animate={{ x: offsetX() }}
      zIndex="$overlay"
      pos="fixed"
      left={3} // width of outline shadow
      top={3}
      h="calc(100vh - 6px)"
      minW={180}
      p="$2"
      overflow="auto"
      shadow="$lg"
      rounded="$lg"
      bgColor="white"
      _dark={{ bgColor: "$neutral3" }}
      onMouseEnter={showFullSidebar}
      onMouseLeave={resetSidebar}
      ref={(el: HTMLDivElement) => setSideBarRef(el)}
    >
      <FolderTree
        autoOpen
        showEmptyIcon
        showHiddenFolder={false}
        onChange={(path) => to(path)}
        handle={(handler) => setFolderTreeHandler(handler)}
      />
    </Box>
  )
}

export function Sidebar() {
  const visible = createMemo(() => local["show_sidebar"] !== "none")

  return (
    <Show when={visible()}>
      <SidebarPannel />
    </Show>
  )
}
