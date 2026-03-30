import { useMemo } from 'react'
import { useApp } from '@/store/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, CalendarCheck, TrendingUp, Clock, PlusCircle, ChevronRight, CheckCircle2, AlertTriangle, CalendarDays } from 'lucide-react'
import type { Event, EventInstance } from '@/types'

interface AdminDashboardProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { users, events, currentUser } = useApp()

  const stats = useMemo(() => {
    const allInstances = events.flatMap(e => e.instances)
    const today = new Date().toISOString().split('T')[0]
    const upcoming = allInstances.filter(i => i.date >= today && i.status === 'scheduled')
    const completed = allInstances.filter(i => i.status === 'completed')
    const staffCount = users.filter(u => u.role === 'staff' && u.isActive).length
    const availableStaff = users.filter(u => u.role === 'staff' && u.isActive && u.availability === 'available').length
    const understaffed = upcoming.filter(i => {
      const ev = events.find(e => e.id === i.eventId)
      return ev && i.staffAssigned.length < ev.requiredStaff
    })
    return { upcoming: upcoming.length, completed: completed.length, staffCount, availableStaff, understaffedCount: understaffed.length }
  }, [users, events])

  const todayInstances = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return events
      .flatMap(e => e.instances.map(i => ({ ...i, eventTitle: e.title, eventType: e.type, venue: i.venueOverride ?? e.venue })))
      .filter(i => i.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [events])

  const upcomingInstances = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return events
      .flatMap(e => e.instances.map(i => ({ ...i, eventTitle: e.title, eventType: e.type })))
      .filter(i => i.date > today && i.status === 'scheduled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 5)
  }, [events])

  const activeStaff = users.filter(u => u.role === 'staff' && u.isActive).slice(0, 6)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Good morning, {currentUser?.name.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground mt-1 text-sm">Here's what's happening at OYCI today</p>
        </div>
        <Button onClick={() => onNavigate('create-event')} className="gap-2 self-start sm:self-auto">
          <PlusCircle className="size-4" />Create Event
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Upcoming Events" value={stats.upcoming} icon={<CalendarDays className="size-5" />} color="blue" />
        <StatCard label="Active Staff" value={`${stats.availableStaff}/${stats.staffCount}`} icon={<Users className="size-5" />} color="emerald" sub="available today" />
        <StatCard label="Sessions Completed" value={stats.completed} icon={<CheckCircle2 className="size-5" />} color="purple" />
        <StatCard label="Understaffed" value={stats.understaffedCount} icon={<AlertTriangle className="size-5" />} color={stats.understaffedCount > 0 ? 'red' : 'emerald'} sub={stats.understaffedCount > 0 ? 'need staff' : 'all covered'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold flex items-center gap-2"><Clock className="size-4 text-muted-foreground" />Today's Schedule</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('events')} className="gap-1 text-xs">View all <ChevronRight className="size-3" /></Button>
          </div>
          {todayInstances.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No events scheduled for today</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {todayInstances.map(inst => <InstanceCard key={inst.id} instance={inst} events={events} onNavigate={onNavigate} />)}
            </div>
          )}
          {upcomingInstances.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-6">
                <h2 className="font-heading font-semibold flex items-center gap-2"><CalendarCheck className="size-4 text-muted-foreground" />Coming Up</h2>
              </div>
              <div className="space-y-2">
                {upcomingInstances.map(inst => <InstanceCard key={inst.id} instance={inst} events={events} onNavigate={onNavigate} compact />)}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold flex items-center gap-2"><TrendingUp className="size-4 text-muted-foreground" />Staff Status</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('staff')} className="gap-1 text-xs">Manage <ChevronRight className="size-3" /></Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {activeStaff.map(s => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{s.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      {s.availabilityNote && <p className="text-xs text-muted-foreground truncate">{s.availabilityNote}</p>}
                    </div>
                    <span className={`size-2 rounded-full ${s.availability === 'unavailable' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full gap-2" onClick={() => onNavigate('staff-availability')}>
            <CalendarDays className="size-4" />Staff Availability
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-2xl font-bold font-heading">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`rounded-xl p-2 ${colorMap[color] ?? colorMap.blue}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

const TYPE_BADGE: Record<string, string> = { workshop: 'info', activity: 'success', trip: 'warning', programme: 'default', meeting: 'secondary' }

function InstanceCard({ instance, events, onNavigate, compact = false }: {
  instance: EventInstance & { eventTitle: string; eventType: string }
  events: Event[]
  onNavigate: (page: string, params?: Record<string, string>) => void
  compact?: boolean
}) {
  const ev = events.find(e => e.id === instance.eventId)
  const understaffed = ev && instance.staffAssigned.length < ev.requiredStaff
  const dateLabel = new Date(instance.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  if (compact) {
    return (
      <button onClick={() => onNavigate('event-detail', { instanceId: instance.id })}
        className="w-full text-left flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:bg-accent transition-colors">
        <div className="text-xs text-muted-foreground w-16 shrink-0">{dateLabel}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{instance.eventTitle}</p>
          <p className="text-xs text-muted-foreground">{instance.startTime}–{instance.endTime}</p>
        </div>
        {understaffed && <Badge variant="warning" className="text-xs shrink-0">Understaffed</Badge>}
        <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
      </button>
    )
  }

  return (
    <button onClick={() => onNavigate('event-detail', { instanceId: instance.id })}
      className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-accent transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={TYPE_BADGE[instance.eventType] as 'info'} className="text-xs capitalize">{instance.eventType}</Badge>
            {understaffed && <Badge variant="warning" className="text-xs">Understaffed</Badge>}
            {instance.status === 'completed' && <Badge variant="success" className="text-xs">Completed</Badge>}
          </div>
          <h3 className="font-medium text-sm">{instance.eventTitle}</h3>
          <p className="text-xs text-muted-foreground mt-1">{instance.startTime}–{instance.endTime} · {instance.venueOverride ?? ev?.venue}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium">{instance.staffAssigned.length}/{ev?.requiredStaff} staff</p>
          <p className="text-xs text-muted-foreground">{instance.attendees.length} attendees</p>
        </div>
      </div>
    </button>
  )
}
