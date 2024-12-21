import {
  Button,
  HStack,
  Image,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from "@hope-ui/solid"
import { useCopyLink, useT } from "~/hooks"
import { objStore } from "~/store"
import { FileInfo } from "./info"
import { OpenWith } from "../file/open-with"
import { createSignal, Show } from "solid-js"
import { BsQrCode } from "solid-icons/bs"
import QRCode from "qrcode"

export const Download = (props: { openWith?: boolean }) => {
  const t = useT()
  const { copyCurrentRawLink } = useCopyLink()
  const [qrUrl, setQrUrl] = createSignal("")
  QRCode.toDataURL(objStore.raw_url).then((url) => setQrUrl(url))
  return (
    <FileInfo>
      <HStack spacing="$2">
        <Button colorScheme="accent" onClick={() => copyCurrentRawLink(true)}>
          {t("home.toolbar.copy_link")}
        </Button>
        <Button as="a" href={objStore.raw_url} target="_blank">
          {t("home.preview.download")}
        </Button>
        <Popover triggerMode="hover">
          <PopoverTrigger as={BsQrCode} />
          <PopoverContent width="fit-content">
            <PopoverArrow />
            <PopoverBody>
              <Image
                boxSize="100px"
                src={qrUrl()}
                alt="QR Code of download link"
                objectFit="cover"
              />
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </HStack>
      <Show when={props.openWith}>
        <OpenWith />
      </Show>
    </FileInfo>
  )
}

export default Download
