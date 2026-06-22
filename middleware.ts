export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!login|register|api/auth|api/register|_next/static|_next/image|favicon.ico|next-dev.*\\.log).*)",
  ],
};
