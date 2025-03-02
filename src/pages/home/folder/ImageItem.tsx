import { Center, VStack, Icon } from "@hope-ui/solid"
import { Motion } from "@motionone/solid"
import { useContextMenu } from "solid-contextmenu"
import { batch, Show } from "solid-js"
import { CenterLoading, ImageWithError } from "~/components"
import { useLink, usePath, useUtil } from "~/hooks"
import { checkboxOpen, getMainColor, selectAll, selectIndex } from "~/store"
import { ObjType, StoreObj } from "~/types"
import { bus } from "~/utils"
import { getIconByObj } from "~/utils/icon"
import { ItemCheckbox, useSelectWithMouse } from "./helper"

export const ImageItem = (props: { obj: StoreObj; index: number }) => {
  const { isHide } = useUtil()
  if (isHide(props.obj) || props.obj.type !== ObjType.IMAGE) {
    return null
  }
  const { setPathAs } = usePath()
  const objIcon = (
    <Icon color={getMainColor()} boxSize="$12" as={getIconByObj(props.obj)} />
  )
  const { show } = useContextMenu({ id: 1 })
  const { rawLink } = useLink()
  const { openWithDoubleClick, toggleWithClick, restoreSelectionCache } =
    useSelectWithMouse()
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        "flex-grow": 1,
      }}
    >
      <VStack
        w="$full"
        classList={{ selected: !!props.obj.selected }}
        class="image-item viselect-item"
        data-index={props.index}
        p="$1"
        spacing="$1"
        rounded="$lg"
        transition="all 0.3s"
        border="2px solid transparent"
        _hover={{
          border: `2px solid ${getMainColor()}`,
        }}
        cursor={
          openWithDoubleClick() || toggleWithClick() ? "default" : "pointer"
        }
        onMouseEnter={() => {
          setPathAs(props.obj.name, props.obj.is_dir, true)
        }}
        onContextMenu={(e: MouseEvent) => {
          batch(() => {
            selectIndex(props.index, true, true)
          })
          show(e, { props: props.obj })
        }}
      >
        <Center w="$full" pos="relative">
          <Show when={checkboxOpen()}>
            <ItemCheckbox
              pos="absolute"
              left="$1"
              top="$1"
              on:mousedown={(e: MouseEvent) => {
                e.stopPropagation()
              }}
              on:click={(e: MouseEvent) => {
                e.stopPropagation()
              }}
              checked={props.obj.selected}
              onChange={(e: any) => {
                selectIndex(props.index, e.target.checked)
              }}
            />
          </Show>
          <ImageWithError
            h="150px"
            w="$full"
            objectFit="cover"
            rounded="$lg"
            shadow="$md"
            fallback={<CenterLoading size="lg" />}
            fallbackErr={objIcon}
            src={rawLink(props.obj)}
            loading="lazy"
            on:dblclick={() => {
              if (!openWithDoubleClick()) return
              bus.emit("gallery", props.obj.name)
              selectIndex(props.index, true, true)
            }}
            on:click={(e: MouseEvent) => {
              if (openWithDoubleClick()) return
              if (e.ctrlKey || e.metaKey || e.shiftKey) return
              if (!restoreSelectionCache()) return
              if (toggleWithClick())
                return selectIndex(props.index, !props.obj.selected)
              bus.emit("gallery", props.obj.name)
            }}
          />
        </Center>
      </VStack>
    </Motion.div>
  )
}
