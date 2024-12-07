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
  Setter,
  Show,
} from "solid-js"
import { Paginator } from "~/components"
import { useFetch, useT } from "~/hooks"
import { PEmptyResp, PResp, TaskInfo } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { TaskCol, cols, Task, TaskOrderBy } from "./Task"
import { me } from "~/store"

export interface TaskNameAnalyzer {
  regex: RegExp
  title: (matches: RegExpMatchArray) => string
  attrs: { [attr: string]: (matches: RegExpMatchArray) => JSX.Element }
}

export interface TasksProps {
  type: string
  done: string
  nameAnalyzer: TaskNameAnalyzer
  canRetry?: boolean
}

export interface TaskViewAttribute {
  selected: boolean
  expanded: boolean
}

export const Tasks = (props: TasksProps) => {
  const t = useT()
  const [loading, get] = useFetch(
    (): PResp<TaskInfo[]> => r.get(`/task/${props.type}/${props.done}`),
  )
  const [tasks, setTasks] = createSignal<(TaskInfo & TaskViewAttribute)[]>([])
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
    progress: (a, b) => (a.progress < b.progress ? 1 : -1),
  }
  const curSorter = createMemo(() => {
    return (a: TaskInfo, b: TaskInfo) =>
      (orderReverse() ? -1 : 1) * sorter[orderBy()](a, b)
  })
  const refresh = async () => {
    const resp = await get()
    const selectMap: Record<string, boolean> = {}
    const expandMap: Record<string, boolean> = {}
    for (const task of tasks()) {
      selectMap[task.id] = task.selected ?? false
      expandMap[task.id] = task.expanded ?? false
    }
    handleResp(resp, (data) =>
      setTasks(
        data
          ?.map((task) => {
            return {
              ...task,
              selected: selectMap[task.id] ?? false,
              expanded: expandMap[task.id] ?? false,
            }
          })
          .sort(curSorter()) ?? [],
      ),
    )
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
  const [regexFilterValue, setRegexFilterValue] = createSignal("")
  const [regexFilter, setRegexFilter] = createSignal(new RegExp(""))
  const [regexFilterCompileFailed, setRegexFilterCompileFailed] =
    createSignal(false)
  createEffect(() => {
    try {
      setRegexFilter(new RegExp(regexFilterValue()))
      setRegexFilterCompileFailed(false)
    } catch (_) {
      setRegexFilterCompileFailed(true)
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
  const allChecked = createMemo(() => {
    return filteredTask()
      .map((task) => task.selected)
      .every(Boolean)
  })
  const isIndeterminate = createMemo(() => {
    return (
      filteredTask()
        .map((task) => task.selected)
        .some(Boolean) && !allChecked()
    )
  })
  const setSelected = (id: string, v: boolean) => {
    setTasks(
      tasks().map((task) => {
        if (task.id === id) task.selected = v
        return task
      }),
    )
  }
  const selectAll = (v: boolean) => {
    const filter = taskFilter()
    setTasks(
      tasks().map((task) => {
        if (filter(task)) task.selected = v
        return task
      }),
    )
  }
  const allExpanded = createMemo(() => {
    return filteredTask()
      .map((task) => task.expanded)
      .every(Boolean)
  })
  const setExpanded = (id: string, v: boolean) => {
    setTasks(
      tasks().map((task) => {
        if (task.id === id) task.expanded = v
        return task
      }),
    )
  }
  const expandedAll = (v: boolean) => {
    const filter = taskFilter()
    setTasks(
      tasks().map((task) => {
        if (filter(task)) task.expanded = v
        return task
      }),
    )
  }
  const doWithSelected = (
    loadingSetter: Setter<boolean>,
    fetchFunc: (task: TaskInfo) => PEmptyResp,
    successCallback?: () => void,
  ) => {
    return async () => {
      loadingSetter(true)
      const promises = filteredTask()
        .filter((task) => task.selected)
        .map(fetchFunc)
      let success = true
      for (const p of promises) {
        const resp = await p
        if (resp.code !== 200) {
          success = false
          handleResp(resp)
          if (resp.code === 401) return
        }
      }
      loadingSetter(false)
      if (success) successCallback?.()
    }
  }
  const [retrySelectedLoading, setRetrySelectedLoading] = createSignal(false)
  const retrySelected = doWithSelected(
    setRetrySelectedLoading,
    (task) => {
      return r.post(`/task/${props.type}/retry?tid=${task.id}`)
    },
    () => {
      notify.info(t("tasks.retry"))
      refresh()
    },
  )
  const [operateSelectedLoading, setOperateSelectedLoading] =
    createSignal(false)
  const operateSelected = doWithSelected(
    setOperateSelectedLoading,
    (task) => {
      return r.post(`/task/${props.type}/${operateName}?tid=${task.id}`)
    },
    () => {
      notify.success(t("global.delete_success"))
      refresh()
    },
  )
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
            onClick={retrySelected}
          >
            {t(`tasks.retry_selected`)}
          </Button>
        </Show>
        <Button
          colorScheme="warning"
          loading={operateSelectedLoading()}
          onClick={operateSelected}
        >
          {t(`tasks.${operateName}_selected`)}
        </Button>
        <Input
          width="auto"
          placeholder={t(`tasks.filter`)}
          value={regexFilterValue()}
          onInput={(e: any) => setRegexFilterValue(e.target.value as string)}
          invalid={regexFilterCompileFailed()}
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
              checked={allChecked()}
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
          <Flex w={cols[4].w} gap="$2">
            <Spacer />
            <Text {...itemProps(cols[4])}>
              {t(`tasks.attr.${cols[4].name}`)}
            </Text>
            <Button
              size="xs"
              colorScheme="neutral"
              onClick={() => expandedAll(!allExpanded())}
              disabled={filteredTask().length === 0}
            >
              {allExpanded() ? t(`tasks.fold_all`) : t(`tasks.expand_all`)}
            </Button>
          </Flex>
        </HStack>
        <For each={curTasks()}>
          {(_, i) => (
            <Task
              {...curTasks()[i()]}
              {...props}
              setSelected={setSelected}
              setExpanded={setExpanded}
            />
          )}
        </For>
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
