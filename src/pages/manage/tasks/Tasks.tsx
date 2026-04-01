import {
  Button,
  Checkbox,
  Flex,
  Heading,
  HStack,
  Input,
  Spacer,
  Text,
  VStack,
} from "@hope-ui/solid"
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  onCleanup,
  Show,
} from "solid-js"
import { Paginator } from "~/components"
import { useFetch, useT } from "~/hooks"
import { PEmptyResp, PResp, TaskInfo } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { TaskCol, cols, Task, TaskOrderBy, TaskLocal } from "./Task"
import { me } from "~/store"

export interface TaskNameAnalyzer {
  regex: RegExp
  title: (matches: RegExpMatchArray, task?: TaskInfo) => string
  attrs: {
    [attr: string]: (
      matches: RegExpMatchArray,
      task?: TaskInfo,
    ) => JSX.Element | undefined
  }
  statusText?: (task: TaskInfo) => JSX.Element | string | undefined
}

export interface TasksProps {
  type: string
  done: string
  nameAnalyzer: TaskNameAnalyzer
  canRetry?: boolean
}

export interface TaskViewAttribute {
  curFetchTime: number
  prevFetchTime?: number
  prevProgress?: number
}

export interface TaskLocalContainer {
  local: TaskLocal
}

export interface TaskLocalSetter {
  setLocal: (l: TaskLocal) => void
}

export type TaskAttribute = TaskInfo & TaskViewAttribute & TaskLocalContainer

