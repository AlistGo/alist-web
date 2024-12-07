import { useManageTitle, useT } from "~/hooks"
import { TypeTasks } from "./Tasks"
import { getPath } from "./helper"

const Copy = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.copy")
  return (
    <TypeTasks
      type="copy"
      canRetry
      nameAnalyzer={{
        regex: /^copy \[(.+)]\((.*\/([^\/]+))\) to \[(.+)]\((.+)\)$/,
        title: (matches) => matches[3],
        attrs: {
          [t(`tasks.attr.copy.src`)]: (matches) =>
            getPath(matches[1], matches[2]),
          [t(`tasks.attr.copy.dst`)]: (matches) =>
            getPath(matches[4], matches[5]),
        },
      }}
    />
  )
}

export default Copy
