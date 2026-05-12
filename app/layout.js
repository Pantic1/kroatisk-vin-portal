import { Nunito } from 'next/font/google'
import "/public/css/animate.min.css"
import "/public/css/animation.css"
import "/public/css/bootstrap-select.min.css"
import "/public/css/bootstrap.css"
import "/public/css/swiper-bundle.min.css"
import "/public/css/style.css"
import "/public/font/fonts.css"
import "/public/icon/style.css"

const nunito = Nunito({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['latin'],
    variable: "--nunito-font-family",
    display: 'swap',
})
export const metadata = {
    title: 'Kroatisk vin',
    description: '',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${nunito.variable} body`}>{children}</body>
        </html>
    )
}
