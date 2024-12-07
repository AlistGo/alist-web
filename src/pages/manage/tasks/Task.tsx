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
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import { useT, useFetch } from "~/hooks"
import { PEmptyResp, TaskInfo } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { TasksProps } from "./Tasks"
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
  name: TaskOrderBy | "operation"
  textAlign: "left" | "right" | "center"
  w: any
}

export interface TaskControlCallback {
  setSelected: (id: string, v: boolean) => void
  setExpanded: (id: string, v: boolean) => void
}

export const cols: TaskCol[] = [
  {
    name: "name",
    textAlign: "left",
    w: me().role === 2 ? "calc(100% - 660px)" : "calc(100% - 540px)",
  },
  { name: "creator", textAlign: "center", w: me().role === 2 ? "120px" : "0" },
  { name: "state", textAlign: "center", w: "100px" },
  { name: "progress", textAlign: "left", w: "160px" },
  { name: "operation", textAlign: "right", w: "280px" },
]

export const Task = (props: TaskInfo & TasksProps & TaskControlCallback) => {
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
  return (
    <Show when={!deleted()}>
      <HStack w="$full" p="$2">
        <HStack w={cols[0].w} spacing="$1">
          <Checkbox
            // colorScheme="neutral"
            on:click={(e: MouseEvent) => {
              e.stopPropagation()
            }}
            checked={props.selected}
            onChange={(e: any) => {
              props.setSelected(props.id, e.target.checked as boolean)
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
        >
          <ProgressIndicator color="$info8" rounded="$md" />
          {/* <ProgressLabel /> */}
        </Progress>
        <Flex w={cols[4].w} gap="$1">
          <Spacer />
          <Show when={props.canRetry}>
            <Button
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
            colorScheme="neutral"
            onClick={() => {
              props.setExpanded(props.id, !props.expanded)
            }}
          >
            {props.expanded ? t(`tasks.fold`) : t(`tasks.expand`)}
          </Button>
        </Flex>
      </HStack>
      <Show when={props.expanded}>
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
              <GridItem color="$danger9">{props.error} </GridItem>
            </Show>
          </Grid>
          <Divider />
        </VStack>
      </Show>
    </Show>
  )
}
