import { Toaster } from "sonner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      {children}
      <p className="mt-8 text-xs text-gray-400">
        Developed by{" "}
        <a href="https://www.iol.ph" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 underline">
          IOL Inc.
        </a>
      </p>
      <Toaster richColors position="top-center" />
    </div>
  );
}
