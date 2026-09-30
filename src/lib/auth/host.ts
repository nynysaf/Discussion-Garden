import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginHref } from "./safe-next-path";

export type HostCheck =
  | { status: "host"; email: string }
  | { status: "signed-out" }
  | { status: "not-host"; email: string };

/** Is the current request from a signed-in host? Never throws. */
export async function checkHost(): Promise<HostCheck> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) return { status: "signed-out" };
    const { data: isHost, error } = await supabase.rpc("is_host");
    if (error || isHost !== true) return { status: "not-host", email };
    return { status: "host", email };
  } catch {
    return { status: "signed-out" };
  }
}

/** For host pages: redirect to /login unless the visitor is a host. */
export async function requireHost(nextPath: string): Promise<string> {
  const check = await checkHost();
  if (check.status === "signed-out") redirect(loginHref(nextPath));
  if (check.status === "not-host") redirect(loginHref(nextPath, "not-host"));
  return check.email;
}
