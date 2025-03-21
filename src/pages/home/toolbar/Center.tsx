import { Box, HStack, useColorModeValue } from "@hope-ui/solid"
import { createMemo, For, Show } from "solid-js"
import { checkboxOpen, haveSelected, objStore, selectAll, State } from "~/store"
import { CopyLink } from "./CopyLink"
import { CenterIcon } from "./Icon"
import { bus } from "~/utils"
import { Download } from "./Download"
import { Motion, Presence } from "@motionone/solid"

export const Center = () => {
  const show = createMemo(
    () =>
      [State.Folder, State.FetchingMore].includes(objStore.state) &&
      checkboxOpen() &&
      haveSelected(),
  )
  return (
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
  )
}
