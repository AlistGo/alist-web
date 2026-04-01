export const firstUpperCase = (str: string) => {
  if (!str || str.length === 0) {
    return ""
  }
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const trimLeft = (str: string, sub: string) => {
  return str.startsWith(sub) ? str.slice(sub.length) : str
}

export function getFileSize(size: number) {
  if (!size) return "-"

  const num = 1024.0 //byte

  if (size < num) return size + "B"
  if (size < Math.pow(num, 2)) return (size / num).toFixed(2) + "K" //kb
  if (size < Math.pow(num, 3)) return (size / Math.pow(num, 2)).toFixed(2) + "M" //M
  if (size < Math.pow(num, 4)) return (size / Math.pow(num, 3)).toFixed(2) + "G" //G
  return (size / Math.pow(num, 4)).toFixed(2) + "T" //T
}

const full = (p: number) => {
  return p < 10 ? "0" + p : p
}

export function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const mon = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const min = date.getMinutes()
  const sec = date.getSeconds()

  return (
    year +
    "-" +
    full(mon) +
    "-" +
    full(day) +
    " " +
    full(hour) +
    ":" +
    full(min) +
    ":" +
    full(sec)
  )
}

export function toDateTimeLocalValue(dateStr?: string | null) {
  if (!dateStr) return ""

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const year = date.getFullYear()
  const mon = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const min = date.getMinutes()
  const sec = date.getSeconds()

  return (
    year +
    "-" +
    full(mon) +
    "-" +
    full(day) +
    "T" +
    full(hour) +
    ":" +
    full(min) +
    ":" +
    full(sec)
  )
}

export function dateTimeLocalToISOString(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toISOString()
}

export type ConvertURLArgs = {
  raw_url: string
  name: string
  d_url: string
  ts?: boolean
}

export const convertURL = (scheme: string, args: ConvertURLArgs) => {
  let ans = scheme
  ans = ans.replace("$name", args.name)
  if (args.ts) {
    const d = new URL(args.d_url)
    const ts = Date.now()
    d.searchParams.set("alist_ts", ts.toString())
    args.d_url = d.toString()
  }
  ans = ans.replace(/\$[eb_]*url/, (old) => {
    const op = old.match(/[eb]/g)
    let u = args.raw_url
    if (op) {
      for (const o of op.reverse()) {
        if (o === "e") {
          u = encodeURIComponent(u)
        } else if (o === "b") {
          u = window.btoa(u)
        }
      }
    }
    return u
  })
  ans = ans.replace(/\$[eb_]*durl/, (old) => {
    const op = old.match(/[eb]/g)
    let u = args.d_url
    if (op) {
      for (const o of op.reverse()) {
        if (o === "e") {
          u = encodeURIComponent(u)
        } else if (o === "b") {
          u = window.btoa(u)
        }
      }
    }
    return u
  })
  return ans
}

export const strToRegExp = (str: string) => {
  str = str.trim()
  let pattern = str.replace(/^\/(.*)\/([a-z]*)$/, "$1")
  let args = str.replace(/^\/(.*)\/([a-z]*)$/, "$2")
  const reg = new RegExp(pattern, args)
  return reg
}

const ENC = {
  "+": "-",
  "/": "_",
  "=": ".",
}
const DEC = {
  "-": "+",
  _: "/",
  ".": "=",
}

export const safeBase64 = (base64: string) => {
  return base64.replace(/[+/=]/g, (m) => ENC[m as "+" | "/" | "="])
}

export const safeBtoa = (str: string) => {
  return safeBase64(window.btoa(str))
}

export const decodeText = (data: BufferSource, encoding?: string) => {
  const textDecoder = new TextDecoder(encoding)
  const text = textDecoder.decode(data)
  return text
}

// export function encodeText(text: string) {
//   const textEncoder = new TextEncoder()
//   const data = textEncoder.encode(text)
//   return data
// }
