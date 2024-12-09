import {
  Badge,
  Button,
  Heading,
  Progress,
  ProgressIndicator,
  Stack,
  Text,
  useColorModeValue,
  VStack,
} from "@hope-ui/solid"
import { createSignal, Show } from "solid-js"
import { useT, useFetch } from "~/hooks"
import { PEmptyResp, TaskInfo } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { TasksProps } from "./Tasks"

export enum TaskStateEnum {
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
  return <Badge colorScheme={roleColors[props.role] as any}>{props.name}</Badge>
}

export const TaskState = (props: { state: number }) => {
  const t = useT()
  return (
    <Badge colorScheme={StateMap[props.state] ?? "info"}>
      {t(`tasks.state.${props.state}`)}
    </Badge>
  )
}

export const Task = (props: TaskInfo & TasksProps) => {
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
  return (
    <Show when={!deleted()}>
      <Stack
        bgColor={useColorModeValue("$background", "$neutral3")()}
        w="$full"
        overflowX="auto"
        shadow="$md"
        rounded="$lg"
        p="$2"
        direction={{ "@initial": "column", "@xl": "row" }}
        spacing="$2"
      >
        <VStack w="$full" alignItems="start" spacing="$1">
          <Heading
            size="sm"
            css={{
              wordBreak: "break-all",
            }}
          >
            {props.name}
          </Heading>
          <Creator name={props.creator} role={props.creator_role} />
          <TaskState state={props.state} />
          <Text
            css={{
              wordBreak: "break-all",
            }}
          >
            {props.status}
          </Text>
          <Show when={props.error}>
            <Text color="$danger9" css={{ wordBreak: "break-all" }}>
              {props.error}
            </Text>
          </Show>
          <Progress
            w="$full"
            trackColor="$info3"
            rounded="$full"
            size="sm"
            value={props.progress}
          >
            <ProgressIndicator color="$info8" rounded="$md" />
            {/* <ProgressLabel /> */}
          </Progress>
        </VStack>

        <Stack
          direction={{ "@initial": "row", "@xl": "column" }}
          justifyContent={{ "@xl": "center" }}
          spacing="$1"
        >
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
        </Stack>
      </Stack>
    </Show>
  )
}
