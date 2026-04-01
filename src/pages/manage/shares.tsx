import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  createDisclosure,
} from "@hope-ui/solid"
import copy from "copy-to-clipboard"
import { createSignal, For, onMount, Show } from "solid-js"
import { DeletePopover } from "./common/DeletePopover"
import { useManageTitle, useT } from "~/hooks"
import { ShareItem } from "~/types"
import {
  deleteShare,
  disableShare,
  getShareList,
  updateShare,
} from "~/utils/api"
import {
  dateTimeLocalToISOString,
  formatDate,
  handleResp,
  notify,
  toDateTimeLocalValue,
} from "~/utils"

const Shares = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.shares")
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [shares, setShares] = createSignal<ShareItem[]>([])
  const [loading, setLoading] = createSignal(false)
  const [deleting, setDeleting] = createSignal<string | null>(null)
  const [disabling, setDisabling] = createSignal<string | null>(null)
  const [updating, setUpdating] = createSignal(false)
  const [editingShare, setEditingShare] = createSignal<ShareItem | null>(null)
  const [editShareId, setEditShareId] = createSignal("")
  const [editName, setEditName] = createSignal("")
  const [editPassword, setEditPassword] = createSignal("")
  const [editExpireAt, setEditExpireAt] = createSignal("")
  const [editAccessLimit, setEditAccessLimit] = createSignal("0")
  const [editAllowPreview, setEditAllowPreview] = createSignal(true)
  const [editAllowDownload, setEditAllowDownload] = createSignal(true)

  const refresh = async () => {
    setLoading(true)
    const resp = await getShareList()
    handleResp(resp, (data) => {
      setShares(data.content)
    })
    setLoading(false)
  }

  const remove = async (shareId: string) => {
    setDeleting(shareId)
    const resp = await deleteShare(shareId)
    handleResp(resp, async () => {
      notify.success(t("global.delete_success"))
      await refresh()
    })
    setDeleting(null)
  }

  const invalidate = async (shareId: string) => {
    setDisabling(shareId)
    const resp = await disableShare(shareId)
    handleResp(resp, async () => {
      notify.success(t("share.disabled", undefined, "Disabled"))
      await refresh()
    })
    setDisabling(null)
  }

  const closeEditor = () => {
    onClose()
    setEditingShare(null)
    setEditShareId("")
    setEditName("")
    setEditPassword("")
    setEditExpireAt("")
    setEditAccessLimit("0")
    setEditAllowPreview(true)
    setEditAllowDownload(true)
    setUpdating(false)
  }

  const openEditor = (item: ShareItem) => {
    setEditingShare(item)
    setEditShareId(item.share_id)
    setEditName(item.name)
    setEditPassword("")
    setEditExpireAt(toDateTimeLocalValue(item.expires_at))
    setEditAccessLimit(String(item.access_limit || 0))
    setEditAllowPreview(item.allow_preview)
    setEditAllowDownload(item.allow_download)
    onOpen()
  }

  const save = async () => {
    const item = editingShare()
    if (!item) return

    const nextShareId = editShareId().trim()
    if (!nextShareId) {
      notify.error(t("share.invalid_link", undefined, "Link cannot be empty"))
      return
    }

    const accessLimitValue = Number.parseInt(editAccessLimit(), 10)
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

    const expireAtValue = editExpireAt().trim()
    const expireAtISO = expireAtValue
      ? dateTimeLocalToISOString(expireAtValue)
      : ""
    if (expireAtValue && !expireAtISO) {
      notify.error(
        t("share.invalid_expire", undefined, "Expire time format is invalid"),
      )
      return
    }

    setUpdating(true)
    const resp = await updateShare({
      share_id: item.share_id,
      new_share_id: nextShareId,
      name: editName(),
      password: editPassword().trim() || undefined,
      expire_at: expireAtISO,
      access_limit: accessLimitValue,
      allow_preview: editAllowPreview(),
      allow_download: editAllowDownload(),
    })
    handleResp(resp, async () => {
      notify.success(t("global.save_success", undefined, "Saved"))
      closeEditor()
      await refresh()
    })
    setUpdating(false)
  }

  const isExpired = (item: ShareItem) =>
    Boolean(
      item.expires_at && new Date(item.expires_at).getTime() <= Date.now(),
    )

  onMount(() => {
    refresh()
  })

  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2">
        <Button colorScheme="accent" loading={loading()} onClick={refresh}>
          {t("global.refresh")}
        </Button>
      </HStack>
      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <Th>{t("global.name")}</Th>
              <Th>{t("share.link", undefined, "Link")}</Th>
              <Th>{t("share.target", undefined, "Target")}</Th>
              <Th>{t("share.mode", undefined, "Mode")}</Th>
              <Th>{t("share.expire", undefined, "Expire")}</Th>
              <Th>{t("share.stats", undefined, "Stats")}</Th>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={shares()}>
              {(item) => (
                <Tr>
                  <Td>{item.name}</Td>
                  <Td>{item.share_id}</Td>
                  <Td>{item.root_path}</Td>
                  <Td>
                    <HStack spacing="$1_5" wrap="wrap">
                      <Show when={item.has_password}>
                        <Badge colorScheme="info">
                          {t("share.password_required", undefined, "Password")}
                        </Badge>
                      </Show>
                      <Show when={item.burn_after_read}>
                        <Badge colorScheme="warning">
                          {t(
                            "share.burn_after_read",
                            undefined,
                            "Burn after read",
                          )}
                        </Badge>
                      </Show>
                      <Show when={item.access_limit > 1}>
                        <Badge colorScheme="warning">
                          {t(
                            "share.access_limit_badge",
                            {
                              count: item.access_limit,
                            },
                            `${item.access_limit} accesses`,
                          )}
                        </Badge>
                      </Show>
                      <Show when={!item.allow_preview}>
                        <Badge colorScheme="danger">
                          {t(
                            "share.preview_disabled",
                            undefined,
                            "Preview off",
                          )}
                        </Badge>
                      </Show>
                      <Show when={!item.allow_download}>
                        <Badge colorScheme="danger">
                          {t(
                            "share.download_disabled",
                            undefined,
                            "Download off",
                          )}
                        </Badge>
                      </Show>
                      <Show
                        when={
                          item.allow_preview &&
                          item.allow_download &&
                          !item.has_password &&
                          item.access_limit === 0
                        }
                      >
                        <Badge colorScheme="success">
                          {t("share.standard", undefined, "Standard")}
                        </Badge>
                      </Show>
                    </HStack>
                  </Td>
                  <Td>
                    <VStack alignItems="start" spacing="$1">
                      <Text>
                        {item.expires_at
                          ? formatDate(item.expires_at)
                          : t("share.never", undefined, "Never")}
                      </Text>
                      <Show when={item.access_limit > 0}>
                        <Text fontSize="$xs" color="$neutral11">
                          {t("share.access", undefined, "Access")}:{" "}
                          {item.access_count}/{item.access_limit}
                          <Show when={item.remaining_accesses > 0}>
                            {" · "}
                            {t(
                              "share.remaining_accesses",
                              {
                                count: item.remaining_accesses,
                              },
                              `${item.remaining_accesses} left`,
                            )}
                          </Show>
                        </Text>
                      </Show>
                      <Show when={item.consumed_at}>
                        <Text fontSize="$xs" color="$danger9">
                          {t("share.consumed", undefined, "Consumed")}:{" "}
                          {formatDate(item.consumed_at!)}
                        </Text>
                      </Show>
                    </VStack>
                  </Td>
                  <Td>
                    <VStack alignItems="start" spacing="$1">
                      <Text>{`${item.view_count} / ${item.download_count}`}</Text>
                      <HStack spacing="$1_5" wrap="wrap">
                        <Badge
                          colorScheme={
                            item.consumed_at
                              ? "danger"
                              : isExpired(item)
                                ? "warning"
                                : item.enabled
                                  ? "success"
                                  : "warning"
                          }
                        >
                          {item.consumed_at
                            ? t("share.consumed", undefined, "Consumed")
                            : isExpired(item)
                              ? t("share.expired", undefined, "Expired")
                              : item.enabled
                                ? t("share.active", undefined, "Active")
                                : t("share.disabled", undefined, "Disabled")}
                        </Badge>
                      </HStack>
                      <Show when={item.last_access_at}>
                        <Text fontSize="$xs" color="$neutral11">
                          {t("share.last_access", undefined, "Last access")}:{" "}
                          {formatDate(item.last_access_at!)}
                        </Text>
                      </Show>
                    </VStack>
                  </Td>
                  <Td>
                    <HStack spacing="$2" wrap="wrap">
                      <Button
                        size="sm"
                        onClick={() => {
                          copy(item.url)
                          notify.success(t("global.copied"))
                        }}
                      >
                        {t("share.copy", undefined, "Copy")}
                      </Button>
                      <Button size="sm" as="a" href={item.url} target="_blank">
                        {t("share.open", undefined, "Open")}
                      </Button>
                      <Button size="sm" onClick={() => openEditor(item)}>
                        {t("global.edit", undefined, "Edit")}
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="warning"
                        loading={disabling() === item.share_id}
                        disabled={!item.enabled || Boolean(item.consumed_at)}
                        onClick={() => invalidate(item.share_id)}
                      >
                        {t("share.invalidate", undefined, "Invalidate")}
                      </Button>
                      <DeletePopover
                        name={item.name}
                        loading={deleting() === item.share_id}
                        onClick={() => remove(item.share_id)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              )}
            </For>
          </Tbody>
        </Table>
      </Box>
      <Modal opened={isOpen()} onClose={closeEditor}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>{t("global.edit", undefined, "Edit")}</ModalHeader>
          <ModalBody>
            <VStack spacing="$3" alignItems="stretch">
              <FormControl>
                <FormLabel>{t("share.target", undefined, "Target")}</FormLabel>
                <Input value={editingShare()?.root_path || ""} disabled />
              </FormControl>
              <FormControl required>
                <FormLabel>{t("share.link", undefined, "Link")}</FormLabel>
                <Input
                  value={editShareId()}
                  maxLength={32}
                  onInput={(e) => setEditShareId(e.currentTarget.value)}
                />
                <FormHelperText>
                  {t(
                    "share.link_hint",
                    undefined,
                    "Use letters, numbers, underscore or hyphen only.",
                  )}
                </FormHelperText>
              </FormControl>
              <FormControl required>
                <FormLabel>
                  {t("share.name", undefined, "Share name")}
                </FormLabel>
                <Input
                  value={editName()}
                  maxLength={128}
                  onInput={(e) => setEditName(e.currentTarget.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>
                  {t("share.password", undefined, "Password")}
                </FormLabel>
                <Input
                  type="password"
                  value={editPassword()}
                  placeholder={t(
                    "share.password_placeholder",
                    undefined,
                    "Optional access password",
                  )}
                  onInput={(e) => setEditPassword(e.currentTarget.value)}
                />
                <FormHelperText>
                  {t(
                    "share.password_keep_hint",
                    undefined,
                    "Leave empty to keep the current password.",
                  )}
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>
                  {t("share.access_limit", undefined, "Access limit")}
                </FormLabel>
                <Input
                  type="number"
                  min="0"
                  value={editAccessLimit()}
                  onInput={(e) => setEditAccessLimit(e.currentTarget.value)}
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
                  value={editExpireAt()}
                  onInput={(e) => setEditExpireAt(e.currentTarget.value)}
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
                checked={editAllowPreview()}
                onChange={() => setEditAllowPreview(!editAllowPreview())}
              >
                {t("share.allow_preview", undefined, "Allow preview")}
              </Checkbox>
              <Checkbox
                checked={editAllowDownload()}
                onChange={() => setEditAllowDownload(!editAllowDownload())}
              >
                {t("share.allow_download", undefined, "Allow download")}
              </Checkbox>
            </VStack>
          </ModalBody>
          <ModalFooter gap="$2">
            <Button onClick={closeEditor}>{t("global.cancel")}</Button>
            <Button colorScheme="accent" loading={updating()} onClick={save}>
              {t("global.save", undefined, "Save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}

export default Shares
