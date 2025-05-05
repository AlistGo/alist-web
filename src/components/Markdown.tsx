// @ts-ignore
import { hljs } from "./highlight.js"
import SolidMarkdown from "solid-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import "./markdown.css"
import { For, Show, createEffect, createMemo, createSignal, on } from "solid-js"
import { clsx } from "clsx"
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Anchor,
  Box,
  List,
  ListItem,
} from "@hope-ui/solid"
import { useParseText, useRouter, useT } from "~/hooks"
import { notify } from "~/utils"
import { EncodingSelect } from "."
import once from "just-once"
import { pathDir, pathJoin, api, pathResolve } from "~/utils"
import { createStorageSignal } from "@solid-primitives/storage"
import { isMobile } from "~/utils/compatibility.js"
import { useScrollListener } from "~/pages/home/toolbar/BackTop.jsx"
import { Motion } from "@motionone/solid"
import { getMainColor, me } from "~/store"

type TocItem = { indent: number; text: string; tagName: string; key: string }

const [isTocVisible, setVisible] = createSignal(false)
const [isTocDisabled, setTocDisabled] = createStorageSignal(
  "isMarkdownTocDisabled",
  true,
  {
    serializer: (v: boolean) => JSON.stringify(v),
    deserializer: (v) => JSON.parse(v),
  },
)

export { isTocVisible, setTocDisabled }

function MarkdownToc(props: {
  disabled?: boolean
  markdownRef: HTMLDivElement
}) {
  if (props.disabled) return null
  if (isMobile) return null

  const [tocList, setTocList] = createSignal<TocItem[]>([])

  useScrollListener(
    () => setVisible(window.scrollY > 100 && tocList().length > 1),
    { immediate: true },
  )

  createEffect(() => {
    const $markdown = props.markdownRef.querySelector(".markdown-body")
    if (!$markdown) return

    /**
     * iterate elements of markdown body to find h1~h6
     * and put them into a list by order
     */
    const iterator = document.createNodeIterator(
      $markdown,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (/h1|h2|h3/i.test(node.nodeName)) {
            return NodeFilter.FILTER_ACCEPT
          }
          return NodeFilter.FILTER_REJECT
        },
      },
    )

    const items: TocItem[] = []
    let $next = iterator.nextNode()
    let minLevel = 6

    while ($next) {
      const level = Number($next.nodeName.match(/h(\d)/i)![1])
      if (level < minLevel) minLevel = level

      items.push({
        indent: level, // initial indent for following compute
        text: $next.textContent!,
        tagName: $next.nodeName.toLowerCase(),
        key: ($next as Element).getAttribute("key")!,
      })

      $next = iterator.nextNode()
    }

    setTocList(
      items.map((item) => ({
        ...item,
        // reset the indent of item to remove whitespace
        indent: item.indent - minLevel,
      })),
    )
  })

  const handleAnchor = (item: TocItem) => {
    const $target = props.markdownRef.querySelector(
      `${item.tagName}[key=${item.key}]`,
    )
    if (!$target) return

    // the top of target should scroll to the bottom of nav
    const $nav = document.querySelector(".nav")
    let navBottom = $nav?.getBoundingClientRect().bottom ?? 0
    if (navBottom < 0) navBottom = 0

    const offsetY = $target.getBoundingClientRect().y
    window.scrollBy({ behavior: "smooth", top: offsetY - navBottom })
  }

  const initialOffsetX = "calc(100% - 20px)"
  const [offsetX, setOffsetX] = createSignal<number | string>(initialOffsetX)

  return (
    <Show when={!isTocDisabled() && isTocVisible()}>
      <Box
        as={Motion.div}
        initial={{ x: 999 }}
        animate={{ x: offsetX() }}
        onMouseEnter={() => setOffsetX(0)}
        onMouseLeave={() => setOffsetX(initialOffsetX)}
        zIndex="$overlay"
        pos="fixed"
        right="$6"
        top="$6"
      >
        <Box
          mt="$5"
          p="$2"
          shadow="$outline"
          rounded="$lg"
          bgColor="white"
          _dark={{ bgColor: "$neutral3" }}
        >
          <List maxH="60vh" overflowY="auto">
            <For each={tocList()}>
              {(item) => (
                <ListItem pl={15 * item.indent} m={4}>
                  <Anchor
                    color={getMainColor()}
                    onClick={() => handleAnchor(item)}
                  >
                    {item.text}
                  </Anchor>
                </ListItem>
              )}
            </For>
          </List>
        </Box>
      </Box>
    </Show>
  )
}

