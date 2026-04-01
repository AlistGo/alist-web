import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Button,
  Center,
  HStack,
  Image,
  Select,
  SelectContent,
  SelectListbox,
  SelectOption,
  SelectOptionText,
  SelectTrigger,
  Text,
  VStack,
  useColorModeValue,
} from "@hope-ui/solid"
import { useNavigate, useParams } from "@solidjs/router"
import { changeColor } from "seemly"
import { TbSelector } from "solid-icons/tb"
import lightGallery from "lightgallery"
import lgAutoplay from "lightgallery/plugins/autoplay"
import lgFullscreen from "lightgallery/plugins/fullscreen"
import lgRotate from "lightgallery/plugins/rotate"
import lgThumbnail from "lightgallery/plugins/thumbnail"
import lgZoom from "lightgallery/plugins/zoom"
import { LightGallery } from "lightgallery/lightgallery"
import {
  For,
  Match,
  Show,
  Suspense,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  untrack,
} from "solid-js"
import { Dynamic } from "solid-js/web"
import {
  Error,
  FullLoading,
  LinkWithBase,
  Paginator,
  SelectWrapper,
} from "~/components"
import { Container } from "~/pages/home/Container"
import GridLayout from "~/pages/home/folder/Grid"
import ImageLayout from "~/pages/home/folder/Images"
import ListLayout from "~/pages/home/folder/List"
import { OpenWith } from "~/pages/home/file/open-with"
import { Layout } from "~/pages/home/header/layout"
import { getPreviews, PreviewComponent } from "~/pages/home/previews"
import HomePassword from "~/pages/home/Password"
import { Readme } from "~/pages/home/Readme"
import { setLinkOverride, useLink, useRouter, useT, useTitle } from "~/hooks"
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ObjStore,
  State,
  getPagination,
  getMainColor,
  getSetting,
  layout,
  objStore,
} from "~/store"
import {
  Obj,
  ObjType,
  PublicShareGet,
  PublicShareInfo,
  PublicShareList,
  PublicShareObj,
  StoreObj,
} from "~/types"
import {
  authPublicShare,
  getPublicShare,
  getPublicShareInfo,
  listPublicShare,
} from "~/utils/api"
import { bus, encodePath, ext, handleResp, hoverColor, joinBase } from "~/utils"
import "lightgallery/css/lightgallery-bundle.css"

const shareVideoExts = new Set([
  "mp4",
  "m4v",
  "mov",
  "webm",
  "mkv",
  "avi",
  "flv",
  "m3u8",
])
const shareAudioExts = new Set([
  "mp3",
  "flac",
  "wav",
  "ogg",
  "m4a",
  "aac",
  "opus",
])
const shareImageExts = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "webp",
  "svg",
  "avif",
  "heic",
  "heif",
])
const shareTextExts = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "scss",
  "less",
  "html",
  "htm",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "conf",
  "log",
  "csv",
  "srt",
  "ass",
  "vtt",
  "lrc",
  "url",
])

type ShareLinkObj = Partial<Obj> & {
  path?: string
  preview_url?: string
  download_url?: string
}

type ShareStoreObj = StoreObj &
  PublicShareObj & {
    selected?: boolean
  }

const tokenStorageKey = (shareId: string) => `share-token-cache:${shareId}`
const legacySessionTokenKey = (shareId: string) => `share-token:${shareId}`
const shareTokenCacheTTL = 24 * 60 * 60 * 1000

const readCachedShareToken = (shareId: string) => {
  const storageKey = tokenStorageKey(shareId)
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw) as {
        token?: string
        expires_at?: number
      }
      if (
        parsed.token &&
        (!parsed.expires_at || parsed.expires_at > Date.now())
      ) {
        return parsed.token
      }
      localStorage.removeItem(storageKey)
    }
  } catch {
    localStorage.removeItem(storageKey)
  }

  const legacyToken =
    sessionStorage.getItem(legacySessionTokenKey(shareId)) || ""
  if (legacyToken) {
    writeCachedShareToken(shareId, legacyToken)
    sessionStorage.removeItem(legacySessionTokenKey(shareId))
    return legacyToken
  }
  return ""
}

