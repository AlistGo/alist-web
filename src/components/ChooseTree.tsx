import {
  Box,
  Button,
  createDisclosure,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
  Tag,
  TagLabel,
  Checkbox,
  Tooltip,
} from "@hope-ui/solid"
import { BiSolidRightArrow, BiSolidFolderOpen } from "solid-icons/bi"
import {
  Accessor,
  createContext,
  createSignal,
  useContext,
  Show,
  For,
  Setter,
  createEffect,
  on,
  JSXElement,
  createMemo,
} from "solid-js"
import { useFetch, useT, useUtil } from "~/hooks"
import { getMainColor, password } from "~/store"
import { Obj } from "~/types"
import {
  pathBase,
  handleResp,
  hoverColor,
  pathJoin,
  fsDirs,
  createMatcher,
  encodePath,
} from "~/utils"
import { createStore } from "solid-js/store"

// 基础类型定义
export type PathArray = string

// 定义路径节点接口
interface PathNode {
  path: string
  name: string
  parent: string
}

// 修改 FolderTreeHandler 类型
export type FolderTreeHandler = {
  setPath: Setter<string>
}

// 修改 FolderTreeContext 接口
interface FolderTreeContext {
  value: Accessor<string>
  onChange: (path: string) => void
  forceRoot?: boolean
  autoOpen?: boolean
  showEmptyIcon?: boolean
  showHiddenFolder?: boolean
  multiSelect?: boolean
  selectedPaths?: Accessor<string[][]>
  onSelect?: (path: string[], checked: boolean, childPaths?: string[][]) => void
}

// 修改 FolderTreeProps 接口
export interface FolderTreeProps {
  onChange: (path: string) => void
  forceRoot?: boolean
  autoOpen?: boolean
  handle?: (handler: FolderTreeHandler) => void
  showEmptyIcon?: boolean
  showHiddenFolder?: boolean
  multiSelect?: boolean
  selectedPaths?: Accessor<string[][]>
  onSelect?: (path: string[], checked: boolean, childPaths?: string[][]) => void
}

// 修改 ChooseTreeProps 接口
export interface ChooseTreeProps {
  value: string[]
  onChange: (paths: string[]) => void
  id?: string
  onlyFolder?: boolean
  multiSelect?: boolean
  autoOpen?: boolean
}

// 修改 FolderTreeNode 组件的 props 类型
interface FolderTreeNodeProps {
  segments: string[]
}

// 修改 getNodeState 函数
const isSamePath = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((segment, index) => segment === right[index])

const isAncestorPath = (ancestor: string[], target: string[]) =>
  ancestor.length < target.length &&
  ancestor.every((segment, index) => segment === target[index])

const getNodeState = (
  segments: string[],
  selectedPaths: string[][],
): { checked: boolean; indeterminate: boolean } => {
  const checked = selectedPaths.some((path) => isSamePath(path, segments))
  if (checked) {
    return { checked: true, indeterminate: false }
  }

  const indeterminate = selectedPaths.some((path) =>
    isAncestorPath(segments, path),
  )

  return { checked: false, indeterminate }
}

// 获取所有子节点路径（包括子节点的子节点）
const getAllChildPaths = async (path: string): Promise<string[]> => {
  try {
    const resp = await fsDirs(path, password(), true)
    if (resp.code === 200) {
      const directChildren = resp.data
        .filter((item: Obj) => item.is_dir)
        .map((child: Obj) => pathJoin(path, child.name))

      // 递归获取所有子节点的子节点
      const childrenOfChildren = await Promise.all(
        directChildren.map((childPath) => getAllChildPaths(childPath)),
      )

      return [...directChildren, ...childrenOfChildren.flat()]
    }
  } catch (error) {
    console.error("Error getting all child paths:", error)
  }
  return []
}

