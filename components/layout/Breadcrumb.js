import Link from "next/link"

export default function Breadcrumb({ breadcrumbTitleParent, breadcrumbTitle }) {
    return (
        <>
            <div className="flex items-center flex-wrap justify-between gap20 mb-27">
                <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
                    <li>
                        <Link href="/">
                            <div className="text-tiny">Dashboard</div>
                        </Link>
                    </li>
                    <li>
                        <i className="icon-chevron-right" />
                    </li>
                    <li>
                        <Link href="#"><div className="text-tiny">{breadcrumbTitleParent}</div></Link>
                    </li>
                    <li>
                        <i className="icon-chevron-right" />
                    </li>
                    <li>
                        <div className="text-tiny">{breadcrumbTitle}</div>
                    </li>
                </ul>
            </div>

        </>
    )
}
