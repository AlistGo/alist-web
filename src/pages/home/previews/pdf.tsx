import { hope } from "@hope-ui/solid"
import { createMemo } from "solid-js"
import { BoxWithFullScreen } from "~/components"
import { useLink } from "~/hooks"
import { objStore } from "~/store"

const PdfPreview = () => {
  const { proxyLink } = useLink()
  const previewUrl = createMemo(() => {
    if (!objStore.web_proxy) {
      return objStore.raw_url
    }
    const url = new URL(proxyLink(objStore.obj, true), location.origin)
    url.searchParams.set("type", "preview")
    return url.toString()
  })
  return (
    <BoxWithFullScreen w="$full" h="75vh">
      <hope.iframe
        w="$full"
        h="$full"
        rounded="$lg"
        shadow="$md"
        src={previewUrl()}
        title="PDF Preview"
      />
    </BoxWithFullScreen>
  )
}

export default PdfPreview
