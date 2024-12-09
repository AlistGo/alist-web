import {
  Button,
  HStack,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  createDisclosure,
} from "@hope-ui/solid"
import { createMemo, For, mergeProps, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { FaSolidAngleLeft, FaSolidAngleRight } from "solid-icons/fa"
import { TbSelector } from "solid-icons/tb"

export interface PaginatorProps {
  colorScheme?:
    | "primary"
    | "accent"
    | "neutral"
    | "success"
    | "info"
    | "warning"
    | "danger"
  // size?: "xs" | "sm" | "lg" | "xl" | "md";
  defaultCurrent?: number
  onChange?: (current: number) => void
  hideOnSinglePage?: boolean
  total: number
  defaultPageSize?: number
  maxShowPage?: number
  setResetCallback?: (callback: () => void) => void
}
export const Paginator = (props: PaginatorProps) => {
  const merged = mergeProps(
    {
      maxShowPage: 4,
      defaultPageSize: 30,
      defaultCurrent: 1,
      hideOnSinglePage: true,
    },
    props,
  )
  const [store, setStore] = createStore({
    pageSize: merged.defaultPageSize,
    current: merged.defaultCurrent,
  })
  merged.setResetCallback?.(() => {
    setStore("current", merged.defaultCurrent)
  })
  const pages = createMemo(() => {
    return Math.ceil(merged.total / store.pageSize)
  })
  const leftPages = createMemo(() => {
    const current = store.current
    const min = Math.max(2, current - Math.floor(merged.maxShowPage / 2))
    return Array.from({ length: current - min }, (_, i) => min + i)
  })
  const rightPages = createMemo(() => {
    const current = store.current
    const max = Math.min(
      pages() - 1,
      current + Math.floor(merged.maxShowPage / 2),
    )
    return Array.from({ length: max - current }, (_, i) => current + 1 + i)
  })
  const allPages = createMemo(() => {
    return Array.from({ length: pages() }, (_, i) => 1 + i)
  })
  const size = {
    "@initial": "sm",
    "@md": "md",
  } as const
  const onPageChange = (page: number) => {
    setStore("current", page)
    merged.onChange?.(page)
  }
  const { isOpen, onClose, onOpen } = createDisclosure()
  const popoverTriggerProps = {
    rightIcon: <TbSelector />,
    iconSpacing: "0",
  }

  return (
    <Show when={!merged.hideOnSinglePage || pages() > 1}>
      <HStack spacing="$1">
        <Show when={store.current !== 1}>
          <Button
            size={size}
            colorScheme={merged.colorScheme}
            onClick={() => {
              onPageChange(1)
            }}
            px="$3"
          >
            1
          </Button>
          <IconButton
            size={size}
            icon={<FaSolidAngleLeft />}
            aria-label="Previous"
            colorScheme={merged.colorScheme}
            onClick={() => {
              onPageChange(store.current - 1)
            }}
            w="2rem !important"
          />
        </Show>
        <For each={leftPages()}>
          {(page) => (
            <Button
              size={size}
              colorScheme={merged.colorScheme}
              onClick={() => {
                onPageChange(page)
              }}
              px={page > 10 ? "$2_5" : "$3"}
            >
              {page}
            </Button>
          )}
        </For>

        <Popover
          closeDelay={0}
          opened={isOpen()}
          onClose={onClose}
          onOpen={pages() > merged.maxShowPage ? onOpen : undefined}
        >
          <PopoverTrigger
            as={Button}
            size={size}
            colorScheme={merged.colorScheme}
            variant="solid"
            px={store.current > 10 ? "$2_5" : "$3"}
            {...(pages() > merged.maxShowPage
              ? popoverTriggerProps
              : undefined)}
          >
            {store.current}
          </PopoverTrigger>
          <PopoverContent maxW="min(88%, 850px)" w="auto" rounded="$lg">
            <PopoverArrow />
            <PopoverBody>
              <For each={allPages()}>
                {(page) => {
                  return (
                    <Button
                      m="$0_5"
                      size={size}
                      variant={page == store.current ? "solid" : "subtle"}
                      px={page > 10 ? "$2_5" : "$3"}
                      onClick={() => {
                        onClose()
                        if (page !== store.current) {
                          onPageChange(page)
                        }
                      }}
                    >
                      {page}
                    </Button>
                  )
                }}
              </For>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        <For each={rightPages()}>
          {(page) => (
            <Button
              size={size}
              colorScheme={merged.colorScheme}
              onClick={() => {
                onPageChange(page)
              }}
              px={page > 10 ? "$2_5" : "$3"}
            >
              {page}
            </Button>
          )}
        </For>
        <Show when={store.current !== pages()}>
          <IconButton
            size={size}
            icon={<FaSolidAngleRight />}
            aria-label="Next"
            colorScheme={merged.colorScheme}
            onClick={() => {
              onPageChange(store.current + 1)
            }}
            w="2rem !important"
          />
          <Button
            size={size}
            colorScheme={merged.colorScheme}
            onClick={() => {
              onPageChange(pages())
            }}
            px={pages() > 10 ? "$2_5" : "$3"}
          >
            {pages()}
          </Button>
        </Show>
      </HStack>
    </Show>
  )
}
