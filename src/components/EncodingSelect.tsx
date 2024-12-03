import { Box } from "@hope-ui/solid"
import { SelectWrapper } from "./Base"
import chardet from "chardet"
import { createEffect } from "solid-js"

export function EncodingSelect(props: {
  encoding: string
  setEncoding: (encoding: string) => void
  referenceText?: string | ArrayBuffer
}) {
  const encodingLabels = [
    "utf-8",
    "gbk",
    "gb18030",
    "ibm866",
    "iso-8859-2",
    "iso-8859-3",
    "iso-8859-4",
    "iso-8859-5",
    "iso-8859-6",
    "iso-8859-7",
    "iso-8859-8",
    "iso-8859-8i",
    "iso-8859-10",
    "iso-8859-13",
    "iso-8859-14",
    "iso-8859-15",
    "iso-8859-16",
    "koi8-r",
    "koi8-u",
    "macintosh",
    "windows-874",
    "windows-1250",
    "windows-1251",
    "windows-1252",
    "windows-1253",
    "windows-1254",
    "windows-1255",
    "windows-1256",
    "windows-1257",
    "windows-1258",
    "x-mac-cyrillic",
    "big5",
    "euc-jp",
    "iso-2022-jp",
    "shift_jis",
    "euc-kr",
    "iso-2022-kr",
    "utf-16be",
    "utf-16le",
    "x-user-defined",
    "iso-2022-cn",
  ]

  createEffect(() => {
    if (props.referenceText) {
      let buffer: Uint8Array
      if (typeof props.referenceText === "string") {
        buffer = new TextEncoder().encode(props.referenceText)
      } else {
        buffer = new Uint8Array(props.referenceText)
      }
      for (let encoding of chardet.analyse(buffer)) {
        const encodingLabel = encoding.name.toLowerCase()
        if (encodingLabels.includes(encodingLabel)) {
          props.setEncoding(encodingLabel)
          return
        }
      }
    }
  })

  return (
    <Box
      pos="absolute"
      right={0}
      top={0}
      w="$36"
      opacity={0.15}
      _hover={{
        opacity: 1,
      }}
      zIndex={1}
    >
      <SelectWrapper
        options={encodingLabels.map((label) => ({
          label: label.toLocaleUpperCase(),
          value: label,
        }))}
        value={props.encoding}
        onChange={(v) => props.setEncoding(v)}
      />
    </Box>
  )
}
