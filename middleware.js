export const config = {
  matcher: ["/((?!api/login|login\\.html|_vercel|favicon\\.ico).*)"],
};

async function sessionToken(password) {
  const data = new TextEncoder().encode(password + ":kadavra-platforms-session");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function middleware(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return new Response("SITE_PASSWORD no configurado en Vercel", { status: 500 });
  }
  const expected = `kadavra_session=${await sessionToken(password)}`;
  const cookieHeader = request.headers.get("cookie") || "";
  const authed = cookieHeader.split(";").some((c) => c.trim() === expected);
  if (!authed) {
    const url = new URL("/login.html", request.url);
    url.searchParams.set("next", new URL(request.url).pathname);
    return Response.redirect(url, 302);
  }
}
