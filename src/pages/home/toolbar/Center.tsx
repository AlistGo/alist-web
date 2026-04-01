import { Box, HStack, useColorModeValue, Icon, Tooltip } from "@hope-ui/solid"
import {
  createMemo,
  For,
  Show,
  createSignal,
  onMount,
  onCleanup,
  lazy,
  Suspense,
} from "solid-js"
import {
  checkboxOpen,
  haveSelected,
  objStore,
  selectAll,
  State,
  oneChecked,
  selectedObjs,
  me,
} from "~/store"
import { CopyLink } from "./CopyLink"
import { CenterIcon } from "./Icon"
import { bus, hoverColor } from "~/utils"
import { Download } from "./Download"
import { Motion, Presence } from "@motionone/solid"
import { useLabels } from "~/store/label"
import {
  createLabelFileBinding,
  createLabelFileBindingBatch,
} from "~/utils/api"
import { usePath, useT } from "~/hooks"
import { AiOutlineTag } from "solid-icons/ai"
import { UserMethods } from "~/types"

// 懒加载对话框组件
const AddLabelDialog = lazy(() => import("~/components/AddLabelDialog"))
const EditLabelDialog = lazy(() => import("~/components/EditLabelDialog"))

export const Center = () => {
  const show = createMemo(
    () =>
      [State.Folder, State.FetchingMore].includes(objStore.state) &&
      checkboxOpen() &&
      haveSelected(),
  )

  const t = useT()

  const canShowS3Actions = createMemo(() => {
    if (!UserMethods.is_admin(me())) return false
    const selected = selectedObjs()
    if (!selected.length) return false
    return selected.every((obj) => !obj.is_dir && !!obj.storage_class)
  })

  // 标签相关
  const { labels, refetch } = useLabels()
  const [isAddLabelOpen, setIsAddLabelOpen] = createSignal(false)
  const [isEditLabelOpen, setIsEditLabelOpen] = createSignal(false)
  const { refresh } = usePath()

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
      const selected = selectedObjs()
      if (!selected.length) return

      // 获取最新的标签列表
      const labelData = await refetch()
      if (labelData?.data?.content) {
        // 找到刚刚创建的标签
        const newLabel = labelData.data.content.find(
          (label: any) =>
            label.name === name &&
            label.description === description &&
            label.bg_color === bg_color,
        )
        if (newLabel) {
          const files = selected.filter((obj) => !obj.is_dir)
          if (files.length > 0) {
            const result = await createLabelFileBindingBatch(
              newLabel.id.toString(),
              files,
            )
          }
          // 强制刷新当前目录
          await refresh(false, true)
        }
      }
    } catch (err) {
      console.error("Failed to bind label to files:", err)
    }
  }

  const handleEditLabel = async (selectedLabels: string[]) => {
    try {
      const selected = selectedObjs()
      if (!selected.length) return

      // 为所有选中的文件更新标签
      for (const obj of selected) {
        if (!obj.is_dir) {
          // 这里需要调用更新标签的 API
          // 暂时先触发刷新
        }
      }
      // 强制刷新当前目录
      await refresh(false, true)
    } catch (err) {
      console.error("Failed to update labels for files:", err)
    }
  }

  const handleTagClick = () => {
    const labelData = labels()
    if (labelData?.data?.content?.length) {
      setIsEditLabelOpen(true)
    } else {
      setIsAddLabelOpen(true)
    }
  }

  return (
    <>
      <Presence exitBeforeEnter>
        <Show when={show()}>
          <Box
            class="center-toolbar"
            pos="fixed"
            bottom="$4"
            right="50%"
            w="max-content"
            color="$neutral11"
            as={Motion.div}
            initial={{ opacity: 0, scale: 0.9, x: "50% ", y: 10 }}
            animate={{ opacity: 1, scale: 1, x: "50%", y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            // @ts-ignore
            transition={{ duration: 0.2 }}
          >
            <HStack
              p="$2"
              bgColor={useColorModeValue("white", "#000000d0")()}
              spacing="$1"
              shadow="0px 10px 30px -5px rgba(0, 0, 0, 0.3)"
              rounded="$lg"
              css={{
                backdropFilter: "blur(8px)",
              }}
            >
              <For each={["rename", "move", "copy", "delete", "decompress"]}>
                {(name) => {
                  return (
                    <CenterIcon
                      name={name}
                      onClick={() => {
                        bus.emit("tool", name)
                      }}
                    />
                  )
                }}
              </For>

              <Show when={canShowS3Actions()}>
                <CenterIcon
                  name="s3_archive"
                  onClick={() => {
                    bus.emit("tool", "s3_archive")
                  }}
                />
                <CenterIcon
                  name="s3_restore"
                  onClick={() => {
                    bus.emit("tool", "s3_restore")
                  }}
                />
              </Show>

              {/* 标签功能 */}
              <Show
                when={
                  haveSelected() &&
                  UserMethods.is_admin(me()) &&
                  selectedObjs().every((obj) => !obj.is_dir)
                }
              >
                <Tooltip placement="top" withArrow label={t("home.tag.add")}>
                  <Icon
                    class="toolbar-add_tag"
                    _hover={{
                      bgColor: hoverColor(),
                    }}
                    _focus={{
                      outline: "none",
                    }}
                    cursor="pointer"
                    boxSize="$7"
                    rounded="$md"
                    p="$1"
                    _active={{
                      transform: "scale(.94)",
                      transition: "0.2s",
                    }}
                    as={AiOutlineTag}
                    color="$info9"
                    onClick={handleTagClick}
                  />
                </Tooltip>
              </Show>

              <CopyLink />
              <Download />
              <CenterIcon
                name="cancel_select"
                onClick={() => {
                  selectAll(false)
                }}
              />
            </HStack>
          </Box>
        </Show>
      </Presence>

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
            obj={selectedObjs()[0]}
            isBatch={selectedObjs().length > 1}
            selectedObjs={selectedObjs()}
          />
        </Show>
      </Suspense>
    </>
  )
}
