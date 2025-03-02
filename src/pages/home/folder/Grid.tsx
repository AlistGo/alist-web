import { Grid } from "@hope-ui/solid"
import { For } from "solid-js"
import { GridItem } from "./GridItem"
import "lightgallery/css/lightgallery-bundle.css"
import { local, objStore } from "~/store"
import { useSelectWithMouse } from "./helper"

const GridLayout = () => {
  const { isMouseSupported, registerSelectContainer, captureContentMenu } =
    useSelectWithMouse()
  registerSelectContainer()
  return (
    <Grid
      oncapture:contextmenu={captureContentMenu}
      class="viselect-container"
      w="$full"
      gap="$1"
      templateColumns={`repeat(auto-fill, minmax(${
        parseInt(local["grid_item_size"]) + 20
      }px,1fr))`}
    >
      <For each={objStore.objs}>
        {(obj, i) => {
          return <GridItem obj={obj} index={i()} />
        }}
      </For>
    </Grid>
  )
}

export default GridLayout
