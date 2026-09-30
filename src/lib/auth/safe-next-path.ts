const HOST_PATHS = ["/admin"];

/**
 * Where to send a host after login. Only same-site host paths are allowed,
 * so a crafted `?next=` link can't bounce someone to another website.
 */
export function safeNextPath(raw: string | null | undefined): string {
  const fallback = "/admin";
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("://") || value.length > 200) {
    return fallback;
  }
  const path = value.split(/[?#]/)[0];
  const allowed = HOST_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  return allowed ? value : fallback;
}

export function loginHref(nextPath: string, error?: "not-host"): string {
  const params = new URLSearchParams({ next: nextPath });
  if (error) params.set("error", error);
  return `/login?${params.toString()}`;
}
