import { HStack, VStack } from "@hope-ui/solid"
import { createMemo, createSignal, Show, Suspense } from "solid-js"
import { Dynamic } from "solid-js/web"
import { FullLoading, SelectWrapper } from "~/components"
import { objStore } from "~/store"
import { Download } from "../previews/download"
import { OpenWith } from "./open-with"
import { getPreviews } from "../previews"
import { useT } from "~/hooks"

const File = () => {
  const t = useT()
  const previews = createMemo(() => {
    return getPreviews({
      ...objStore.obj,
      provider: objStore.provider,
      web_proxy: objStore.web_proxy,
    })
  })
  const [cur, setCur] = createSignal(previews()[0])
  return (
    <Show when={previews().length > 1} fallback={<Download openWith />}>
      <VStack w="$full" spacing="$2">
        <HStack w="$full" spacing="$2">
          <SelectWrapper
            alwaysShowBorder
            value={cur().name}
            onChange={(name) => {
              setCur(previews().find((p) => p.name === name)!)
            }}
            options={previews().map((item) => ({
              value: item.name,
              label: item.i18nKey ? t(item.i18nKey) : item.name,
            }))}
          />
          <OpenWith />
        </HStack>
        <Suspense fallback={<FullLoading />}>
          <Dynamic component={cur().component} />
        </Suspense>
      </VStack>
    </Show>
  )
}

export default File
