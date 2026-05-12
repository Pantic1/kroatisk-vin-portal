"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Menu() {
    const router = usePathname()

    const [activeAccordion, setActiveAccordion] = useState(null)

    useEffect(() => {
        const accordionRoutes = {
            '/': 1,
            '/home-2': 1,
            '/home-3': 1,
            '/home-4': 1,
            '/home-boxed': 1,
            '/home-menu-icon-hover': 1,
            '/home-menu-icon-default': 1,
            '/add-product': 2,
            '/product-list': 2,
            '/product-detail-1': 2,
            '/product-detail-2': 2,
            '/product-detail-3': 2,
            '/category-list': 3,
            '/new-category': 3,
            '/attributes': 4,
            '/add-attributes': 4,
            '/order-list': 5,
            '/order-detail': 5,
            '/order-tracking': 5,
            '/all-user': 6,
            '/add-new-user': 6,
            '/login': 6,
            '/sign-up': 6,
            '/all-roles': 7,
            '/create-role': 7,
            '/gallery': 0,
            '/report': 0,
            '/countries': 8,
            '/states': 8,
            '/cities': 8,
            '/setting': 0,
            '/list-company': 9,
            '/new-company': 9,
            '/create-company': 9,
            '/components': 0,
            '/faq': 10,
            '/privacy-policy': 10,
        }

        // Check if the current path is in the object of accordion routes and set the activeAccordion state accordingly
        if (accordionRoutes.hasOwnProperty(router)) {
            setActiveAccordion(accordionRoutes[router])
        } else {
            setActiveAccordion(null)
        }
    }, [router])

    const handleAccordion = (key) => {
        setActiveAccordion(prevState => prevState === key ? null : key)
    }

    const isSubMenuItemActive = (path) => {
        return router === path
    }

    return (
        <div className="center">
            <div className="center-item">
                <div className="center-item">
                    <ul className="menu-list">
                        <li className={`menu-item ${router === '/' ? 'active' : ''}`}>
                            <Link className="menu-item-button" href="/">
                                <div className="icon"><i className="icon-grid" /></div>
                                <div className="text">Forside</div>
                            </Link>
                        </li>
                        <li className={`menu-item has-children ${activeAccordion === 2 ? 'active' : ''}`}>
                            <a className="menu-item-button" onClick={() => handleAccordion(2)}>
                                <div className="icon"><i className="icon-shopping-cart" /></div>
                                <div className="text">Produkter</div>
                            </a>
                            <ul className="sub-menu" style={{ display: `${activeAccordion === 2 ? "block" : "none"}` }}>
                                <li className="sub-menu-item">
                                    <Link href="/product-list" className={isSubMenuItemActive('/product-list') ? 'active' : ''}>
                                        <div className="text">Alle Produkt</div>
                                    </Link>
                                </li>
                                <li className="sub-menu-item">
                                    <Link href="/add-product" className={isSubMenuItemActive('/add-product') ? 'active' : ''}>
                                        <div className="text">Tilføj Produkt</div>
                                    </Link>
                                </li>
                            </ul>
                        </li>
                        <li className={`menu-item has-children ${activeAccordion === 9 ? 'active' : ''}`}>
                            <a className="menu-item-button" onClick={() => handleAccordion(9)}>
                                <div className="icon"><i className="icon-layers" /></div>
                                <div className="text">Firma</div>
                            </a>
                            <ul className="sub-menu" style={{ display: `${activeAccordion === 9 ? "block" : "none"}` }}>
                                <li className="sub-menu-item">
                                    <Link href="/list-page" className={isSubMenuItemActive('/list-page') ? 'active' : ''}>
                                        <div className="text">Alle Firma</div>
                                    </Link>
                                </li>
                                <li className="sub-menu-item">
                                    <Link href="/create-company" className={isSubMenuItemActive('/create-company') ? 'active' : ''}>
                                        <div className="text">Tilføj Firma</div>
                                    </Link>
                                </li>
                            </ul>
                        </li>


                        <li className={`menu-item has-children ${activeAccordion === 5 ? 'active' : ''}`}>
                            <a className="menu-item-button" onClick={() => handleAccordion(5)}>
                                <div className="icon"><i className="icon-file-plus" /></div>
                                <div className="text">Order</div>
                            </a>
                            <ul className="sub-menu" style={{ display: `${activeAccordion === 5 ? "block" : "none"}` }}>
                                <li className="sub-menu-item">
                                    <Link href="/order-list" className={isSubMenuItemActive('/order-list') ? 'active' : ''}>
                                        <div className="text">Order list</div>
                                    </Link>
                                </li>

                            </ul>
                        </li>
                        <li className={`menu-item has-children ${activeAccordion === 6 ? 'active' : ''}`}>
                            <a className="menu-item-button" onClick={() => handleAccordion(6)}>
                                <div className="icon"><i className="icon-user" /></div>
                                <div className="text">Brugere</div>
                            </a>
                            <ul className="sub-menu" style={{ display: `${activeAccordion === 6 ? "block" : "none"}` }}>
                                <li className="sub-menu-item">
                                    <Link href="/all-user" className={isSubMenuItemActive('/all-user') ? 'active' : ''}>
                                        <div className="text">Alle brugere</div>
                                    </Link>
                                </li>
                                <li className="sub-menu-item">
                                    <Link href="/add-new-user" className={isSubMenuItemActive('/add-new-user') ? 'active' : ''}>
                                        <div className="text">Tilføj bruger</div>
                                    </Link>
                                </li>
                            </ul>
                        </li>

                    </ul>
                </div>
            </div>


        </div>
    )
}
