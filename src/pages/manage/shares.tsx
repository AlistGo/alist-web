import {
  Box,
  Button,
  HStack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  VStack,
} from "@hope-ui/solid"
import copy from "copy-to-clipboard"
import { createSignal, For, onMount } from "solid-js"
import { DeletePopover } from "./common/DeletePopover"
import { useManageTitle, useT } from "~/hooks"
import { ShareItem } from "~/types"
import { deleteShare, getShareList } from "~/utils/api"
import { handleResp, notify } from "~/utils"

const Shares = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.shares")
  const [shares, setShares] = createSignal<ShareItem[]>([])
  const [loading, setLoading] = createSignal(false)
  const [deleting, setDeleting] = createSignal<string | null>(null)

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
                    {item.expires_at
                      ? new Date(item.expires_at).toLocaleString()
                      : t("share.never", undefined, "Never")}
                  </Td>
                  <Td>{`${item.view_count} / ${item.download_count}`}</Td>
                  <Td>
                    <HStack spacing="$2">
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
    </VStack>
  )
}

export default Shares
