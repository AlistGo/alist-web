import { globalCss, HopeThemeConfig } from "@hope-ui/solid"
import { hoverColor } from "~/utils"

const theme: HopeThemeConfig = {
  initialColorMode: "system",
  lightTheme: {
    colors: {
      background: "#FFFFFF",
      loContrast: "#F5F5F7",
      primary1: "#F2F8FF",
      primary2: "#E5F1FF",
      primary3: "#D4E5FF",
      primary4: "#C1D8FF",
      primary5: "#A9C8FF",
      primary6: "#8BB4FF",
      primary7: "#6699FF",
      primary8: "#3D7AFF",
      primary9: "#007AFF",
      primary10: "#0066CC",
      primary11: "#0052A3",
      primary12: "#003D7A",
      success1: "#F2FFF5",
      success2: "#E5FFEB",
      success3: "#D4FFDE",
      success4: "#C1FFD1",
      success5: "#A9FFC1",
      success6: "#8BFFAA",
      success7: "#66FF8F",
      success8: "#3DFF72",
      success9: "#34C759",
      success10: "#2DB04E",
      success11: "#269943",
      success12: "#1F8238",
      warning1: "#FFF8F2",
      warning2: "#FFEFE5",
      warning3: "#FFE5D4",
      warning4: "#FFD9C1",
      warning5: "#FFCBA9",
      warning6: "#FFBA8B",
      warning7: "#FFA566",
      warning8: "#FF8C3D",
      warning9: "#FF9500",
      warning10: "#E08200",
      warning11: "#C77200",
      warning12: "#A86000",
      danger1: "#FFF2F2",
      danger2: "#FFE5E5",
      danger3: "#FFD4D4",
      danger4: "#FFC1C1",
      danger5: "#FFA9A9",
      danger6: "#FF8B8B",
      danger7: "#FF6666",
      danger8: "#FF3D3D",
      danger9: "#FF3B30",
      danger10: "#E03329",
      danger11: "#C72C24",
      danger12: "#A8241E",
      info1: "#F2F8FF",
      info2: "#E5F1FF",
      info3: "#D4E5FF",
      info4: "#C1D8FF",
      info5: "#A9C8FF",
      info6: "#8BB4FF",
      info7: "#6699FF",
      info8: "#3D7AFF",
      info9: "#007AFF",
      info10: "#0066CC",
      info11: "#0052A3",
      info12: "#003D7A",
    },
  },
  darkTheme: {
    colors: {
      background: "#000000",
      loContrast: "#1C1C1E",
      primary1: "#001A33",
      primary2: "#00264D",
      primary3: "#003366",
      primary4: "#004080",
      primary5: "#004D99",
      primary6: "#005AB3",
      primary7: "#0066CC",
      primary8: "#0073E6",
      primary9: "#0A84FF",
      primary10: "#3399FF",
      primary11: "#66B3FF",
      primary12: "#99CCFF",
      success1: "#00330D",
      success2: "#004D14",
      success3: "#00661A",
      success4: "#008021",
      success5: "#009927",
      success6: "#00B32E",
      success7: "#00CC34",
      success8: "#00E63B",
      success9: "#30D158",
      success10: "#5DD97A",
      success11: "#8AE19C",
      success12: "#B7E9BE",
      warning1: "#331F00",
      warning2: "#4D2E00",
      warning3: "#663D00",
      warning4: "#804D00",
      warning5: "#995C00",
      warning6: "#B36B00",
      warning7: "#CC7A00",
      warning8: "#E68A00",
      warning9: "#FF9F0A",
      warning10: "#FFB33D",
      warning11: "#FFC766",
      warning12: "#FFDB99",
      danger1: "#330A08",
      danger2: "#4D0F0C",
      danger3: "#661410",
      danger4: "#801914",
      danger5: "#991E18",
      danger6: "#B3231C",
      danger7: "#CC2820",
      danger8: "#E62D24",
      danger9: "#FF453A",
      danger10: "#FF6961",
      danger11: "#FF8D88",
      danger12: "#FFB1AE",
      info1: "#001A33",
      info2: "#00264D",
      info3: "#003366",
      info4: "#004080",
      info5: "#004D99",
      info6: "#005AB3",
      info7: "#0066CC",
      info8: "#0073E6",
      info9: "#0A84FF",
      info10: "#3399FF",
      info11: "#66B3FF",
      info12: "#99CCFF",
    },
  },
  components: {
    Button: {
      baseStyle: {
        root: {
          rounded: "12px",
          fontWeight: 600,
          _active: {
            transform: "scale(0.97)",
            transition: "transform 0.15s ease-in-out",
          },
          _focus: {
            boxShadow: "0 0 0 4px rgba(0, 122, 255, 0.2)",
          },
          _disabled: {
            opacity: 0.5,
            cursor: "not-allowed",
          },
        },
      },
      defaultProps: {
        root: {
          colorScheme: "primary",
          variant: "solid",
        },
      },
      variants: {
        solid: {
          root: {
            bgColor: "$primary9",
            color: "white",
            _hover: {
              bgColor: "$primary10",
            },
            _active: {
              bgColor: "$primary11",
            },
          },
        },
        subtle: {
          root: {
            bgColor: "transparent",
            color: "$primary9",
            _hover: {
              bgColor: "$primary2",
            },
            _active: {
              bgColor: "$primary3",
            },
          },
        },
        outline: {
          root: {
            bgColor: "transparent",
            color: "$primary9",
            border: "1.5px solid",
            borderColor: "$primary6",
            _hover: {
              bgColor: "$primary1",
              borderColor: "$primary7",
            },
            _active: {
              bgColor: "$primary2",
            },
          },
        },
        ghost: {
          root: {
            bgColor: "transparent",
            color: "$neutral12",
            _hover: {
              bgColor: "$neutral4",
            },
            _active: {
              bgColor: "$neutral5",
            },
          },
        },
      },
    },
    IconButton: {
      baseStyle: {
        root: {
          rounded: "12px",
          _active: {
            transform: "scale(0.97)",
            transition: "transform 0.15s ease-in-out",
          },
          _focus: {
            boxShadow: "0 0 0 4px rgba(0, 122, 255, 0.2)",
          },
        },
      },
      defaultProps: {
        colorScheme: "primary",
        variant: "ghost",
      },
    },
    Input: {
      baseStyle: {
        input: {
          rounded: "12px",
          border: "1.5px solid",
          borderColor: "$neutral6",
          bgColor: "$background",
          _focus: {
            boxShadow: "0 0 0 4px rgba(0, 122, 255, 0.2)",
            borderColor: "$primary9",
          },
          _hover: {
            borderColor: "$neutral7",
          },
          _disabled: {
            opacity: 0.5,
            cursor: "not-allowed",
          },
          py: "$2_5",
          fontSize: "$md",
        },
      },
      defaultProps: {
        input: {
          variant: "outline",
        },
      },
    },
    Textarea: {
      baseStyle: {
        rounded: "12px",
        border: "1.5px solid",
        borderColor: "$neutral6",
        bgColor: "$background",
        _focus: {
          boxShadow: "0 0 0 4px rgba(0, 122, 255, 0.2)",
          borderColor: "$primary9",
        },
        _hover: {
          borderColor: "$neutral7",
        },
        resize: "vertical",
        wordBreak: "break-all",
        py: "$2_5",
        fontSize: "$md",
      },
      defaultProps: {
        variant: "outline",
      },
    },
    Select: {
      baseStyle: {
        trigger: {
          rounded: "12px",
          border: "1.5px solid",
          borderColor: "$neutral6",
          bgColor: "$background",
          _focus: {
            boxShadow: "0 0 0 4px rgba(0, 122, 255, 0.2)",
            borderColor: "$primary9",
          },
          _hover: {
            borderColor: "$neutral7",
          },
          py: "$2_5",
          fontSize: "$md",
        },
        content: {
          border: "none",
          rounded: "12px",
          shadow:
            "rgba(0, 0, 0, 0.1) 0px 4px 20px, rgba(0, 0, 0, 0.06) 0px 0px 1px",
          bgColor: "$background",
        },
        option: {
          rounded: "8px",
          mx: "$1",
          py: "$2",
          px: "$3",
          _hover: {
            bgColor: "$neutral4",
          },
          _selected: {
            bgColor: "$primary2",
            color: "$primary10",
          },
        },
        optionIndicator: {
          color: "$primary10",
        },
      },
      defaultProps: {
        root: {
          variant: "outline",
        },
      },
    },
    Checkbox: {
      baseStyle: {
        root: {
          _hover: {
            "& .hope-checkbox__control": {
              borderColor: "$primary7",
            },
          },
        },
        control: {
          rounded: "6px",
          borderWidth: "2px",
          borderColor: "$neutral6",
          _checked: {
            bgColor: "$primary9",
            borderColor: "$primary9",
          },
          _indeterminate: {
            bgColor: "$primary9",
            borderColor: "$primary9",
          },
        },
      },
      defaultProps: {
        root: {
          colorScheme: "primary",
          variant: "filled",
        },
      },
    },
    Switch: {
      baseStyle: {
        track: {
          rounded: "full",
          bgColor: "$neutral5",
          _checked: {
            bgColor: "$primary9",
          },
        },
        thumb: {
          rounded: "full",
          bgColor: "white",
          shadow: "rgba(0, 0, 0, 0.15) 0px 1px 3px",
        },
      },
      defaultProps: {
        root: {
          colorScheme: "primary",
        },
      },
    },
    Menu: {
      baseStyle: {
        content: {
          rounded: "12px",
          minW: "unset",
          border: "none",
          shadow:
            "rgba(0, 0, 0, 0.1) 0px 4px 20px, rgba(0, 0, 0, 0.06) 0px 0px 1px",
          bgColor: "$background",
          p: "$1",
        },
        item: {
          rounded: "8px",
          py: "$2",
          px: "$3",
          mx: "$1",
          _hover: {
            bgColor: "$neutral4",
          },
        },
        groupTitle: {
          px: "$3",
          py: "$1",
          fontSize: "$xs",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "$neutral10",
        },
      },
    },
    Notification: {
      baseStyle: {
        root: {
          rounded: "12px",
          border: "none",
          shadow:
            "rgba(0, 0, 0, 0.1) 0px 4px 20px, rgba(0, 0, 0, 0.06) 0px 0px 1px",
        },
      },
    },
    Alert: {
      baseStyle: {
        root: {
          rounded: "12px",
          border: "none",
        },
      },
    },
    Anchor: {
      baseStyle: {
        rounded: "8px",
        px: "$1_5",
        py: "$1",
        color: "$primary9",
        _hover: {
          bgColor: hoverColor(),
          textDecoration: "none",
        },
        _focus: {
          boxShadow: "0 0 0 4px rgba(0, 122, 255, 0.2)",
        },
        _active: {
          transform: "scale(0.98)",
          transition: "transform 0.15s ease-in-out",
        },
      },
    },
    Modal: {
      baseStyle: {
        overlay: {
          bgColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
        },
        content: {
          rounded: "16px",
          border: "none",
          shadow:
            "rgba(0, 0, 0, 0.2) 0px 20px 40px, rgba(0, 0, 0, 0.1) 0px 0px 1px",
          bgColor: "$background",
        },
        header: {
          fontSize: "$lg",
          fontWeight: 600,
          pb: "$2",
        },
        body: {
          py: "$2",
        },
        footer: {
          pt: "$2",
        },
      },
    },
    Drawer: {
      baseStyle: {
        overlay: {
          bgColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
        },
        content: {
          border: "none",
          shadow:
            "rgba(0, 0, 0, 0.2) 0px 20px 40px, rgba(0, 0, 0, 0.1) 0px 0px 1px",
          bgColor: "$background",
        },
        header: {
          fontSize: "$lg",
          fontWeight: 600,
        },
      },
    },
    Popover: {
      baseStyle: {
        content: {
          rounded: "12px",
          border: "none",
          shadow:
            "rgba(0, 0, 0, 0.1) 0px 4px 20px, rgba(0, 0, 0, 0.06) 0px 0px 1px",
          bgColor: "$background",
        },
      },
    },
    Tooltip: {
      baseStyle: {
        content: {
          rounded: "8px",
          bgColor: "$neutral12",
          color: "white",
          fontSize: "$sm",
          py: "$1_5",
          px: "$2",
        },
      },
    },
    Badge: {
      baseStyle: {
        root: {
          rounded: "full",
          fontSize: "$xs",
          fontWeight: 600,
          textTransform: "none",
        },
      },
    },
    Tag: {
      baseStyle: {
        root: {
          rounded: "8px",
          fontSize: "$sm",
        },
      },
    },
    Card: {
      baseStyle: {
        root: {
          rounded: "16px",
          border: "none",
          shadow:
            "rgba(0, 0, 0, 0.04) 0px 1px 3px, rgba(0, 0, 0, 0.06) 0px 1px 2px",
          bgColor: "$background",
        },
        header: {
          pb: "$3",
        },
        body: {
          py: "$3",
        },
        footer: {
          pt: "$3",
        },
      },
    },
    Table: {
      baseStyle: {
        table: {
          borderCollapse: "collapse",
          w: "$full",
        },
        thead: {
          th: {
            fontWeight: 600,
            fontSize: "$sm",
            color: "$neutral11",
            textTransform: "none",
            letterSpacing: "normal",
            borderBottom: "1px solid",
            borderColor: "$neutral5",
          },
        },
        tbody: {
          tr: {
            borderBottom: "1px solid",
            borderColor: "$neutral4",
            _last: {
              borderBottom: "none",
            },
            _hover: {
              bgColor: "$neutral3",
            },
          },
          td: {
            py: "$3",
          },
        },
      },
    },
  },
}