const writeCachedShareToken = (shareId: string, token: string) => {
  if (!token) return
  localStorage.setItem(
    tokenStorageKey(shareId),
    JSON.stringify({
      token,
      expires_at: Date.now() + shareTokenCacheTTL,
    }),
  )
  sessionStorage.removeItem(legacySessionTokenKey(shareId))
}

const clearCachedShareToken = (shareId: string) => {
  localStorage.removeItem(tokenStorageKey(shareId))
  sessionStorage.removeItem(legacySessionTokenKey(shareId))
}

const parseShareRoute = (raw?: string) => {
  const decoded = raw ? decodeURIComponent(raw) : ""
  const segments = decoded.split("/").filter(Boolean)
  const shareId = segments[0] || ""
  const path = segments.length > 1 ? `/${segments.slice(1).join("/")}` : "/"
  return {
    shareId,
    path: path.replace(/\/{2,}/g, "/"),
  }
}

const normalizeSharePreviewType = (item: PublicShareObj): ObjType => {
  if (item.type !== ObjType.UNKNOWN) {
    return item.type
  }
  const extension = ext(item.name).toLowerCase()
  if (shareVideoExts.has(extension)) return ObjType.VIDEO
  if (shareAudioExts.has(extension)) return ObjType.AUDIO
  if (shareImageExts.has(extension)) return ObjType.IMAGE
  if (shareTextExts.has(extension)) return ObjType.TEXT
  return ObjType.UNKNOWN
}

const toShareStoreObj = (item: PublicShareObj): ShareStoreObj =>
  ({
    ...item,
    type: normalizeSharePreviewType(item),
    selected: false,
  }) as ShareStoreObj

const getParentSharePath = (path: string) => {
  const segments = path.split("/").filter(Boolean)
  if (segments.length <= 1) {
    return "/"
  }
  return `/${segments.slice(0, -1).join("/")}`
}

const buildSharePageUrl = (shareId: string, path: string, encodeAll = true) => {
  const encoded = path === "/" ? "" : encodePath(path, encodeAll)
  return joinBase(`/s/${shareId}${encoded}`)
}

const buildShareAssetUrl = (
  shareId: string,
  token: string,
  path: string,
  type: "direct" | "preview",
  encodeAll = true,
) => {
  const encoded = path === "/" ? "" : encodePath(path, encodeAll)
  const query = new URLSearchParams()
  if (token) {
    query.set("auth", token)
  }
  if (type === "preview") {
    query.set("type", "preview")
  }
  const base = joinBase(`/sd/${shareId}${encoded}`)
  const queryString = query.toString()
  return queryString ? `${base}?${queryString}` : base
}

const previewAssetUrl = (
  shareId: string,
  token: string,
  obj: ShareLinkObj,
  encodeAll = true,
) => {
  if (obj.preview_url) {
    return obj.preview_url
  }
  return buildShareAssetUrl(
    shareId,
    token,
    obj.path || "/",
    "preview",
    encodeAll,
  )
}

const directAssetUrl = (
  shareId: string,
  token: string,
  obj: ShareLinkObj,
  encodeAll = true,
) => {
  if (obj.download_url) {
    return obj.download_url
  }
  if (obj.preview_url) {
    return obj.preview_url
  }
  return buildShareAssetUrl(
    shareId,
    token,
    obj.path || "/",
    "direct",
    encodeAll,
  )
}

const resetObjStore = () => {
  ObjStore.set({
    obj: {} as Obj,
    raw_url: "",
    related: [],
    objs: [],
    total: 0,
    readme: "",
    header: "",
    provider: "",
    write: false,
    state: State.Initial,
    err: "",
  })
}

const ShareHeader = (props: { showLayout: boolean }) => {
  const logos = getSetting("logo").split("\n")
  const defaultLogo =
    logos[0] === "https://cdn.jsdelivr.net/gh/alist-org/logo@main/logo.svg"
      ? joinBase("/images/new_icon.png")
      : logos[0]
  const logo = useColorModeValue(
    defaultLogo,
    logos[logos.length - 1] ===
      "https://cdn.jsdelivr.net/gh/alist-org/logo@main/logo.svg"
      ? joinBase("/images/new_icon.png")
      : logos[logos.length - 1] || defaultLogo,
  )

  return (
    <Center bgColor="$background" class="header" w="$full">
      <Container>
        <HStack
          px="calc(2% + 0.5rem)"
          py="$2"
          w="$full"
          justifyContent="space-between"
        >
          <LinkWithBase href="/">
            <HStack h="44px">
              <Image src={logo()!} h="$full" w="auto" />
            </HStack>
          </LinkWithBase>
          <Show when={props.showLayout}>
            <Layout />
          </Show>
        </HStack>
      </Container>
    </Center>
  )
}

