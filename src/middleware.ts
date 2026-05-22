import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "mircioo_session";

const publicPaths = ["/login", "/register"];
const apiPrefix = "/api";

function isPublic(pathname: string): boolean {
  if (pathname.startsWith(apiPrefix)) return true;
  return publicPaths.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const parsed = JSON.parse(session.value);
    if (!parsed.userId || !parsed.workspaceId || !parsed.role) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