const FolderTreeNode = (props: FolderTreeNodeProps) => {
  const { isHidePath } = useUtil()
  const [children, setChildren] = createSignal<Obj[]>()
  const [manuallyCollapsed, setManuallyCollapsed] = createSignal(false)
  const {
    value,
    onChange,
    forceRoot,
    autoOpen,
    showEmptyIcon,
    showHiddenFolder,
    selectedPaths,
    onSelect,
    multiSelect,
  } = useContext(context)!

  // 获取节点状态
  const nodeState = createMemo(() => {
    if (!selectedPaths || !selectedPaths())
      return { checked: false, indeterminate: false }
    return getNodeState(props.segments, selectedPaths())
  })

  // 修改 hasSelectedChildren 函数
  const hasSelectedChildren = createMemo(() => {
    if (!selectedPaths || !selectedPaths()) return false
    const paths = selectedPaths()
    return paths.some((path) => isAncestorPath(props.segments, path))
  })

  // 统一的节点点击处理函数
  const handleNodeClick = async (e: Event, segments: string[]) => {
    e.stopPropagation()

    if (multiSelect && onSelect) {
      const currentChecked = !nodeState().checked
      onSelect(segments, currentChecked)
    } else {
      onChange("/" + segments.join("/"))
    }
  }

  const emptyIconVisible = () =>
    Boolean(showEmptyIcon && children() !== undefined && !children()?.length)
  const [loading, fetchDirs] = useFetch(() =>
    fsDirs(props.segments.join("/"), password(), forceRoot),
  )
  let isLoaded = false
  const load = async () => {
    if (children()?.length) return
    const resp = await fetchDirs()
    if (
      resp.code === 500 &&
      resp.message?.includes("storage not found; please add a storage first")
    ) {
      setChildren([])
      return
    }
    handleResp(
      resp,
      (data) => {
        isLoaded = true
        setChildren(data)
      },
      () => {
        if (isOpen()) onToggle()
      },
    )
  }
  const { isOpen, onToggle } = createDisclosure()
  const active = () => value() === props.segments.join("/")
  const isMatchedFolder = createMatcher(props.segments.join("/"))

  // 修改箭头点击处理函数
  const handleArrowClick = (e: Event) => {
    e.stopPropagation()
    if (isOpen()) {
      setManuallyCollapsed(true)
    } else {
      setManuallyCollapsed(false)
      load()
    }
    onToggle()
  }

  // 修改自动展开逻辑
  createEffect(() => {
    const currentLevel = props.segments.length
    const paths = selectedPaths?.()
    const currentPath = props.segments.join("/")

    // 检查是否需要展开
    const shouldExpand = () => {
      if (manuallyCollapsed()) return false

      // // 如果是根节点，不自动展开（让用户手动控制）
      // if (currentLevel === 0) {
      //   return false
      // }

      // // 如果是前三层且是选中路径的父节点，展开
      // if (
      //   currentLevel < 3 &&
      //   paths?.some((path) => {
      //     const pathStr = path.join("/")
      //     return pathStr.startsWith(currentPath + "/")
      //   })
      // ) {
      //   return true
      // }

      return false
    }

    if (shouldExpand() && !isOpen()) {
      console.log("展开节点:", currentPath)
      onToggle()
      load()
    }
  })

  const checkIfShouldOpen = async (pathname: string) => {
    // 检查当前节点层级
    // const currentLevel = props.segments.length
    // if (currentLevel >= 3) {
    //   return
    // }

    // // 根节点不自动展开
    // if (currentLevel === 0) {
    //   return
    // }

    // if (!autoOpen) return
    // if (isMatchedFolder(pathname)) {
    //   if (!isOpen()) onToggle()
    //   if (!isLoaded) load()
    // }
    // 不自动展开任何节点，让用户手动控制
    return
  }
  createEffect(on(value, checkIfShouldOpen))
  const isHiddenFolder = () =>
    isHidePath(props.segments.join("/")) && !isMatchedFolder(value())

  return (
    <Show when={showHiddenFolder || !isHiddenFolder()}>
      <Box>
        <HStack spacing="$2" alignItems="center">
          <Show when={multiSelect}>
            <Box>
              <Checkbox
                checked={nodeState().checked}
                indeterminate={nodeState().indeterminate}
                // onClick={(e) => {
                //     e.stopPropagation();
                //     handleNodeClick(e, props.segments);
                // }}
                // onChange={(e: Event) => {
                //     e.stopPropagation();
                // }}
              />
            </Box>
          </Show>
          <Show
            when={!loading()}
            fallback={<Spinner size="sm" color={getMainColor()} />}
          >
            <Show
              when={!emptyIconVisible()}
              fallback={<Icon color={getMainColor()} as={BiSolidFolderOpen} />}
            >
              <Icon
                color={getMainColor()}
                as={BiSolidRightArrow}
                transform={isOpen() ? "rotate(90deg)" : "none"}
                transition="transform 0.2s"
                cursor="pointer"
                onClick={handleArrowClick}
              />
            </Show>
          </Show>
          <Text
            css={{
              whiteSpace: "nowrap",
            }}
            fontSize="$md"
            cursor="pointer"
            px="$1"
            rounded="$md"
            bgColor={active() ? "$info8" : "transparent"}
            _hover={{
              backgroundColor: active() ? "$info8" : hoverColor(),
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleNodeClick(e, props.segments)
            }}
          >
            {props.segments.join("/") === ""
              ? "root"
              : pathBase(props.segments.join("/"))}
          </Text>
        </HStack>
        <Show when={isOpen()}>
          <VStack mt="$1" pl="$4" alignItems="start" spacing="$1">
            <For each={children()}>
              {(item) => (
                <FolderTreeNode segments={[...props.segments, item.name]} />
              )}
            </For>
          </VStack>
        </Show>
      </Box>
    </Show>
  )
}

