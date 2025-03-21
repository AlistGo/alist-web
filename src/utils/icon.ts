import {
  BsFileEarmarkWordFill,
  BsFileEarmarkExcelFill,
  BsFileEarmarkPptFill,
  BsFileEarmarkPdfFill,
  BsFileEarmarkPlayFill,
  BsFileEarmarkMusicFill,
  BsFileEarmarkFontFill,
  BsFileEarmarkImageFill,
  BsFileEarmarkMinusFill,
  BsApple,
  BsWindows,
  BsFileEarmarkZipFill,
  BsMarkdownFill,
} from "solid-icons/bs"
import {
  FaSolidDatabase,
  FaSolidBook,
  FaSolidCompactDisc,
  FaSolidLink,
} from "solid-icons/fa"
import { IoFolder } from "solid-icons/io"
import { ImAndroid } from "solid-icons/im"
import { Obj, ObjType } from "~/types"
import { ext } from "./path"
import {
  VscodeIconsFileTypeAi2,
  VscodeIconsFileTypePhotoshop2,
} from "~/components"
import { SiAsciinema } from "solid-icons/si"
import { isArchive } from "~/store/archive"

const iconMap = {
  "dmg,ipa,plist,tipa": BsApple,
  "exe,msi": BsWindows,
  apk: ImAndroid,
  db: FaSolidDatabase,
  md: BsMarkdownFill,
  epub: FaSolidBook,
  iso: FaSolidCompactDisc,
  m3u8: BsFileEarmarkPlayFill,
  "doc,docx": BsFileEarmarkWordFill,
  "xls,xlsx": BsFileEarmarkExcelFill,
  "ppt,pptx": BsFileEarmarkPptFill,
  pdf: BsFileEarmarkPdfFill,
  psd: VscodeIconsFileTypePhotoshop2,
  ai: VscodeIconsFileTypeAi2,
  url: FaSolidLink,
  cast: SiAsciinema,
}

export const getIconByTypeAndName = (type: number, name: string) => {
  if (type !== ObjType.FOLDER) {
    for (const [extensions, icon] of Object.entries(iconMap)) {
      if (extensions.split(",").includes(ext(name).toLowerCase())) {
        return icon
      }
    }
    if (isArchive(name)) {
      return BsFileEarmarkZipFill
    }
  }
  switch (type) {
    case ObjType.FOLDER:
      return IoFolder
    // case ObjType.OFFICE: {
    //   if (ext === "doc" || ext === "docx") {
    //     return BsFileEarmarkWordFill;
    //   }
    //   if (ext === "xls" || ext === "xlsx") {
    //     return BsFileEarmarkExcelFill;
    //   }
    //   if (ext === "ppt" || ext === "pptx") {
    //     return BsFileEarmarkPptFill;
    //   } else {
    //     return BsFileEarmarkPdfFill;
    //   }
    // }
    case ObjType.VIDEO:
      return BsFileEarmarkPlayFill
    case ObjType.AUDIO:
      return BsFileEarmarkMusicFill
    case ObjType.TEXT:
      return BsFileEarmarkFontFill
    case ObjType.IMAGE:
      return BsFileEarmarkImageFill
    default:
      return BsFileEarmarkMinusFill
  }
}

export const getIconByObj = (obj: Pick<Obj, "type" | "name">) => {
  return getIconByTypeAndName(obj.type, obj.name)
}
