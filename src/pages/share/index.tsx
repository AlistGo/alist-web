import {
  Box,
  Button,
  Divider,
  HStack,
  Image,
  Input,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { useNavigate, useParams } from "@solidjs/router"
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  untrack,
} from "solid-js"
import { useT, useTitle } from "~/hooks"
import {
  ObjType,
  PublicShareGet,
  PublicShareInfo,
  PublicShareList,
} from "~/types"
import {
  authPublicShare,
  getPublicShare,
  getPublicShareInfo,
  listPublicShare,
} from "~/utils/api"
import { handleResp, encodePath, joinBase } from "~/utils"

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
  } catch (err) {
    localStorage.removeItem(storageKey)
  }

  // Migrate the old sessionStorage token into the single localStorage source of truth.
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

const SharePage = () => {
  const t = useT()
  const params = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = createSignal("")
  const [authLoading, setAuthLoading] = createSignal(false)
  const [infoLoading, setInfoLoading] = createSignal(false)
  const [nodeLoading, setNodeLoading] = createSignal(false)
  const [nodeError, setNodeError] = createSignal("")
  const [info, setInfo] = createSignal<PublicShareInfo | null>(null)
  const [currentNode, setCurrentNode] = createSignal<PublicShareGet | null>(
    null,
  )
  const [listing, setListing] = createSignal<PublicShareList | null>(null)
  const [textPreview, setTextPreview] = createSignal("")
  const [shareToken, setShareToken] = createSignal("")

  const route = createMemo(() => parseShareRoute(params.share_path))
  const shareId = createMemo(() => route().shareId)
  const currentPath = createMemo(() => route().path)
  const currentToken = createMemo(() => shareToken())
  let lastShareId = ""
  let shareLoadID = 0

  useTitle(() => info()?.name || "Share")

  const resetNodeState = () => {
    setCurrentNode(null)
    setListing(null)
    setTextPreview("")
  }

  const resetShareState = () => {
    setInfo(null)
    resetNodeState()
    setPassword("")
    setNodeError("")
  }

  const unauthShare = (id: string) => {
    clearCachedShareToken(id)
    setShareToken("")
    setInfo((prev) => (prev ? { ...prev, authed: false } : prev))
    resetNodeState()
  }

  const loadShare = async (
    id = shareId(),
    path = currentPath(),
    token = currentToken(),
  ) => {
    if (!id) return null
    const currentLoadID = ++shareLoadID
    setInfoLoading(true)
    setNodeLoading(false)
    setNodeError("")

    const infoResp = await getPublicShareInfo(id, token || undefined)
    if (currentLoadID !== shareLoadID) return null

    let infoData: PublicShareInfo | null = null
    handleResp(
      infoResp,
      (data) => {
        infoData = data
        setInfo(data)
      },
      (message) => {
        setInfo(null)
        resetNodeState()
        setNodeError(message)
      },
      false,
      false,
    )
    if (!infoData) {
      setInfoLoading(false)
      return null
    }
    if (!infoData.authed) {
      if (token) {
        clearCachedShareToken(id)
        setShareToken("")
      }
      resetNodeState()
      setInfoLoading(false)
      return infoData
    }

    setNodeLoading(true)
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
        setCurrentNode(data)
        setTextPreview("")
      },
      (message, code) => {
        if (code === 401) {
          shouldResetAuth = true
          return
        }
        resetNodeState()
        setNodeError(message)
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
      const listResp = await listPublicShare({
        share_id: id,
        path,
        token: token || undefined,
        page: 1,
        per_page: 200,
      })
      if (currentLoadID !== shareLoadID) return infoData

      let listResetAuth = false
      handleResp(
        listResp,
        (listData) => setListing(listData),
        (message, code) => {
          if (code === 401) {
            listResetAuth = true
            return
          }
          setNodeError(message)
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
    } else {
      setListing(null)
      if (nodeData.item.type === ObjType.TEXT && nodeData.item.preview_url) {
        try {
          const textResp = await fetch(nodeData.item.preview_url)
          if (currentLoadID === shareLoadID) {
            setTextPreview(await textResp.text())
          }
        } catch (err) {
          if (currentLoadID === shareLoadID) {
            setTextPreview("")
          }
        }
      }
    }

    setInfoLoading(false)
    setNodeLoading(false)
    return infoData
  }

  createEffect(() => {
    const id = shareId()
    const path = currentPath()
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

  const navigateToPath = (path: string) => {
    const encoded = path === "/" ? "" : encodePath(path, true)
    navigate(joinBase(`/s/${shareId()}${encoded}`))
  }

  const submitPassword = async () => {
    if (!shareId() || authLoading() || !password().trim()) return
    setAuthLoading(true)
    setNodeError("")
    const resp = await authPublicShare(shareId(), password())
    let nextToken = ""
    let authed = false
    handleResp(
      resp,
      (data) => {
        authed = true
        nextToken = data.token || ""
      },
      (message) => setNodeError(message),
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

  const breadcrumbs = createMemo(() => {
    const path = currentPath()
    const segments = path.split("/").filter(Boolean)
    const items = [{ label: info()?.name || shareId(), path: "/" }]
    let acc = ""
    for (const segment of segments) {
      acc += `/${segment}`
      items.push({ label: segment, path: acc })
    }
    return items
  })

  const file = createMemo(() => currentNode()?.item)

  return (
    <VStack
      maxW="1100px"
      mx="auto"
      px="$4"
      py="$6"
      spacing="$4"
      alignItems="stretch"
    >
      <VStack alignItems="start" spacing="$1">
        <Text fontSize="$3xl" fontWeight="$bold">
          {info()?.name || t("share.title", undefined, "Share")}
        </Text>
        <Text color="$neutral11">{shareId()}</Text>
      </VStack>
      <Divider />

      <Show when={infoLoading() && !info()}>
        <HStack justifyContent="center" py="$8">
          <Spinner />
        </HStack>
      </Show>

      <Show when={info()?.has_password && !info()?.authed}>
        <VStack alignItems="stretch" spacing="$3" maxW="420px">
          <Text>
            {t(
              "share.password_prompt",
              undefined,
              "This share is protected by a password.",
            )}
          </Text>
          <Input
            type="password"
            value={password()}
            placeholder={t("share.password", undefined, "Password")}
            onInput={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void submitPassword()
              }
            }}
          />
          <Button
            colorScheme="accent"
            loading={authLoading()}
            disabled={!password().trim()}
            onClick={submitPassword}
          >
            {t("global.confirm")}
          </Button>
        </VStack>
      </Show>

      <Show when={info() && (!info()?.has_password || info()?.authed)}>
        <VStack alignItems="stretch" spacing="$4">
          <HStack spacing="$2" wrap="wrap">
            <For each={breadcrumbs()}>
              {(item) => (
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => navigateToPath(item.path)}
                >
                  {item.label}
                </Button>
              )}
            </For>
          </HStack>

          <Show when={nodeError()}>
            <Text color="$danger9">{nodeError()}</Text>
          </Show>

          <Show when={nodeLoading() || infoLoading()}>
            <HStack justifyContent="center" py="$8">
              <Spinner />
            </HStack>
          </Show>

          <Show when={!nodeLoading() && file()}>
            <Switch>
              <Match when={file()?.is_dir}>
                <Box overflowX="auto">
                  <Table highlightOnHover dense>
                    <Thead>
                      <Tr>
                        <Th>{t("global.name")}</Th>
                        <Th>{t("home.obj.size", undefined, "Size")}</Th>
                        <Th>{t("home.obj.modified", undefined, "Modified")}</Th>
                        <Th>{t("global.operations")}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <For each={listing()?.content || []}>
                        {(item) => (
                          <Tr>
                            <Td>
                              <Text
                                as="button"
                                type="button"
                                color="$accent9"
                                cursor="pointer"
                                _hover={{ textDecoration: "underline" }}
                                onClick={() => navigateToPath(item.path)}
                              >
                                {item.name}
                              </Text>
                            </Td>
                            <Td>{item.is_dir ? "-" : item.size}</Td>
                            <Td>
                              {item.modified
                                ? new Date(item.modified).toLocaleString()
                                : "-"}
                            </Td>
                            <Td>
                              <HStack spacing="$2">
                                <Show when={item.preview_url && !item.is_dir}>
                                  <Button
                                    size="sm"
                                    as="a"
                                    href={item.preview_url}
                                    target="_blank"
                                  >
                                    {t("share.preview", undefined, "Preview")}
                                  </Button>
                                </Show>
                                <Show when={item.download_url && !item.is_dir}>
                                  <Button
                                    size="sm"
                                    colorScheme="accent"
                                    as="a"
                                    href={item.download_url}
                                    target="_blank"
                                  >
                                    {t("share.download", undefined, "Download")}
                                  </Button>
                                </Show>
                              </HStack>
                            </Td>
                          </Tr>
                        )}
                      </For>
                    </Tbody>
                  </Table>
                </Box>
              </Match>
              <Match when={file() && !file()?.is_dir}>
                <VStack alignItems="stretch" spacing="$4">
                  <HStack spacing="$2">
                    <Show when={file()?.preview_url}>
                      <Button as="a" href={file()?.preview_url} target="_blank">
                        {t("share.open", undefined, "Open")}
                      </Button>
                    </Show>
                    <Show when={file()?.download_url}>
                      <Button
                        colorScheme="accent"
                        as="a"
                        href={file()?.download_url}
                        target="_blank"
                      >
                        {t("share.download", undefined, "Download")}
                      </Button>
                    </Show>
                  </HStack>
                  <Switch>
                    <Match
                      when={
                        file()?.type === ObjType.IMAGE && file()?.preview_url
                      }
                    >
                      <Image
                        src={file()?.preview_url}
                        maxH="70vh"
                        objectFit="contain"
                      />
                    </Match>
                    <Match
                      when={
                        file()?.type === ObjType.VIDEO && file()?.preview_url
                      }
                    >
                      <Box
                        as="video"
                        src={file()?.preview_url}
                        controls
                        w="$full"
                        maxH="70vh"
                      />
                    </Match>
                    <Match
                      when={
                        file()?.type === ObjType.AUDIO && file()?.preview_url
                      }
                    >
                      <Box
                        as="audio"
                        src={file()?.preview_url}
                        controls
                        w="$full"
                      />
                    </Match>
                    <Match when={file()?.type === ObjType.TEXT}>
                      <Box
                        as="pre"
                        p="$4"
                        rounded="$lg"
                        bg="$neutral2"
                        overflow="auto"
                        whiteSpace="pre-wrap"
                      >
                        {textPreview()}
                      </Box>
                    </Match>
                    <Match when={true}>
                      <Text color="$neutral11">
                        {t(
                          "share.no_inline_preview",
                          undefined,
                          "Inline preview is not available for this file type.",
                        )}
                      </Text>
                    </Match>
                  </Switch>
                </VStack>
              </Match>
            </Switch>
          </Show>
        </VStack>
      </Show>
    </VStack>
  )
}

export default SharePage
