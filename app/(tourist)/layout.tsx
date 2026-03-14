import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { ZircuviaLogo } from "@/components/illustrations";

export default async function TouristLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const isSignedIn = !!session;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <ZircuviaLogo className="w-7 h-7" />
            <span className="font-bold text-lg text-[#2E7D32]">ZircuVia</span>
          </Link>

          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <Link href="/profile">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} alt={session.firstName} />
                  <AvatarFallback className="bg-[#2E7D32] text-white text-xs">
                    {session.firstName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-[#2E7D32] hover:underline"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-20">
        {children}
      </main>

      <BottomNav isSignedIn={isSignedIn} />
    </div>
  );
}
