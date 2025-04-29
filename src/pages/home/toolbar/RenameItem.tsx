import { HStack, Text } from "@hope-ui/solid"
import { Motion } from "solid-motionone"
import { RenameObj } from "~/types"
import { hoverColor } from "~/utils"

export const RenameItem = (props: { obj: RenameObj; index: number }) => {
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        width: "100%",
      }}
    >
      <HStack
        class="list-item"
        w="$full"
        p="$2"
        rounded="$lg"
        transition="all 0.3s"
        _hover={{
          transform: "scale(1.01)",
          bgColor: hoverColor(),
        }}
      >
        <Text
          w={{ "@initial": "50%", "@md": "50%" }}
          class="name"
          css={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={props.obj.src_name}
        >
          {props.obj.src_name}
        </Text>

        <Text
          w={{ "@initial": "50%", "@md": "50%" }}
          class="name"
          css={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={props.obj.new_name}
        >
          {props.obj.new_name}
        </Text>
      </HStack>
    </Motion.div>
  )
}
