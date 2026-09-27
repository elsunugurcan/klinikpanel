import { NextResponse, type NextRequest } from "next/server";
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = !!req.cookies.get("kp_session")?.value;
  if (pathname.startsWith("/giris")) return hasCookie ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  if (!hasCookie) return NextResponse.redirect(new URL(`/giris?next=${encodeURIComponent(pathname)}`, req.url));
  const res = NextResponse.next(); res.headers.set("x-pathname", pathname); return res;
}
export const config = { matcher: ["/((?!_next|api|favicon.ico|icon.svg|fonts).*)"] };
