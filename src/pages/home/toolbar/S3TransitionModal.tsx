import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  VStack,
  createDisclosure,
} from "@hope-ui/solid"
import { For, Show, createSignal, onCleanup } from "solid-js"
import { SelectOptions } from "~/components"
import { usePath, useRouter, useT } from "~/hooks"
import { bus, joinBase, normalizeStorageClass, notify, pathJoin } from "~/utils"
import { password, selectedObjs } from "~/store"
import {
  S3TransitionArchivePayload,
  S3TransitionPayload,
  fsS3Transition,
} from "~/utils/api"
import type { Obj, StoreObj } from "~/types"

const storageClassValues = [
  "GLACIER",
  "DEEP_ARCHIVE",
  "GLACIER_IR",
  "STANDARD_IA",
  "ONEZONE_IA",
  "INTELLIGENT_TIERING",
  "STANDARD",
] as const

const restoreTiers = ["Standard", "Bulk", "Expedited"] as const

type Target = StoreObj & Obj

type Mode = "s3_archive" | "s3_restore"

export const S3TransitionModal = () => {
  const { isOpen, onOpen, onClose } = createDisclosure()
  const t = useT()
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [mode, setMode] = createSignal<Mode>("s3_archive")
  const [targets, setTargets] = createSignal<Target[]>([])
  const [storageClass, setStorageClass] =
    createSignal<(typeof storageClassValues)[number]>("GLACIER")
  const [transitionDays, setTransitionDays] = createSignal("")
  const [restoreDays, setRestoreDays] = createSignal("7")
  const [restoreTier, setRestoreTier] =
    createSignal<(typeof restoreTiers)[number]>("Standard")
  const [loading, setLoading] = createSignal(false)

  const handleOpen = (name: string) => {
    if (name !== "s3_archive" && name !== "s3_restore") return
    const selected = selectedObjs().filter(
      (obj): obj is Target => !obj.is_dir && !!obj.storage_class,
    )
    if (!selected.length) return
    setTargets(selected.map((item) => ({ ...item })))
    setMode(name)
    if (name === "s3_archive") {
      setStorageClass("GLACIER")
      setTransitionDays("")
    } else {
      setRestoreDays("7")
      setRestoreTier("Standard")
    }
    onOpen()
  }

  bus.on("tool", handleOpen)
  onCleanup(() => {
    bus.off("tool", handleOpen)
  })

  const closeModal = () => {
    if (loading()) return
    setTargets([])
    onClose()
  }

  const storageClassOptions = () =>
    storageClassValues.map((value) => {
      const key = normalizeStorageClass(value)
      const label = key ? t(`home.storage_class.${key}`) : undefined
      return { key: value, label: label || value }
    })

  const tierOptions = () =>
    restoreTiers.map((value) => ({
      key: value,
      label: t(`home.toolbar.s3_transition.tier.${value.toLowerCase()}`),
    }))

  const resolvePath = (target: Target) => {
    const currentDir = pathJoin("/", pathname())
    const computed = pathJoin(currentDir, target.name)

    if (target.path) {
      const normalizedTarget = pathJoin("/", target.path)

      if (normalizedTarget === computed) {
        return normalizedTarget
      }

      if (computed.endsWith(normalizedTarget)) {
        return computed
      }

      return normalizedTarget
    }

    return computed
  }

  const submit = async () => {
    if (!targets().length) return
    setLoading(true)
    try {
      let payload: S3TransitionPayload
      if (mode() === "s3_archive") {
        const archivePayload: S3TransitionArchivePayload = {
          action: "archive",
          storage_class: storageClass(),
        }
        const parsedDays = transitionDays().trim()
          ? Number(transitionDays())
          : undefined
        if (parsedDays !== undefined) {
          if (Number.isNaN(parsedDays) || parsedDays < 0) {
            notify.error(
              t("home.toolbar.s3_transition.invalid_transition_days"),
            )
            setLoading(false)
            return
          }
          archivePayload.days = Math.floor(parsedDays)
        }
        payload = archivePayload
      } else {
        const parsedDays = Number(restoreDays())
        if (Number.isNaN(parsedDays) || parsedDays <= 0) {
          notify.error(t("home.toolbar.s3_transition.invalid_restore_days"))
          setLoading(false)
          return
        }
        payload = {
          action: "restore",
          days: Math.floor(parsedDays),
          tier: restoreTier(),
        }
      }

      const responses = [] as (string | number | undefined)[]
      for (const target of targets()) {
        const resp = await fsS3Transition(
          resolvePath(target),
          payload,
          password(),
        )
        if (resp.code !== 200) {
          notify.error(resp.message)
          setLoading(false)
          return
        }
        responses.push(resp.data?.task_id)
      }

      const successKey =
        mode() === "s3_archive"
          ? "home.toolbar.s3_transition.archive_success"
          : "home.toolbar.s3_transition.restore_success"
      notify.success(
        t(successKey, {
          count: targets().length,
        }),
      )

      const taskIds = responses.filter((id): id is string | number => !!id)
      if (taskIds.length) {
        notify.render(
          <div
            style={{ display: "flex", "flex-direction": "column", gap: "4px" }}
          >
            <span>
              {t("home.toolbar.s3_transition.task_created", {
                count: taskIds.length,
              })}
            </span>
            <span>
              {t("home.toolbar.s3_transition.task_ids", {
                ids: taskIds.join(", "),
              })}
            </span>
            <a
              href={joinBase("/@manage/tasks")}
              target="_blank"
              rel="noreferrer"
            >
              {t("home.toolbar.s3_transition.task_link")}
            </a>
          </div>,
        )
      }

      await refresh(false, true)
      setTargets([])
      onClose()
    } catch (err) {
      console.error(err)
      notify.error((err as Error)?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      blockScrollOnMount={false}
      opened={isOpen()}
      onClose={closeModal}
      size={{
        "@initial": "xs",
        "@md": "md",
      }}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton disabled={loading()} />
        <ModalHeader>
          {mode() === "s3_archive"
            ? t("home.toolbar.s3_transition.title_archive")
            : t("home.toolbar.s3_transition.title_restore")}
        </ModalHeader>
        <ModalBody>
          <VStack alignItems="start" spacing="$2">
            <Text>
              {t("home.toolbar.s3_transition.selection", {
                count: targets().length,
              })}
            </Text>
            <For each={targets()}>
              {(item) => (
                <Text fontSize="$sm">
                  {item.name}
                  <Show when={item.storage_class}>
                    {(storage) => {
                      const normalized = normalizeStorageClass(storage)
                      const label =
                        normalized && normalized.length > 0
                          ? t(`home.storage_class.${normalized}`)
                          : undefined
                      return (
                        <>
                          {" "}
                          —
                          {t("home.toolbar.s3_transition.current_class", {
                            value: label || storage,
                          })}
                        </>
                      )
                    }}
                  </Show>
                </Text>
              )}
            </For>
            <Show when={mode() === "s3_archive"}>
              <FormControl>
                <FormLabel>
                  {t("home.toolbar.s3_transition.storage_class")}
                </FormLabel>
                <Select
                  value={storageClass()}
                  onChange={(value) => setStorageClass(value)}
                >
                  <SelectOptions options={storageClassOptions()} />
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>
                  {t("home.toolbar.s3_transition.transition_days")}
                </FormLabel>
                <Input
                  type="number"
                  min="0"
                  value={transitionDays()}
                  onInput={(e) => setTransitionDays(e.currentTarget.value)}
                  placeholder={t(
                    "home.toolbar.s3_transition.transition_days_hint",
                  )}
                />
              </FormControl>
            </Show>
            <Show when={mode() === "s3_restore"}>
              <FormControl>
                <FormLabel>
                  {t("home.toolbar.s3_transition.restore_days")}
                </FormLabel>
                <Input
                  type="number"
                  min="1"
                  value={restoreDays()}
                  onInput={(e) => setRestoreDays(e.currentTarget.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>
                  {t("home.toolbar.s3_transition.restore_tier")}
                </FormLabel>
                <Select
                  value={restoreTier()}
                  onChange={(value) => setRestoreTier(value)}
                >
                  <SelectOptions options={tierOptions()} />
                </Select>
              </FormControl>
            </Show>
          </VStack>
        </ModalBody>
        <ModalFooter display="flex" gap="$2">
          <Button
            onClick={closeModal}
            colorScheme="neutral"
            disabled={loading()}
          >
            {t("global.cancel")}
          </Button>
          <Button
            colorScheme="accent"
            loading={loading()}
            onClick={() => submit()}
          >
            {t("global.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
