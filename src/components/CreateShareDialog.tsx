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
import { dateTimeLocalToISOString } from "~/utils"

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
  const [shareId, setShareId] = createSignal("")
  const [name, setName] = createSignal("")
  const [password, setPassword] = createSignal("")
  const [expireAt, setExpireAt] = createSignal("")
  const [accessLimit, setAccessLimit] = createSignal("0")
  const [allowPreview, setAllowPreview] = createSignal(true)
  const [allowDownload, setAllowDownload] = createSignal(true)

  const reset = () => {
    setShareId("")
    setPassword("")
    setExpireAt("")
    setAccessLimit("0")
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
    const accessLimitValue = Number.parseInt(accessLimit(), 10)
    if (Number.isNaN(accessLimitValue) || accessLimitValue < 0) {
      notify.error(
        t(
          "share.invalid_access_limit",
          undefined,
          "Access limit must be 0 or greater",
        ),
      )
      return
    }
    const expireAtValue = expireAt().trim()
    const expireAtISO = expireAtValue
      ? dateTimeLocalToISOString(expireAtValue)
      : ""
    if (expireAtValue && !expireAtISO) {
      notify.error(
        t("share.invalid_expire", undefined, "Expire time format is invalid"),
      )
      return
    }
    setLoading(true)
    const resp = await createShare({
      path: current.path,
      share_id: shareId().trim() || undefined,
      name: name(),
      password: password(),
      expire_at: expireAtISO || undefined,
      access_limit: accessLimitValue,
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
              <FormLabel>{t("share.link", undefined, "Link")}</FormLabel>
              <Input
                value={shareId()}
                maxLength={32}
                placeholder={t(
                  "share.link_placeholder",
                  undefined,
                  "Leave empty to auto generate",
                )}
                onInput={(e) => setShareId(e.currentTarget.value)}
              />
              <FormHelperText>
                {t(
                  "share.link_hint",
                  undefined,
                  "Use letters, numbers, underscore or hyphen only.",
                )}
              </FormHelperText>
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
                {t("share.access_limit", undefined, "Access limit")}
              </FormLabel>
              <Input
                type="number"
                min="0"
                value={accessLimit()}
                onInput={(e) => setAccessLimit(e.currentTarget.value)}
              />
              <FormHelperText>
                {t(
                  "share.access_limit_hint",
                  undefined,
                  "Use 0 for unlimited, 1 for burn after read.",
                )}
              </FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel>{t("share.expire", undefined, "Expire")}</FormLabel>
              <Input
                type="datetime-local"
                step="1"
                value={expireAt()}
                onInput={(e) => setExpireAt(e.currentTarget.value)}
              />
              <FormHelperText>
                {t(
                  "share.expire_hint",
                  undefined,
                  "Leave empty for never expire.",
                )}
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
