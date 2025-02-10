import { Box, createDisclosure } from "@hope-ui/solid"
import { ModalInput, SelectWrapper } from "~/components"
import { useFetch, useRouter, useT } from "~/hooks"
import {
  offlineDownload,
  bus,
  handleRespWithNotifySuccess,
  r,
  handleResp,
} from "~/utils"
import { createSignal, onCleanup, onMount } from "solid-js"
import { PResp } from "~/types"
import bencode from "bencode"
import crypto from "crypto-js"

const deletePolicies = [
  "delete_on_upload_succeed",
  "delete_on_upload_failed",
  "delete_never",
  "delete_always",
] as const

type DeletePolicy = (typeof deletePolicies)[number]

function utf8Decode(data: Uint8Array): string {
  return crypto.enc.Utf8.stringify(crypto.lib.WordArray.create(data))
}

function toMagnetUrl(torrentBuffer: Uint8Array) {
  const data = bencode.decode(torrentBuffer as any)
  const infoEncode = bencode.encode(data.info) as unknown as Uint8Array

  const infoHash = crypto
    .SHA1(crypto.lib.WordArray.create(infoEncode))
    .toString()
  let params = {} as any

  if (Number.isInteger(data?.info?.length)) {
    params.xl = data.info.length
  }
  if (data.info.name) {
    params.dn = utf8Decode(data.info.name)
  }
  if (data.announce) {
    params.tr = utf8Decode(data.announce)
  }

  return `magnet:?xt=urn:btih:${infoHash}&${new URLSearchParams(
    params,
  ).toString()}`
}

export const OfflineDownload = () => {
  const t = useT()
  const [tools, setTools] = createSignal([] as string[])
  const [toolsLoading, reqTool] = useFetch((): PResp<string[]> => {
    return r.get("/public/offline_download_tools")
  })
  const [tool, setTool] = createSignal("")
  const [deletePolicy, setDeletePolicy] = createSignal<DeletePolicy>(
    "delete_on_upload_succeed",
  )
  onMount(async () => {
    const resp = await reqTool()
    handleResp(resp, (data) => {
      setTools(data)
      setTool(data[0])
    })
  })

  const { isOpen, onOpen, onClose } = createDisclosure()
  const [loading, ok] = useFetch(offlineDownload)
  const { pathname } = useRouter()
  const handler = (name: string) => {
    if (name === "offline_download") {
      onOpen()
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  // convert torrent file to magnet link
  const handleTorrentFileDrop = async (
    e: DragEvent,
    setValue: (value: string) => void,
  ) => {
    e.preventDefault()
    if (e.dataTransfer?.files.length) {
      const values = []
      for (const file of e.dataTransfer.files) {
        if (file.name.toLowerCase().endsWith(".torrent")) {
          try {
            const buffer = await file.arrayBuffer()
            values.push(toMagnetUrl(new Uint8Array(buffer)))
          } catch (err) {
            console.error("Failed to convert torrent file to magnet link:", err)
          }
        }
      }
      if (values.length) {
        setValue(values.join("\n"))
      }
    }
  }

  return (
    <ModalInput
      title="home.toolbar.offline_download"
      type="text"
      opened={isOpen()}
      onClose={onClose}
      loading={toolsLoading() || loading()}
      tips={t("home.toolbar.offline_download-tips")}
      onDrop={handleTorrentFileDrop}
      topSlot={
        <Box mb="$2">
          <SelectWrapper
            value={tool()}
            onChange={(v) => setTool(v)}
            options={tools().map((tool) => {
              return { value: tool, label: tool }
            })}
          />
        </Box>
      }
      bottomSlot={
        <Box mb="$2">
          <SelectWrapper
            value={deletePolicy()}
            onChange={(v) => setDeletePolicy(v as DeletePolicy)}
            options={deletePolicies.map((policy) => {
              return {
                value: policy,
                label: t(`home.toolbar.delete_policy.${policy}`),
              }
            })}
          />
        </Box>
      }
      onSubmit={async (urls) => {
        const resp = await ok(
          pathname(),
          urls.split("\n"),
          tool(),
          deletePolicy(),
        )
        handleRespWithNotifySuccess(resp, () => {
          onClose()
        })
      }}
    />
  )
}