export const globalStyles = globalCss({
  "*": {
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
  },
  "*, *::before, *::after": {
    boxSizing: "border-box",
  },
  html: {
    fontFamily: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" !important`,
    fontSize: "16px",
    lineHeight: 1.5,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    textRendering: "optimizeLegibility",
  },
  body: {
    fontFamily: `inherit`,
    lineHeight: 1.5,
    color: "$neutral12",
    bgColor: "$background",
  },
  "#root": {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minHeight: "100vh",
  },
  "::selection": {
    bgColor: "$primary4",
    color: "$primary12",
  },
  'button, [role="button"]': {
    cursor: "pointer",
  },
  a: {
    color: "$primary9",
    textDecoration: "none",
    _hover: {
      textDecoration: "underline",
    },
  },
  ".hope-breadcrumb__list": {
    flexWrap: "wrap",
    rowGap: "0 !important",
  },
  ".lightgallery-container": {
    "& .lg-backdrop": {
      zIndex: "$popover",
    },
    "& .lg-outer": {
      zIndex: "calc($popover + 10)",
    },
  },
  ".viselect-selection-area": {
    background: "rgba(0, 122, 255, 0.15)",
    border: "2px solid rgba(0, 122, 255, 0.8)",
    borderRadius: "4px",
  },
  ".viselect-container": {
    userSelect: "none",
    "& .viselect-item": {
      "-webkit-user-drag": "none",
      "& img": {
        "-webkit-user-drag": "none",
      },
    },
  },
  "h1, h2, h3, h4, h5, h6": {
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h1: {
    fontSize: "$4xl",
  },
  h2: {
    fontSize: "$3xl",
  },
  h3: {
    fontSize: "$2xl",
  },
  h4: {
    fontSize: "$xl",
  },
  h5: {
    fontSize: "$lg",
  },
  h6: {
    fontSize: "$md",
  },
})

export { theme }
