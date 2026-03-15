import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SurveyProvider } from "@/components/survey/SurveyProvider";
import { CheckerHeader } from "./checker-header";

export default async function CheckerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "VERIFIER") redirect("/checker-login");

  const profile = await prisma.verifierProfile.findUnique({
    where: { userId: session.userId },
    include: { assignedLocation: { select: { name: true } } },
  });

  const locationName = profile?.assignedLocation?.name ?? null;

  return (
    <SurveyProvider role="VERIFIER" variant="dialog">
      <div className="min-h-screen bg-white flex flex-col items-center">
        <CheckerHeader firstName={session.firstName} locationName={locationName} />
        <main className="w-full max-w-md px-4 py-6">{children}</main>
      </div>
    </SurveyProvider>
  );
}
