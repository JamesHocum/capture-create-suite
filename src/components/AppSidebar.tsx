import {
  LayoutDashboard,
  Camera,
  Video,
  FolderOpen,
  Trash2,
  LogOut,
  Monitor,
  Download,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Screenshots", url: "/screenshots", icon: Camera },
  { title: "Recordings", url: "/recordings", icon: Video },
  { title: "All Files", url: "/files", icon: FolderOpen },
  { title: "Trash", url: "/trash", icon: Trash2 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { isInstallable, install } = useInstallPrompt();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Monitor className="h-6 w-6 text-primary shrink-0 neon-text" />
          {!collapsed && (
            <span className="text-lg font-bold text-primary neon-text tracking-widest uppercase">
              ScreenCraft
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs tracking-widest text-muted-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-primary/5 transition-all duration-300 uppercase text-sm tracking-wider"
                      activeClassName="bg-primary/10 text-primary font-medium neon-border"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        {isInstallable && (
          <Button
            variant="outline"
            className="w-full justify-start text-primary border-primary/30 hover:bg-primary/10 neon-border uppercase text-xs tracking-wider"
            onClick={install}
          >
            <Download className="mr-2 h-4 w-4" />
            {!collapsed && <span>Install App</span>}
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive uppercase text-xs tracking-wider"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
