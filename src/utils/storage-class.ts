export const normalizeStorageClass = (value?: string) => {
  if (!value) return undefined
  return value.trim().replace(/\s+/g, "_").replace(/-+/g, "_").toLowerCase()
}
