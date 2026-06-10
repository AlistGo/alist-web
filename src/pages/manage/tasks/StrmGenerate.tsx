import { useManageTitle, useT } from "~/hooks"
import { TypeTasks } from "./Tasks"

const StrmGenerate = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.strm_generate")
  return (
    <TypeTasks
      type="strm_generate"
      canRetry
      nameAnalyzer={{
        // backend name: `generate strm [<mount>](<path>)`
        regex: /^generate strm \[(.+)]\((.*)\)$/,
        title: (matches) => matches[1],
        attrs: {
          [t(`tasks.attr.strm_generate.path`)]: (matches) => matches[2] || "/",
        },
      }}
    />
  )
}

export default StrmGenerate
