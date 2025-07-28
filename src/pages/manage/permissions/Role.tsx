import {
  VStack,
  HStack,
  Button,
  Box,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from "@hope-ui/solid"
import { useT, useRouter } from "~/hooks"
import { For, createSignal, onMount } from "solid-js"
import { getRoleList, Permission, deleteRole } from "~/utils/api"
import { handleResp, notify, r } from "~/utils"
import { DeletePopover } from "~/pages/manage/common/DeletePopover"

interface Role {
  id: number
  name: string
  description: string
  permission_scopes: []
}

interface RoleResponse {
  content: Role[]
}

interface PermissionResponse {
  content: Permission[]
}

const Role = () => {
  const t = useT()
  const { to } = useRouter()
  const [roles, setRoles] = createSignal<Role[]>([])
  const [permissions, setPermissions] = createSignal<Permission[]>([])
  const [loading, setLoading] = createSignal(false)
  const [deleting, setDeleting] = createSignal<number | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const [rolesResp] = await Promise.all([getRoleList()])
      handleResp<RoleResponse>(rolesResp, (data) => {
        setRoles(data.content)
      })
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时加载数据
  onMount(() => {
    refresh()
  })

  const getPermissionName = (id: number) => {
    const permission = permissions().find((p) => p.id === id)
    return permission?.name || `ID: ${id}`
  }

  const handleDelete = async (role: Role) => {
    setDeleting(role.id)
    try {
      const resp = await deleteRole(role.id)
      handleResp(resp, () => {
        notify.success(t("global.delete_success"))
        refresh()
      })
    } finally {
      setDeleting(null)
    }
  }

  // 判断角色是否应该被禁用操作（id 为 1 和 2 的角色）
  const isRoleDisabled = (roleId: number) => {
    return roleId === 1 || roleId === 2
  }

  const isRoleEdited = (roleId: number) => {
    return roleId === 2
  }

  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2">
        <Button colorScheme="accent" loading={loading()} onClick={refresh}>
          {t("global.refresh")}
        </Button>
        <Button
          onClick={() => {
            to("/@manage/permissions/add")
          }}
        >
          {t("global.add")}
        </Button>
      </HStack>
      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <For each={["role_name", "role_description"]}>
                {(title) => <Th>{t(`permissions.role.${title}`)}</Th>}
              </For>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={roles()}>
              {(role) => (
                <Tr>
                  <Td>{role.name}</Td>
                  <Td>{role.description}</Td>
                  <Td>
                    <HStack spacing="$2">
                      <Button
                        disabled={isRoleEdited(role.id)}
                        onClick={() => {
                          to(`/@manage/permissions/edit/${role.id}`)
                        }}
                      >
                        {t("global.edit")}
                      </Button>
                      <DeletePopover
                        name={role.name}
                        loading={deleting() === role.id}
                        disabled={isRoleDisabled(role.id)}
                        onClick={() => handleDelete(role)}
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

export default Role
