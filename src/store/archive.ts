let archiveExtensions: string[] = []

export const setArchiveExtensions = (extensions: string[]) => {
  archiveExtensions = extensions
}

export const isArchive = (name: string): boolean => {
  name = name.toLowerCase()
  return archiveExtensions.some((v) => name.endsWith(v))
}
