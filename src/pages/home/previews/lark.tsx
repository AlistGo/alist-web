import { Button, HStack, hope } from "@hope-ui/solid"
import { TbExternalLink } from "solid-icons/tb"
import { BoxWithFullScreen } from "~/components"
import { objStore } from "~/store"
import { useT } from "~/hooks"

const LarkPreview = () => {
  const t = useT()
  return (
    <BoxWithFullScreen w="$full" h="75vh">
      <HStack mb="$2" justifyContent="flex-end">
        <Button
          as="a"
          href={objStore.raw_url}
          target="_blank"
          leftIcon={<TbExternalLink />}
        >
          {t("home.preview.open_in_new_window")}
        </Button>
      </HStack>
      <hope.iframe
        w="$full"
        h="$full"
        rounded="$lg"
        shadow="$md"
        src={objStore.raw_url}
        title={t("home.preview.lark_preview")}
      />
    </BoxWithFullScreen>
  )
}

export default LarkPreview
