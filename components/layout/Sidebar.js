import Link from "next/link"
import Menu from "./Menu"

export default function Sidebar({handleSidebar}) {
    return (
        <>

            <div className="section-menu-left">
                <div className="box-logo">
                    <Link href="/" id="site-logo-inner">
                        <img id="logo_header" alt="" src="/images/logo/logo.png" data-light="images/logo/logo.png" data-dark="images/logo/logo-dark.png" />
                    </Link>
                    <div className="button-show-hide" onClick={handleSidebar}>
                        <i className="icon-menu-left" />
                    </div>
                </div>
                <Menu />

            </div>

        </>
    )
}
