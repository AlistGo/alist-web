import { Button, useColorMode, VStack } from "@hope-ui/solid"
import { createEffect, createMemo, createSignal, on, Show } from "solid-js"
import { EncodingSelect, MaybeLoading } from "~/components"
import { MonacoEditorLoader } from "~/components/MonacoEditor"
import { useFetch, useFetchText, useParseText, useRouter, useT } from "~/hooks"
import { objStore, userCan } from "~/store"
import { PEmptyResp } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { createShortcut } from "@solid-primitives/keyboard"

function Editor(props: { data?: string | ArrayBuffer; contentType?: string }) {
  const { colorMode } = useColorMode()
  const theme = createMemo(() => {
    return colorMode() === "light" ? "vs" : "vs-dark"
  })
  const { pathname } = useRouter()
  const { isString, text } = useParseText(props.data)
  const [encoding, setEncoding] = createSignal("utf-8")
  const [value, setValue] = createSignal(text(encoding()))
  const t = useT()
  const [loading, save] = useFetch(
    (): PEmptyResp =>
      r.put("/fs/put", value(), {
        headers: {
          "File-Path": encodeURIComponent(pathname()),
          "Content-Type": props.contentType || "text/plain",
        },
      }),
  )
  createEffect(
    on(encoding, (v) => {
      setValue(text(v))
    }),
  )

  async function onSave() {
    const resp = await save()
    handleResp(resp, () => {
      notify.success(t("global.save_success"))
    })
  }

  createShortcut(["Control", "S"], onSave)

  return (
    <VStack w="$full" alignItems="start" spacing="$2" pos="relative">
      <Show when={!isString}>
        <EncodingSelect
          encoding={encoding()}
          setEncoding={setEncoding}
          referenceText={props.data}
        />
      </Show>
      <MonacoEditorLoader
        value={text(encoding())}
        theme={theme()}
        path={objStore.obj.name}
        onChange={(value) => {
          setValue(value)
        }}
      />
      <Show when={userCan("write") || objStore.write}>
        <Button loading={loading()} onClick={onSave}>
          {t("global.save")}
        </Button>
      </Show>
    </VStack>
  )
}

// TODO add encoding select
const TextEditor = () => {
  const [content] = useFetchText()
  return (
    <MaybeLoading loading={content.loading}>
      <Editor data={content()?.content} contentType={content()?.contentType} />
    </MaybeLoading>
  )
}

export default TextEditor
