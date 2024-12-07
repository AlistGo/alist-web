import { VStack } from "@hope-ui/solid"
import { useManageTitle } from "~/hooks"
import { TypeTasks } from "./Tasks"
import {
  getOfflineDownloadNameAnalyzer,
  getOfflineDownloadTransferNameAnalyzer,
} from "./helper"

const OfflineDownload = () => {
  useManageTitle("manage.sidemenu.offline_download")
  return (
    <VStack w="$full" alignItems="start" spacing="$4">
      <TypeTasks
        type="offline_download"
        canRetry
        nameAnalyzer={getOfflineDownloadNameAnalyzer()}
      />
      <TypeTasks
        type="offline_download_transfer"
        canRetry
        nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
      />
    </VStack>
  )
}

export default OfflineDownload
