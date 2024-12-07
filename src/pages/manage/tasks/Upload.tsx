import { useManageTitle, useT } from "~/hooks"
import { TypeTasks } from "./Tasks"
import { getPath } from "./helper"

const Upload = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.upload")
  return (
    <TypeTasks
      type="upload"
      nameAnalyzer={{
        regex: /^upload (.+) to \[(.+)]\((.+)\)$/,
        title: (matches) => matches[1],
        attrs: {
          [t(`tasks.attr.upload.path`)]: (matches) =>
            getPath(matches[2], matches[3]),
        },
      }}
    />
  )
}

export default Upload
