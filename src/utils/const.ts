import { useColorModeValue } from "@hope-ui/solid"

export const hoverColor = () => {
  return useColorModeValue("rgba(0, 0, 0, 0.04)", "rgba(255, 255, 255, 0.08)")()
}

export const selectedColor = () => {
  return useColorModeValue(
    "rgba(0, 122, 255, 0.12)",
    "rgba(10, 132, 255, 0.20)",
  )()
}

export const separatorColor = () => {
  return useColorModeValue("rgba(0, 0, 0, 0.12)", "rgba(255, 255, 255, 0.15)")()
}

export const alphaColor = (level: number, reverse = false) => {
  if (reverse) {
    return useColorModeValue(`$blackAlpha${level}`, `whiteAlpha${level}`)()
  }
  return useColorModeValue(`$whiteAlpha${level}`, `blackAlpha${level}`)()
}

export const alphaBgColor = () =>
  useColorModeValue("$whiteAlpha10", "$blackAlpha11")()
