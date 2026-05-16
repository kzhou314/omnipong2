import { Outlet, useLocation } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export function Layout() {
  const location = useLocation();
  const isLayoutWorkshopRoute = location.pathname.startsWith("/directors/layouts/");
  const isPublicLayoutRoute = /^\/activities\/[^/]+\/layout$/.test(location.pathname);
  const useImmersiveLayout = isLayoutWorkshopRoute || isPublicLayoutRoute;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main
        className={`flex min-h-0 flex-1 flex-col ${
          useImmersiveLayout ? "overflow-hidden" : ""
        }`}
      >
        <Outlet />
      </main>
      {useImmersiveLayout ? null : <Footer />}
    </div>
  );
}