// 获取目录下的所有子节点路径
const getChildrenPaths = async (path: string): Promise<string[]> => {
  try {
    const resp = await fsDirs(path, password(), true)
    if (
      resp.code === 500 &&
      resp.message?.includes("storage not found; please add a storage first")
    ) {
      return []
    }
    if (resp.code === 200) {
      return resp.data
        .filter((item: Obj) => item.is_dir)
        .map((child: Obj) => pathJoin(path, child.name))
    }
  } catch (error) {
    console.error("Error getting children paths:", error)
  }
  return []
}

// 获取节点的所有子节点
const getChildrenNodes = async (path: string): Promise<PathNode[]> => {
  try {
    const resp = await fsDirs(path, password(), true)
    if (
      resp.code === 500 &&
      resp.message?.includes("storage not found; please add a storage first")
    ) {
      return []
    }

    if (resp.code === 200 && Array.isArray(resp.data)) {
      // API 返回的都是文件夹，直接映射成节点
      const children = resp.data.map((item: Obj) => {
        const childPath = pathJoin(path, item.name)
        return {
          path: childPath,
          name: item.name,
          parent: path,
        }
      })

      return children
    } else {
      return []
    }
  } catch (error) {
    console.error("获取子节点失败:", error)
    return []
  }
}

// 获取所有同级节点
const getSiblingPaths = async (path: string): Promise<PathNode[]> => {
  if (path === "/" || path === "") return []
  const parentPath = pathBase(path) || "/"
  try {
    const resp = await fsDirs(parentPath, password(), true)
    if (
      resp.code === 500 &&
      resp.message?.includes("storage not found; please add a storage first")
    ) {
      return []
    }
    if (resp.code === 200 && Array.isArray(resp.data)) {
      return resp.data.map((item: Obj) => {
        const siblingPath = pathJoin(parentPath, item.name)
        return {
          path: siblingPath,
          name: item.name,
          parent: parentPath,
        }
      })
    }
  } catch (error) {
    console.error("获取同级节点失败:", error)
  }
  return []
}

// 修改 context 类型
interface FolderTreeContext {
  value: Accessor<string>
  onChange: (path: string) => void
  forceRoot?: boolean
  autoOpen?: boolean
  showEmptyIcon?: boolean
  showHiddenFolder?: boolean
  multiSelect?: boolean
  selectedPaths?: Accessor<string[][]>
  onSelect?: (path: string[], checked: boolean, childPaths?: string[][]) => void
}

// 修改 handleSelect 函数
const context = createContext<FolderTreeContext>()

// 修改 FolderTree 组件
export const FolderTree = (props: FolderTreeProps) => {
  const [path, setPath] = createSignal("/")
  props.handle?.({ setPath })

  // 创建一个类型安全的 selectedPaths
  const typedSelectedPaths = props.selectedPaths as
    | Accessor<string[][]>
    | undefined

  return (
    <Box class="folder-tree-box" w="$full" overflowX="auto">
      <context.Provider
        value={{
          value: path,
          onChange: (val) => {
            setPath(val)
            props.onChange(val)
          },
          autoOpen: props.autoOpen ?? false,
          forceRoot: props.forceRoot ?? false,
          showEmptyIcon: props.showEmptyIcon ?? false,
          showHiddenFolder: props.showHiddenFolder ?? true,
          multiSelect: props.multiSelect,
          selectedPaths: typedSelectedPaths,
          onSelect: props.onSelect,
        }}
      >
        <FolderTreeNode segments={[]} />
      </context.Provider>
    </Box>
  )
}

