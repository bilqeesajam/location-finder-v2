import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, MapPin, ChartBar, FileText, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

function AdminSidebarContent({ closeOnNavigate = false }: { closeOnNavigate?: boolean }) {
  return (
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
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive }) =>
                  cn(
                    "w-full rounded-lg px-3 py-2 text-sm transition-colors",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    isActive && "bg-green-700 text-foreground font-medium"
                  )
                }
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span className="text-white font-medium inline-block">{item.label}</span>
                </span>
              </NavLink>
            );

            return closeOnNavigate ? (
              <SheetClose asChild key={item.to}>
                {link}
              </SheetClose>
            ) : (
              link
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-4">
        {closeOnNavigate ? (
          <SheetClose asChild>
            <Button variant="secondary" className="w-full" asChild>
              <NavLink to="/">Back to app</NavLink>
            </Button>
          </SheetClose>
        ) : (
          <Button variant="secondary" className="w-full" asChild>
            <NavLink to="/">Back to app</NavLink>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Sidebar - KEPT EXACTLY AS IS */}
      <aside className="hidden md:flex w-72 shrink-0 bg-background rounded-tr-2xl rounded-br-2xl overflow-hidden border border-border/50">
        <AdminSidebarContent />
      </aside>

      {/* Main Content Area - FIXED PADDING ISSUE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Nav Trigger */}
        <div className="md:hidden fixed top-4 right-4 z-40">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-background border border-border/50 rounded-xl h-10 w-10 shadow-sm"
                aria-label="Open admin navigation"
              >
                <Menu className="h-5 w-5 text-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-background border-r border-border/50">
              <AdminSidebarContent closeOnNavigate />
            </SheetContent>
          </Sheet>
        </div>
        <main className="flex-1 p-6 bg-gray-100 overflow-auto">
          {/* This is where your page content (Home, Suggestions, etc.) will appear */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
