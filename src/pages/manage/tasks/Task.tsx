import {
  Badge,
  Button,
  Center,
  Checkbox,
  Divider,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Progress,
  ProgressIndicator,
  Spacer,
  Text,
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import { useT, useFetch } from "~/hooks"
import { PEmptyResp } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { TaskAttribute, TaskLocalSetter, TasksProps } from "./Tasks"
import { me } from "~/store"

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

const StateMap: Record<
  string,
  | "primary"
  | "accent"
  | "neutral"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | undefined
> = {
  [TaskStateEnum.Failed]: "danger",
  [TaskStateEnum.Succeeded]: "success",
  [TaskStateEnum.Canceled]: "neutral",
}

const Creator = (props: { name: string; role: number }) => {
  if (props.role < 0) return null
  const roleColors = ["info", "neutral", "accent"]
  return (
    <Badge
      colorScheme={roleColors[props.role] as any}
      css={{
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      }}
    >
      {props.name}
    </Badge>
  )
}

export const TaskState = (props: { state: number }) => {
  const t = useT()
  return (
    <Badge colorScheme={StateMap[props.state] ?? "info"}>
      {t(`tasks.state.${props.state}`)}
    </Badge>
  )
}

export type TaskOrderBy = "name" | "creator" | "state" | "progress"

export interface TaskCol {
  name: TaskOrderBy | "speed" | "operation"
  textAlign: "left" | "right" | "center"
  w: any
}

export const cols: TaskCol[] = [
  {
    name: "name",
    textAlign: "left",
    w: me().role === 2 ? "calc(100% - 660px)" : "calc(100% - 560px)",
  },
  { name: "creator", textAlign: "center", w: me().role === 2 ? "100px" : "0" },
  { name: "state", textAlign: "center", w: "100px" },
  { name: "progress", textAlign: "left", w: "140px" },
  { name: "speed", textAlign: "center", w: "100px" },
  { name: "operation", textAlign: "right", w: "220px" },
]

export interface TaskLocal {
  selected: boolean
  expanded: boolean
}

const toTimeNumber = (n: number) => {
  return Math.floor(n).toString().padStart(2, "0")
}

const getTimeStr = (millisecond: number) => {
  const sec = (millisecond / 1000) % 60
  const min = (millisecond / 1000 / 60) % 60
  const hour = millisecond / 1000 / 3600
  return `${toTimeNumber(hour)}:${toTimeNumber(min)}:${toTimeNumber(sec)}`
}

export const Task = (props: TaskAttribute & TasksProps & TaskLocalSetter) => {
  const t = useT()
  const operateName = props.done === "undone" ? "cancel" : "delete"
  const canRetry = props.done === "done" && props.state === TaskStateEnum.Failed
  const [operateLoading, operate] = useFetch(
    (): PEmptyResp =>
      r.post(`/task/${props.type}/${operateName}?tid=${props.id}`),
  )
  const [retryLoading, retry] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/retry?tid=${props.id}`),
  )
  const [deleted, setDeleted] = createSignal(false)
  const matches: RegExpMatchArray | null = props.name.match(
    props.nameAnalyzer.regex,
  )
  const title =
    matches === null ? props.name : props.nameAnalyzer.title(matches)
  const startTime =
    props.start_time === null ? -1 : new Date(props.start_time).getTime()
  const endTime =
    props.end_time === null
      ? new Date().getTime()
      : new Date(props.end_time).getTime()
  let speedText = "-"
  const parseSpeedText = (timeDelta: number, lengthDelta: number) => {
    let delta = lengthDelta / timeDelta
    let unit = "bytes/s"
    if (delta > 1024) {
      delta /= 1024
      unit = "KB/s"
    }
    if (delta > 1024) {
      delta /= 1024
      unit = "MB/s"
    }
    if (delta > 1024) {
      delta /= 1024
      unit = "GB/s"
    }
    return `${delta.toFixed(2)} ${unit}`
  }
  if (props.done) {
    if (
      props.start_time !== props.end_time &&
      props.progress > 0 &&
      startTime !== -1
    ) {
      const timeDelta = (endTime - startTime) / 1000
      const lengthDelta = (props.total_bytes * props.progress) / 100
      speedText = parseSpeedText(timeDelta, lengthDelta)
    }
  } else if (
    props.prevProgress !== undefined &&
    props.prevFetchTime !== undefined
  ) {
    const timeDelta = (props.curFetchTime - props.prevFetchTime) / 1000
    const lengthDelta =
      ((props.progress - props.prevProgress) * props.total_bytes) / 100
    speedText = parseSpeedText(timeDelta, lengthDelta)
  }
  return (
    <Show when={!deleted()}>
      <HStack w="$full" p="$2">
        <HStack w={cols[0].w} spacing="$1">
          <Checkbox
            // colorScheme="neutral"
            on:click={(e: MouseEvent) => {
              e.stopPropagation()
            }}
            checked={props.local.selected}
            onChange={(e: any) => {
              props.setLocal({
                selected: e.target.checked as boolean,
                expanded: props.local.expanded,
              })
            }}
          />
          <Heading
            size="sm"
            css={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </Heading>
        </HStack>
        <Show when={me().role === 2}>
          <Center w={cols[1].w}>
            <Creator name={props.creator} role={props.creator_role} />
          </Center>
        </Show>
        <Center w={cols[2].w}>
          <TaskState state={props.state} />
        </Center>
        <Progress
          w={cols[3].w}
          trackColor="$info3"
          rounded="$full"
          size="sm"
          value={props.progress}
          mr="$1"
        >
          <ProgressIndicator color="$info8" rounded="$md" />
          {/* <ProgressLabel /> */}
        </Progress>
        <Center w={cols[1].w}>
          <Text
            size="sm"
            css={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {speedText}
          </Text>
        </Center>
        <Flex w={cols[5].w} gap="$1">
          <Spacer />
          <Show when={props.canRetry}>
            <Button
              size="sm"
              disabled={!canRetry}
              display={canRetry ? "block" : "none"}
              loading={retryLoading()}
              onClick={async () => {
                const resp = await retry()
                handleResp(resp, () => {
                  notify.info(t("tasks.retry"))
                  setDeleted(true)
                })
              }}
            >
              {t(`tasks.retry`)}
            </Button>
          </Show>
          <Button
            size="sm"
            colorScheme="danger"
            loading={operateLoading()}
            onClick={async () => {
              const resp = await operate()
              handleResp(resp, () => {
                notify.success(t("global.delete_success"))
                setDeleted(true)
              })
            }}
          >
            {t(`global.${operateName}`)}
          </Button>
          <Button
            size="sm"
            colorScheme="neutral"
            onClick={() => {
              props.setLocal({
                selected: props.local.selected,
                expanded: !props.local.expanded,
              })
            }}
          >
            {props.local.expanded ? t(`tasks.fold`) : t(`tasks.expand`)}
          </Button>
        </Flex>
      </HStack>
      <Show when={props.local.expanded}>
        <VStack
          css={{ wordBreak: "break-all", fontSize: "0.8em" }}
          w="$full"
          pl="$2"
          pr="$2"
        >
          <Grid
            templateColumns="min-content 1fr"
            w="$full"
            columnGap="$4"
            mb="$2"
          >
            <Show when={startTime !== -1}>
              <GridItem
                color="$neutral9"
                textAlign="right"
                css={{ whiteSpace: "nowrap" }}
              >
                {t(`tasks.attr.time_elapsed`)}
              </GridItem>
              <GridItem color="$neutral9">
                {getTimeStr(endTime - startTime)}
              </GridItem>
            </Show>
            <Show when={matches !== null}>
              <For each={Object.entries(props.nameAnalyzer.attrs)}>
                {(entry) => (
                  <>
                    <GridItem
                      color="$neutral9"
                      textAlign="right"
                      css={{ whiteSpace: "nowrap" }}
                    >
                      {entry[0]}
                    </GridItem>
                    <GridItem color="$neutral9">
                      {entry[1](matches as RegExpMatchArray)}
                    </GridItem>
                  </>
                )}
              </For>
            </Show>
            <GridItem
              color="$neutral9"
              textAlign="right"
              css={{ whiteSpace: "nowrap" }}
            >
              {t(`tasks.attr.status`)}
            </GridItem>
            <GridItem color="$neutral9">{props.status}</GridItem>
            <Show when={props.error}>
              <GridItem
                color="$danger9"
                textAlign="right"
                css={{ whiteSpace: "nowrap" }}
              >
                {t(`tasks.attr.err`)}
              </GridItem>
              <GridItem color="$danger9">{props.error}</GridItem>
            </Show>
          </Grid>
          <Divider />
        </VStack>
      </Show>
    </Show>
  )
}
