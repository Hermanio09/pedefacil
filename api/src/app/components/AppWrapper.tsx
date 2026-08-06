"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const semSidebar = pathname === "/login" || pathname === "/setup";

  if (semSidebar) return <>{children}</>;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-wrap">{children}</div>
    </div>
  );
}
