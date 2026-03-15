import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, Building2, Leaf, Receipt, Users, Calendar,
  ScrollText, Settings, MessageSquare, FileText,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { SurveyProvider } from "@/components/survey/SurveyProvider";
import { GiveFeedbackButton } from "@/components/survey/GiveFeedbackButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: LayoutDashboard, permission: null },
  { href: "/admin/businesses", label: "Businesses", icon: Building2, permission: "businessManagement" },
  { href: "/admin/eco-business", label: "Eco Business", icon: Leaf, permission: "ecoBusinessProcessing" },
  { href: "/admin/fees", label: "Envi Fees", icon: Receipt, permission: "environmentalFees" },
  { href: "/admin/treasury-report", label: "Treasury Report", icon: FileText, permission: "environmentalFees" },
  { href: "/admin/visits", label: "Visits", icon: Users, permission: "visitorStats" },
  { href: "/admin/events", label: "Events & Promos", icon: Calendar, permission: "eventsAndPromos" },
  { href: "/admin/logs", label: "System Logs", icon: ScrollText, permission: "systemLogs" },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare, permission: null },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings" },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin-login");

  const access = await prisma.adminAccess.findUnique({ where: { userId: session.userId } });

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.permission === null || (access && access[item.permission as keyof typeof access])
  );

  return (
    <SurveyProvider role="ADMIN" variant="dialog">
      <div className="min-h-screen flex bg-gray-50">
        <aside className="w-64 bg-white border-r p-4 flex flex-col fixed h-full print:hidden">
          <div className="font-bold text-lg text-[#2E7D32] mb-1">ZircuVia</div>
          <div className="text-xs text-gray-500 mb-6">Content Management System</div>
          <nav className="flex-1 space-y-1">
            {visibleItems.map((item) => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:text-[#2E7D32] hover:bg-green-50 transition text-sm">
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2">
            <GiveFeedbackButton />
          </div>
          <div className="border-t pt-4 mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">{session.firstName}</div>
            <SignOutButton redirectTo="/admin-login" />
          </div>
        </aside>
        <main className="flex-1 ml-64 p-8 print:ml-0 print:p-0">{children}</main>
      </div>
    </SurveyProvider>
  );
}
