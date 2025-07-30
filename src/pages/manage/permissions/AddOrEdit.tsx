import {
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  VStack,
  HStack,
  Box,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
  Tag,
  TagLabel,
  TagCloseButton,
  Checkbox,
  Alert,
  AlertIcon,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@hope-ui/solid"
import { MaybeLoading } from "~/components"
import { ChooseTree } from "~/components/ChooseTree"
import { useFetch, useRouter, useT } from "~/hooks"
import { handleResp, notify, pathJoin, r } from "~/utils"
import { createStore } from "solid-js/store"
import { For, createSignal, onMount, Show } from "solid-js"
import {
  createRole,
  updateRole,
  Permission,
  getRoleDetail,
  Role,
  fsDirs,
} from "~/utils/api"
import { UserPermissions } from "~/types"
import { password } from "~/store"
import { Obj } from "~/types"
import { Resp } from "~/types/resp"

interface RoleForm {
  name: string
  description: string
  permission_scopes: {
    path: string
    permission: number
  }[]
  base_path: string[] // 改为字符串数组
}

// 添加工具函数在组件外部
const getParentPath = (path: string): string => {
  if (path === "/" || !path.includes("/")) return "/"
  return path.substring(0, path.lastIndexOf("/"))
}

const isChildPath = (childPath: string, parentPath: string): boolean => {
  if (parentPath === "/") return childPath !== "/"
  return childPath.startsWith(parentPath + "/")
}

const optimizePaths = async (paths: string[]): Promise<string[]> => {
  // 存储每个目录的子目录信息
  const dirStructure = new Map<string, string[]>()

  // 获取目录的所有子目录
  const getChildDirs = async (path: string): Promise<string[]> => {
    try {
      const resp = await fsDirs(path, password(), true)
      if (resp.code === 200) {
        const childDirs = resp.data.map((dir: Obj) => pathJoin(path, dir.name))
        return childDirs
      }
    } catch (error) {
      console.error(`获取目录 [${path}] 内容失败:`, error)
    }
    return []
  }

  // 获取路径的父路径
  const getParentPath = (path: string): string => {
    if (path === "/" || !path.includes("/")) return ""
    const lastSlash = path.lastIndexOf("/")
    return lastSlash === 0 ? "/" : path.substring(0, lastSlash)
  }

  // 第一步：获取所有相关路径的目录结构
  const pathsToProcess = new Set<string>()

  // 添加所有选中的路径
  paths.forEach((path) => pathsToProcess.add(path))

  // 添加所有父路径
  paths.forEach((path) => {
    let parent = getParentPath(path)
    while (parent !== "") {
      pathsToProcess.add(parent)
      parent = getParentPath(parent)
    }
  })

  // 获取所有路径的目录结构
  for (const path of pathsToProcess) {
    if (!dirStructure.has(path)) {
      const childDirs = await getChildDirs(path)
      dirStructure.set(path, childDirs)
    }
  }

  // 检查路径是否是另一个路径的子路径
  const isChildPath = (child: string, parent: string): boolean => {
    if (parent === "/") return child !== "/"
    return child.startsWith(parent + "/")
  }

  // 检查一个目录的所有子目录是否都被选中
  const areAllChildrenSelected = (
    path: string,
    selectedPaths: Set<string>,
  ): boolean => {
    const children = dirStructure.get(path) || []
    if (children.length === 0) return false

    return children.every((child) => {
      // 检查子目录是否被选中，或者其所有子目录是否都被选中
      return (
        selectedPaths.has(child) || areAllChildrenSelected(child, selectedPaths)
      )
    })
  }

  // 第二步：优化路径
  const result = new Set<string>()
  const selectedPathsSet = new Set(paths)

  // 按路径长度排序，从短到长处理（优先处理父路径）
  const sortedPaths = [...paths].sort((a, b) => a.length - b.length)

  for (const path of sortedPaths) {
    // 检查是否已经有父路径被添加
    let hasParentInResult = false
    for (const existingPath of result) {
      if (path !== existingPath && isChildPath(path, existingPath)) {
        hasParentInResult = true
        break
      }
    }

    // 如果没有父路径被添加，检查是否应该添加当前路径
    if (!hasParentInResult) {
      // 检查当前路径的所有子目录是否都被选中
      if (areAllChildrenSelected(path, selectedPathsSet)) {
        // 如果所有子目录都被选中，只添加当前路径
        result.add(path)
      } else {
        // 否则添加当前路径
        result.add(path)
      }
    }
  }

  // 确保结果不为空
  if (result.size === 0 && paths.length > 0) {
    result.add(paths[0])
  }

  const finalResult = Array.from(result)
  return finalResult
}

const AddOrEdit = () => {
  const t = useT()
  const { params, back, to } = useRouter()
  const { id } = params
  const [role, setRole] = createStore<RoleForm>({
    name: "",
    description: "",
    permission_scopes: [],
    base_path: [],
  })

  const [permissions, setPermissions] = createSignal<Permission[]>([])
  const [currentPermission, setCurrentPermission] = createSignal(0)
  const [hasStorage, setHasStorage] = createSignal(false)
  const [showNoStorageModal, setShowNoStorageModal] = createSignal(false)

  // 检查存储状态
  const checkStorage = async () => {
    try {
      const resp: Resp<any> = await r.get("/fs/list")
      if (
        resp.code === 500 &&
        resp.message?.includes("please add a storage first")
      ) {
        setShowNoStorageModal(true)
        return false
      }
      return true
    } catch (err) {
      console.error("Failed to check storage:", err)
      return false
    }
  }

  // const [permissionsLoading, loadPermissions] = useFetch(
  //     () => getPermissionList(),
  // )

  const [roleLoading, loadRole] = useFetch(() => getRoleDetail(parseInt(id)))

  const initData = async () => {
    const hasStorageNow = await checkStorage()
    setHasStorage(hasStorageNow)
    if (!hasStorageNow) return

    if (id) {
      const roleResp = await loadRole()
      handleResp<Role>(roleResp, (data) => {
        setRole({
          name: data.name || "",
          description: data.description || "",
          permission_scopes: data.permission_scopes || [],
          base_path: data.permission_scopes?.length
            ? data.permission_scopes.map((scope) => scope.path)
            : [],
        })
        // 如果有权限数据，设置当前权限
        if (data.permission_scopes?.length > 0) {
          setCurrentPermission(data.permission_scopes[0].permission)
        }
      })
    }
  }

  onMount(() => {
    initData()
  })

  const validateForm = () => {
    if (role.base_path.length === 0 || role.name.length === 0) {
      notify.error(t("users.base_path") + " " + t("global.required"))
      return false
    }
    return true
  }

  const [okLoading, ok] = useFetch(async () => {
    // 计算合并的权限值
    const combinedPermissions = UserPermissions.reduce((acc, _, index) => {
      if (((currentPermission() >> index) & 1) === 1) {
        return acc | (1 << index)
      }
      return acc
    }, 0)

    // 优化路径
    const optimizedPaths = await optimizePaths(role.base_path)

    const submitData = {
      name: role.name,
      description: role.description,
      permission_scopes: optimizedPaths.map((path) => ({
        path,
        permission: combinedPermissions,
      })),
    }

    if (id) {
      return updateRole({
        ...submitData,
        id: parseInt(id),
      })
    }

    return createRole(submitData)
  })

  const getSelectedPermissions = () => {
    return UserPermissions.filter(
      (_, i) => ((currentPermission() >> i) & 1) === 1,
    )
  }

  const togglePermission = (index: number) => {
    const bit = 1 << index
    const newPermission = currentPermission() ^ bit
    setCurrentPermission(newPermission)

    if (role.base_path) {
      if ((newPermission >> index) & 1) {
        // 添加权限
        setRole("permission_scopes", [
          ...role.permission_scopes,
          {
            permission: bit,
            path: role.base_path[0], // 假设 base_path 是单个字符串
          },
        ])
      } else {
        // 移除权限
        setRole(
          "permission_scopes",
          role.permission_scopes.filter(
            (scope) =>
              scope.permission !== bit || scope.path !== role.base_path[0],
          ),
        )
      }
    }
  }

  const addPermissionScope = () => {
    if (currentPermission() === 0) {
      notify.error(
        t("permissions.role.role_permissions") + t("global.required"),
      )
      return
    }
    if (!role.base_path || role.base_path.length === 0) {
      notify.error(t("users.base_path") + t("global.required"))
      return
    }
    const existingScope = role.permission_scopes.find(
      (scope) =>
        scope.permission === currentPermission() &&
        scope.path === role.base_path[0],
    )
    if (existingScope) {
      notify.error(t("permissions.role.permission_scope_exists"))
      return
    }
    setRole("permission_scopes", [
      ...role.permission_scopes,
      {
        permission: currentPermission(),
        path: role.base_path[0],
      },
    ])
    setCurrentPermission(0)
  }

  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <Heading>{id ? t("global.edit") : t("global.add")}</Heading>
      <MaybeLoading loading={roleLoading()}>
        <Show when={hasStorage()}>
          <VStack spacing="$2" alignItems="start" w="$full">
            <FormControl required>
              <FormLabel>{t("permissions.role.role_name")}</FormLabel>
              <Input
                value={role.name}
                onInput={(e) => setRole("name", e.currentTarget.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>{t("permissions.role.role_description")}</FormLabel>
              <Input
                value={role.description}
                onInput={(e) => setRole("description", e.currentTarget.value)}
              />
            </FormControl>
            <FormControl required>
              <FormLabel>{t("users.base_path")}</FormLabel>
              <ChooseTree
                id="base_path"
                value={role.base_path}
                onChange={(paths) => {
                  setRole("base_path", paths)
                }}
                multiSelect
                autoOpen={!!id}
              />
            </FormControl>
            <FormControl>
              <FormLabel>
                {t("permissions.config.permissions_permissions")}
              </FormLabel>
              <Select multiple value={getSelectedPermissions()}>
                <SelectTrigger>
                  <Box
                    display="flex"
                    flexWrap="wrap"
                    gap="$2"
                    pr="$6"
                    py="$2"
                    minH="40px"
                    alignItems="center"
                  >
                    <Show
                      when={getSelectedPermissions().length > 0}
                      fallback={
                        <SelectPlaceholder>
                          {t("permissions.config.select_permissions")}
                        </SelectPlaceholder>
                      }
                    >
                      <For each={getSelectedPermissions().slice(0, 3)}>
                        {(item, i) => (
                          <Tag
                            size="lg"
                            variant="subtle"
                            bgColor="$neutral2"
                            rounded="$sm"
                            px="$3"
                            py="$1"
                          >
                            <TagLabel>
                              {t(`users.permissions.${item}`)}
                            </TagLabel>
                            <TagCloseButton
                              onClick={(e) => {
                                e.stopPropagation()
                                togglePermission(UserPermissions.indexOf(item))
                              }}
                            />
                          </Tag>
                        )}
                      </For>
                      <Show when={getSelectedPermissions().length > 3}>
                        <Tag
                          size="lg"
                          variant="subtle"
                          bgColor="$neutral2"
                          rounded="$sm"
                          px="$3"
                          py="$1"
                        >
                          <TagLabel>
                            +{getSelectedPermissions().length - 3}
                          </TagLabel>
                        </Tag>
                      </Show>
                    </Show>
                  </Box>
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    <For each={UserPermissions}>
                      {(item, i) => (
                        <SelectOption
                          value={item}
                          onClick={() => togglePermission(i())}
                        >
                          <HStack spacing="$2" w="$full" pl="$4" fontSize="$lg">
                            <Checkbox
                              checked={((currentPermission() >> i()) & 1) === 1}
                              readOnly
                            />
                            <SelectOptionText>
                              {t(`users.permissions.${item}`)}
                            </SelectOptionText>
                          </HStack>
                        </SelectOption>
                      )}
                    </For>
                  </SelectListbox>
                </SelectContent>
              </Select>
            </FormControl>

            <HStack spacing="$2">
              <Button
                loading={okLoading()}
                onClick={async () => {
                  if (!validateForm()) {
                    return
                  }
                  const resp = await ok()
                  handleResp(resp, () => {
                    notify.success(t("global.save_success"))
                    back()
                  })
                }}
              >
                {t("global.save")}
              </Button>
              <Button colorScheme="accent" onClick={() => back()}>
                {t("global.back")}
              </Button>
            </HStack>
          </VStack>
        </Show>
      </MaybeLoading>
      <Modal
        opened={showNoStorageModal()}
        onClose={() => setShowNoStorageModal(false)}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader></ModalHeader>
          <ModalBody>{t("storages.no_storage_content")}</ModalBody>
          <ModalFooter>
            <Button
              colorScheme="accent"
              onClick={() => setShowNoStorageModal(false)}
            >
              {t("global.cancel")}
            </Button>
            <Button
              onClick={() => {
                setShowNoStorageModal(false)
                to("/@manage/storages")
              }}
              ml="$2"
            >
              {t("home.go_to_storages")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}
export default AddOrEdit
