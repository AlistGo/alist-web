type Status = "pending" | "uploading" | "backending" | "success" | "error"
export interface UploadFileProps {
  name: string
  path: string
  size: number
  progress: number
  speed: number
  status: Status
  msg?: string
}
export const StatusBadge = {
  pending: "neutral",
  uploading: "info",
  backending: "info",
  success: "success",
  error: "danger",
} as const
export type SetUpload = (key: keyof UploadFileProps, value: any) => void
export type Upload = (
  uploadPath: string,
  file: File,
  setUpload: SetUpload,
  asTask: boolean,
  overwrite: boolean,
  rapid: boolean,
) => Promise<Error | undefined>
