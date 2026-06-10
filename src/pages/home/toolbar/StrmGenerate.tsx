import { Show } from "solid-js"
import { TbFileExport } from "solid-icons/tb"
import { useRouter } from "~/hooks"
import { me, objStore } from "~/store"
import { StrmGenerate } from "~/pages/manage/storages/StrmGenerate"
import { RightIcon } from "./Icon"

export const ToolbarStrmGenerate = () => {
  const { pathname } = useRouter()
  const isAdmin = () => (me().role || []).includes(2)
  const isStrm = () => objStore.provider === "Strm"
  return (
    <Show when={isAdmin() && isStrm()}>
      <StrmGenerate path={pathname()}>
        {({ start }) => (
          <RightIcon as={TbFileExport} tips="generate_strm" onClick={start} />
        )}
      </StrmGenerate>
    </Show>
  )
}