const ShareNav = (props: {
  rootLabel: string
  path: string
  onNavigate: (path: string) => void
}) => {
  const items = createMemo(() => {
    const segments = props.path.split("/").filter(Boolean)
    const paths = [{ label: props.rootLabel, path: "/" }]
    let current = ""
    for (const segment of segments) {
      current += `/${segment}`
      paths.push({ label: segment, path: current })
    }
    return paths
  })

  return (
    <Breadcrumb background="$background" class="nav" w="$full">
      <For each={items()}>
        {(item, index) => {
          const isLast = () => index() === items().length - 1
          return (
            <BreadcrumbItem class="nav-item">
              <BreadcrumbLink
                class="nav-link"
                css={{ wordBreak: "break-all" }}
                color="unset"
                _hover={{ bgColor: hoverColor(), color: "unset" }}
                _active={{ transform: "scale(.95)", transition: "0.1s" }}
                cursor={isLast() ? "default" : "pointer"}
                p="$1"
                rounded="$lg"
                currentPage={isLast()}
                onClick={() => {
                  if (!isLast()) {
                    props.onNavigate(item.path)
                  }
                }}
              >
                {item.label}
              </BreadcrumbLink>
              <Show when={!isLast()}>
                <BreadcrumbSeparator class="nav-separator" />
              </Show>
            </BreadcrumbItem>
          )
        }}
      </For>
    </Breadcrumb>
  )
}

const ShareFolder = (props: { allowPreview: boolean }) => {
  const { rawLink } = useLink()
  const images = createMemo(() =>
    objStore.objs.filter((obj) => obj.type === ObjType.IMAGE),
  )

  let dynamicGallery: LightGallery | undefined

  const initGallery = () => {
    dynamicGallery = lightGallery(document.createElement("div"), {
      addClass: "lightgallery-container",
      dynamic: true,
      thumbnail: true,
      plugins: [lgZoom, lgThumbnail, lgRotate, lgAutoplay, lgFullscreen],
      dynamicEl: images().map((obj) => {
        const raw = rawLink(obj, true)
        return {
          src: raw,
          thumb: obj.thumb === "" ? raw : obj.thumb,
          subHtml: `<h4>${obj.name}</h4>`,
        }
      }),
    })
  }

  const openGallery = (name: string) => {
    if (!props.allowPreview) return
    if (!dynamicGallery) {
      initGallery()
    }
    dynamicGallery?.openGallery(images().findIndex((obj) => obj.name === name))
  }

  createEffect(
    on(images, () => {
      dynamicGallery?.destroy()
      dynamicGallery = undefined
    }),
  )

  createEffect(() => {
    if (!props.allowPreview) return
    bus.on("gallery", openGallery)
    onCleanup(() => {
      bus.off("gallery", openGallery)
    })
  })

  onCleanup(() => {
    dynamicGallery?.destroy()
  })

  return (
    <Switch>
      <Match when={!props.allowPreview || layout() === "list"}>
        <ListLayout />
      </Match>
      <Match when={layout() === "grid"}>
        <GridLayout />
      </Match>
      <Match when={layout() === "image"}>
        <ImageLayout images={images() as StoreObj[]} />
      </Match>
    </Switch>
  )
}

