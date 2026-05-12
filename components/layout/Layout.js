'use client'
import { useState } from "react"
import ProgressBar from "../elements/ProgressBar"
import Breadcrumb from './Breadcrumb'
import Footer1 from './Footer1'
import Header1 from "./Header1"
import Offcanvas from "./Offcanvas"
import Sidebar from './Sidebar'

export default function Layout({
  user, // <-- NY: kommer fra server-layoutet
  headerStyle,
  breadcrumbTitleParent,
  breadcrumbTitle,
  children,
  boxed,
  menuIconHover,
  menuIconDefault
}) {
  const [isSidebar, setSidebar] = useState(false)
  const handleSidebar = () => setSidebar(!isSidebar)

  const [isOffcanvas, setIsOffcanvas] = useState(false)
  const handleOffcanvas = () => setIsOffcanvas(!isOffcanvas)

  return (
    <>
      <ProgressBar />
      <div id="wrapper">
        <div id="page">
          <div
            className={`layout-wrap 
              ${boxed ? "layout-width-boxed" : ""}
              ${menuIconHover ? "menu-style-icon" : ""}
              ${menuIconDefault ? "menu-style-icon-default" : ""}
              ${isSidebar ? "full-width" : ""}
            `}
          >
            <Sidebar handleSidebar={handleSidebar} />
            <div className="section-content-right">
              {/* NY: giv user videre til headeren */}
              <Header1
                user={user}
                isSidebar={isSidebar}
                handleSidebar={handleSidebar}
                handleOffcanvas={handleOffcanvas}
              />
              <div className="main-content">
                <div className="main-content-inner">
                  <div className="main-content-wrap">
                    {breadcrumbTitle && (
                      <Breadcrumb
                        breadcrumbTitle={breadcrumbTitle}
                        breadcrumbTitleParent={breadcrumbTitleParent}
                      />
                    )}
                    {children}
                  </div>
                </div>
                <Footer1 />
              </div>
            </div>
          </div>
        </div>
        <Offcanvas isOffcanvas={isOffcanvas} handleOffcanvas={handleOffcanvas} />
      </div>
    </>
  )
}
