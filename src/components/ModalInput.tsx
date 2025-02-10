import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  FormHelperText,
} from "@hope-ui/solid"
import {
  createSignal,
  JSXElement,
  Show,
  createEffect,
  onCleanup,
} from "solid-js"
import { useT } from "~/hooks"
import { notify } from "~/utils"
export type ModalInputProps = {
  opened: boolean
  onClose: () => void
  title: string
  isRenamingFile?: boolean
  onSubmit?: (text: string) => void
  type?: string
  defaultValue?: string
  loading?: boolean
  tips?: string
  topSlot?: JSXElement
  bottomSlot?: JSXElement
  footerSlot?: JSXElement
  onDrop?: (e: DragEvent, setValue: (value: string) => void) => void
}
export const ModalInput = (props: ModalInputProps) => {
  const [value, setValue] = createSignal(props.defaultValue ?? "")
  const t = useT()

  let inputRef: HTMLInputElement | HTMLTextAreaElement

  const handleFocus = () => {
    // Find the position of the first dot (".") in the value
    const dotIndex = value().lastIndexOf(".")

    setTimeout(() => {
      // If a dot exists and it is not the first character, select from start to dotIndex
      // And it must be a file, not a folder
      if (dotIndex > 0 && props.isRenamingFile) {
        inputRef.setSelectionRange(0, dotIndex)
      } else {
        // If there's no dot or it's the first character, select the entire value
        inputRef.select()
      }
    }, 10) // To prevent default select behavior from interfering
  }

  createEffect(() => {
    if (inputRef) {
      inputRef.focus()
      handleFocus()
    }

    // Cleanup function to clear the selection range before unmounting
    onCleanup(() => {
      if (inputRef) {
        inputRef.setSelectionRange(0, 0)
      }
    })
  })

  createEffect(() => {
    if (!props.opened) {
      setValue("")
    }
  })

  const submit = () => {
    if (!value()) {
      notify.warning(t("global.empty_input"))
      return
    }
    props.onSubmit?.(value())
  }

  return (
    <Modal
      blockScrollOnMount={false}
      opened={props.opened}
      onClose={props.onClose}
      initialFocus="#modal-input"
    >
      <ModalOverlay />
      <ModalContent onDrop={(e) => props.onDrop?.(e, setValue)}>
        {/* <ModalCloseButton /> */}
        <ModalHeader>{t(props.title)}</ModalHeader>
        <ModalBody>
          <Show when={props.topSlot}>{props.topSlot}</Show>
          <Show
            when={props.type === "text"}
            fallback={
              <Input
                id="modal-input"
                type={props.type}
                value={value()}
                ref={(el) => (inputRef = el)}
                onInput={(e) => {
                  setValue(e.currentTarget.value)
                }}
                onFocus={handleFocus}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    submit()
                  }
                }}
              />
            }
          >
            <Textarea
              id="modal-input"
              value={value()}
              ref={(el) => (inputRef = el)}
              onInput={(e) => {
                setValue(e.currentTarget.value)
              }}
              onFocus={handleFocus}
            />
          </Show>
          <Show when={props.tips}>
            <FormHelperText>{props.tips}</FormHelperText>
          </Show>
          <Show when={props.bottomSlot}>{props.bottomSlot}</Show>
        </ModalBody>
        <ModalFooter display="flex" gap="$2">
          <Show when={props.footerSlot}>{props.footerSlot}</Show>
          <Button onClick={props.onClose} colorScheme="neutral">
            {t("global.cancel")}
          </Button>
          <Button loading={props.loading} onClick={() => submit()}>
            {t("global.ok")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
