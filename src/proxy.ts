import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasAdminAccess, hasApplicantAccess } from "@/lib/auth/roles";

const applicantRoutes = [
  "/eligibility",
  "/schemes",
  "/applications",
  "/branches",
];

export const proxy = auth((request) => {
  const pathname = request.nextUrl.pathname;
  const role = request.auth?.user?.role;

  if (!request.auth?.user) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && !hasAdminAccess(role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.nextUrl));
  }

  if (
    applicantRoutes.some((route) => pathname.startsWith(route)) &&
    !hasApplicantAccess(role)
  ) {
    if (hasAdminAccess(role)) return NextResponse.redirect(new URL("/admin", request.nextUrl));
    return NextResponse.redirect(new URL("/unauthorized", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/eligibility/:path*",
    "/schemes/:path*",
    "/applications/:path*",
    "/branches/:path*",
  ],
};
