import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  HStack,
  Text,
  VStack,
} from "@hope-ui/solid"
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
} from "solid-js"
import { SelectWrapper } from "~/components"
import { useFetch, useRouter, useT, useUtil } from "~/hooks"
import { objStore, password } from "~/store"
import { PResp } from "~/types"
import { handleResp, notify, r } from "~/utils"

type ExportFormat = "pdf" | "docx" | "xlsx" | "csv"
type ExportStatus = "idle" | "pending" | "processing" | "success" | "failed"

type LarkExportCreateResp = {
  ticket: string
  token: string
  type: string
  format: ExportFormat
  sub_id?: string
}

type LarkExportFormatOption = {
  value: ExportFormat
  label: string
  requires_sub_id?: boolean
}

type LarkExportSubResource = {
  id: string
  name: string
  type: string
}

type LarkExportOptionsResp = {
  type: string
  formats: LarkExportFormatOption[]
  sub_resources?: LarkExportSubResource[]
  sub_resource_error?: string
}

type LarkExportStatusResp = {
  status: Exclude<ExportStatus, "idle">
  file_token?: string
  file_size?: number
  job_status?: number
  error_message?: string
  error_detail?: string
}

type StoredExportTask = {
  ticket: string
  format: ExportFormat
  sub_id?: string
  status: ExportStatus
  file_token?: string
  error_message?: string
  error_detail?: string
  updated_at: number
}

const larkSuffixes = [".lark-doc", ".lark-docx", ".lark-sheet", ".lark-bitable"]

const larkBaseName = (name: string) => {
  for (const suffix of larkSuffixes) {
    if (name.endsWith(suffix)) {
      return name.slice(0, -suffix.length)
    }
  }
  return name
}

const storageAvailable = () =>
  typeof window !== "undefined" && window.sessionStorage

