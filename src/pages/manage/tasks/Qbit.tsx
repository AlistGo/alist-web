import { VStack } from "@hope-ui/solid"
import { useManageTitle } from "~/hooks"
import { TypeTasks } from "./Tasks"
import {
  getOfflineDownloadNameAnalyzer,
  getOfflineDownloadTransferNameAnalyzer,
} from "./helper"

// deprecated
const Qbit = () => {
  useManageTitle("manage.sidemenu.qbit")
  return (
    <VStack w="$full" alignItems="start" spacing="$4">
      <TypeTasks
        type="qbit_down"
        canRetry
        nameAnalyzer={getOfflineDownloadNameAnalyzer()}
      />
      <TypeTasks
        type="qbit_transfer"
        nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
      />
    </VStack>
  )
}

export default Qbit
