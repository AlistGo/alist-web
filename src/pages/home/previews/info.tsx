import { Badge, Heading, Icon, Image, Text, VStack } from "@hope-ui/solid"
import { JSXElement, Show, createMemo } from "solid-js"
import { useT } from "~/hooks"
import { getMainColor, objStore } from "~/store"
import { formatDate, getFileSize, normalizeStorageClass } from "~/utils"
import { getIconByObj } from "~/utils/icon"

export const FileInfo = (props: { children: JSXElement }) => {
  const t = useT()
  const storageClassKey = createMemo(() =>
    normalizeStorageClass(objStore.obj.storage_class),
  )
  const storageClassLabel = createMemo(() => {
    const key = storageClassKey()
    return key ? t(`home.storage_class.${key}`) : undefined
  })
  return (
    <VStack class="fileinfo" py="$6" spacing="$6">
      <Image
        boxSize="$20"
        fallback={
          <Icon
            color={getMainColor()}
            boxSize="$20"
            as={getIconByObj(objStore.obj)}
          />
        }
        src={objStore.obj.thumb}
      />
      <VStack spacing="$2">
        <Heading
          size="lg"
          css={{
            wordBreak: "break-all",
          }}
        >
          {objStore.obj.name}
        </Heading>
        <Show when={storageClassLabel()}>
          <Badge
            variant="subtle"
            colorScheme="primary"
            textTransform="none"
            css={{ "align-self": "flex-start", "font-size": "0.75rem" }}
          >
            {t("home.storage_class.label")}: {storageClassLabel()}
          </Badge>
        </Show>
        <Text color="$neutral10" size="sm">
          {getFileSize(objStore.obj.size)} · {formatDate(objStore.obj.modified)}
        </Text>
      </VStack>
      <VStack spacing="$2">{props.children}</VStack>
    </VStack>
  )
}
