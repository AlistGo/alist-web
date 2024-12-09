import {
  Popover,
  PopoverTrigger,
  Button,
  PopoverContent,
  PopoverArrow,
  PopoverHeader,
  PopoverBody,
  HStack,
} from "@hope-ui/solid"
import { useT } from "~/hooks"

export interface DeletePopoverProps {
  name: string
  loading: boolean
  onClick: () => void
}
export const DeletePopover = (props: DeletePopoverProps) => {
  const t = useT()
  return (
    <Popover>
      {({ onClose }) => (
        <>
          <PopoverTrigger as={Button} colorScheme="danger">
            {t("global.delete")}
          </PopoverTrigger>
          <PopoverContent rounded="$lg">
            <PopoverArrow />
            <PopoverHeader>
              {t("global.delete_confirm", {
                name: props.name,
              })}
            </PopoverHeader>
            <PopoverBody>
              <HStack spacing="$2">
                <Button onClick={onClose} colorScheme="neutral">
                  {t("global.cancel")}
                </Button>
                <Button
                  colorScheme="danger"
                  loading={props.loading}
                  onClick={props.onClick}
                >
                  {t("global.confirm")}
                </Button>
              </HStack>
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  )
}
