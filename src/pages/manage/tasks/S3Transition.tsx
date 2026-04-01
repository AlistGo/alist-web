import { useManageTitle, useT } from "~/hooks"
import { TypeTasks } from "./Tasks"
import { normalizeStorageClass } from "~/utils"
import type { TaskInfo } from "~/types"

const metadataCache = new WeakMap<
  TaskInfo,
  Record<string, unknown> | undefined
>()

const normalizeKey = (key: string) =>
  key
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()

const parseKeyValueStatus = (value: string) => {
  const pairs = value
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!pairs.length) return undefined
  const result: Record<string, unknown> = {}
  for (const pair of pairs) {
    const separatorIndex = pair.search(/[:=]/)
    if (separatorIndex === -1) continue
    const key = pair.slice(0, separatorIndex).trim()
    const val = pair.slice(separatorIndex + 1).trim()
    if (!key) continue
    result[key] = val
  }
  return Object.keys(result).length ? result : undefined
}

const parseMetadata = (task?: TaskInfo) => {
  if (!task || !task.status) return undefined
  if (metadataCache.has(task)) {
    return metadataCache.get(task)
  }
  let metadata: Record<string, unknown> | undefined
  try {
    const parsed = JSON.parse(task.status)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      metadata = parsed as Record<string, unknown>
    }
  } catch (_) {
    /* noop */
  }
  if (!metadata) {
    metadata = parseKeyValueStatus(task.status)
  }
  metadataCache.set(task, metadata)
  return metadata
}

const findMetadataValue = (
  metadata: Record<string, unknown> | undefined,
  keys: (string | undefined)[],
) => {
  if (!metadata) return undefined
  const normalizedKeys = keys
    .filter((key): key is string => !!key)
    .map((key) => normalizeKey(key))
  if (!normalizedKeys.length) return undefined
  for (const [metadataKey, value] of Object.entries(metadata)) {
    if (normalizedKeys.includes(normalizeKey(metadataKey))) {
      return value
    }
  }
  return undefined
}

const parseNumeric = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

const renderText = (value: unknown) => {
  if (value === undefined || value === null) return undefined
  return <p>{String(value)}</p>
}

const renderDays = (value: unknown) => {
  const parsed = parseNumeric(value)
  if (parsed === undefined) return undefined
  return <p>{parsed}</p>
}

const S3Transition = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.s3_transition")

  const renderAction = (action: string) => {
    const normalized = normalizeKey(action)
    return (
      <p>{t(`tasks.s3_transition_actions.${normalized}`, undefined, action)}</p>
    )
  }

  const renderStorageClass = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return undefined
    const normalized = normalizeStorageClass(value)
    return (
      <p>
        {normalized
          ? t(`home.storage_class.${normalized}`, undefined, value)
          : value}
      </p>
    )
  }

  const renderTier = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return undefined
    const normalized = value.toLowerCase().replace(/\s+/g, "_")
    return (
      <p>
        {t(`home.toolbar.s3_transition.tier.${normalized}`, undefined, value)}
      </p>
    )
  }

  return (
    <TypeTasks
      type="s3_transition"
      canRetry
      nameAnalyzer={{
        regex: /^s3\s+(archive|restore)\s+(.+)$/i,
        title: (matches) => matches[2],
        attrs: {
          [t("tasks.attr.s3_transition.action")]: (matches) =>
            renderAction(matches[1]),
          [t("tasks.attr.s3_transition.path")]: (matches) => (
            <p>{matches[2]}</p>
          ),
          [t("tasks.attr.s3_transition.storage_class")]: (matches, task) =>
            renderStorageClass(
              findMetadataValue(parseMetadata(task), [
                "storage_class",
                "destination_storage_class",
                "target_storage_class",
              ]),
            ),
          [t("tasks.attr.s3_transition.transition_days")]: (matches, task) =>
            renderDays(
              findMetadataValue(parseMetadata(task), [
                matches[1].toLowerCase() === "archive" ? "days" : undefined,
                "transition_days",
              ]),
            ),
          [t("tasks.attr.s3_transition.restore_days")]: (matches, task) =>
            matches[1].toLowerCase() === "restore"
              ? renderDays(
                  findMetadataValue(parseMetadata(task), [
                    "restore_days",
                    "days",
                  ]),
                )
              : undefined,
          [t("tasks.attr.s3_transition.restore_tier")]: (matches, task) =>
            matches[1].toLowerCase() === "restore"
              ? renderTier(
                  findMetadataValue(parseMetadata(task), [
                    "tier",
                    "restore_tier",
                  ]),
                )
              : undefined,
          [t("tasks.attr.s3_transition.message")]: (_, task) =>
            renderText(
              findMetadataValue(parseMetadata(task), [
                "message",
                "reason",
                "detail",
                "details",
              ]),
            ),
        },
        statusText: (task) => {
          const metadata = parseMetadata(task)
          const value = findMetadataValue(metadata, [
            "status",
            "state",
            "phase",
            "s3_status",
          ])
          if (value === undefined || value === null) return undefined
          if (typeof value === "string") {
            const normalized = normalizeKey(value)
            return t(
              `tasks.s3_transition_status.${normalized}`,
              undefined,
              value,
            )
          }
          return String(value)
        },
      }}
    />
  )
}

export default S3Transition
