import { MaybeLoading } from "~/components"
import { recordKeysToLowerCase } from "~/utils"
import { FileInfo } from "./info"
import { useFetchText, useParseText, useT } from "~/hooks"
import { createEffect } from "solid-js"
import { Button } from "@hope-ui/solid"
import { parse } from "ini"

export default function () {
  const [content] = useFetchText()
  function openInNewWindow() {
    const ini = content()?.content
    const { text } = useParseText(ini)
    const config = recordKeysToLowerCase(parse(text()))
    const url = config.internetshortcut?.url
    if (url) {
      const a = document.createElement("a")
      a.href = url
      a.rel = "noopener noreferrer"
      a.target = "_blank"
      a.click()
    }
  }
  createEffect(() => {
    openInNewWindow()
  })
  const t = useT()
  return (
    <MaybeLoading loading={content.loading}>
      <FileInfo>
        <Button onClick={openInNewWindow}>
          {t("home.preview.open_in_new_window")}
        </Button>
      </FileInfo>
    </MaybeLoading>
  )
}
