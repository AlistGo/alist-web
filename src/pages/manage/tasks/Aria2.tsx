import { VStack } from "@hope-ui/solid"
import { useManageTitle } from "~/hooks"
import { TypeTasks } from "./Tasks"
import {
  getOfflineDownloadNameAnalyzer,
  getOfflineDownloadTransferNameAnalyzer,
} from "./helper"

// deprecated
const Aria2 = () => {
  useManageTitle("manage.sidemenu.aria2")
  return (
    <VStack w="$full" alignItems="start" spacing="$4">
      <TypeTasks
        type="aria2_down"
        canRetry
        nameAnalyzer={getOfflineDownloadNameAnalyzer()}
      />
      <TypeTasks
        type="aria2_transfer"
        nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
      />
    </VStack>
  )
}

export default Aria2