// 获取父路径
const getParentPath = (path: string[]): string[] => {
  if (path.length <= 1) return []
  return path.slice(0, -1)
}

// 检查是否所有子节点都被选中
const checkAllChildrenSelected = async (
  parentPath: string[],
  selectedPaths: string[][],
): Promise<boolean> => {
  try {
    const resp = await fsDirs("/" + parentPath.join("/"), password(), true)
    if (
      resp.code === 500 &&
      resp.message?.includes("storage not found; please add a storage first")
    ) {
      return false
    }
    if (resp.code === 200) {
      const dirs = resp.data.filter((item: Obj) => item.is_dir)
      // 检查每个子目录是否都被选中
      return (
        dirs.length > 0 &&
        dirs.every((dir) =>
          selectedPaths.some(
            (path) => path.join("/") === [...parentPath, dir.name].join("/"),
          ),
        )
      )
    }
  } catch (error) {
    console.error("检查子节点选中状态失败:", error)
  }
  return false
}

// 优化选中路径
const optimizeSelectedPaths = async (
  paths: string[][],
): Promise<string[][]> => {
  // 按路径长度排序，这样我们可以从最深的路径开始处理
  const sortedPaths = [...paths].sort((a, b) => b.length - a.length)
  const result: string[][] = []
  const processedPaths = new Set<string>()

  for (const path of sortedPaths) {
    const pathStr = path.join("/")

    // 如果这个路径已经被处理过，跳过
    if (processedPaths.has(pathStr)) {
      continue
    }

    // 获取所有可能的父路径
    const parentPaths: string[][] = []
    for (let i = path.length - 1; i > 0; i--) {
      parentPaths.push(path.slice(0, i))
    }

    // 从最近的父路径开始检查
    let optimized = false
    for (const parentPath of parentPaths) {
      const parentPathStr = parentPath.join("/")

      // 获取父路径下的所有选中路径
      const childrenOfParent = sortedPaths.filter((p) => {
        const pStr = p.join("/")
        return pStr.startsWith(parentPathStr + "/") && pStr !== parentPathStr
      })

      // 获取父路径下的实际子目录
      try {
        const resp = await fsDirs("/" + parentPathStr, password(), true)
        if (
          resp.code === 500 &&
          resp.message?.includes(
            "storage not found; please add a storage first",
          )
        ) {
          continue
        }
        if (resp.code === 200) {
          // 后端返回的都是文件夹，不需要过滤
          const actualDirs = resp.data

          // 如果选中的子路径数量等于实际子目录数量，说明是全选
          if (
            actualDirs.length > 0 &&
            childrenOfParent.length === actualDirs.length
          ) {
            // 将父路径添加到结果中
            if (!result.some((p) => p.join("/") === parentPathStr)) {
              result.push(parentPath)
            }
            // 标记所有子路径为已处理
            childrenOfParent.forEach((p) => processedPaths.add(p.join("/")))
            optimized = true
            break
          }
        }
      } catch (error) {
        console.error("检查目录结构失败:", error)
      }
    }

    // 如果没有找到可以优化的父路径，添加原始路径
    if (!optimized && !processedPaths.has(pathStr)) {
      result.push(path)
      processedPaths.add(pathStr)
    }
  }

  return result
}

