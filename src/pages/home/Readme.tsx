import { Box, useColorModeValue } from "@hope-ui/solid"
import { createMemo, Show, createResource, on } from "solid-js"
import { Markdown, MaybeLoading } from "~/components"
import { useLink, useRouter } from "~/hooks"
import { getSettingBool, objStore, State } from "~/store"
import { fetchText } from "~/utils"

export function Readme(props: {
  files: string[]
  fromMeta: keyof typeof objStore
}) {
  const cardBg = useColorModeValue("white", "$neutral3")
  const { proxyLink } = useLink()
  const { pathname } = useRouter()
  const readme = createMemo(
    on(
      () => objStore.state,
      () => {
        if (
          ![State.FetchingMore, State.Folder, State.File].includes(
            objStore.state,
          )
        ) {
          return ""
        }
        if ([State.FetchingMore, State.Folder].includes(objStore.state)) {
          const obj = objStore.objs.find((item) =>
            props.files.find(
              (file) => file.toLowerCase() === item.name.toLowerCase(),
            ),
          )
          if (obj) {
            return proxyLink(obj, true)
          }
        }
        if (
          objStore[props.fromMeta] &&
          typeof objStore[props.fromMeta] === "string"
        ) {
          return objStore[props.fromMeta] as string
        }
        return ""
      },
    ),
  )
  const fetchContent = async (readme: string) => {
    let res = {
      content: readme as string | ArrayBuffer,
    }
    if (/^https?:\/\//g.test(readme)) {
      res = await fetchText(readme)
    }
    return res
  }
  const [content] = createResource(readme, fetchContent)
  return (
    <Show when={getSettingBool("readme_autorender") && readme()}>
      <Box w="$full" rounded="$xl" p="$4" bgColor={cardBg()} shadow="$lg">
        <MaybeLoading loading={content.loading}>
          <Markdown
            children={content()?.content}
            readme
            toc={props.fromMeta === "readme"}
          />
        </MaybeLoading>
      </Box>
    </Show>
  )
}