const ShareFile = () => {
  const t = useT()
  const previews = createMemo(() => {
    return getPreviews({
      ...(objStore.obj as Obj),
      provider: objStore.provider,
    } as Obj & { provider: string; download_url?: string })
  })
  const [currentPreview, setCurrentPreview] = createSignal<
    PreviewComponent | undefined
  >(undefined)

  createEffect(() => {
    const options = previews()
    const current = currentPreview()
    if (!options.length) {
      setCurrentPreview(undefined)
      return
    }
    if (!current || !options.find((preview) => preview.name === current.name)) {
      setCurrentPreview(options[0])
    }
  })

  return (
    <Show
      when={previews().length}
      fallback={
        <Text color="$neutral11">
          {t(
            "share.no_inline_preview",
            undefined,
            "Inline preview is not available for this file type.",
          )}
        </Text>
      }
    >
      <VStack w="$full" spacing="$2">
        <Show when={previews().length > 1}>
          <HStack w="$full" spacing="$2">
            <SelectWrapper
              alwaysShowBorder
              value={currentPreview()?.name || previews()?.[0]?.name || ""}
              onChange={(name) => {
                setCurrentPreview(
                  previews().find((preview) => preview.name === name),
                )
              }}
              options={previews().map((preview) => ({
                value: preview.name,
              }))}
            />
            <OpenWith />
          </HStack>
        </Show>
        <Show when={currentPreview()} fallback={<FullLoading />}>
          <Suspense fallback={<FullLoading />}>
            <Dynamic component={currentPreview()!.component} />
          </Suspense>
        </Show>
      </VStack>
    </Show>
  )
}

const ShareDownloadOnly = (props: { item: ShareLinkObj }) => {
  const t = useT()
  const previewUrl = props.item.preview_url
  const downloadUrl = props.item.download_url

  return (
    <VStack alignItems="start" spacing="$3">
      <HStack spacing="$2" wrap="wrap">
        <Show when={previewUrl}>
          <Button as="a" href={previewUrl} target="_blank">
            {t("share.open", undefined, "Open")}
          </Button>
        </Show>
        <Show when={downloadUrl}>
          <Button
            colorScheme="accent"
            as="a"
            href={downloadUrl}
            target="_blank"
          >
            {t("share.download", undefined, "Download")}
          </Button>
        </Show>
      </HStack>
      <Text color="$neutral11">
        {t(
          "share.preview_disabled",
          undefined,
          "Preview is disabled for this share.",
        )}
      </Text>
    </VStack>
  )
}

const SharePager = (props: {
  currentPage: number
  currentPerPage: number
  total: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}) => {
  const pageSizeOptions = [50, 100, 200, 300, 500].filter(
    (size) => size <= MAX_PAGE_SIZE,
  )

  return (
    <HStack spacing="$2" flexWrap="wrap" justifyContent="center">
      <HStack spacing="$1">
        {/*<Text size="sm">Per page</Text>*/}
        <Select
          size="sm"
          value={props.currentPerPage}
          onChange={(value) => {
            props.onPerPageChange(Number(value))
          }}
        >
          <SelectTrigger as={Button} size="sm" variant="subtle" minW="$20">
            <Box>{props.currentPerPage}</Box>
            <TbSelector />
          </SelectTrigger>
          <SelectContent minW="$20">
            <SelectListbox>
              {pageSizeOptions.map((size) => (
                <SelectOption value={size}>
                  <SelectOptionText>{size}</SelectOptionText>
                </SelectOption>
              ))}
            </SelectListbox>
          </SelectContent>
        </Select>
      </HStack>
      <Show
        when={`${props.currentPage}-${props.currentPerPage}-${props.total}`}
        keyed
      >
        {() => (
          <Paginator
            total={props.total}
            defaultCurrent={props.currentPage}
            defaultPageSize={props.currentPerPage}
            onChange={props.onPageChange}
          />
        )}
      </Show>
    </HStack>
  )
}

const ShareObj = (props: {
  nodeLoading: boolean
  nodeError: string
  allowPreview: boolean
}) => {
  const cardBg = useColorModeValue("white", "$neutral3")

  return (
    <VStack
      class="obj-box"
      w="$full"
      rounded="$xl"
      bgColor={cardBg()}
      p="$2"
      shadow="$lg"
      spacing="$2"
    >
      <Switch>
        <Match when={props.nodeError}>
          <Error msg={props.nodeError} disableColor />
        </Match>
        <Match when={props.nodeLoading}>
          <FullLoading />
        </Match>
        <Match
          when={[State.FetchingObj, State.FetchingObjs].includes(
            objStore.state,
          )}
        >
          <FullLoading />
        </Match>
        <Match when={objStore.state === State.Folder}>
          <ShareFolder allowPreview={props.allowPreview} />
        </Match>
        <Match when={objStore.state === State.File && props.allowPreview}>
          <ShareFile />
        </Match>
        <Match when={objStore.state === State.File}>
          <ShareDownloadOnly item={objStore.obj as ShareLinkObj} />
        </Match>
      </Switch>
    </VStack>
  )
}

