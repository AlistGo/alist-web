import { Menu, Item, Submenu } from "solid-contextmenu"
import { useCopyLink, useDownload, useLink, useT } from "~/hooks"
import "solid-contextmenu/dist/style.css"
import { HStack, Icon, Text, useColorMode, Image } from "@hope-ui/solid"
import { operations } from "../toolbar/operations"
import {
  For,
  Show,
  createSignal,
  onMount,
  onCleanup,
  lazy,
  Suspense,
} from "solid-js"
import { bus, convertURL, notify, joinBase, pathJoin } from "~/utils"
import { ObjType, UserMethods, UserPermissions } from "~/types"
import {
  getSettingBool,
  haveSelected,
  me,
  oneChecked,
  selectedObjs,
  getCurrentPath,
} from "~/store"
import { players } from "../previews/video_box"
import { BsPlayCircleFill } from "solid-icons/bs"
import { isArchive } from "~/store/archive"
import { useLabels } from "~/store/label"
import {
  createLabelFileBinding,
  createLabelFileBindingBatch,
} from "~/utils/api"
import { usePath } from "~/hooks"
import { AiOutlineTag } from "solid-icons/ai"

// 懒加载对话框组件
const AddLabelDialog = lazy(() => import("~/components/AddLabelDialog"))
const EditLabelDialog = lazy(() => import("~/components/EditLabelDialog"))

interface Label {
  id: number
  name: string
  type: number
  description: string
  bg_color: string
}

const ItemContent = (props: { name: string }) => {
  const t = useT()
  return (
    <HStack spacing="$2">
      <Icon
        p={operations[props.name].p ? "$1" : undefined}
        as={operations[props.name].icon}
        boxSize="$7"
        color={operations[props.name].color}
      />
      <Text>{t(`home.toolbar.${props.name}`)}</Text>
    </HStack>
  )
}

