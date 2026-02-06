import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, MapPin, ChartBar, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
};

const NAV_ITEMS: AdminNavItem[] = [
  { label: "Home", to: "/admin", icon: LayoutDashboard },
  { label: "Suggestions", to: "/admin/suggestions", icon: MapPin },
  { label: "Analytics", to: "/admin/analytics", icon: ChartBar },
  { label: "Audit Log", to: "/admin/audit", icon: FileText },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - KEPT EXACTLY AS IS */}
      <aside className="hidden md:flex w-72 shrink-0 bg-background rounded-2xl overflow-hidden border border-border/50 m-3">
        <div className="w-full flex flex-col">
          <div className="px-5 py-4">
            <div className="font-bold text-lg">Admin</div>
            <div className="text-sm text-muted-foreground">
              Dashboard & moderation
            </div>
          </div>

          <Separator />

          <ScrollArea className="flex-1 px-3 py-3">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/admin"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        isActive && "bg-muted text-foreground font-medium"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </ScrollArea>

          <Separator />

          <div className="p-4">
            <Button variant="secondary" className="w-full" asChild>
              <NavLink to="/">Back to app</NavLink>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area - FIXED PADDING ISSUE */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 bg-gray-100 overflow-auto">
          {/* This is where your page content (Home, Suggestions, etc.) will appear */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}