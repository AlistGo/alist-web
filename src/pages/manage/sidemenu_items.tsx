import { SideMenuItemProps } from "./SideMenu"
import {
  BsGearFill,
  BsPaletteFill,
  BsCameraFill,
  BsWindow,
  BsPersonCircle,
  BsJoystick,
  BsMedium,
  BsFingerprint,
  BsFront,
  BsCloudUploadFill,
  BsSearch,
  BsBucket,
  BsHddNetwork,
  BsArrowLeftRight,
} from "solid-icons/bs"
import { FiLogIn } from "solid-icons/fi"
import { SiMetabase } from "solid-icons/si"
import { CgDatabase } from "solid-icons/cg"
import { OcWorkflow2 } from "solid-icons/oc"
import { IoCopy, IoHome, IoMagnetOutline } from "solid-icons/io"
import { Component, lazy } from "solid-js"
import { joinBase } from "~/utils"
import { Group, UserRole } from "~/types"
import { FaSolidBook, FaSolidDatabase } from "solid-icons/fa"
import { TbArchive, TbDevices2 } from "solid-icons/tb"
import { TbLink } from "solid-icons/tb"
import { FaSolidUserGear } from "solid-icons/fa"
import { BiRegularMessageAltDetail } from "solid-icons/bi"
import { RiCommunicationChatSettingsLine } from "solid-icons/ri"

export type SideMenuItem = SideMenuItemProps & {
  component?: Component
  children?: SideMenuItem[]
}

const CommonSettings = lazy(() => import("./settings/Common"))