export const ContextMenu = () => {
  const t = useT()
  const { colorMode } = useColorMode()
  const { copySelectedRawLink, copySelectedPreviewPage } = useCopyLink()
  const { batchDownloadSelected, sendToAria2, playlistDownloadSelected } =
    useDownload()
  const { refresh } = usePath()

  // 标签相关
  const { labels, refetch } = useLabels()
  const [isAddLabelOpen, setIsAddLabelOpen] = createSignal(false)
  const [isEditLabelOpen, setIsEditLabelOpen] = createSignal(false)
  const [currentObj, setCurrentObj] = createSignal<any>(null)

  onMount(() => {
    const refreshHandler = () => {
      refetch()
    }
    bus.on("refresh_labels", refreshHandler)
    onCleanup(() => {
      bus.off("refresh_labels", refreshHandler)
    })
  })

  const handleAddLabel = async (
    name: string,
    description: string,
    bg_color: string,
  ) => {
    try {
      const obj = currentObj()
      if (!obj) return

      // 获取最新的标签列表
      const labelData = await refetch()
      if (labelData?.data?.content) {
        // 找到刚刚创建的标签
        const newLabel = labelData.data.content.find(
          (label: Label) =>
            label.name === name &&
            label.description === description &&
            label.bg_color === bg_color,
        )
        if (newLabel) {
          // 创建标签文件绑定
          await createLabelFileBindingBatch(newLabel.id.toString(), [obj])
          // 强制刷新当前目录
          await refresh(false, true)
        }
      }
    } catch (err) {
      console.error("Failed to bind label to file:", err)
    }
  }

  const handleEditLabel = (selectedLabels: string[]) => {
    // 触发父组件刷新
    bus.emit("refresh")
  }

  const canPackageDownload = () => {
    return UserMethods.is_admin(me()) || getSettingBool("package_download")
  }

  const canS3Transition = () => {
    if (!haveSelected()) return false
    if (!UserMethods.is_admin(me())) return false
    return selectedObjs().every((obj) => !obj.is_dir && !!obj.storage_class)
  }
  const { rawLink } = useLink()
  return (
    <>
      <Menu
        id={1}
        animation="scale"
        theme={colorMode() !== "dark" ? "light" : "dark"}
        style="z-index: var(--hope-zIndices-popover)"
      >
        <For each={["rename", "move", "copy", "delete"]}>
          {(name) => (
            <Item
              hidden={() => {
                const index = UserPermissions.findIndex((item) => item === name)
                return !UserMethods.can(me(), index, getCurrentPath())
              }}
              onClick={() => {
                bus.emit("tool", name)
              }}
            >
              <ItemContent name={name} />
            </Item>
          )}
        </For>

        {/* 标签管理 */}
        <Show
          when={
            oneChecked() &&
            UserMethods.is_admin(me()) &&
            !selectedObjs()[0].is_dir
          }
        >
          <Item
            onClick={({ props }) => {
              setCurrentObj(props)
              const labelData = labels()
              if (labelData?.data?.content?.length) {
                setIsEditLabelOpen(true)
              } else {
                setIsAddLabelOpen(true)
              }
            }}
          >
            <HStack spacing="$2">
              <Icon
                as={AiOutlineTag}
                boxSize="$7"
                color="$info9"
                // mr="$1"
              />
              <Text>{t("home.tag.add")}</Text>
            </HStack>
          </Item>
        </Show>

        <Show when={oneChecked()}>
          <Item
            hidden={() => {
              const index = UserPermissions.findIndex(
                (item) => item === "decompress",
              )
              return (
                !UserMethods.can(me(), index, getCurrentPath()) ||
                selectedObjs()[0].is_dir ||
                !isArchive(selectedObjs()[0].name)
              )
            }}
            onClick={() => {
              bus.emit("tool", "decompress")
            }}
          >
            <ItemContent name="decompress" />
          </Item>
        </Show>

        <Show when={canS3Transition()}>
          <Item
            onClick={() => {
              bus.emit("tool", "s3_archive")
            }}
          >
            <ItemContent name="s3_archive" />
          </Item>
          <Item
            onClick={() => {
              bus.emit("tool", "s3_restore")
            }}
          >
            <ItemContent name="s3_restore" />
          </Item>
        </Show>
        <Show when={oneChecked()}>
          <Item
            onClick={({ props }) => {
              const targetPath =
                props.path && props.path.startsWith("/")
                  ? props.path
                  : pathJoin(getCurrentPath(), props.name)
              bus.emit("share", {
                path: targetPath,
                name: props.name,
                is_dir: props.is_dir,
              })
            }}
          >
            <ItemContent name="share" />
          </Item>
          <Item
            onClick={({ props }) => {
              if (props.is_dir) {
                copySelectedPreviewPage()
              } else {
                copySelectedRawLink(true)
              }
            }}
          >
            <ItemContent name="copy_link" />
          </Item>
          <Item
            onClick={({ props }) => {
              if (props.is_dir) {
                if (!canPackageDownload()) {
                  notify.warning(t("home.toolbar.package_download_disabled"))
                  return
                }
                bus.emit("tool", "package_download")
              } else {
                batchDownloadSelected()
              }
            }}
          >
            <ItemContent name="download" />
          </Item>
          <Submenu
            hidden={({ props }) => {
              return props.type !== ObjType.VIDEO
            }}
            label={
              <HStack spacing="$2">
                <Icon
                  as={BsPlayCircleFill}
                  boxSize="$7"
                  p="$0_5"
                  color="$info9"
                />
                <Text>{t("home.preview.play_with")}</Text>
              </HStack>
            }
          >
            <For each={players}>
              {(player) => (
                <Item
                  onClick={({ props }) => {
                    const href = convertURL(player.scheme, {
                      raw_url: "",
                      name: props.name,
                      d_url: rawLink(props, true),
                    })
                    window.open(href, "_self")
                  }}
                >
                  <HStack spacing="$2">
                    <Image
                      m="0 auto"
                      boxSize="$7"
                      src={joinBase(`/images/${player.icon}.webp`)}
                    />
                    <Text>{player.name}</Text>
                  </HStack>
                </Item>
              )}
            </For>
          </Submenu>
        </Show>
        <Show when={!oneChecked() && haveSelected()}>
          <Submenu label={<ItemContent name="copy_link" />}>
            <Item onClick={copySelectedPreviewPage}>
              {t("home.toolbar.preview_page")}
            </Item>
            <Item onClick={() => copySelectedRawLink()}>
              {t("home.toolbar.down_link")}
            </Item>
            <Item onClick={() => copySelectedRawLink(true)}>
              {t("home.toolbar.encode_down_link")}
            </Item>
          </Submenu>
          <Submenu label={<ItemContent name="download" />}>
            <Item onClick={batchDownloadSelected}>
              {t("home.toolbar.batch_download")}
            </Item>
            <Show
              when={
                UserMethods.is_admin(me()) || getSettingBool("package_download")
              }
            >
              <Item onClick={() => bus.emit("tool", "package_download")}>
                {t("home.toolbar.package_download")}
              </Item>
              <Item onClick={playlistDownloadSelected}>
                {t("home.toolbar.playlist_download")}
              </Item>
            </Show>
            <Item onClick={sendToAria2}>{t("home.toolbar.send_aria2")}</Item>
          </Submenu>
        </Show>
      </Menu>

      {/* 标签对话框 */}
      <Suspense fallback={<div />}>
        <Show when={isAddLabelOpen()}>
          <AddLabelDialog
            isOpen={isAddLabelOpen()}
            onClose={() => setIsAddLabelOpen(false)}
            onSubmit={handleAddLabel}
          />
        </Show>
        <Show when={isEditLabelOpen()}>
          <EditLabelDialog
            isOpen={isEditLabelOpen()}
            onClose={() => setIsEditLabelOpen(false)}
            onSubmit={handleEditLabel}
            labels={labels()?.data?.content || []}
            obj={currentObj()}
          />
        </Show>
      </Suspense>
    </>
  )
}
