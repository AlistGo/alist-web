import { Markdown } from "~/components"
import { useTitle } from "~/hooks"
import { getSetting } from "~/store"
import { notify } from "~/utils"
import CreateShareDialog from "~/components/CreateShareDialog"
import { Body } from "./Body"
import { Footer } from "./Footer"
import { Header } from "./header/Header"
import { Toolbar } from "./toolbar/Toolbar"

const Index = () => {
  useTitle(getSetting("site_title"))
  const announcement = getSetting("announcement")
  if (announcement) {
    notify.render(() => <Markdown children={announcement} />)
  }
  return (
    <>
      <Header />
      <Toolbar />
      <Body />
      <CreateShareDialog />
      <Footer />
    </>
  )
}

export default Index
