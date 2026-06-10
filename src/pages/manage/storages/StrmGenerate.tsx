import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  ProgressIndicator,
  Text,
  VStack,
} from "@hope-ui/solid"
import { createSignal, JSX, onCleanup, Show } from "solid-js"
import { useT } from "~/hooks"
import { r, notify, handleResp } from "~/utils"

type TaskInfo = { id: string; progress: number; state: number; error: string }
type Status = "idle" | "running" | "done" | "failed"

export type StrmGenerateProps = {
  path: string
  // render-prop trigger: receives `start` to kick off generation. Lets callers
  // render either a Button (storages page) or a toolbar icon while sharing the
  // progress dialog + polling logic below.
  children: (api: { start: () => void }) => JSX.Element
}

export type StrmGenerateButtonProps = {
  path: string
  size?: "xs" | "sm" | "md" | "lg"
  colorScheme?: string
}

export const StrmGenerate = (props: StrmGenerateProps) => {
  const t = useT()
  const [opened, setOpened] = createSignal(false)
  const [progress, setProgress] = createSignal(0)
  const [status, setStatus] = createSignal<Status>("idle")
  const [err, setErr] = createSignal("")
  let timer: ReturnType<typeof setInterval> | undefined
  // generation increments on every start/close/cleanup so any in-flight request
  // or interval tick that resolves late can detect it is stale and bail out.
  let generation = 0

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
  onCleanup(() => {
    generation++
    stop()
  })

  const fail = (msg: string) => {
    stop()
    setStatus("failed")
    setErr(msg)
  }

  const poll = (gen: number, tid: string) => {
    stop()
    timer = setInterval(async () => {
      const resp = await r.post(`/admin/task/strm_generate/info?tid=${tid}`)
      if (gen !== generation) return
      handleResp(
        resp,
        (info: TaskInfo) => {
          if (gen !== generation) return
          if (info.error) {
            fail(info.error)
            return
          }
          setProgress(Math.floor(info.progress))
          if (info.progress >= 100) {
            stop()
            setStatus("done")
            notify.success(t("global.generate_strm_done"))
          }
        },
        (msg: string) => {
          if (gen === generation) fail(msg)
        },
      )
    }, 1000)
  }

  const start = async () => {
    stop()
    const gen = ++generation
    setOpened(true)
    setStatus("running")
    setProgress(0)
    setErr("")
    const resp = await r.post("/admin/strm/generate", { path: props.path })
    if (gen !== generation) return
    handleResp(
      resp,
      (data: { task: TaskInfo }) => {
        if (gen !== generation) return
        notify.info(t("global.generate_strm_start"))
        poll(gen, data.task.id)
      },
      (msg: string) => {
        if (gen === generation) fail(msg)
      },
    )
  }

  // hide just closes the foreground window; the backend task keeps running and
  // polling continues, so the success toast still fires and progress stays
  // visible in the task center.
  const hide = () => setOpened(false)

  // close is used once the task reached a terminal state: stop polling and reset.
  const close = () => {
    generation++
    stop()
    setOpened(false)
  }

  const isRunning = () => status() === "running"
  const dismiss = () => (isRunning() ? hide() : close())

  const statusText = () => {
    switch (status()) {
      case "failed":
        return t("global.generate_strm_failed") + ": " + err()
      case "done":
        return t("global.generate_strm_done")
      case "running":
        return t("global.generate_strm_progress") + " " + progress() + "%"
      default:
        return ""
    }
  }

  return (
    <>
      {props.children({ start })}
      <Modal opened={opened()} onClose={dismiss} blockScrollOnMount={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t("global.generate_strm")}</ModalHeader>
          <ModalBody>
            <VStack spacing="$3" alignItems="stretch" py="$2">
              <Progress value={progress()} trackColor="$neutral4">
                <ProgressIndicator color="$success9" />
              </Progress>
              <Text>{statusText()}</Text>
              <Show when={isRunning()}>
                <Text size="sm" color="$neutral10">
                  {t("global.generate_strm_background")}
                </Text>
              </Show>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="neutral" onClick={dismiss}>
              {isRunning() ? t("global.generate_strm_hide") : t("global.close")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export const StrmGenerateButton = (props: StrmGenerateButtonProps) => {
  const t = useT()
  return (
    <StrmGenerate path={props.path}>
      {({ start }) => (
        <Button
          size={props.size}
          colorScheme={(props.colorScheme as any) ?? "accent"}
          onClick={start}
        >
          {t("global.generate_strm")}
        </Button>
      )}
    </StrmGenerate>
  )
}
