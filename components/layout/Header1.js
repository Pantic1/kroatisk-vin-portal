"use client";

import { Menu } from '@headlessui/react';
import Link from "next/link";
import { useUser } from "../../lib/useUser";


export default function Header1({
    scroll,
    isMobileMenu,
    handleSidebar,
    handleOffcanvas,
}) {
    const { loading, name } = useUser();

    return (
        <div className="header-dashboard">
            <div className="wrap">
                <div className="header-left">
                    <Link href="/">
                        <img id="logo_header_mobile" />
                    </Link>
                    <div className="button-show-hide" onClick={handleSidebar}>
                        <i className="icon-menu-left" />
                    </div>
                    {/* search form here if needed */}
                </div>

                <div className="header-grid">
                    <div className="popup-wrap user type-header">
                        <Menu as="div" className="dropdown">
                            <Menu.Button className="btn btn-secondary dropdown-toggle">
                                <span className="header-user wg-user">
                                    <span className="image">
                                        <img src="/images/avatar/user-1.png" alt="" />
                                    </span>
                                    <span className="flex flex-column">
                                        <span className="body-title mb-2">{name || "Bruger"}</span>
                                        <span className="text-tiny">Admin</span>
                                    </span>
                                </span>
                            </Menu.Button>
                            {/* Menu items remain the same */}
                        </Menu>
                    </div>
                    
                </div>
            </div>
        </div>
    );
}
