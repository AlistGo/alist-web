import {
  Button,
  Center,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Select,
  Switch as HopeSwitch,
  Text,
  Textarea,
  VStack,
} from "@hope-ui/solid"
import { For, Match, Show, Switch } from "solid-js"
import { useT } from "~/hooks"
import { DriverItem, Type } from "~/types"
import { FolderChooseInput, SelectOptions } from "~/components"
import { getFileSize } from "~/utils"

export type ItemProps = DriverItem & {
  readonly?: boolean
  full_name_path?: string
  options_prefix?: string
  driver?: string
  additionValues?: Record<string, any>
} & (
    | {
        type: Type.Bool
        onChange?: (value: boolean) => void
        value: boolean
      }
    | {
        type: Type.Number
        onChange?: (value: number) => void
        value: number
      }
    | {
        type: Type.Float
        onChange?: (value: number) => void
        value: number
      }
    | {
        type: Type.String | Type.Text
        onChange?: (value: string) => void
        value: string
      }
    | {
        type: Type.Select
        searchable?: boolean
        onChange?: (value: string) => void
        value: string
      }
  )

const maxLocalUploadChunkSizeMB = 4096

const Item = (props: ItemProps) => {
  const t = useT()
  const isFolderPathField =
    props.type === Type.String &&
    !props.readonly &&
    (props.name === "root_folder_path" || props.name === "remote_path")
  const isChunkSizeField =
    props.type === Type.Number &&
    props.driver === "Chunker" &&
    props.name === "chunk_size"
  const isLocalUploadChunkSizeField =
    props.type === Type.Number &&
    props.driver === "Local" &&
    props.name === "upload_chunk_size_mb"
  const isChunkerRemotePathsField =
    props.type === Type.Text &&
    props.driver === "Chunker" &&
    props.name === "remote_paths"
  const isStrmPathsField =
    props.type === Type.Text &&
    props.driver === "Strm" &&
    props.name === "paths"
  const isPathSelectionTextField = isChunkerRemotePathsField || isStrmPathsField
  const isChunkerStoreChunksInPrimaryField =
    props.type === Type.Bool &&
    props.driver === "Chunker" &&
    props.name === "store_chunks_in_primary"
  const numberOnChange = props.type === Type.Number ? props.onChange : undefined
  const chunkerExtraRemotePaths = () =>
    String(props.additionValues?.remote_paths ?? "")
      .split("\n")
      .map((path) => path.trim())
      .filter(Boolean)
  const chunkerStoreChunksInPrimaryHint = () => {
    if (!isChunkerStoreChunksInPrimaryField) {
      return ""
    }
    if (chunkerExtraRemotePaths().length === 0) {
      return t("drivers.Chunker.store_chunks_in_primary-empty_hint")
    }
    return props.value
      ? t("drivers.Chunker.store_chunks_in_primary-enabled_hint")
      : t("drivers.Chunker.store_chunks_in_primary-disabled_hint")
  }
  const pathSelectionEntries = () => {
    if (!isPathSelectionTextField) {
      return []
    }
    const value = (props.value as string) ?? ""
    return value === "" ? [""] : value.split("\n")
  }
  const updatePathSelectionEntries = (entries: string[]) => {
    if (props.type !== Type.Text) {
      return
    }
    props.onChange?.(entries.join("\n"))
  }

  return (
    <FormControl
      w="$full"
      display="flex"
      flexDirection="column"
      required={props.required}
    >
      <FormLabel for={props.name} display="flex" alignItems="center">
        {t(
          props.full_name_path ?? props.driver === "common"
            ? `storages.common.${props.name}`
            : `drivers.${props.driver}.${props.name}`,
        )}
      </FormLabel>
      <Switch fallback={<Center>{t("settings.unknown_type")}</Center>}>
        <Match when={isFolderPathField}>
          <FolderChooseInput
            id={props.name}
            value={props.value as string}
            onChange={(value) => {
              if (props.type === Type.String) {
                props.onChange?.(value)
              }
            }}
          />
        </Match>
        <Match when={props.type === Type.String}>
          <Input
            id={props.name}
            type={props.name == "password" ? "password" : "text"}
            readOnly={props.readonly}
            value={props.value as string}
            onChange={
              props.type === Type.String
                ? (e) => props.onChange?.(e.currentTarget.value)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Number}>
          <Show
            when={isChunkSizeField}
            fallback={
              <Input
                type="number"
                id={props.name}
                readOnly={props.readonly}
                min={isLocalUploadChunkSizeField ? 0 : undefined}
                max={
                  isLocalUploadChunkSizeField
                    ? maxLocalUploadChunkSizeMB
                    : undefined
                }
                step={isLocalUploadChunkSizeField ? 1 : undefined}
                value={props.value as number}
                onInput={
                  props.type === Type.Number
                    ? (e) => {
                        let nextValue = Number.parseInt(
                          e.currentTarget.value,
                          10,
                        )
                        if (!Number.isFinite(nextValue)) {
                          nextValue = 0
                        }
                        props.onChange?.(nextValue)
                      }
                    : undefined
                }
              />
            }
          >
            <HStack w="$full" spacing="$2">
              <Input
                type="number"
                id={props.name}
                readOnly={props.readonly}
                value={((props.value as number) / (1024 * 1024)).toString()}
                onInput={(e) => {
                  const mb = parseFloat(e.currentTarget.value)
                  numberOnChange?.(
                    Number.isFinite(mb) ? Math.round(mb * 1024 * 1024) : 0,
                  )
                }}
              />
              <Text minW="3rem" textAlign="right">
                MB
              </Text>
            </HStack>
          </Show>
        </Match>
        <Match when={props.type === Type.Float}>
          <Input
            type="number"
            id={props.name}
            readOnly={props.readonly}
            value={props.value as number}
            onInput={
              props.type === Type.Float
                ? (e) => props.onChange?.(parseFloat(e.currentTarget.value))
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Bool}>
          <HopeSwitch
            id={props.name}
            readOnly={props.readonly}
            defaultChecked={props.value as boolean}
            onChange={
              props.type === Type.Bool
                ? (e: any) => props.onChange?.(e.currentTarget.checked)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Text}>
          <Show
            when={isPathSelectionTextField}
            fallback={
              <Textarea
                id={props.name}
                readOnly={props.readonly}
                value={props.value as string}
                onChange={
                  props.type === Type.Text
                    ? (e) => props.onChange?.(e.currentTarget.value)
                    : undefined
                }
              />
            }
          >
            <VStack w="$full" alignItems="stretch" spacing="$2">
              <For each={pathSelectionEntries()}>
                {(entry, index) => (
                  <HStack w="$full" alignItems="flex-start" spacing="$2">
                    <FolderChooseInput
                      id={index() === 0 ? props.name : undefined}
                      value={entry}
                      onChange={(value) => {
                        const next = [...pathSelectionEntries()]
                        next[index()] = value
                        updatePathSelectionEntries(next)
                      }}
                    />
                    <Button
                      colorScheme="danger"
                      variant="subtle"
                      onClick={() => {
                        const next = [...pathSelectionEntries()]
                        next.splice(index(), 1)
                        updatePathSelectionEntries(next)
                      }}
                      disabled={props.readonly}
                    >
                      {t("global.delete")}
                    </Button>
                  </HStack>
                )}
              </For>
              <Button
                variant="subtle"
                onClick={() => {
                  updatePathSelectionEntries([...pathSelectionEntries(), ""])
                }}
                disabled={props.readonly}
              >
                {t("global.add")}
              </Button>
            </VStack>
          </Show>
        </Match>
        <Match when={props.type === Type.Select}>
          <Select
            id={props.name}
            readOnly={props.readonly}
            defaultValue={props.value}
            onChange={
              props.type === Type.Select
                ? (e) => props.onChange?.(e)
                : undefined
            }
          >
            <SelectOptions
              readonly={props.readonly}
              searchable={props.type === Type.Select && props.searchable}
              options={props.options.split(",").map((key) => ({
                key,
                label: t(
                  (props.options_prefix ??
                    (props.driver === "common"
                      ? `storages.common.${props.name}s`
                      : `drivers.${props.driver}.${props.name}s`)) + `.${key}`,
                ),
              }))}
            />
          </Select>
        </Match>
      </Switch>
      <Show when={props.help}>
        <FormHelperText>
          {t(
            props.driver === "common"
              ? `storages.common.${props.name}-tips`
              : `drivers.${props.driver}.${props.name}-tips`,
          )}
        </FormHelperText>
      </Show>
      <Show when={isLocalUploadChunkSizeField}>
        <FormHelperText>
          {t("storages.local_upload_chunk_size_range", {
            min: "0",
            max: String(maxLocalUploadChunkSizeMB),
          })}
        </FormHelperText>
      </Show>
      <Show when={isChunkSizeField}>
        <FormHelperText>
          {`${(props.value as number).toLocaleString()} bytes (${getFileSize(
            props.value as number,
          )})`}
        </FormHelperText>
      </Show>
      <Show when={chunkerStoreChunksInPrimaryHint()}>
        <FormHelperText>{chunkerStoreChunksInPrimaryHint()}</FormHelperText>
      </Show>
    </FormControl>
  )
}

export { Item }
