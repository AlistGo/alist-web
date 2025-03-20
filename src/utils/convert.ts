export const getTarget = (proxy: any) => {
  return JSON.parse(JSON.stringify(proxy))
}

export const recordToArray = <K extends keyof any, V>(record: Record<K, V>) => {
  const res = []
  for (const k in record) {
    res.push({
      key: k,
      value: record[k],
    })
  }
  return res
}

export const recordKeysToLowerCase = <T extends Record<string, any>>(
  obj: T,
): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.toLowerCase(),
      v !== null && typeof v === "object" ? recordKeysToLowerCase(v) : v,
    ]),
  )
}
