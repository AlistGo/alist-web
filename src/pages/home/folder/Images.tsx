import { Flex, Grid, Heading, VStack } from "@hope-ui/solid"
import { For, Show, createMemo } from "solid-js"
import { ImageItem } from "./ImageItem"
import { local, objStore } from "~/store"
import { GridItem } from "./GridItem"
import { StoreObj } from "~/types"
import { useT } from "~/hooks"
import { useSelectWithMouse } from "./helper"

const ImageLayout = (props: { images: StoreObj[] }) => {
  const t = useT()
  const folders = createMemo(() => (
    <Grid
      w="$full"
      gap="$1"
      templateColumns="repeat(auto-fill, minmax(100px,1fr))"
      class="image-folders"
    >
      <For each={objStore.objs.filter((obj) => obj.is_dir)}>
        {(obj, i) => {
          return <GridItem obj={obj} index={i()} />
        }}
      </For>
    </Grid>
  ))
  const { isMouseSupported, registerSelectContainer, captureContentMenu } =
    useSelectWithMouse()
  registerSelectContainer()
  return (
    <VStack
      oncapture:contextmenu={captureContentMenu}
      class="viselect-container"
      spacing="$2"
      w="$full"
    >
      <Show when={local["show_folder_in_image_view"] === "top"}>
        {folders()}
      </Show>
      <Show
        when={props.images.length > 0}
        fallback={<Heading m="$2">{t("home.no_images")}</Heading>}
      >
        <Flex w="$full" gap="$1" flexWrap="wrap" class="image-images">
          <For each={objStore.objs}>
            {(obj, i) => {
              return <ImageItem obj={obj} index={i()} />
            }}
          </For>
        </Flex>
      </Show>
      <Show when={local["show_folder_in_image_view"] === "bottom"}>
        {folders()}
      </Show>
    </VStack>
  )
}

export default ImageLayout
