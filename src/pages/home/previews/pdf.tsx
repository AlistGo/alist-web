import { hope } from "@hope-ui/solid"
import { BoxWithFullScreen } from "~/components"
import { objStore } from "~/store"

const PdfPreview = () => {
  return (
    <BoxWithFullScreen w="$full" h="75vh">
      <hope.iframe
        w="$full"
        h="$full"
        rounded="$lg"
        shadow="$md"
        src={objStore.raw_url}
        title="PDF Preview"
      />
    </BoxWithFullScreen>
  )
}

export default PdfPreview
