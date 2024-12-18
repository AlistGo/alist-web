import { PublicKeysProps } from "./PublicKeys"
import { SSHPublicKey } from "~/types/sshkey"
import { useFetch, useT } from "~/hooks"
import { createSignal, Show } from "solid-js"
import { Button, Flex, Heading, HStack, Spacer, Text } from "@hope-ui/solid"
import { PResp } from "~/types"
import { handleResp, notify, r } from "~/utils"

const formatDate = (date: Date) => {
  const year = date.getFullYear().toString()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

export interface PublicKeyCol {
  name: "title" | "fingerprint" | "last_used" | "operation"
  textAlign: "left" | "right" | "center"
  w: any
}

export const cols: PublicKeyCol[] = [
  { name: "title", textAlign: "left", w: "calc(35% - 110px)" },
  { name: "fingerprint", textAlign: "left", w: "calc(65% - 110px)" },
  { name: "last_used", textAlign: "right", w: "140px" },
  { name: "operation", textAlign: "right", w: "80px" },
]

export const PublicKey = (props: PublicKeysProps & SSHPublicKey) => {
  const t = useT()
  const [deleted, setDeleted] = createSignal(false)
  const [delLoading, del] = props.isMine
    ? useFetch(
        (): PResp<SSHPublicKey[]> => r.post(`/me/sshkey/delete?id=${props.id}`),
      )
    : useFetch(
        (): PResp<SSHPublicKey[]> =>
          r.post(
            `/admin/user/sshkey/delete?uid=${props.userId}&id=${props.id}`,
          ),
      )
  const textEllipsisCss = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }
  return (
    <Show when={!deleted()}>
      <HStack w="$full" p="$2">
        <Heading
          w={cols[0].w}
          size="sm"
          textAlign={cols[0].textAlign}
          css={textEllipsisCss}
        >
          {props.title}
        </Heading>
        <Text
          w={cols[1].w}
          size="sm"
          textAlign={cols[1].textAlign}
          css={textEllipsisCss}
        >
          {props.fingerprint}
        </Text>
        <Text
          w={cols[2].w}
          size="sm"
          textAlign={cols[2].textAlign}
          css={textEllipsisCss}
        >
          {formatDate(new Date(props.last_used_time))}
        </Text>
        <Flex w={cols[3].w} gap="$1">
          <Spacer />
          <Button
            size="sm"
            colorScheme="danger"
            loading={delLoading()}
            onClick={async () => {
              const resp = await del()
              handleResp(resp, () => {
                notify.success(t("global.delete_success"))
                setDeleted(true)
              })
            }}
          >
            {t(`global.delete`)}
          </Button>
        </Flex>
      </HStack>
    </Show>
  )
}
