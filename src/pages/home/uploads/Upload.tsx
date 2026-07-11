import {
  VStack,
  Input,
  Heading,
  HStack,
  IconButton,
  Checkbox,
  Text,
  Badge,
  Progress,
  ProgressIndicator,
  Button,
  Box,
} from "@hope-ui/solid"
import { createSignal, For, onCleanup, Show } from "solid-js"
import { usePath, useRouter, useT } from "~/hooks"
import { getMainColor } from "~/store"
import {
  RiDocumentFolderUploadFill,
  RiDocumentFileUploadFill,
} from "solid-icons/ri"
import { Resp, TaskInfo } from "~/types"
import { getFileSize, joinBase, notify, pathJoin, r } from "~/utils"
import { asyncPool } from "~/utils/async_pool"
import { createStore } from "solid-js/store"
import { UploadFileProps, StatusBadge } from "./types"
import { File2Upload, traverseFileTree } from "./util"
import { SelectWrapper } from "~/components"
import { getUploads } from "./uploads"
import { TaskState } from "~/pages/manage/tasks/Task"
import { uploadWithChunkPolicy } from "./chunk"

enum TaskStateEnum {
  Pending,
  Running,
  Succeeded,
  Canceling,
  Canceled,
  Errored,
  Failing,
  Failed,
  WaitingRetry,
  BeforeRetry,
}

const UploadFile = (props: UploadFileProps) => {
  const t = useT()
  return (
    <VStack
      w="$full"
      spacing="$1"
      rounded="$lg"
      border="1px solid $neutral7"
      alignItems="start"
      p="$2"
      _hover={{
        border: `1px solid ${getMainColor()}`,
      }}
    >
      <Text
        css={{
          wordBreak: "break-all",
        }}
      >
        {props.path}
      </Text>
      <HStack spacing="$2" flexWrap="wrap">
        <Show
          when={props.task}
          fallback={
            <Badge colorScheme={StatusBadge[props.status]}>
              {t(`home.upload.${props.status}`)}
            </Badge>
          }
        >
          <TaskState state={props.task!.state} />
        </Show>
        <Text>{getFileSize(props.speed)}/s</Text>
      </HStack>
      <Show when={props.task_id}>
        <Badge colorScheme="accent">
          {t("home.upload.task_id", { id: props.task_id! })}
        </Badge>
      </Show>
      <Progress
        w="$full"
        trackColor="$info3"
        rounded="$full"
        value={props.progress}
        size="sm"
      >
        <ProgressIndicator color={getMainColor()} rounded="$md" />
        {/* <ProgressLabel /> */}
      </Progress>
      <Show when={props.msg}>
        <Text color="$danger10">{props.msg}</Text>
      </Show>
    </VStack>
  )
}

