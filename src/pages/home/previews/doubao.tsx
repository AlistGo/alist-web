import { Box, HStack, IconButton, Text } from "@hope-ui/solid"
import { FaSolidAngleLeft, FaSolidAngleRight } from "solid-icons/fa"
import { createEffect, createMemo, createSignal, Show } from "solid-js"
import { Error, ImageWithError, MaybeLoading, FullLoading } from "~/components"
import { useFetch, useLink, useRouter, useT } from "~/hooks"
import { objStore, password } from "~/store"
import { PResp } from "~/types"
import { handleResp, r } from "~/utils"

type DoubaoPreviewInfo = {
  page_nums: number
  img_ext: string
  version?: string
}

const DoubaoPreview = () => {
  const t = useT()
  const { pathname } = useRouter()
  const { proxyLink } = useLink()
  const [page, setPage] = createSignal(0)
  const [pageNums, setPageNums] = createSignal(1)
  const [errMsg, setErrMsg] = createSignal("")

  const [loading, post] = useFetch(
    (): PResp<DoubaoPreviewInfo> =>
      r.post("/fs/other", {
        path: pathname(),
        password: password(),
        method: "doubao_preview",
      }),
  )

  const init = async () => {
    const resp = await post()
    handleResp(
      resp,
      (data) => {
        setErrMsg("")
        const total = Math.max(1, data.page_nums || 1)
        setPageNums(total)
        if (page() >= total) setPage(0)
      },
      (msg) => {
        setErrMsg(msg)
      },
    )
  }

  createEffect(() => {
    pathname()
    objStore.obj.name
    setPage(0)
    init()
  })

  const previewURL = createMemo(() => {
    const base = proxyLink(objStore.obj, true)
    const url = new URL(base, location.origin)
    url.searchParams.set("type", "preview")
    url.searchParams.set("page", page().toString())
    return url.toString()
  })

  const prev = () => setPage((p) => Math.max(0, p - 1))
  const next = () => setPage((p) => Math.min(pageNums() - 1, p + 1))

  return (
    <MaybeLoading loading={loading()}>
      <Show when={!errMsg()} fallback={<Error msg={errMsg()} />}>
        <Box w="$full" h="70vh" display="flex" flexDirection="column" gap="$3">
          <ImageWithError
            maxH="65vh"
            rounded="$lg"
            src={previewURL()}
            fallback={<FullLoading />}
            fallbackErr={<Error msg={t("home.preview.failed_load_img")} />}
          />
          <Show when={pageNums() > 1}>
            <HStack justifyContent="center" spacing="$2">
              <IconButton
                aria-label="Previous page"
                icon={<FaSolidAngleLeft />}
                onClick={prev}
                isDisabled={page() <= 0}
              />
              <Text>
                {page() + 1} / {pageNums()}
              </Text>
              <IconButton
                aria-label="Next page"
                icon={<FaSolidAngleRight />}
                onClick={next}
                isDisabled={page() >= pageNums() - 1}
              />
            </HStack>
          </Show>
        </Box>
      </Show>
    </MaybeLoading>
  )
}

export default DoubaoPreview