export const side_menu_items: SideMenuItem[] = [
  {
    title: "manage.sidemenu.profile",
    icon: BsFingerprint,
    to: "/@manage",
    role: UserRole.GUEST,
    component: lazy(() => import("./users/Profile")),
  },
  {
    title: "manage.sidemenu.settings",
    icon: BsGearFill,
    to: "/@manage/settings",
    role: UserRole.ADMIN,
    children: [
      {
        title: "manage.sidemenu.site",
        icon: BsWindow,
        to: "/@manage/settings/site",
        component: () => <CommonSettings group={Group.SITE} />,
      },
      {
        title: "manage.sidemenu.style",
        icon: BsPaletteFill,
        to: "/@manage/settings/style",
        component: () => <CommonSettings group={Group.STYLE} />,
      },
      {
        title: "manage.sidemenu.preview",
        icon: BsCameraFill,
        to: "/@manage/settings/preview",
        component: () => <CommonSettings group={Group.PREVIEW} />,
      },
      {
        title: "manage.sidemenu.global",
        icon: BsJoystick,
        to: "/@manage/settings/global",
        component: () => <CommonSettings group={Group.GLOBAL} />,
      },
      {
        title: "manage.sidemenu.sso",
        icon: FiLogIn,
        to: "/@manage/settings/sso",
        component: () => <CommonSettings group={Group.SSO} />,
      },
      {
        title: "manage.sidemenu.ldap",
        icon: FiLogIn,
        to: "/@manage/settings/ldap",
        component: () => <CommonSettings group={Group.LDAP} />,
      },
      {
        title: "manage.sidemenu.s3",
        icon: BsBucket,
        to: "/@manage/settings/s3",
        component: lazy(() => import("./settings/S3")),
      },
      {
        title: "manage.sidemenu.tag",
        icon: (props: { active?: boolean; style?: any }) => (
          <img
            src={
              props.active
                ? joinBase("/images/tag-active.png")
                : joinBase("/images/tag-gray.png")
            }
            alt="search"
            style={{ width: "1.1em", height: "1.1em", ...(props.style || {}) }}
          />
        ),
        to: "/@manage/settings/tag",
        component: lazy(() => import("./settings/Tag")),
      },
      {
        title: "manage.sidemenu.ftp",
        icon: BsHddNetwork,
        to: "/@manage/settings/ftp",
        component: () => <CommonSettings group={Group.FTP} />,
      },
      {
        title: "manage.sidemenu.traffic",
        icon: BsArrowLeftRight,
        to: "/@manage/settings/traffic",
        component: () => <CommonSettings group={Group.TRAFFIC} />,
      },
      {
        title: "manage.sidemenu.other",
        icon: BsMedium,
        to: "/@manage/settings/other",
        component: lazy(() => import("./settings/Other")),
      },
    ],
  },
  {
    title: "manage.sidemenu.tasks",
    icon: OcWorkflow2,
    to: "/@manage/tasks",
    role: UserRole.GENERAL,
    children: [
      {
        title: "manage.sidemenu.offline_download",
        icon: IoMagnetOutline,
        to: "/@manage/tasks/offline_download",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/offline_download")),
      },
      // {
      //   title: "manage.sidemenu.aria2",
      //   icon: BsCloudArrowDownFill,
      //   to: "/@manage/tasks/aria2",
      //   component: lazy(() => import("./tasks/Aria2")),
      // },
      // {
      //   title: "manage.sidemenu.qbit",
      //   icon: FaBrandsQuinscape,
      //   to: "/@manage/tasks/qbit",
      //   component: lazy(() => import("./tasks/Qbit")),
      // },
      {
        title: "manage.sidemenu.upload",
        icon: BsCloudUploadFill,
        to: "/@manage/tasks/upload",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/Upload")),
      },
      {
        title: "manage.sidemenu.copy",
        icon: IoCopy,
        to: "/@manage/tasks/copy",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/Copy")),
      },
      {
        title: "manage.sidemenu.decompress",
        icon: TbArchive,
        to: "/@manage/tasks/decompress",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/Decompress")),
      },
      {
        title: "manage.sidemenu.s3_transition",
        icon: BsBucket,
        to: "/@manage/tasks/s3_transition",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/S3Transition")),
      },
    ],
  },
  // {
  //   title: "manage.sidemenu.permissions",
  //   icon: (props: { active?: boolean; style?: any }) => (
  //     <img
  //       src={
  //         props.active
  //           ? "/images/permissions-active.png"
  //           : "/images/permissions-gray.png"
  //       }
  //       alt="search"
  //       style={{ width: "1.2em", height: "1.2em", ...(props.style || {}) }}
  //     />
  //   ),
  //   to: "/@manage/permissions",
  //   children: [
  //     {
  //       title: "manage.sidemenu.role",
  //       icon: (props: { active?: boolean; style?: any }) => (
  //         <img
  //           src={
  //             props.active ? "/images/role-active.png" : "/images/role-gray.png"
  //           }
  //           alt="search"
  //           style={{ width: "1.2em", height: "1.2em", ...(props.style || {}) }}
  //         />
  //       ),
  //       to: "/@manage/permissions/role",
  //       component: lazy(() => import("./permissions/Role")),
  //     },
  //   ],
  // },
  {
    title: "manage.sidemenu.role",
    icon: (props: { active?: boolean; style?: any }) => (
      <FaSolidUserGear
        style={{ width: "18px", height: "18px", ...(props.style || {}) }}
      />
    ),
    to: "/@manage/permissions/role",
    role: UserRole.ADMIN,
    component: lazy(() => import("./permissions/Role")),
  },
  {
    title: "manage.sidemenu.users",
    icon: BsPersonCircle,
    to: "/@manage/users",
    role: UserRole.ADMIN,
    component: lazy(() => import("./users/Users")),
  },
  {
    title: "manage.sidemenu.session",
    icon: (props: { active?: boolean; style?: any }) => (
      <BiRegularMessageAltDetail
        style={{ width: "18px", height: "18px", ...(props.style || {}) }}
      />
    ),
    to: "/@manage/session",
    role: UserRole.GENERAL,
    children: [
      {
        title: "manage.sidemenu.my_session",
        icon: (props: { active?: boolean; style?: any }) => (
          <TbDevices2
            style={{ width: "19px", height: "19px", ...(props.style || {}) }}
          />
        ),
        to: "/@manage/session/my_session",
        role: UserRole.GENERAL,
        component: lazy(() => import("./session/mySession")),
      },
      {
        title: "manage.sidemenu.session_management",
        role: UserRole.ADMIN,
        icon: (props: { active?: boolean; style?: any }) => (
          <RiCommunicationChatSettingsLine
            style={{ width: "18px", height: "18px", ...(props.style || {}) }}
          />
        ),
        to: "/@manage/session/management",
        component: lazy(() => import("./session/management")),
      },
    ],
  },
  {
    title: "manage.sidemenu.shares",
    icon: TbLink,
    to: "/@manage/shares",
    role: UserRole.GENERAL,
    component: lazy(() => import("./shares")),
  },
  {
    title: "manage.sidemenu.storages",
    icon: CgDatabase,
    to: "/@manage/storages",
    role: UserRole.ADMIN,
    component: lazy(() => import("./storages/Storages")),
  },
  {
    title: "manage.sidemenu.metas",
    icon: SiMetabase,
    to: "/@manage/metas",
    role: UserRole.ADMIN,
    component: lazy(() => import("./metas/Metas")),
  },
  {
    title: "manage.sidemenu.indexes",
    icon: BsSearch,
    to: "/@manage/indexes",
    role: UserRole.ADMIN,
    component: lazy(() => import("./indexes/indexes")),
  },
  {
    title: "manage.sidemenu.backup-restore",
    to: "/@manage/backup-restore",
    icon: FaSolidDatabase,
    role: UserRole.ADMIN,
    component: lazy(() => import("./backup-restore")),
  },
  {
    title: "manage.sidemenu.about",
    icon: BsFront,
    to: "/@manage/about",
    role: UserRole.GUEST,
    component: lazy(() => import("./About")),
  },
  {
    title: "manage.sidemenu.docs",
    icon: FaSolidBook,
    to: "https://alist.nn.ci",
    role: UserRole.GUEST,
    external: true,
  },
  {
    title: "manage.sidemenu.home",
    icon: IoHome,
    to: "/",
    role: UserRole.GUEST,
    refresh: true,
  },
]
