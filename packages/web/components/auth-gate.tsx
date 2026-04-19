import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { ConnectPanel } from "./connect-panel";

/**
 * Server gate. Shows a connect panel instead of the children when the caller
 * isn't yet authed. Default mode requires *both* a verified wallet and a
 * linked X account — the strict surface for /apply, /quiz, /raffle submit.
 */
export async function AuthGate({
  children,
  mode = "both",
}: {
  children: React.ReactNode;
  mode?: "wallet" | "both";
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.wallet) {
    return <ConnectPanel step="wallet" />;
  }
  if (mode === "both" && !session.user.twitterLinked) {
    return <ConnectPanel step="twitter" />;
  }
  return <>{children}</>;
}
