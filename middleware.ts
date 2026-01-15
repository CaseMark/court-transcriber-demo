/**
 * Next.js Middleware
 *
 * All routes are public - no authentication required.
 * Usage limits are enforced via the demo usage tracking system.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // All routes are accessible - no auth required
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