const Upload = () => {
  const t = useT()
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [drag, setDrag] = createSignal(false)
  const [uploading, setUploading] = createSignal(false)
  const [asTask, setAsTask] = createSignal(false)
  const [overwrite, setOverwrite] = createSignal(false)
  const [rapid, setRapid] = createSignal(true)
  const [uploadFiles, setUploadFiles] = createStore<{
    uploads: UploadFileProps[]
  }>({
    uploads: [],
  })
  const taskPollers = new Map<string, number>()
  const allDone = () => {
    return uploadFiles.uploads.every(({ status }) =>
      ["success", "error"].includes(status),
    )
  }
  const hasBackgroundTask = () =>
    uploadFiles.uploads.some(({ task_id }) => !!task_id)
  let fileInput!: HTMLInputElement
  let folderInput!: HTMLInputElement
  const clearTaskPoller = (path: string) => {
    const timer = taskPollers.get(path)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      taskPollers.delete(path)
    }
  }
  const scheduleTaskPoll = (path: string, taskID: string, delay = 1500) => {
    clearTaskPoller(path)
    const timer = window.setTimeout(() => {
      void pollTask(path, taskID)
    }, delay)
    taskPollers.set(path, timer)
  }
  const setUpload = (path: string, key: keyof UploadFileProps, value: any) => {
    setUploadFiles("uploads", (upload) => upload.path === path, key, value)
  }
  const syncTask = (path: string, task: TaskInfo) => {
    setUpload(path, "task", task)
    setUpload(path, "task_id", task.id)
    setUpload(path, "progress", task.progress)
    if (task.state === TaskStateEnum.Succeeded) {
      clearTaskPoller(path)
      setUpload(path, "status", "success")
      setUpload(path, "progress", 100)
      setUpload(path, "msg", undefined)
      refresh(undefined, true)
      return
    }
    if (
      task.state === TaskStateEnum.Failed ||
      task.state === TaskStateEnum.Canceled
    ) {
      clearTaskPoller(path)
      setUpload(path, "status", "error")
      setUpload(path, "msg", task.error || task.status)
      return
    }
    setUpload(path, "status", "backending")
    setUpload(path, "msg", undefined)
    scheduleTaskPoll(path, task.id)
  }
  const pollTask = async (path: string, taskID: string) => {
    const resp: Resp<TaskInfo> = await r.post(`/task/upload/info?tid=${taskID}`)
    if (resp.code !== 200 || !resp.data) {
      scheduleTaskPoll(path, taskID, 3000)
      return
    }
    syncTask(path, resp.data)
  }
  onCleanup(() => {
    taskPollers.forEach((timer) => window.clearTimeout(timer))
    taskPollers.clear()
  })
  const handleAddFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    for (const file of files) {
      const upload = File2Upload(file)
      setUploadFiles("uploads", (uploads) => [...uploads, upload])
    }
    for await (const ms of asyncPool(3, files, handleFile)) {
      console.log(ms)
    }
    refresh(undefined, true)
  }
  const uploaders = getUploads()
  const [curUploader, setCurUploader] = createSignal(uploaders[0])
  const handleFile = async (file: File) => {
    const path = file.webkitRelativePath ? file.webkitRelativePath : file.name
    setUpload(path, "status", "uploading")
    const uploadPath = pathJoin(pathname(), path)
    try {
      const result = await uploadWithChunkPolicy(
        uploadPath,
        file,
        (key, value) => {
          setUpload(path, key, value)
        },
        asTask(),
        overwrite(),
        rapid(),
        curUploader().upload,
      )
      if (result.error) {
        setUpload(path, "status", "error")
        setUpload(path, "msg", result.error.message)
      } else if (result.task) {
        syncTask(path, result.task)
      } else {
        setUpload(path, "status", "success")
        setUpload(path, "progress", 100)
      }
    } catch (e: any) {
      console.error(e)
      setUpload(path, "status", "error")
      setUpload(path, "msg", e.message)
    }
  }
  return (
    <VStack w="$full" pb="$2" spacing="$2">
      <Show
        when={!uploading()}
        fallback={
          <>
            <HStack spacing="$2">
              <Show when={hasBackgroundTask()}>
                <Button
                  colorScheme="primary"
                  onClick={() => {
                    window.open(joinBase("/@manage/tasks/upload"), "_blank")
                  }}
                >
                  {t("home.upload.open_task_center")}
                </Button>
              </Show>
              <Button
                colorScheme="accent"
                onClick={() => {
                  setUploadFiles("uploads", (_uploads) =>
                    _uploads.filter(
                      ({ status }) => !["success", "error"].includes(status),
                    ),
                  )
                  console.log(uploadFiles.uploads)
                }}
              >
                {t("home.upload.clear_done")}
              </Button>
              <Show when={allDone()}>
                <Button
                  onClick={() => {
                    setUploading(false)
                  }}
                >
                  {t("home.upload.back")}
                </Button>
              </Show>
            </HStack>
            <For each={uploadFiles.uploads}>
              {(upload) => <UploadFile {...upload} />}
            </For>
          </>
        }
      >
        <Input
          type="file"
          multiple
          ref={fileInput!}
          display="none"
          onChange={(e) => {
            // @ts-ignore
            handleAddFiles(Array.from(e.target.files ?? []))
          }}
        />
        <Input
          type="file"
          multiple
          // @ts-ignore
          webkitdirectory
          ref={folderInput!}
          display="none"
          onChange={(e) => {
            // @ts-ignore
            handleAddFiles(Array.from(e.target.files ?? []))
          }}
        />
        <VStack
          w="$full"
          justifyContent="center"
          border={`2px dashed ${drag() ? getMainColor() : "$neutral8"}`}
          rounded="$lg"
          onDragOver={(e: DragEvent) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => {
            setDrag(false)
          }}
          onDrop={async (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setDrag(false)
            const res: File[] = []
            const items = Array.from(e.dataTransfer?.items ?? [])
            const files = Array.from(e.dataTransfer?.files ?? [])
            let itemLength = items.length
            const folderEntries = []
            for (let i = 0; i < itemLength; i++) {
              const item = items[i]
              const entry = item.webkitGetAsEntry()
              if (entry?.isFile) {
                res.push(files[i])
              } else if (entry?.isDirectory) {
                folderEntries.push(entry)
              }
            }
            for (const entry of folderEntries) {
              const innerFiles = await traverseFileTree(entry)
              res.push(...innerFiles)
            }
            if (res.length === 0) {
              notify.warning(t("home.upload.no_files_drag"))
            }
            handleAddFiles(res)
          }}
          spacing="$4"
          // py="$4"
          h="$56"
        >
          <Show
            when={!drag()}
            fallback={<Heading>{t("home.upload.release")}</Heading>}
          >
            <Heading>{t("home.upload.upload-tips")}</Heading>
            <Box w="30%">
              <SelectWrapper
                value={curUploader().name}
                onChange={(name) => {
                  setCurUploader(
                    uploaders.find((uploader) => uploader.name === name)!,
                  )
                }}
                options={uploaders.map((uploader) => {
                  return {
                    label: uploader.name,
                    value: uploader.name,
                  }
                })}
              />
            </Box>
            <HStack spacing="$4">
              <IconButton
                compact
                size="xl"
                aria-label={t("home.upload.upload_folder")}
                colorScheme="accent"
                icon={<RiDocumentFolderUploadFill />}
                onClick={() => {
                  folderInput.click()
                }}
              />
              <IconButton
                compact
                size="xl"
                aria-label={t("home.upload.upload_files")}
                icon={<RiDocumentFileUploadFill />}
                onClick={() => {
                  fileInput.click()
                }}
              />
            </HStack>
            <HStack spacing="$4">
              <Checkbox
                checked={asTask()}
                onChange={() => {
                  setAsTask(!asTask())
                }}
              >
                {t("home.upload.add_as_task")}
              </Checkbox>
              <Checkbox
                checked={overwrite()}
                onChange={() => {
                  setOverwrite(!overwrite())
                }}
              >
                {t("home.conflict_policy.overwrite_existing")}
              </Checkbox>
              <Checkbox
                checked={rapid()}
                onChange={() => {
                  setRapid(!rapid())
                }}
              >
                {t("home.upload.try_rapid")}
              </Checkbox>
            </HStack>
          </Show>
        </VStack>
      </Show>
    </VStack>
  )
}

export default Upload
