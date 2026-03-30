import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/store/AppContext'
import { LayoutDashboard, Users, CalendarDays, PlusCircle, CheckSquare, History, UserCircle, LogOut, HelpingHand, CalendarCheck, Sun, Moon, HeartHandshake } from 'lucide-react'
import { Field, FieldLabel } from "@/components/ui/field"
import { useEffect, useState } from 'react'

interface AppSidebarProps { currentPage: string; onNavigate: (page: string) => void }
const AVAIL_DOT: Record<string, string> = { available: 'bg-emerald-500', partial: 'bg-amber-500', unavailable: 'bg-red-500' }

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const [dark, setDark] = useState(false)
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  const { currentUser, logout } = useApp()
  if (!currentUser) return null
  const isAdmin = currentUser.role === 'admin'
  const adminItems = [
    { page: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { page: 'staff', label: 'Staff Management', Icon: Users },
    { page: 'staff-availability', label: 'Staff Availability', Icon: CalendarCheck },
  ]
  const sharedItems = [
    { page: 'create-event', label: 'Create Event', Icon: PlusCircle },
    { page: 'events', label: isAdmin ? 'All Events' : 'My Events', Icon: CalendarDays },
    { page: 'attendance', label: 'Attendance', Icon: CheckSquare },
    { page: 'history', label: 'Event History', Icon: History },
    { page: 'profile', label: 'My Profile', Icon: UserCircle },
  ]
  const individualItems = [
    { page: 'dashboard', label: 'My Dashboard', Icon: LayoutDashboard },
    { page: 'events', label: "What's On?", Icon: CalendarDays },
    { page: 'my-events', label: 'My Events', Icon: CalendarDays },
    { page: 'attendance', label: 'Attendance', Icon: CheckSquare },
    { page: 'profile', label: 'My Profile', Icon: UserCircle },
  ]
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
      
        <div className="flex items-center gap-1 px-2 py-2">
          <div className="flex items-center justify-center cursor-pointer" onClick={
            () => onNavigate('/')
          }>
            <img src="./logo.png" alt="OYCI Logo" className="size-12 p-2" />
            {/* <HelpingHand className="size-4 fill-white text-white" /> */}
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <p className="font-heading font-bold text-sm leading-tight text-left text-primary">OYCI</p>
            <p className="text-xs text-muted-foreground leading-tight text-left">Management Portal</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {isAdmin ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Overview</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map(({ page, label, Icon }) => (
                    <SidebarMenuItem key={page}>
                      <SidebarMenuButton isActive={currentPage === page} onClick={() => onNavigate(page)} tooltip={label}>
                        <Icon /><span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Manage</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sharedItems.map(({ page, label, Icon }) => (
                    <SidebarMenuItem key={page}>
                      <SidebarMenuButton isActive={currentPage === page} onClick={() => onNavigate(page)} tooltip={label}>
                        <Icon /><span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {individualItems.map(({ page, label, Icon }) => (
                  <SidebarMenuItem key={`${page}-${label}`}>
                    <SidebarMenuButton isActive={currentPage === page} onClick={() => onNavigate(page)} tooltip={label}>
                      <Icon /><span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator className='group-data-[collapsible=icon]:hidden'/>
        <Field orientation="horizontal" data-disabled className="w-fit p-2">
          <FieldLabel htmlFor="switch-size-default" className='group-data-[collapsible=icon]:hidden hover:cursor-pointer'>{dark ? 
            <Sun onClick={() => setDark(v => !v)}/>
            : <Moon onClick={() => setDark(v => !v)}/>
            }</FieldLabel>
          <FieldLabel htmlFor="switch-size-default" className='group-data-[collapsible=icon]:hidden'>{dark ? "Light Mode": "Dark mode"}</FieldLabel>
        </Field>
        <SidebarSeparator />
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="relative shrink-0">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar ${AVAIL_DOT[currentUser.availability]}`} />
          </div>
          <div className="group-data-[collapsible=icon]:hidden flex-1 min-w-0 text-left">
            <p className="text-xs font-medium truncate">{currentUser.name}</p>
            <Badge variant={currentUser.role === 'admin' ? 'default' : 'secondary'} className="text-xs mt-0.5">{currentUser.role}</Badge>
          </div>
          <button onClick={logout} className="group-data-[collapsible=icon]:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Sign out">
            <LogOut className="size-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
