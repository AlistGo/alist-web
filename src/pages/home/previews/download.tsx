import {
  Button,
  HStack,
  IconButton,
  Image,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from "@hope-ui/solid"
import { useCopyLink, useRouter, useT } from "~/hooks"
import { objStore } from "~/store"
import { FileInfo } from "./info"
import { OpenWith } from "../file/open-with"
import { createSignal, Show } from "solid-js"
import { BsQrCode } from "solid-icons/bs"
import QRCode from "qrcode"
import { bus } from "~/utils"

export const Download = (props: { openWith?: boolean }) => {
  const t = useT()
  const { pathname } = useRouter()
  const { copyCurrentRawLink } = useCopyLink()
  const isShareRoute = () => pathname().startsWith("/s/")
  const [qrUrl, setQrUrl] = createSignal("")
  QRCode.toDataURL(objStore.raw_url, {
    type: "image/jpeg",
    scale: 2,
  }).then((url) => setQrUrl(url))
  const [pinned, setPinned] = createSignal(false)
  const [hover, setHover] = createSignal(false)
  return (
    <FileInfo>
      <HStack spacing="$2">
        <Button colorScheme="accent" onClick={() => copyCurrentRawLink(true)}>
          {t("home.toolbar.copy_link")}
        </Button>
        <Show when={!isShareRoute()}>
          <Button
            onClick={() =>
              bus.emit("share", {
                path: pathname(),
                name: objStore.obj.name,
                is_dir: false,
              })
            }
          >
            {t("home.toolbar.share", undefined, "Share")}
          </Button>
        </Show>
        <Button as="a" href={objStore.raw_url} target="_blank">
          {t("home.preview.download")}
        </Button>
        <Popover opened={pinned() || hover()} motionPreset="none">
          <PopoverTrigger
            as={IconButton}
            icon={<BsQrCode />}
            aria-label="QRCode"
            colorScheme="success"
            onClick={() => {
              setPinned(!pinned())
            }}
            onMouseOver={() => setHover(true)}
            onMouseOut={() => setHover(false)}
          />
          <PopoverContent width="fit-content">
            <PopoverArrow />
            <PopoverBody>
              <Image
                maxWidth="300px"
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