// 修改 ChooseTree 组件
export const ChooseTree = (props: ChooseTreeProps) => {
  const { isOpen, onOpen, onClose } = createDisclosure()
  const t = useT()

  const [selectedPaths, setSelectedPaths] = createSignal<string[][]>(
    props.value.map((path) => path.split("/").filter(Boolean)),
  )
  const [displaySelectedPaths, setDisplaySelectedPaths] = createSignal<
    string[][]
  >(props.value.map((path) => path.split("/").filter(Boolean)))

  // 监听 props.value 的变化
  createEffect(() => {
    if (props.value) {
      const paths = props.value.map((path) => path.split("/").filter(Boolean))
      setSelectedPaths(paths)
      setDisplaySelectedPaths(paths)
    }
  })

  // 包装 handleSelect 函数
  const wrappedHandleSelect = async (segments: string[], checked: boolean) => {
    let newPaths = [...selectedPaths()]

    if (checked) {
      if (segments.length === 0) {
        newPaths = [[]]
      } else {
        newPaths = newPaths.filter(
          (path) =>
            !isSamePath(path, []) &&
            !isSamePath(path, segments) &&
            !isAncestorPath(path, segments) &&
            !isAncestorPath(segments, path),
        )
        newPaths.push([...segments])
      }
    } else {
      newPaths = newPaths.filter(
        (path) =>
          !isSamePath(path, segments) && !isAncestorPath(segments, path),
      )
    }

    setSelectedPaths(newPaths)
    setDisplaySelectedPaths(newPaths)
    props.onChange(
      newPaths.map((path) => (path.length === 0 ? "/" : "/" + path.join("/"))),
    )
  }

  return (
    <>
      <Box w="$full" position="relative">
        <Input
          id={props.id}
          readOnly={true}
          h="44px"
          pl="$4"
          pointerEvents="none"
          _focus={{
            border: "none",
            boxShadow: "none",
          }}
        />
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          display="flex"
          alignItems="center"
          flexWrap="wrap"
          gap="$2"
          maxW="90%"
          pl="$4"
          cursor="pointer"
          onClick={onOpen}
          zIndex={1}
        >
          <Show
            when={displaySelectedPaths().length > 0}
            fallback={
              <Text color="$neutral10">{t("global.choose_folder")}</Text>
            }
          >
            <For each={displaySelectedPaths().slice(0, 3)}>
              {(path) => {
                const fullPath = "/" + path.join("/")
                return (
                  <Tag
                    size="lg"
                    variant="subtle"
                    bgColor="$neutral2"
                    rounded="$sm"
                    px="$3"
                    py="$1"
                    maxW="300px"
                    title={fullPath}
                  >
                    <TagLabel
                      css={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {fullPath}
                    </TagLabel>
                  </Tag>
                )
              }}
            </For>
            <Show when={displaySelectedPaths().length > 3}>
              <Tooltip
                placement="bottom"
                withArrow
                closeDelay={0}
                label={
                  <VStack alignItems="flex-start" spacing="$1">
                    <For each={displaySelectedPaths().slice(3)}>
                      {(path) => (
                        <Text
                          fontSize="$sm"
                          color="$neutral8"
                          css={{
                            wordBreak: "break-all",
                          }}
                        >
                          {"/" + path.join("/")}
                        </Text>
                      )}
                    </For>
                  </VStack>
                }
              >
                <Tag
                  size="lg"
                  variant="subtle"
                  bgColor="$neutral2"
                  rounded="$sm"
                  px="$3"
                  py="$1"
                >
                  <TagLabel>+{displaySelectedPaths().length - 3}</TagLabel>
                </Tag>
              </Tooltip>
            </Show>
          </Show>
        </Box>
      </Box>
      <Modal size="xl" opened={isOpen()} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>
            <HStack spacing="$2" alignItems="center">
              <Text fontWeight="bold">{t("global.choose_folder")}</Text>
              <Text fontSize="$sm">
                （{t("global.please_click_to_select")}）
              </Text>
            </HStack>
          </ModalHeader>
          <ModalBody>
            <context.Provider
              value={{
                value: () => "/",
                onChange: (path: string) => {},
                forceRoot: true,
                autoOpen: props.autoOpen ?? false,
                showEmptyIcon: false,
                showHiddenFolder: true,
                selectedPaths: displaySelectedPaths,
                onSelect: wrappedHandleSelect,
                multiSelect: props.multiSelect,
              }}
            >
              <FolderTree
                forceRoot
                onChange={(path: string) => {}}
                multiSelect={props.multiSelect}
                selectedPaths={displaySelectedPaths}
                onSelect={wrappedHandleSelect}
                autoOpen={props.autoOpen}
              />
            </context.Provider>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="neutral" onClick={onClose} mr="$2">
              {t("global.cancel")}
            </Button>
            <Button onClick={onClose}>{t("global.confirm")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
