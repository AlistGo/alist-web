import { password } from "~/store"
import { Resp, TaskInfo } from "~/types"
import { r } from "~/utils"
import { SetUpload, Upload, UploadResult } from "./types"
import { calculateHash } from "./util"

type PolicyResp = Resp<{
  provider: string
  chunk_size_mb: number
  enabled: boolean
}>

type InitResp = Resp<{
  upload_id: string
  provider: string
  chunk_size_mb: number
  chunk_size_bytes: number
}>

type CompleteResp = Resp<{
  task?: TaskInfo
}>

const toError = (e: any) => {
  if (e instanceof Error) {
    return e
  }
  if (e?.message) {
    return new Error(e.message)
  }
  return new Error("upload failed")
}

const buildBaseHeaders = (
  uploadPath: string,
  asTask: boolean,
  overwrite: boolean,
  file: File,
) => ({
  "File-Path": encodeURIComponent(uploadPath),
  "As-Task": asTask,
  "Last-Modified": file.lastModified,
  Password: password(),
  Overwrite: overwrite.toString(),
})

const calcSpeed = (
  now: number,
  loaded: number,
  oldTimestamp: number,
  oldLoaded: number,
  setUpload: SetUpload,
) => {
  const duration = (now - oldTimestamp) / 1000
  if (duration <= 1) {
    return { oldTimestamp, oldLoaded }
  }
  const deltaLoaded = loaded - oldLoaded
  if (deltaLoaded >= 0) {
    setUpload("speed", deltaLoaded / duration)
  }
  return { oldTimestamp: now, oldLoaded: loaded }
}

const cleanupFailedUpload = async (uploadID?: string) => {
  if (!uploadID) {
    return
  }
  try {
    await r.post("/fs/upload/cancel", { upload_id: uploadID })
  } catch {
    // Best-effort cleanup; main error should still propagate.
  }
}

const chunkUpload = async (
  uploadPath: string,
  file: File,
  setUpload: SetUpload,
  asTask: boolean,
  overwrite: boolean,
  rapid: boolean,
  chunkSizeBytes: number,
): Promise<UploadResult> => {
  let uploadID = ""
  const initHeaders: { [k: string]: any } = {
    ...buildBaseHeaders(uploadPath, asTask, overwrite, file),
    "Content-Type": "application/json",
  }
  if (rapid) {
    const { md5, sha1, sha256 } = await calculateHash(file)
    initHeaders["X-File-Md5"] = md5
    initHeaders["X-File-Sha1"] = sha1
    initHeaders["X-File-Sha256"] = sha256
  }

  const initResp: InitResp = await r.post(
    "/fs/upload/init",
    {
      size: file.size,
      as_task: asTask,
      overwrite,
      last_modified: file.lastModified,
      mimetype: file.type || "application/octet-stream",
    },
    { headers: initHeaders },
  )
  if (initResp.code !== 200 || !initResp.data?.upload_id) {
    return {
      error: new Error(initResp.message),
    }
  }
  uploadID = initResp.data.upload_id
  const effectiveChunkSize = initResp.data.chunk_size_bytes || chunkSizeBytes
  if (effectiveChunkSize <= 0) {
    await cleanupFailedUpload(uploadID)
    return {
      error: new Error("invalid chunk size"),
    }
  }

  let oldTimestamp = Date.now()
  let oldLoaded = 0

  try {
    for (
      let chunkIndex = 0, start = 0;
      start < file.size;
      chunkIndex++, start += effectiveChunkSize
    ) {
      const end = Math.min(start + effectiveChunkSize, file.size)
      const chunk = file.slice(start, end)
      const resp: Resp<{
        uploaded_size: number
        total_size: number
      }> = await r.put("/fs/upload/chunk", chunk, {
        headers: {
          "Upload-Id": uploadID,
          "Chunk-Index": chunkIndex,
          "Content-Type": "application/octet-stream",
        },
        onUploadProgress: (progressEvent) => {
          const loadedThisChunk = progressEvent.loaded ?? 0
          const totalLoaded = Math.min(start + loadedThisChunk, file.size)
          const complete = ((totalLoaded / file.size) * 100) | 0
          setUpload("progress", complete)

          const speedCalc = calcSpeed(
            Date.now(),
            totalLoaded,
            oldTimestamp,
            oldLoaded,
            setUpload,
          )
          oldTimestamp = speedCalc.oldTimestamp
          oldLoaded = speedCalc.oldLoaded
        },
      })
      if (resp.code !== 200) {
        throw new Error(resp.message)
      }
      const uploadedSize = resp.data?.uploaded_size ?? end
      const complete = ((uploadedSize / file.size) * 100) | 0
      setUpload("progress", Math.min(100, complete))
    }

    setUpload("status", "backending")
    const completeResp: CompleteResp = await r.post("/fs/upload/complete", {
      upload_id: uploadID,
    })
    if (completeResp.code !== 200) {
      throw new Error(completeResp.message)
    }
    return {
      task: completeResp.data?.task,
    }
  } catch (e: any) {
    await cleanupFailedUpload(uploadID)
    return {
      error: toError(e),
    }
  }
}

export const uploadWithChunkPolicy = async (
  uploadPath: string,
  file: File,
  setUpload: SetUpload,
  asTask: boolean,
  overwrite: boolean,
  rapid: boolean,
  fallbackUpload: Upload,
): Promise<UploadResult> => {
  const policyHeaders = buildBaseHeaders(uploadPath, asTask, overwrite, file)
  const policyResp: PolicyResp = await r.post(
    "/fs/upload/policy",
    {},
    { headers: policyHeaders },
  )
  if (policyResp.code !== 200 || !policyResp.data?.enabled) {
    return fallbackUpload(uploadPath, file, setUpload, asTask, overwrite, rapid)
  }
  const chunkSizeMB = policyResp.data.chunk_size_mb ?? 0
  const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024)
  if (chunkSizeBytes <= 0 || file.size <= chunkSizeBytes) {
    return fallbackUpload(uploadPath, file, setUpload, asTask, overwrite, rapid)
  }
  return chunkUpload(
    uploadPath,
    file,
    setUpload,
    asTask,
    overwrite,
    rapid,
    chunkSizeBytes,
  )
}
