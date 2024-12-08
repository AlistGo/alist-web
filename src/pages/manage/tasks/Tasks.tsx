import { Button, Heading, HStack, VStack } from "@hope-ui/solid"
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import { Paginator } from "~/components"
import { useFetch, useT } from "~/hooks"
import { PEmptyResp, PResp, TaskInfo } from "~/types"
import { handleResp, r } from "~/utils"
import { Task, TaskStateEnum } from "./Task"

export interface TasksProps {
  type: string
  done: string
  canRetry?: boolean
}
export const Tasks = (props: TasksProps) => {
  const t = useT()
  const [loading, get] = useFetch(
    (): PResp<TaskInfo[]> => r.get(`/task/${props.type}/${props.done}`),
  )
  const [tasks, setTasks] = createSignal<TaskInfo[]>([])
  let compareFn: (a: TaskInfo, b: TaskInfo) => number
  const refresh = async () => {
    const resp = await get()
    handleResp(resp, (data) => setTasks(data?.sort(compareFn) ?? []))
  }
  if (props.done === "undone") {
    compareFn = (a, b) => {
      if (a.state === b.state) return a.id > b.id ? 1 : -1
      if (a.state == TaskStateEnum.Pending) return 1
      if (b.state == TaskStateEnum.Pending) return -1
      return a.state > b.state ? 1 : -1
    }

    const interval = setInterval(refresh, 2000)
    onCleanup(() => clearInterval(interval))
  } else compareFn = (a, b) => (a.id > b.id ? 1 : -1)
  refresh()
  const [clearDoneLoading, clearDone] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/clear_done`),
  )
  const [clearSucceededLoading, clearSucceeded] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/clear_succeeded`),
  )
  const [retryFailedLoading, retryFailed] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/retry_failed`),
  )
  const [page, setPage] = createSignal(1)
  const pageSize = 20
  const curTasks = createMemo(() => {
    const start = (page() - 1) * pageSize
    const end = start + pageSize
    return tasks().slice(start, end)
  })
  return (
    <VStack w="$full" alignItems="start" spacing="$2">
      <Heading size="lg">{t(`tasks.${props.done}`)}</Heading>
      <Show when={props.done === "done"}>
        <HStack gap="$2" flexWrap="wrap">
          <Button colorScheme="accent" loading={loading()} onClick={refresh}>
            {t(`global.refresh`)}
          </Button>
          <Button
            loading={retryFailedLoading()}
            onClick={async () => {
              const resp = await retryFailed()
              handleResp(resp, () => refresh())
            }}
          >
            {t(`tasks.retry_failed`)}
          </Button>
          <Button
            colorScheme="danger"
            loading={clearDoneLoading()}
            onClick={async () => {
              const resp = await clearDone()
              handleResp(resp, () => refresh())
            }}
          >
            {t(`global.clear`)}
          </Button>
          <Button
            colorScheme="success"
            loading={clearSucceededLoading()}
            onClick={async () => {
              const resp = await clearSucceeded()
              handleResp(resp, () => refresh())
            }}
          >
            {t(`tasks.clear_succeeded`)}
          </Button>
        </HStack>
      </Show>
      <VStack w="$full" spacing="$2">
        <For each={curTasks()}>{(task) => <Task {...task} {...props} />}</For>
      </VStack>
      <Paginator
        total={tasks().length}
        defaultPageSize={pageSize}
        onChange={(p) => {
          setPage(p)
        }}
      />
    </VStack>
  )
}

export const TypeTasks = (props: { type: string; canRetry?: boolean }) => {
  const t = useT()
  return (
    <VStack w="$full" alignItems="start" spacing="$4">
      <Heading size="xl">{t(`tasks.${props.type}`)}</Heading>
      <VStack w="$full" spacing="$2">
        <For each={["undone", "done"]}>
          {(done) => (
            <Tasks type={props.type} done={done} canRetry={props.canRetry} />
          )}
        </For>
      </VStack>
    </VStack>
  )
}