const insertKatexCSS = once(() => {
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href =
    "https://registry.npmmirror.com/katex/0.16.11/files/dist/katex.min.css"
  document.head.appendChild(link)
})

export function Markdown(props: {
  children?: string | ArrayBuffer
  class?: string
  ext?: string
  readme?: boolean
  toc?: boolean
}) {
  const [encoding, setEncoding] = createSignal<string>("utf-8")
  const [show, setShow] = createSignal(true)
  const { isString, text } = useParseText(props.children)
  const t = useT()
  const convertToMd = (content: string) => {
    if (!props.ext || props.ext.toLocaleLowerCase() === "md") {
      return content
    }
    return "```" + props.ext + "\n" + content + "\n```"
  }
  const { pathname } = useRouter()
  const md = createMemo(() => {
    let content = convertToMd(text(encoding()))
    content = content.replace(/!\[.*?\]\((.*?)\)/g, (match) => {
      const name = match.match(/!\[(.*?)\]\(.*?\)/)![1]
      let url = match.match(/!\[.*?\]\((.*?)\)/)![1]
      // 检查是否为 base64 编码的图片
      if (url.startsWith("data:image/")) {
        return match // 如果是 base64 编码的图片，直接返回原标签
      }
      if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("//")
      ) {
        return match
      }
      if (url.startsWith("/")) {
        url = `${api}/d${url}`
      } else {
        url = `${api}/d${pathJoin(
          me().base_path,
          pathResolve(props.readme ? pathname() : pathDir(pathname()), url),
        )}`
      }
      const ans = `![${name}](${url})`
      console.log(ans)
      return ans
    })
    return content
  })
  const [remarkPlugins, setRemarkPlugins] = createSignal<Function[]>([
    remarkGfm,
  ])
  const [rehypePlugins, setRehypePlugins] = createSignal<Function[]>([
    rehypeRaw,
  ])
  let runHighlight = true
  let fileLength = text().length
  // disable markdown rendering if file is too large
  if (fileLength > 2 * 1024 * 1024) {
    return (
      <Alert
        status="danger"
        variant="subtle"
        flexDirection="column"
        justifyContent="center"
        textAlign="center"
        w="$full"
        p="$8"
      >
        <AlertIcon boxSize="40px" mr="0" />
        <AlertTitle mt="$4" mb="$1" fontSize="$lg">
          {t("home.preview.large_file")}
        </AlertTitle>
        <AlertDescription>{t("home.preview.large_file_desc")}</AlertDescription>
      </Alert>
    )
  }
  // disable hljs if file is too large
  if (fileLength > 256 * 1024) {
    notify.warning(t("home.preview.large_file_hljs_disabled"))
    runHighlight = false
  }
  createEffect(
    on(md, async (content) => {
      setShow(false)
      // lazy for math rendering
      if (/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/.test(content)) {
        const { default: reMarkMath } = await import("remark-math")
        const { default: rehypeKatex } = await import("rehype-katex")
        insertKatexCSS()
        setRemarkPlugins([...remarkPlugins(), reMarkMath])
        setRehypePlugins([...rehypePlugins(), rehypeKatex])
      }
      setTimeout(() => {
        setShow(true)
        runHighlight && hljs.highlightAll()
        window.onMDRender && window.onMDRender(content)
      })
    }),
  )
  const [markdownRef, setMarkdownRef] = createSignal<HTMLDivElement>()
  return (
    <Box
      ref={(r: HTMLDivElement) => setMarkdownRef(r)}
      class="markdown"
      pos="relative"
      w="$full"
    >
      <Show when={show()}>
        <SolidMarkdown
          class={clsx("markdown-body", props.class)}
          remarkPlugins={remarkPlugins()}
          rehypePlugins={rehypePlugins()}
          children={md()}
        />
      </Show>
      <Show when={!isString}>
        <EncodingSelect
          encoding={encoding()}
          setEncoding={setEncoding}
          referenceText={props.children}
        />
      </Show>
      <MarkdownToc disabled={!props.toc} markdownRef={markdownRef()!} />
    </Box>
  )
}
