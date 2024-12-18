import {
  Button,
  createDisclosure,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Text,
  Textarea,
  VStack,
} from "@hope-ui/solid"
import { createSignal, Show } from "solid-js"
import { useFetch, useT } from "~/hooks"
import { SSHPublicKey } from "~/types/sshkey"
import { PEmptyResp, PPageResp } from "~/types"
import { handleResp, r } from "~/utils"
import { cols, PublicKey, PublicKeyCol } from "./PublicKey"
import { createStore } from "solid-js/store"

export interface PublicKeysProps {
  isMine: boolean
  userId: number
}

export interface SSHKeyAddReq {
  title: string
  key: string
}

export const PublicKeys = (props: PublicKeysProps) => {
  const t = useT()
  const [keys, setKeys] = createSignal<SSHPublicKey[]>([])
  const [loading, get] = props.isMine
    ? useFetch((): PPageResp<SSHPublicKey> => r.get(`/me/sshkey/list`))
    : useFetch(
        (): PPageResp<SSHPublicKey> =>
          r.get(`/admin/user/sshkey/list?uid=${props.userId}`),
      )
  const [addReq, setAddReq] = createStore<SSHKeyAddReq>({
    title: "",
    key: "",
  })
  const [addLoading, add] = useFetch(
    (): PEmptyResp => r.post(`/me/sshkey/add`, addReq),
  )
  const { isOpen, onOpen, onClose } = createDisclosure()
  const refresh = async () => {
    const resp = await get()
    handleResp(resp, (data) => {
      setKeys(data.content)
    })
  }
  refresh()
  const itemProps = (col: PublicKeyCol) => {
    return {
      fontWeight: "bold",
      fontSize: "$sm",
      color: "$neutral11",
      textAlign: col.textAlign as any,
    }
  }
  return (
    <VStack w="$full" alignItems="start" spacing="$2">
      <Flex w="$full">
        <Heading>{t(`users.ssh_keys.heading`)}</Heading>
        <Show when={props.isMine}>
          <Spacer />
          <Button loading={loading()} onClick={onOpen}>
            {t(`global.add`)}
          </Button>
          <Modal opened={isOpen()} onClose={onClose} scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
              <ModalCloseButton />
              <ModalHeader>{t(`users.ssh_keys.add_heading`)}</ModalHeader>
              <ModalBody>
                <FormControl mb="$4">
                  <FormLabel for="add_title">
                    {t(`users.ssh_keys.title`)}
                  </FormLabel>
                  <Input
                    id="add_title"
                    value={addReq.title}
                    onInput={(e) => setAddReq("title", e.currentTarget.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel for="add_key">{t(`users.ssh_keys.key`)}</FormLabel>
                  <Textarea
                    id="add_key"
                    value={addReq.key}
                    onInput={(e) => setAddReq("key", e.currentTarget.value)}
                  />
                </FormControl>
              </ModalBody>
              <ModalFooter>
                <Button
                  loading={addLoading()}
                  onClick={async () => {
                    const resp = await add()
                    handleResp(resp, () => {
                      setAddReq("title", "")
                      setAddReq("key", "")
                      refresh()
                      onClose()
                    })
                  }}
                >
                  {t(`global.add`)}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Show>
      </Flex>
      <VStack
        w="$full"
        overflowX="auto"
        shadow="$md"
        rounded="$lg"
        spacing="$1"
        p="$1"
      >
        <HStack class="title" w="$full" p="$2">
          <Text w={cols[0].w} {...itemProps(cols[0])}>
            {t(`users.ssh_keys.${cols[0].name}`)}
          </Text>
          <Text w={cols[1].w} {...itemProps(cols[1])}>
            {t(`users.ssh_keys.${cols[1].name}`)}
          </Text>
          <Text w={cols[2].w} {...itemProps(cols[2])}>
            {t(`users.ssh_keys.${cols[2].name}`)}
          </Text>
          <Text w={cols[3].w} {...itemProps(cols[3])}>
            {t(`users.ssh_keys.${cols[3].name}`)}
          </Text>
        </HStack>
        {keys().map((key) => (
          <PublicKey {...props} {...key} />
        ))}
      </VStack>
    </VStack>
  )
}