export const Tasks = (props: TasksProps) => {
  const t = useT()
  const [loading, get] = useFetch(
    (): PResp<TaskInfo[]> => r.get(`/task/${props.type}/${props.done}`),
  )
  const [tasks, setTasks] = createSignal<TaskAttribute[]>([])
  const [orderBy, setOrderBy] = createSignal<TaskOrderBy>("name")
  const [orderReverse, setOrderReverse] = createSignal(false)
  const sorter: Record<TaskOrderBy, (a: TaskInfo, b: TaskInfo) => number> = {
    name: (a, b) => (a.name > b.name ? 1 : -1),
    creator: (a, b) =>
      a.creator === b.creator
        ? a.id > b.id
          ? 1
          : -1
        : a.creator > b.creator
          ? 1
          : -1,
    state: (a, b) =>
      a.state === b.state ? (a.id > b.id ? 1 : -1) : a.state > b.state ? 1 : -1,
    progress: (a, b) =>
      a.progress === b.progress
        ? a.id > b.id
          ? 1
          : -1
        : a.progress < b.progress
          ? 1
          : -1,
  }
  const curSorter = createMemo(() => {
    return (a: TaskInfo, b: TaskInfo) =>
      (orderReverse() ? -1 : 1) * sorter[orderBy()](a, b)
  })
  const refresh = async () => {
    const resp = await get()
    handleResp(resp, (data) => {
      const fetchTime = new Date().getTime()
      const curFetchTimeMap: Record<string, number> = {}
      const prevFetchTimeMap: Record<string, number | undefined> = {}
      const curProgressMap: Record<string, number> = {}
      const prevProgressMap: Record<string, number | undefined> = {}
      const taskLocalMap: Record<string, TaskLocal> = {}
      for (const task of tasks()) {
        curFetchTimeMap[task.id] = task.curFetchTime
        prevFetchTimeMap[task.id] = task.prevFetchTime
        curProgressMap[task.id] = task.progress
        prevProgressMap[task.id] = task.prevProgress
        taskLocalMap[task.id] = task.local
      }
      setTasks(
        data
          ?.map((task) => {
            let prevFetchTime: number | undefined
            let prevProgress: number | undefined
            if (task.progress === curProgressMap[task.id]) {
              prevFetchTime = prevFetchTimeMap[task.id] // may be undefined
              prevProgress = prevProgressMap[task.id] // may be undefined
            } else {
              prevFetchTime = curFetchTimeMap[task.id]
              prevProgress = curProgressMap[task.id]
            }
            const taskLocal = taskLocalMap[task.id] ?? {
              selected: false,
              expanded: false,
            }
            return {
              ...task,
              curFetchTime: fetchTime,
              prevFetchTime: prevFetchTime,
              prevProgress: prevProgress,
              local: taskLocal,
            }
          })
          .sort(curSorter()) ?? [],
      )
    })
  }
  refresh()
  if (props.done === "undone") {
    const interval = setInterval(refresh, 2000)
    onCleanup(() => clearInterval(interval))
  }
  const [clearDoneLoading, clearDone] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/clear_done`),
  )
  const [clearSucceededLoading, clearSucceeded] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/clear_succeeded`),
  )
  const [retryFailedLoading, retryFailed] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/retry_failed`),
  )
  console.log("props", props.type)

  const [regexFilterValue, setRegexFilterValue] = createSignal("")
  const [regexFilter, setRegexFilter] = createSignal(new RegExp(""))
  const [regexCompileFailed, setRegexCompileFailed] = createSignal(false)
  createEffect(() => {
    try {
      setRegexFilter(new RegExp(regexFilterValue()))
      setRegexCompileFailed(false)
    } catch (_) {
      setRegexCompileFailed(true)
    }
  })
  const [showOnlyMine, setShowOnlyMine] = createSignal(me().role !== 2)
  const taskFilter = createMemo(() => {
    const regex = regexFilter()
    const mine = showOnlyMine()
    return (task: TaskInfo): boolean =>
      regex.test(task.name) && (!mine || task.creator === me().username)
  })
  const filteredTask = createMemo(() => {
    return tasks().filter(taskFilter())
  })
  const allSelected = createMemo(() =>
    filteredTask()
      .map((task) => task.local.selected)
      .every(Boolean),
  )
  const isIndeterminate = createMemo(
    () =>
      filteredTask()
        .map((task) => task.local.selected)
        .some(Boolean) && !allSelected(),
  )
  const selectAll = (v: boolean) =>
    setTasks(
      tasks().map((task) => {
        if (taskFilter()(task)) {
          task.local.selected = v
        }
        return task
      }),
    )
  const allExpanded = createMemo(() =>
    filteredTask()
      .map((task) => task.local.expanded)
      .every(Boolean),
  )
  const expandAll = (v: boolean) =>
    setTasks(
      tasks().map((task) => {
        if (taskFilter()(task)) {
          task.local.expanded = v
        }
        return task
      }),
    )
  const getSelectedId = () =>
    filteredTask()
      .filter((task) => task.local.selected)
      .map((task) => task.id)
  const [retrySelectedLoading, retrySelected] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/retry_some`, getSelectedId()),
  )
  const [operateSelectedLoading, operateSelected] = useFetch(
    (): PEmptyResp =>
      r.post(`/task/${props.type}/${operateName}_some`, getSelectedId()),
  )
  const notifyIndividualError = (msg: Record<string, string>) => {
    Object.entries(msg).forEach(([key, value]) => {
      notify.error(`${key}: ${value}`)
    })
  }
  const [page, setPage] = createSignal(1)
  const pageSize = 20
  const operateName = props.done === "undone" ? "cancel" : "delete"
  const curTasks = createMemo(() => {
    const start = (page() - 1) * pageSize
    const end = start + pageSize
    return filteredTask().slice(start, end)
  })
  const itemProps = (col: TaskCol) => {
    return {
      fontWeight: "bold",
      fontSize: "$sm",
      color: "$neutral11",
      textAlign: col.textAlign as any,
    }
  }
  const itemPropsSort = (col: TaskCol) => {
    return {
      cursor: "pointer",
      onClick: () => {
        if (orderBy() === col.name) {
          setOrderReverse(!orderReverse())
        } else {
          batch(() => {
            setOrderBy(col.name as TaskOrderBy)
            setOrderReverse(false)
          })
        }
        refresh()
      },
    }
  }
  const getLocalSetter = (id: string) => {
    return (l: TaskLocal) =>
      setTasks(
        tasks().map((t) => {
          if (t.id === id) {
            t.local = l
          }
          return t
        }),
      )
  }
  return (
    <VStack w="$full" alignItems="start" spacing="$2">
      <Heading size="lg">{t(`tasks.${props.done}`)}</Heading>
      <HStack gap="$2" flexWrap="wrap">
        <Show when={props.done === "done"}>
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
        </Show>
        <Show when={props.canRetry}>
          <Button
            colorScheme="primary"
            loading={retrySelectedLoading()}
            onClick={async () => {
              const resp = await retrySelected()
              handleResp(resp, (data) => {
                notifyIndividualError(data)
                refresh()
              })
            }}
          >
            {t(`tasks.retry_selected`)}
          </Button>
        </Show>
        <Button
          colorScheme="warning"
          loading={operateSelectedLoading()}
          onClick={async () => {
            const resp = await operateSelected()
            handleResp(resp, (data) => {
              notifyIndividualError(data)
              refresh()
            })
          }}
        >
          {t(`tasks.${operateName}_selected`)}
        </Button>
        <Input
          width="auto"
          placeholder={t(`tasks.filter`)}
          value={regexFilterValue()}
          onInput={(e: any) => setRegexFilterValue(e.target.value as string)}
          invalid={regexCompileFailed()}
        />
        <Show when={me().role === 2}>
          <Checkbox
            checked={showOnlyMine()}
            onChange={(e: any) => setShowOnlyMine(e.target.checked as boolean)}
          >
            {t(`tasks.show_only_mine`)}
          </Checkbox>
        </Show>
      </HStack>
      <VStack
        w={{ "@initial": "1024px", "@lg": "$full" }}
        overflowX="auto"
        shadow="$md"
        rounded="$lg"
        spacing="$1"
        p="$1"
      >
        <HStack class="title" w="$full" p="$2">
          <HStack w={cols[0].w} spacing="$1">
            <Checkbox
              disabled={filteredTask().length === 0}
              checked={allSelected()}
              indeterminate={isIndeterminate()}
              onChange={(e: any) => selectAll(e.target.checked as boolean)}
            />
            <Text {...itemProps(cols[0])} {...itemPropsSort(cols[0])}>
              {t(`tasks.attr.${cols[0].name}`)}
            </Text>
          </HStack>
          <Show when={me().role === 2}>
            <Text
              w={cols[1].w}
              {...itemProps(cols[1])}
              {...itemPropsSort(cols[1])}
            >
              {t(`tasks.attr.${cols[1].name}`)}
            </Text>
          </Show>
          <Text
            w={cols[2].w}
            {...itemProps(cols[2])}
            {...itemPropsSort(cols[2])}
          >
            {t(`tasks.attr.${cols[2].name}`)}
          </Text>
          <Text
            w={cols[3].w}
            {...itemProps(cols[3])}
            {...itemPropsSort(cols[3])}
          >
            {t(`tasks.attr.${cols[3].name}`)}
          </Text>
          <Text w={cols[4].w} {...itemProps(cols[4])}>
            {t(`tasks.attr.${cols[4].name}`)}
          </Text>
          <Flex w={cols[5].w} gap="$2">
            <Spacer />
            <Text {...itemProps(cols[5])}>
              {t(`tasks.attr.${cols[5].name}`)}
            </Text>
            <Button
              size="xs"
              colorScheme="neutral"
              onClick={() => expandAll(!allExpanded())}
              disabled={filteredTask().length === 0}
            >
              {allExpanded() ? t(`tasks.fold_all`) : t(`tasks.expand_all`)}
            </Button>
          </Flex>
        </HStack>
        {curTasks().map((task) => (
          <Task {...task} {...props} setLocal={getLocalSetter(task.id)} />
        ))}
      </VStack>
      <Paginator
        total={filteredTask().length}
        defaultPageSize={pageSize}
        onChange={(p) => {
          setPage(p)
        }}
      />
    </VStack>
  )
}

export const TypeTasks = (props: {
  type: string
  nameAnalyzer: TaskNameAnalyzer
  canRetry?: boolean
}) => {
  const t = useT()
  return (
    <VStack w="$full" alignItems="start" spacing="$4">
      <Heading size="xl">{t(`tasks.${props.type}`)}</Heading>
      <VStack w="$full" spacing="$2">
        <For each={["undone", "done"]}>
          {(done) => (
            <Tasks
              type={props.type}
              done={done}
              canRetry={props.canRetry}
              nameAnalyzer={props.nameAnalyzer}
            />
          )}
        </For>
      </VStack>
    </VStack>
  )
}