const LarkTools = () => {
  const { pathname } = useRouter()
  const t = useT()
  const { copy } = useUtil()
  const [exportOptions, setExportOptions] =
    createSignal<LarkExportOptionsResp>()
  const [optionError, setOptionError] = createSignal("")
  const [format, setFormat] = createSignal<ExportFormat>("pdf")
  const [subResourceID, setSubResourceID] = createSignal("")
  const [ticket, setTicket] = createSignal("")
  const [status, setStatus] = createSignal<ExportStatus>("idle")
  const [fileToken, setFileToken] = createSignal("")
  const [errorMessage, setErrorMessage] = createSignal("")
  const [errorDetail, setErrorDetail] = createSignal("")
  let timer: number | undefined
  let attempts = 0

  const taskKey = (path = pathname(), name = objStore.obj.name) =>
    `alist:lark-export:${path}:${name}`

  const selectedFormat = createMemo(
    () => exportOptions()?.formats.find((item) => item.value === format()),
  )
  const requiresSubResource = createMemo(
    () => selectedFormat()?.requires_sub_id ?? false,
  )
  const subResources = createMemo(() => exportOptions()?.sub_resources ?? [])
  const canCreate = createMemo(
    () =>
      Boolean(exportOptions()?.formats.length) &&
      (!requiresSubResource() || Boolean(subResourceID())),
  )

  const stopPolling = () => {
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timer = undefined
    }
  }

  onCleanup(stopPolling)

  const saveTask = (task: StoredExportTask) => {
    const storage = storageAvailable()
    if (!storage || !task.ticket) return
    storage.setItem(taskKey(), JSON.stringify(task))
  }

  const saveCurrentTask = (next: Partial<StoredExportTask> = {}) => {
    if (!ticket() && !next.ticket) return
    saveTask({
      ticket: next.ticket ?? ticket(),
      format: next.format ?? format(),
      sub_id: next.sub_id ?? subResourceID(),
      status: next.status ?? status(),
      file_token: next.file_token ?? fileToken(),
      error_message: next.error_message ?? errorMessage(),
      error_detail: next.error_detail ?? errorDetail(),
      updated_at: Date.now(),
    })
  }

  const restoreTask = (
    path: string,
    name: string,
    options: LarkExportOptionsResp,
  ) => {
    const storage = storageAvailable()
    if (!storage) return
    const raw = storage.getItem(taskKey(path, name))
    if (!raw) return
    let task: StoredExportTask
    try {
      task = JSON.parse(raw)
    } catch {
      storage.removeItem(taskKey(path, name))
      return
    }
    if (
      !task.ticket ||
      !options.formats.some((item) => item.value === task.format)
    ) {
      storage.removeItem(taskKey(path, name))
      return
    }
    setTicket(task.ticket)
    setFormat(task.format)
    setSubResourceID(task.sub_id ?? "")
    setStatus(task.status)
    setFileToken(task.file_token ?? "")
    setErrorMessage(task.error_message ?? "")
    setErrorDetail(task.error_detail ?? "")
    if (task.status === "pending" || task.status === "processing") {
      setStatus("processing")
      timer = window.setTimeout(poll, 500)
    }
  }

  const [loadingOptions, fetchExportOptions] = useFetch(
    (): PResp<LarkExportOptionsResp> =>
      r.post("/fs/other", {
        path: pathname(),
        password: password(),
        method: "lark_export_options",
        data: {},
      }),
    true,
  )

  const [creating, createExport] = useFetch(
    (): PResp<LarkExportCreateResp> =>
      r.post("/fs/other", {
        path: pathname(),
        password: password(),
        method: "lark_export_create",
        data: {
          format: format(),
          sub_id: subResourceID(),
        },
      }),
  )

  const [checking, checkExport] = useFetch(
    (): PResp<LarkExportStatusResp> =>
      r.post("/fs/other", {
        path: pathname(),
        password: password(),
        method: "lark_export_status",
        data: {
          ticket: ticket(),
        },
      }),
  )

  const loadExportOptions = async (path: string, name: string) => {
    stopPolling()
    attempts = 0
    setExportOptions(undefined)
    setOptionError("")
    setTicket("")
    setFileToken("")
    setErrorMessage("")
    setErrorDetail("")
    setStatus("idle")
    const resp = await fetchExportOptions()
    handleResp(
      resp,
      (data) => {
        setExportOptions(data)
        const firstFormat = data.formats[0]?.value
        if (firstFormat) {
          setFormat(firstFormat)
        }
        setSubResourceID(data.sub_resources?.[0]?.id ?? "")
        if (data.sub_resource_error) {
          setOptionError(data.sub_resource_error)
        }
        restoreTask(path, name, data)
      },
      (msg) => {
        setOptionError(msg)
      },
      true,
      false,
    )
  }

  createEffect(() => {
    void loadExportOptions(pathname(), objStore.obj.name)
  })

  createEffect(() => {
    const options = exportOptions()?.formats
    if (options?.length && !options.some((item) => item.value === format())) {
      setFormat(options[0].value)
    }
    if (!requiresSubResource()) {
      setSubResourceID("")
      return
    }
    if (!subResourceID() && subResources()[0]?.id) {
      setSubResourceID(subResources()[0].id)
    }
  })

  const poll = async () => {
    if (!ticket()) return
    const resp = await checkExport()
    handleResp(
      resp,
      (data) => {
        setStatus(data.status)
        if (data.error_message) {
          setErrorMessage(data.error_message)
        }
        if (data.error_detail) {
          setErrorDetail(data.error_detail)
        }
        if (data.status === "success" && data.file_token) {
          setFileToken(data.file_token)
          saveCurrentTask({
            status: "success",
            file_token: data.file_token,
            error_message: "",
            error_detail: "",
          })
          stopPolling()
          return
        }
        if (data.status === "failed") {
          saveCurrentTask({
            status: "failed",
            error_message: data.error_message ?? errorMessage(),
            error_detail: data.error_detail ?? errorDetail(),
          })
          stopPolling()
          return
        }
        attempts += 1
        if (attempts >= 30) {
          const msg = t("home.preview.lark_tools.export_timeout")
          setStatus("failed")
          setErrorMessage(msg)
          setErrorDetail("")
          saveCurrentTask({
            status: "failed",
            error_message: msg,
            error_detail: "",
          })
          stopPolling()
          return
        }
        saveCurrentTask({ status: "processing" })
        timer = window.setTimeout(poll, 2000)
      },
      (msg) => {
        setStatus("failed")
        setErrorMessage(msg)
        setErrorDetail(msg)
        saveCurrentTask({
          status: "failed",
          error_message: msg,
          error_detail: msg,
        })
        stopPolling()
      },
      true,
      false,
    )
  }

  const startExport = async () => {
    if (requiresSubResource() && !subResourceID()) {
      notify.warning(t("home.preview.lark_tools.sub_resource_required"))
      return
    }
    stopPolling()
    attempts = 0
    setTicket("")
    setFileToken("")
    setErrorMessage("")
    setErrorDetail("")
    setStatus("pending")
    const resp = await createExport()
    handleResp(
      resp,
      (data) => {
        setTicket(data.ticket)
        setStatus("processing")
        saveTask({
          ticket: data.ticket,
          format: data.format,
          sub_id: data.sub_id ?? subResourceID(),
          status: "processing",
          updated_at: Date.now(),
        })
        timer = window.setTimeout(poll, 1000)
      },
      (msg) => {
        setStatus("failed")
        setErrorMessage(msg)
        setErrorDetail(msg)
        saveCurrentTask({
          status: "failed",
          error_message: msg,
          error_detail: msg,
        })
      },
    )
  }

  const downloadName = () => `${larkBaseName(objStore.obj.name)}.${format()}`

  const downloadExport = async () => {
    if (!fileToken()) return
    const query = new URLSearchParams({
      path: pathname(),
      password: password(),
      file_token: fileToken(),
      filename: downloadName(),
    })
    const blob = await r.get(`/fs/lark/export/download?${query.toString()}`, {
      responseType: "blob",
    })
    if (!(blob instanceof Blob)) {
      notify.error(
        blob?.message ?? t("home.preview.lark_tools.download_failed"),
      )
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = downloadName()
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    notify.success(t("home.preview.lark_tools.download_started"))
  }

  return (
    <Box w="$full" border="1px solid $neutral6" rounded="$lg" p="$4">
      <VStack alignItems="stretch" spacing="$4">
        <HStack justifyContent="space-between" alignItems="center">
          <Box>
            <Text fontWeight="$semibold">
              {t("home.preview.lark_tools.title")}
            </Text>
            <Text color="$neutral11" size="sm">
              {loadingOptions()
                ? t("home.preview.lark_tools.loading_options")
                : exportOptions()
                  ? t(`home.preview.lark_tools.type.${exportOptions()!.type}`)
                  : t("home.preview.lark_tools.unsupported_current")}
            </Text>
          </Box>
          <SelectWrapper
            value={format()}
            onChange={(value) => setFormat(value)}
            options={
              exportOptions()?.formats.map((item) => ({
                value: item.value,
                label: item.label,
              })) ?? [{ value: format(), label: format().toUpperCase() }]
            }
            size="sm"
            w="120px"
          />
        </HStack>

        <Show when={optionError()}>
          <Alert status={exportOptions() ? "warning" : "danger"}>
            <AlertTitle>
              {exportOptions()
                ? t("home.preview.lark_tools.sub_resource_error")
                : t("home.preview.lark_tools.option_failed")}
            </AlertTitle>
            <AlertDescription>{optionError()}</AlertDescription>
          </Alert>
        </Show>

        <Show
          when={exportOptions()?.formats.length}
          fallback={
            <Alert status="warning">
              <AlertTitle>
                {t("home.preview.lark_tools.unsupported_title")}
              </AlertTitle>
              <AlertDescription>
                {t("home.preview.lark_tools.unsupported_description")}
              </AlertDescription>
            </Alert>
          }
        >
          <Show when={requiresSubResource()}>
            <VStack alignItems="stretch" spacing="$2">
              <Text color="$neutral11" size="sm">
                {t("home.preview.lark_tools.sub_resource")}
              </Text>
              <SelectWrapper
                value={subResourceID()}
                onChange={(value) => setSubResourceID(value)}
                options={
                  subResources().length
                    ? subResources().map((item) => ({
                        value: item.id,
                        label: item.name,
                      }))
                    : [
                        {
                          value: "",
                          label: t("home.preview.lark_tools.no_sub_resources"),
                        },
                      ]
                }
                size="sm"
                w="$full"
              />
            </VStack>
          </Show>

          <Text color="$neutral11" size="sm">
            {t("home.preview.lark_tools.download_name", {
              name: downloadName(),
            })}
          </Text>

          <HStack spacing="$3">
            <Button
              colorScheme="accent"
              loading={creating()}
              isDisabled={
                loadingOptions() ||
                checking() ||
                status() === "processing" ||
                !canCreate()
              }
              onClick={startExport}
            >
              {t("home.preview.lark_tools.create_export_task")}
            </Button>
            <Show when={status() === "success" && fileToken()}>
              <Button onClick={downloadExport}>
                {t("home.preview.lark_tools.download_export", {
                  name: downloadName(),
                })}
              </Button>
            </Show>
          </HStack>

          <Show when={status() !== "idle"}>
            <Alert
              status={
                status() === "failed"
                  ? "danger"
                  : status() === "success"
                    ? "success"
                    : "info"
              }
            >
              <AlertTitle>
                {status() === "success"
                  ? t("home.preview.lark_tools.status.success_title")
                  : status() === "failed"
                    ? t("home.preview.lark_tools.status.failed_title")
                    : t("home.preview.lark_tools.status.processing_title")}
              </AlertTitle>
              <AlertDescription>
                {status() === "failed" ? (
                  <VStack alignItems="stretch" spacing="$2">
                    <Text whiteSpace="pre-wrap">
                      {errorMessage() ||
                        t("home.preview.lark_tools.export_failed")}
                    </Text>
                    <Show when={errorDetail()}>
                      <HStack justifyContent="space-between">
                        <Text color="$neutral11">
                          {t("home.preview.lark_tools.feishu_error_detail")}
                        </Text>
                        <Button
                          size="sm"
                          onClick={() => copy(errorDetail() || errorMessage())}
                        >
                          {t("home.preview.lark_tools.copy_error_detail")}
                        </Button>
                      </HStack>
                      <Box
                        as="pre"
                        m="$0"
                        p="$2"
                        rounded="$md"
                        bg="$neutral3"
                        whiteSpace="pre-wrap"
                        wordBreak="break-word"
                      >
                        {errorDetail()}
                      </Box>
                    </Show>
                  </VStack>
                ) : status() === "success" ? (
                  t("home.preview.lark_tools.status.success_description")
                ) : (
                  t("home.preview.lark_tools.status.processing_description")
                )}
              </AlertDescription>
            </Alert>
          </Show>
        </Show>
      </VStack>
    </Box>
  )
}

export default LarkTools
