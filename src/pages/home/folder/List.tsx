import { HStack, VStack, Text } from "@hope-ui/solid"
import { batch, createEffect, createSignal, For, Show } from "solid-js"
import { useT } from "~/hooks"
import {
  allChecked,
  checkboxOpen,
  getCurrentPath,
  getSortPreference,
  isIndeterminate,
  me,
  objStore,
  selectAll,
  setSortPreference,
  sortObjs,
} from "~/store"
import { OrderBy } from "~/store"
import { UserMethods, UserPermissions } from "~/types"
import { Col, cols, ListItem } from "./ListItem"
import { ItemCheckbox, useSelectWithMouse } from "./helper"
import { bus } from "~/utils"

export const ListTitle = (props: {
  sortCallback: (orderBy: OrderBy, reverse?: boolean) => void
  disableCheckbox?: boolean
}) => {
  const t = useT()
  const [orderBy, setOrderBy] = createSignal<OrderBy>()
  const [reverse, setReverse] = createSignal(false)
  createEffect(() => {
    const preference = getSortPreference(getCurrentPath())
    batch(() => {
      setOrderBy(preference?.orderBy)
      setReverse(preference?.reverse ?? false)
    })
  })
  createEffect(() => {
    if (orderBy()) {
      const currentOrderBy = orderBy()!
      const currentReverse = reverse()
      props.sortCallback(currentOrderBy, currentReverse)
      setSortPreference(currentOrderBy, currentReverse, getCurrentPath())
    }
  })
  const itemProps = (col: Col) => {
    return {
      fontWeight: "bold",
      fontSize: "$sm",
      color: "$neutral11",
      textAlign: col.textAlign as any,
      cursor: "pointer",
      onClick: () => {
        if (col.name === orderBy()) {
          setReverse(!reverse())
        } else {
          batch(() => {
            setOrderBy(col.name as OrderBy)
            setReverse(false)
          })
        }
      },
    }
  }
  return (
    <HStack class="title" w="$full" p="$2">
      <HStack w={cols[0].w} spacing="$1">
        <Show when={!props.disableCheckbox && checkboxOpen()}>
          <ItemCheckbox
            checked={allChecked()}
            indeterminate={isIndeterminate()}
            onChange={(e: any) => {
              selectAll(e.target.checked as boolean)
            }}
          />
        </Show>
        <Text {...itemProps(cols[0])}>{t(`home.obj.${cols[0].name}`)}</Text>
      </HStack>
      <Text w={cols[1].w} {...itemProps(cols[1])}>
        {t(`home.obj.${cols[1].name}`)}
      </Text>
      <Text
        w={cols[2].w}
        {...itemProps(cols[2])}
        display={{ "@initial": "none", "@md": "inline" }}
      >
        {t(`home.obj.${cols[2].name}`)}
      </Text>
    </HStack>
  )
}

const ListLayout = () => {
  const onDragOver = (e: DragEvent) => {
    // 拖拽上传做权限检查限制
    const writeIndex = UserPermissions.findIndex((item) => item === "write")
    if (!UserMethods.can(me(), writeIndex, getCurrentPath())) {
      return
    }

    const items = Array.from(e.dataTransfer?.items ?? [])
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === "file") {
        bus.emit("tool", "upload")
        e.preventDefault()
        break
      }
    }
  }
  const { isMouseSupported, registerSelectContainer, captureContentMenu } =
    useSelectWithMouse()
  registerSelectContainer()
  return (
    <VStack
      onDragOver={onDragOver}
      oncapture:contextmenu={captureContentMenu}
      class="list viselect-container"
      w="$full"
      spacing="$1"
    >
      <ListTitle sortCallback={sortObjs} />
      <For each={objStore.objs}>
        {(obj, i) => {
          return <ListItem obj={obj} index={i()} />
        }}
      </For>
    </VStack>
  )
}

export default ListLayout
