import { AuthProvider } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import AppGuard from "@/components/AppGuard";
import { ToastProvider } from "@/components/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppGuard>
        <ToastProvider>
          <div className="h-full flex">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </ToastProvider>
      </AppGuard>
    </AuthProvider>
  );
}
