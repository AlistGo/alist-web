import { Alert, AlertIcon, Button, Heading, VStack } from "@hope-ui/solid"
import { createMemo, createSignal, For, Show } from "solid-js"
import { MaybeLoading } from "~/components"
import { useFetch, useRouter, useT } from "~/hooks"
import { handleResp, joinBase, notify, r } from "~/utils"
import {
  Addition,
  DriverConfig,
  DriverItem,
  PResp,
  Storage,
  Type,
} from "~/types"
import { createStore, produce } from "solid-js/store"
import { Item } from "./Item"
import { ResponsiveGrid } from "../common/ResponsiveGrid"

interface DriverInfo {
  common: DriverItem[]
  additional: DriverItem[]
  config: DriverConfig
}

function GetDefaultValue(type: Type, value?: string) {
  switch (type) {
    case Type.Bool:
      if (value) {
        return value === "true"
      }
      return false
    case Type.Number:
      if (value) {
        return parseInt(value)
      }
      return 0
    default:
      if (value) {
        return value
      }
      return ""
  }
}

type Drivers = Record<string, DriverInfo>

const maxLocalUploadChunkSizeMB = 4096

const AddOrEdit = () => {
  const t = useT()
  const { params, back, to } = useRouter()
  const { id } = params
  const [driversLoading, loadDrivers] = useFetch(
    (): PResp<Drivers> => r.get("/admin/driver/list"),
    true,
  )
  const [drivers, setDrivers] = createSignal<Drivers>({})
  const initAdd = async () => {
    const resp = await loadDrivers()
    handleResp(resp, setDrivers)
  }

  const [storageLoading, loadStorage] = useFetch(
    (): PResp<Storage> => r.get(`/admin/storage/get?id=${id}`),
    true,
  )
  const [driverLoading, loadDriver] = useFetch(
    (): PResp<DriverInfo> =>
      r.get(`/admin/driver/info?driver=${storage.driver}`),
    true,
  )
  const initEdit = async () => {
    const storageResp = await loadStorage()
    handleResp(storageResp, async (storageData) => {
      setStorage(storageData)
      setAddition(JSON.parse(storageData.addition))
      const driverResp = await loadDriver()
      handleResp(driverResp, (driverData) =>
        setDrivers({ [storage.driver]: driverData }),
      )
    })
  }
  if (id) {
    initEdit()
  } else {
    initAdd()
  }
  const [storage, setStorage] = createStore<Storage>({} as Storage)
  const [addition, setAddition] = createStore<Addition>({})
  const [okLoading, ok] = useFetch((): PResp<{ id: number }> => {
    setStorage("addition", JSON.stringify(addition))
    return r.post(`/admin/storage/${id ? "update" : "create"}`, storage)
  })
  const validateLocalUploadChunkSize = () => {
    if (storage.driver !== "Local") {
      return true
    }
    const raw = addition.upload_chunk_size_mb
    if (raw === undefined || raw === null || raw === "") {
      return true
    }
    const valueStr = String(raw).trim()
    if (!/^-?\d+$/.test(valueStr)) {
      notify.error(t("storages.local_upload_chunk_size_invalid"))
      return false
    }
    const value = Number.parseInt(valueStr, 10)
    if (value < 0 || value > maxLocalUploadChunkSizeMB) {
      notify.error(
        t("storages.local_upload_chunk_size_range", {
          min: "0",
          max: String(maxLocalUploadChunkSizeMB),
        }),
      )
      return false
    }
    return true
  }
  const alert = createMemo(() => {
    const i = drivers()[storage.driver]?.config.alert
    console.log(i)
    if (i) {
      return i.split("|")[0]
    }
  })
  return (
    <MaybeLoading
      loading={id ? storageLoading() || driverLoading() : driversLoading()}
    >
      <Heading mb="$2">{t(`global.${id ? "edit" : "add"}`)}</Heading>
      <VStack mb="$2" spacing="$2">
        <Item
          name="driver"
          default=""
          readonly={id !== undefined}
          required
          searchable
          type={Type.Select}
          options={id ? storage.driver : Object.keys(drivers()).join(",")}
          value={storage.driver}
          full_name_path="storages.common.driver"
          options_prefix="drivers.drivers"
          driver="drivers"
          onChange={(value) => {
            for (const item of drivers()[value].common) {
              setStorage(
                item.name as keyof Storage,
                GetDefaultValue(item.type, item.default) as any,
              )
            }
            // clear addition first
            setAddition(
              produce((addition) => {
                for (const key in addition) {
                  delete addition[key]
                }
              }),
            )
            for (const item of drivers()[value].additional) {
              setAddition(
                item.name,
                GetDefaultValue(item.type, item.default) as any,
              )
            }
            setStorage("driver", value)
          }}
        />
        <Show when={alert()}>
          <Alert status={alert() as any} w="$full">
            <AlertIcon />
            {t(`drivers.config.${storage.driver}.alert`)}
          </Alert>
        </Show>
      </VStack>
      <ResponsiveGrid>
        <Show when={drivers()[storage.driver]}>
          <For each={drivers()[storage.driver].common}>
            {(item) => (
              <Item
                {...item}
                driver="common"
                additionValues={addition}
                value={(storage as any)[item.name]}
                onChange={(val: any) => {
                  setStorage(item.name as keyof Storage, val)
                }}
              />
            )}
          </For>
          <For each={drivers()[storage.driver].additional}>
            {(item) => (
              <Item
                {...item}
                driver={storage.driver}
                additionValues={addition}
                value={addition[item.name] as any}
                onChange={(val: any) => {
                  setAddition(item.name, val)
                }}
              />
            )}
          </For>
        </Show>
      </ResponsiveGrid>
      <Button
        mt="$2"
        loading={okLoading()}
        onClick={async () => {
          if (!validateLocalUploadChunkSize()) {
            return
          }
          if (drivers()[storage.driver].config.need_ms) {
            notify.info(t("manage.add_storage-tips"))
            window.open(joinBase("/@manage/messenger"), "_blank")
          }
          const resp = await ok()
          // TODO maybe can use handleRrespWithNotifySuccess
          handleResp(
            resp,
            () => {
              notify.success(t("global.save_success"))
              back()
            },
            (msg, code) => {
              if (resp.data.id) {
                to(`/@manage/storages/edit/${resp.data.id}`)
              }
            },
          )
        }}
      >
        {t(`global.${id ? "save" : "add"}`)}
      </Button>
    </MaybeLoading>
  )
}

export default AddOrEdit
