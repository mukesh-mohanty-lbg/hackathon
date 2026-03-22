import { Link, Outlet, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Calendar, UserCheck, Users2, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/attendance", label: "Attendance", icon: UserCheck },
  { to: "/admin/staff", label: "Staff", icon: Users2 },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span className="font-bold tracking-tight">OYCI Admin</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const AdminLayout = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 gap-3 bg-background sticky top-0 z-20">
            <SidebarTrigger className="shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
            <div className="flex-1" />
            <button
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-accent"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Exit
            </Link>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
