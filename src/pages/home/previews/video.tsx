import { Box } from "@hope-ui/solid"
import { createSignal, onCleanup, onMount } from "solid-js"
import { useRouter, useLink } from "~/hooks"
import { getSettingBool, objStore } from "~/store"
import { ObjType } from "~/types"
import { ext, pathDir, pathJoin } from "~/utils"
import Artplayer from "artplayer"
import { type Option } from "artplayer/types/option"
import { type Setting } from "artplayer/types/setting"
import { type Events } from "artplayer/types/events"
import artplayerPluginDanmuku from "artplayer-plugin-danmuku"
import artplayerPluginAss from "~/components/artplayer-plugin-ass"
import flvjs from "flv.js"
import Hls from "hls.js"
import { currentLang } from "~/app/i18n"
import { AutoHeightPlugin, VideoBox } from "./video_box"
import { ArtPlayerIconsSubtitle } from "~/components/icons"
import { useNavigate } from "@solidjs/router"

const Preview = () => {
  const { pathname, searchParams } = useRouter()
  const { proxyLink } = useLink()
  const navigate = useNavigate()
  let videos = objStore.objs.filter((obj) => obj.type === ObjType.VIDEO)
  if (videos.length === 0) {
    videos = [objStore.obj]
  }
  const next_video = () => {
    const index = videos.findIndex((f) => f.name === objStore.obj.name)
    if (index < videos.length - 1) {
      navigate(
        pathJoin(pathDir(location.pathname), videos[index + 1].name) +
          "?auto_fullscreen=" +
          player.fullscreen,
      )
    }
  }
  const previous_video = () => {
    const index = videos.findIndex((f) => f.name === objStore.obj.name)
    if (index > 0) {
      navigate(
        pathJoin(pathDir(location.pathname), videos[index - 1].name) +
          "?auto_fullscreen=" +
          player.fullscreen,
      )
    }
  }
  let player: Artplayer
  let option: Option = {
    id: pathname(),
    container: "#video-player",
    url: objStore.raw_url,
    title: objStore.obj.name,
    volume: 0.5,
    autoplay: getSettingBool("video_autoplay"),
    autoSize: false,
    autoMini: true,
    loop: false,
    flip: true,
    playbackRate: true,
    aspectRatio: true,
    setting: true,
    hotkey: true,
    pip: true,
    mutex: true,
    fullscreen: true,
    fullscreenWeb: true,
    subtitleOffset: true,
    miniProgressBar: false,
    playsInline: true,
    // layers: [],
    // settings: [],
    // contextmenu: [],
    controls: [
      {
        name: "previous-button",
        index: 10,
        position: "left",
        html: '<svg fill="none" stroke-width="2" xmlns="http://www.w3.org/2000/svg" height="22" width="22" class="icon icon-tabler icon-tabler-player-track-prev-filled" width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="overflow: visible; color: currentcolor;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M20.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647 .565 1.659 .106 1.659 -.753v-14c0 -.86 -1.012 -1.318 -1.659 -.753z" stroke-width="0" fill="currentColor"></path><path d="M9.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647 .565 1.659 .106 1.659 -.753v-14c0 -.86 -1.012 -1.318 -1.659 -.753z" stroke-width="0" fill="currentColor"></path></svg>',
        tooltip: "Previous",
        click: function () {
          previous_video()
        },
      },
      {
        name: "next-button",
        index: 11,
        position: "left",
        html: '<svg fill="none" stroke-width="2" xmlns="http://www.w3.org/2000/svg" height="22" width="22" class="icon icon-tabler icon-tabler-player-track-next-filled" width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="overflow: visible; color: currentcolor;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M2 5v14c0 .86 1.012 1.318 1.659 .753l8 -7a1 1 0 0 0 0 -1.506l-8 -7c-.647 -.565 -1.659 -.106 -1.659 .753z" stroke-width="0" fill="currentColor"></path><path d="M13 5v14c0 .86 1.012 1.318 1.659 .753l8 -7a1 1 0 0 0 0 -1.506l-8 -7c-.647 -.565 -1.659 -.106 -1.659 .753z" stroke-width="0" fill="currentColor"></path></svg>',
        tooltip: "Next",
        click: function () {
          next_video()
        },
      },
    ],
    quality: [],
    // highlight: [],
    plugins: [AutoHeightPlugin],
    whitelist: [],
    settings: [],
    // subtitle:{}
    moreVideoAttr: {
      // @ts-ignore
      "webkit-playsinline": true,
      playsInline: true,
    },
    type: ext(objStore.obj.name),
    customType: {
      flv: function (video: HTMLMediaElement, url: string) {
        const flvPlayer = flvjs.createPlayer(
          {
            type: "flv",
            url: url,
          },
          { referrerPolicy: "same-origin" },
        )
        flvPlayer.attachMediaElement(video)
        flvPlayer.load()
      },
      m3u8: function (video: HTMLMediaElement, url: string) {
        const hls = new Hls()
        hls.loadSource(url)
        hls.attachMedia(video)
        if (!video.src) {
          video.src = url
        }
      },
    },
    lang: ["en", "zh-cn", "zh-tw"].includes(currentLang().toLowerCase())
      ? (currentLang().toLowerCase() as string)
      : "en",
    lock: true,
    fastForward: true,
    autoPlayback: true,
    autoOrientation: true,
    airplay: true,
  }
  const subtitle = objStore.related.filter((obj) => {
    for (const ext of [".srt", ".ass", ".vtt"]) {
      if (obj.name.endsWith(ext)) {
        return true
      }
    }
    return false
  })
  const danmu = objStore.related.find((obj) => {
    for (const ext of [".xml"]) {
      if (obj.name.endsWith(ext)) {
        return true
      }
    }
    return false
  })

  // TODO: add a switch in manage panel to choose whether to enable `libass-wasm`
  const enableEnhanceAss = true

  if (subtitle.length != 0) {
    let isEnhanceAssMode = false

    // set default subtitle
    const defaultSubtitle = subtitle[0]
    if (enableEnhanceAss && ext(defaultSubtitle.name).toLowerCase() === "ass") {
      isEnhanceAssMode = true
      option.plugins?.push(
        artplayerPluginAss({
          // debug: true,
          subUrl: proxyLink(defaultSubtitle, true),
        }),
      )
    } else {
      option.subtitle = {
        url: proxyLink(defaultSubtitle, true),
        type: ext(defaultSubtitle.name),
        escape: false,
      }
    }

    // render subtitle toggle menu
    const innerMenu: Setting[] = [
      {
        id: "setting_subtitle_display",
        html: "Display",
        tooltip: "Show",
        switch: true,
        onSwitch: function (item: Setting) {
          item.tooltip = item.switch ? "Hide" : "Show"
          setSubtitleVisible(!item.switch)

          // sync menu subtitle tooltip
          const menu_sub = option.settings?.find(
            (_) => _.id === "setting_subtitle",
          )
          menu_sub && (menu_sub.tooltip = item.tooltip)

          return !item.switch
        },
      },
    ]
    subtitle.forEach((item, i) => {
      innerMenu.push({
        default: i === 0,
        html: (
          <span
            title={item.name}
            style={{
              "max-width": "200px",
              overflow: "hidden",
              "text-overflow": "ellipsis",
              "word-break": "break-all",
              "white-space": "normal",
              display: "-webkit-box",
              "-webkit-line-clamp": "2",
              "-webkit-box-orient": "vertical",
              "font-size": "12px",
            }}
          >
            {item.name}
          </span>
        ) as HTMLElement,
        name: item.name,
        url: proxyLink(item, true),
      })
    })

    option.settings?.push({
      id: "setting_subtitle",
      html: "Subtitle",
      tooltip: "Show",
      icon: ArtPlayerIconsSubtitle({ size: 24 }) as HTMLElement,
      selector: innerMenu,
      onSelect: function (item: Setting) {
        if (enableEnhanceAss && ext(item.name).toLowerCase() === "ass") {
          isEnhanceAssMode = true
          this.emit("artplayer-plugin-ass:switch" as keyof Events, item.url)
          setSubtitleVisible(true)
        } else {
          isEnhanceAssMode = false
          this.subtitle.switch(item.url, { name: item.name })
          this.once("subtitleLoad", setSubtitleVisible.bind(this, true))
        }

        const switcher = innerMenu.find(
          (_) => _.id === "setting_subtitle_display",
        )

        if (switcher && !switcher.switch) switcher.$html?.click?.()

        // sync from display switcher
        return switcher?.tooltip
      },
    })

    function setSubtitleVisible(visible: boolean) {
      const type = isEnhanceAssMode ? "ass" : "webvtt"

      switch (type) {
        case "ass":
          player.subtitle.show = false
          player.emit("artplayer-plugin-ass:visible" as keyof Events, visible)
          break

        case "webvtt":
        default:
          player.subtitle.show = visible
          player.emit("artplayer-plugin-ass:visible" as keyof Events, false)
          break
      }
    }
  }

  if (danmu) {
    option.plugins?.push(
      artplayerPluginDanmuku({
        danmuku: proxyLink(danmu, true),
        speed: 5,
        opacity: 1,
        fontSize: 25,
        color: "#FFFFFF",
        mode: 0,
        margin: [0, "0%"],
        antiOverlap: false,
        useWorker: true,
        synchronousPlayback: false,
        lockTime: 5,
        maxLength: 100,
        minWidth: 200,
        maxWidth: 400,
        theme: "dark",
        heatmap: true,
      }),
    )
  }
  onMount(() => {
    player = new Artplayer(option)
    let auto_fullscreen: boolean
    switch (searchParams["auto_fullscreen"]) {
      case "true":
        auto_fullscreen = true
      case "false":
        auto_fullscreen = false
      default:
        auto_fullscreen = false
    }
    player.on("ready", () => {
      player.fullscreen = auto_fullscreen
    })
    player.on("video:ended", () => {
      if (!autoNext()) return
      next_video()
    })
  })
  onCleanup(() => {
    if (player && player.video) player.video.src = ""
    player?.destroy()
  })
  const [autoNext, setAutoNext] = createSignal()
  return (
    <VideoBox onAutoNextChange={setAutoNext}>
      <Box w="$full" h="60vh" id="video-player" />
    </VideoBox>
  )
}

export default Preview
