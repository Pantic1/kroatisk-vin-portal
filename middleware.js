// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("auth_token")?.value;
  const { pathname } = req.nextUrl;

  // Offentlige ruter der skal være åbne
  const publicPaths = ["/login", "/register", "/api/login", "/favicon.ico"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // Skip Next.js assets og billeder
  const isAsset =
    pathname.startsWith("/_next") ||
    pathname === "/" && false || // behold root som beskyttet (fjern 'false' hvis forsiden skal være åben)
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$/.test(pathname);

  if (isPublic || isAsset) return NextResponse.next();

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // (valgfrit) hvis man er logget ind, undgå /login
  if (token && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Kør middleware på alt undtagen API og Next assets
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