const SharePage = () => {
  const t = useT()
  const params = useParams()
  const navigate = useNavigate()
  const { searchParams, setSearchParams } = useRouter()
  const [password, setPassword] = createSignal("")
  const [authLoading, setAuthLoading] = createSignal(false)
  const [infoLoading, setInfoLoading] = createSignal(false)
  const [nodeLoading, setNodeLoading] = createSignal(false)
  const [nodeError, setNodeError] = createSignal("")
  const [nodeErrorCode, setNodeErrorCode] = createSignal<number | null>(null)
  const [info, setInfo] = createSignal<PublicShareInfo | null>(null)
  const [shareToken, setShareToken] = createSignal("")

  const route = createMemo(() => parseShareRoute(params.share_path))
  const shareId = createMemo(() => route().shareId)
  const currentPath = createMemo(() => route().path)
  const currentToken = createMemo(() => shareToken())
  const pagination = getPagination()
  const currentPage = createMemo(() => {
    const value = parseInt(searchParams["page"], 10)
    return Number.isFinite(value) && value > 0 ? value : 1
  })
  const currentPerPage = createMemo(() => {
    const value = parseInt(searchParams["per_page"], 10)
    if (Number.isFinite(value) && value > 0) {
      return Math.min(MAX_PAGE_SIZE, value)
    }
    const fallback = pagination.size || DEFAULT_PAGE_SIZE
    return Math.min(MAX_PAGE_SIZE, Math.max(1, fallback))
  })
  const currentItem = createMemo(() => objStore.obj as ShareLinkObj)
  const shareConsumed = createMemo(() => Boolean(info()?.consumed_at))
  let lastShareId = ""
  let shareLoadID = 0

  useTitle(() => info()?.name || "Share")

  createEffect(() => {
    const id = shareId()
    if (!id) {
      setLinkOverride(null)
      return
    }
    const token = currentToken()
    setLinkOverride({
      getLinkByObj: (obj, type, encodeAll) =>
        type === "preview"
          ? buildSharePageUrl(id, (obj as ShareLinkObj).path || "/", encodeAll)
          : type === "proxy"
            ? previewAssetUrl(id, token, obj as ShareLinkObj, encodeAll)
            : directAssetUrl(id, token, obj as ShareLinkObj, encodeAll),
      rawLink: (obj, encodeAll) =>
        directAssetUrl(id, token, obj as ShareLinkObj, encodeAll),
      proxyLink: (obj, encodeAll) =>
        previewAssetUrl(id, token, obj as ShareLinkObj, encodeAll),
      previewPage: (obj, encodeAll) =>
        buildSharePageUrl(id, (obj as ShareLinkObj).path || "/", encodeAll),
      currentObjLink: (encodeAll) =>
        directAssetUrl(id, token, objStore.obj as ShareLinkObj, encodeAll),
    })
  })

  onCleanup(() => {
    setLinkOverride(null)
  })

  const clearNodeError = () => {
    setNodeError("")
    setNodeErrorCode(null)
  }

  const setShareError = (message: string, code?: number) => {
    setNodeError(message)
    setNodeErrorCode(code ?? null)
  }

  const markShareConsumed = () => {
    setInfo((prev) =>
      prev && prev.access_limit > 0
        ? {
            ...prev,
            access_count: Math.min(prev.access_count + 1, prev.access_limit),
            remaining_accesses: Math.max(
              0,
              prev.access_limit -
                Math.min(prev.access_count + 1, prev.access_limit),
            ),
            consumed_at:
              prev.access_count + 1 >= prev.access_limit
                ? prev.consumed_at || new Date().toISOString()
                : prev.consumed_at,
          }
        : prev,
    )
  }

  const resetShareState = () => {
    setInfo(null)
    setPassword("")
    clearNodeError()
    resetObjStore()
  }

  const unauthShare = (id: string) => {
    clearCachedShareToken(id)
    setShareToken("")
    setInfo((prev) => (prev ? { ...prev, authed: false } : prev))
    resetObjStore()
  }

  const applyFolderState = (
    nodeData: PublicShareGet,
    listData: PublicShareList,
  ) => {
    const currentDir = toShareStoreObj(nodeData.item)
    const items = listData.content.map(toShareStoreObj)
    ObjStore.set({
      obj: currentDir as Obj,
      raw_url: "",
      related: [],
      objs: items,
      total: listData.total,
      readme: "",
      header: "",
      provider: nodeData.provider,
      write: false,
      state: State.Folder,
      err: "",
    })
  }

  const applyFileState = (
    id: string,
    token: string,
    nodeData: PublicShareGet,
    siblings: ShareStoreObj[],
    allowPreview: boolean,
  ) => {
    const fileItem = toShareStoreObj(nodeData.item)
    const items = siblings.length ? siblings : [fileItem]
    ObjStore.set({
      obj: fileItem as Obj,
      raw_url: allowPreview
        ? previewAssetUrl(id, token, fileItem)
        : directAssetUrl(id, token, fileItem),
      related: [],
      objs: items,
      total: items.length,
      readme: "",
      header: "",
      provider: nodeData.provider,
      write: false,
      state: State.File,
      err: "",
    })
  }

  const loadSiblingsForFile = async (
    currentLoadID: number,
    id: string,
    path: string,
    token: string,
    shareInfo: PublicShareInfo,
    fileItem: ShareStoreObj,
  ) => {
    if (!shareInfo.is_dir) {
      return [fileItem]
    }

    const parentPath = getParentSharePath(path)
    let siblings: ShareStoreObj[] = [fileItem]
    let shouldResetAuth = false

    const resp = await listPublicShare({
      share_id: id,
      path: parentPath,
      token: token || undefined,
      page: 1,
      per_page: 200,
    })
    if (currentLoadID !== shareLoadID) return null

    handleResp(
      resp,
      (data) => {
        siblings = data.content.map(toShareStoreObj)
      },
      (_, code) => {
        if (code === 401) {
          shouldResetAuth = true
        }
      },
      false,
      false,
    )

    if (shouldResetAuth) {
      unauthShare(id)
      return null
    }

    if (!siblings.find((item) => item.path === fileItem.path)) {
      siblings = [fileItem, ...siblings]
    }
    return siblings
  }

  const loadShare = async (
    id = shareId(),
    path = currentPath(),
    token = currentToken(),
  ) => {
    if (!id) return null
    const currentLoadID = ++shareLoadID
    setInfoLoading(true)
    setNodeLoading(true)
    clearNodeError()
    ObjStore.setState(State.FetchingObj)

    const infoResp = await getPublicShareInfo(id, token || undefined)
    if (currentLoadID !== shareLoadID) return null

    let infoData: PublicShareInfo | null = null
    handleResp(
      infoResp,
      (data) => {
        infoData = data
        setInfo(data)
      },
      (message, code) => {
        setInfo(null)
        resetObjStore()
        setShareError(message, code)
      },
      false,
      false,
    )

    if (!infoData) {
      setInfoLoading(false)
      setNodeLoading(false)
      return null
    }

    if (!infoData.authed) {
      if (token) {
        clearCachedShareToken(id)
        setShareToken("")
      }
      resetObjStore()
      setInfoLoading(false)
      setNodeLoading(false)
      return infoData
    }

    const nodeResp = await getPublicShare({
      share_id: id,
      path,
      token: token || undefined,
    })
    if (currentLoadID !== shareLoadID) return infoData

    let nodeData: PublicShareGet | null = null
    let shouldResetAuth = false
    handleResp(
      nodeResp,
      (data) => {
        nodeData = data
      },
      (message, code) => {
        if (code === 401) {
          shouldResetAuth = true
          return
        }
        resetObjStore()
        setShareError(message, code)
      },
      false,
      false,
    )

    if (shouldResetAuth) {
      unauthShare(id)
      setInfoLoading(false)
      setNodeLoading(false)
      return null
    }

    if (!nodeData) {
      setInfoLoading(false)
      setNodeLoading(false)
      return infoData
    }

    if (nodeData.item.is_dir) {
      ObjStore.setState(State.FetchingObjs)
      let listData: PublicShareList | null = null
      let listResetAuth = false
      const listResp = await listPublicShare({
        share_id: id,
        path,
        token: token || undefined,
        page: currentPage(),
        per_page: currentPerPage(),
      })
      if (currentLoadID !== shareLoadID) return infoData

      handleResp(
        listResp,
        (data) => {
          listData = data
        },
        (message, code) => {
          if (code === 401) {
            listResetAuth = true
            return
          }
          setShareError(message, code)
        },
        false,
        false,
      )

      if (listResetAuth) {
        unauthShare(id)
        setInfoLoading(false)
        setNodeLoading(false)
        return null
      }

      if (!listData) {
        setInfoLoading(false)
        setNodeLoading(false)
        return infoData
      }

      applyFolderState(nodeData, listData)
      if (infoData.access_limit > 0) {
        markShareConsumed()
      }
    } else {
      const fileItem = toShareStoreObj(nodeData.item)
      const siblings = await loadSiblingsForFile(
        currentLoadID,
        id,
        path,
        token,
        infoData,
        fileItem,
      )
      if (siblings === null) {
        setInfoLoading(false)
        setNodeLoading(false)
        return null
      }

      applyFileState(id, token, nodeData, siblings, infoData.allow_preview)
      if (infoData.access_limit > 0 && infoData.allow_preview) {
        markShareConsumed()
      }
    }

    setInfoLoading(false)
    setNodeLoading(false)
    return infoData
  }

  createEffect(() => {
    const id = shareId()
    const path = currentPath()
    currentPage()
    currentPerPage()
    if (!id) return
    if (lastShareId !== id) {
      lastShareId = id
      resetShareState()
      const cachedToken = readCachedShareToken(id)
      setShareToken(cachedToken)
      void loadShare(id, path, cachedToken)
      return
    }
    void loadShare(
      id,
      path,
      untrack(() => currentToken()),
    )
  })

  const submitPassword = async () => {
    if (!shareId() || authLoading() || !password().trim()) return
    setAuthLoading(true)
    clearNodeError()
    const resp = await authPublicShare(shareId(), password())
    let nextToken = ""
    let authed = false
    handleResp(
      resp,
      (data) => {
        authed = true
        nextToken = data.token || ""
      },
      (message, code) => setShareError(message, code),
      false,
      false,
    )
    if (authed) {
      writeCachedShareToken(shareId(), nextToken)
      setShareToken(nextToken)
      setPassword("")
      await loadShare(shareId(), currentPath(), nextToken)
    }
    setAuthLoading(false)
  }

  const navigateToPath = (path: string) => {
    navigate(buildSharePageUrl(shareId(), path))
  }

  const topBarBg = createMemo(() =>
    changeColor(getMainColor(), {
      alpha: 0.15,
    }),
  )

  return (
    <>
      <ShareHeader
        showLayout={Boolean(
          info()?.authed &&
            info()?.allow_preview &&
            objStore.state === State.Folder,
        )}
      />
      <Container>
        <VStack
          class="body"
          mt="$1"
          py="$2"
          px="2%"
          minH="80vh"
          w="$full"
          gap="$4"
        >
          <VStack
            w="$full"
            p="$4"
            rounded="$xl"
            bgColor={topBarBg()}
            alignItems="start"
            spacing="$3"
          >
            <VStack alignItems="start" spacing="$1">
              <Text fontSize="$3xl" fontWeight="$bold">
                {info()?.name || t("share.title", undefined, "Share")}
              </Text>
              <Text color="$neutral11">{shareId()}</Text>
            </VStack>

            <Show when={info()}>
              <HStack spacing="$2" wrap="wrap">
                <Show when={info()?.has_password}>
                  <Badge colorScheme="info">
                    {t("share.password_required", undefined, "Password")}
                  </Badge>
                </Show>
                <Show when={info()?.burn_after_read}>
                  <Badge colorScheme={shareConsumed() ? "danger" : "warning"}>
                    {t("share.burn_after_read", undefined, "Burn after read")}
                  </Badge>
                </Show>
                <Show
                  when={Boolean(
                    info()?.access_limit && info()!.access_limit > 1,
                  )}
                >
                  <Badge colorScheme={shareConsumed() ? "danger" : "warning"}>
                    {t(
                      "share.access_limit_badge",
                      {
                        count: info()?.access_limit,
                      },
                      `${info()?.access_limit} accesses`,
                    )}
                  </Badge>
                </Show>
                <Show when={!info()?.allow_preview}>
                  <Badge colorScheme="danger">
                    {t("share.preview_disabled", undefined, "Preview off")}
                  </Badge>
                </Show>
                <Show when={!info()?.allow_download}>
                  <Badge colorScheme="danger">
                    {t("share.download_disabled", undefined, "Download off")}
                  </Badge>
                </Show>
              </HStack>
            </Show>

            <Show when={info()?.access_limit === 1 && !shareConsumed()}>
              <Alert status="warning" w="$full">
                <AlertIcon />
                <AlertDescription>
                  {t(
                    "share.burn_after_read_warning",
                    undefined,
                    "This share will be disabled after the first successful read. Loading a directory or previewing a file may consume it.",
                  )}
                </AlertDescription>
              </Alert>
            </Show>

            <Show
              when={Boolean(
                info()?.access_limit &&
                  info()!.access_limit > 1 &&
                  !shareConsumed(),
              )}
            >
              <Alert status="warning" w="$full">
                <AlertIcon />
                <AlertDescription>
                  {t(
                    "share.access_limit_warning",
                    {
                      count: info()?.access_limit,
                    },
                    `This share will be disabled after ${info()
                      ?.access_limit} successful accesses. Loading a directory or previewing a file may consume it.`,
                  )}
                </AlertDescription>
              </Alert>
            </Show>

            <Show when={shareConsumed()}>
              <Alert status="warning" w="$full">
                <AlertIcon />
                <AlertDescription>
                  <Show
                    when={info()?.access_limit === 1}
                    fallback={t(
                      "share.access_limit_consumed_notice",
                      undefined,
                      "This share has reached its access limit. Refreshing or opening more items may no longer work.",
                    )}
                  >
                    {t(
                      "share.consumed_notice",
                      undefined,
                      "This burn-after-read share has already been consumed. Refreshing or opening more items may no longer work.",
                    )}
                  </Show>
                </AlertDescription>
              </Alert>
            </Show>

            <Show when={nodeError()}>
              <Alert
                status={nodeErrorCode() === 410 ? "warning" : "danger"}
                w="$full"
              >
                <AlertIcon />
                <AlertDescription>{nodeError()}</AlertDescription>
              </Alert>
            </Show>
          </VStack>

          <Show when={infoLoading() && !info()}>
            <FullLoading />
          </Show>

          <Show when={info()?.has_password && !info()?.authed}>
            <VStack
              w="$full"
              rounded="$xl"
              bgColor={useColorModeValue("white", "$neutral3")()}
              shadow="$lg"
            >
              <HomePassword
                title={t(
                  "share.password_prompt",
                  undefined,
                  "This share is protected by a password.",
                )}
                password={password}
                setPassword={setPassword}
                enterCallback={() => {
                  void submitPassword()
                }}
              />
            </VStack>
          </Show>

          <Show when={info() && (!info()?.has_password || info()?.authed)}>
            <>
              <ShareNav
                rootLabel={info()?.name || shareId()}
                path={currentPath()}
                onNavigate={navigateToPath}
              />

              <Show when={info()?.allow_preview}>
                <Readme
                  files={["header.md", "top.md", "index.md"]}
                  fromMeta="header"
                />
              </Show>

              <ShareObj
                nodeLoading={nodeLoading() || infoLoading()}
                nodeError={nodeError()}
                allowPreview={Boolean(info()?.allow_preview)}
              />

              <Show
                when={
                  objStore.state === State.Folder &&
                  !nodeLoading() &&
                  !infoLoading() &&
                  !nodeError()
                }
              >
                <SharePager
                  currentPage={currentPage()}
                  currentPerPage={currentPerPage()}
                  total={objStore.total}
                  onPageChange={(page) => {
                    setSearchParams({
                      page,
                      per_page: currentPerPage(),
                    })
                  }}
                  onPerPageChange={(perPage) => {
                    setSearchParams({
                      page: 1,
                      per_page: perPage,
                    })
                  }}
                />
              </Show>

              <Show when={info()?.allow_preview}>
                <Readme
                  files={["readme.md", "footer.md", "bottom.md"]}
                  fromMeta="readme"
                />
              </Show>
            </>
          </Show>
        </VStack>
      </Container>
    </>
  )
}

export default SharePage
