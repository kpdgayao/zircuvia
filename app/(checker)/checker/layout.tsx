import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { SurveyProvider } from "@/components/survey/SurveyProvider";

export default async function CheckerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "VERIFIER") redirect("/checker-login");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <header className="w-full max-w-md px-4 py-4 text-center border-b">
        <h1 className="font-bold text-[#2E7D32] text-lg">ZircuVia</h1>
        <p className="text-xs text-gray-500">Visitor Checker — {session.firstName}</p>
        <div className="mt-2">
          <SignOutButton redirectTo="/checker-login" />
        </div>
      </header>
      <main className="w-full max-w-md px-4 py-6">
        <SurveyProvider role="VERIFIER" variant="dialog">
          {children}
        </SurveyProvider>
      </main>
    </div>
  );
}
