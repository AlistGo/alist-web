import {
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
} from "@hope-ui/solid"
import { createEffect, createSignal, onCleanup, onMount } from "solid-js"
import { useT, useUtil } from "~/hooks"
import { bus, handleResp, notify } from "~/utils"
import { createShare } from "~/utils/api"

const CreateShareDialog = () => {
  const t = useT()
  const { copy } = useUtil()
  const [opened, setOpened] = createSignal(false)
  const [loading, setLoading] = createSignal(false)
  const [target, setTarget] = createSignal<{
    path: string
    name: string
    is_dir: boolean
  } | null>(null)
  const [name, setName] = createSignal("")
  const [password, setPassword] = createSignal("")
  const [expireHours, setExpireHours] = createSignal("0")
  const [allowPreview, setAllowPreview] = createSignal(true)
  const [allowDownload, setAllowDownload] = createSignal(true)

  const reset = () => {
    setPassword("")
    setExpireHours("0")
    setAllowPreview(true)
    setAllowDownload(true)
    setLoading(false)
  }

  createEffect(() => {
    const current = target()
    if (current) {
      setName(current.name)
    }
  })

  onMount(() => {
    const handleOpen = (payload: {
      path: string
      name: string
      is_dir: boolean
    }) => {
      setTarget(payload)
      setOpened(true)
      reset()
      setName(payload.name)
    }
    bus.on("share", handleOpen)
    onCleanup(() => bus.off("share", handleOpen))
  })

  const close = () => {
    setOpened(false)
    setTarget(null)
    reset()
  }

  const submit = async () => {
    const current = target()
    if (!current) return
    const hours = Number.parseInt(expireHours(), 10)
    if (Number.isNaN(hours) || hours < 0) {
      notify.error(
        t(
          "share.invalid_expire",
          undefined,
          "Expire hours must be 0 or greater",
        ),
      )
      return
    }
    setLoading(true)
    const resp = await createShare({
      path: current.path,
      name: name(),
      password: password(),
      expire_hours: hours,
      allow_preview: allowPreview(),
      allow_download: allowDownload(),
    })
    handleResp(
      resp,
      (data) => {
        copy(data.url)
        notify.success(
          t(
            "share.created_and_copied",
            undefined,
            "Share link created and copied",
          ),
        )
        close()
      },
      undefined,
      true,
      true,
    )
    setLoading(false)
  }

  return (
    <Modal opened={opened()} onClose={close}>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>
          {t("share.create_title", undefined, "Create share")}
        </ModalHeader>
        <ModalBody>
          <VStack spacing="$3" alignItems="stretch">
            <FormControl>
              <FormLabel>{t("share.target", undefined, "Target")}</FormLabel>
              <Input value={target()?.path || ""} disabled />
            </FormControl>
            <FormControl required>
              <FormLabel>{t("share.name", undefined, "Share name")}</FormLabel>
              <Input
                value={name()}
                maxLength={128}
                onInput={(e) => setName(e.currentTarget.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>
                {t("share.password", undefined, "Password")}
              </FormLabel>
              <Input
                type="password"
                value={password()}
                placeholder={t(
                  "share.password_placeholder",
                  undefined,
                  "Optional access password",
                )}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>
                {t("share.expire_hours", undefined, "Expire hours")}
              </FormLabel>
              <Input
                type="number"
                min="0"
                value={expireHours()}
                onInput={(e) => setExpireHours(e.currentTarget.value)}
              />
              <FormHelperText>
                {t("share.expire_hint", undefined, "Use 0 for never expire")}
              </FormHelperText>
            </FormControl>
            <Checkbox
              checked={allowPreview()}
              onChange={() => setAllowPreview(!allowPreview())}
            >
              {t("share.allow_preview", undefined, "Allow preview")}
            </Checkbox>
            <Checkbox
              checked={allowDownload()}
              onChange={() => setAllowDownload(!allowDownload())}
            >
              {t("share.allow_download", undefined, "Allow download")}
            </Checkbox>
          </VStack>
        </ModalBody>
        <ModalFooter gap="$2">
          <Button onClick={close}>{t("global.cancel")}</Button>
          <Button colorScheme="accent" loading={loading()} onClick={submit}>
            {t("global.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default CreateShareDialog
