import { useMemo } from 'react'
import { useApp } from '@/store/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Clock, CheckCircle2, ChevronRight, PlusCircle, ToggleLeft } from 'lucide-react'

interface StaffDashboardProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export function StaffDashboard({ onNavigate }: StaffDashboardProps) {
  const { currentUser, events } = useApp()
  if (!currentUser) return null

  const today = new Date().toISOString().split('T')[0]

  const myInstances = useMemo(() =>
    events.flatMap(ev => ev.instances.map(i => ({ ...i, eventTitle: ev.title, eventType: ev.type, venue: i.venueOverride ?? ev.venue })))
      .filter(i => i.staffAssigned.includes(currentUser.id))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [events, currentUser]
  )

  const todayInst = myInstances.filter(i => i.date === today)
  const upcoming = myInstances.filter(i => i.date > today && i.status === 'scheduled').slice(0, 4)
  const recentDone = myInstances.filter(i => i.status === 'completed').slice(0, 3)

  const AVAIL_COLOR = { available: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700', partial: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700', unavailable: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700' }
  const AVAIL_BADGE: Record<string, 'success' | 'warning' | 'destructive'> = { available: 'success', partial: 'success', unavailable: 'destructive' }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Hi, {currentUser.name.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => onNavigate('profile')} className="gap-2"><ToggleLeft className="size-4" />My Availability</Button>
          <Button size="sm" onClick={() => onNavigate('create-event')} className="gap-2"><PlusCircle className="size-4" />Create Event</Button>
        </div>
      </div>

      {/* Availability banner */}
      <div className={`rounded-xl border-2 p-4 flex items-center justify-between gap-4 ${AVAIL_COLOR[currentUser.availability]}`}>
        <div className="flex items-center gap-3">
          <Avatar className="size-10"><AvatarFallback className="text-sm bg-primary/10 text-primary">{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
          <div>
            <p className="font-medium text-sm">{currentUser.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant={AVAIL_BADGE[currentUser.availability]} className="text-xs capitalize">
                {currentUser.availability === 'available' ? '🟢' : '🔴'} {currentUser.availability === 'unavailable' ? 'Unavailable' : 'Available'}
              </Badge>
              {currentUser.availabilityNote && <span className="text-xs text-muted-foreground">"{currentUser.availabilityNote}"</span>}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('profile')}>Update</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-2xl font-bold font-heading text-blue-600">{myInstances.filter(i => i.date >= today && i.status === 'scheduled').length}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground"><Clock className="size-3.5" />Upcoming sessions</div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-2xl font-bold font-heading text-emerald-600">{myInstances.filter(i => i.status === 'completed').length}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5" />Sessions completed</div>
        </CardContent></Card>
      </div>

      {todayInst.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold flex items-center gap-2"><Calendar className="size-4 text-muted-foreground" />Today</h2>
          {todayInst.map(inst => <InstRow key={inst.id} instance={inst} onNavigate={onNavigate} highlight />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold flex items-center gap-2"><Clock className="size-4 text-muted-foreground" />Upcoming</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('events')} className="text-xs gap-1">View all <ChevronRight className="size-3" /></Button>
          </div>
          {upcoming.map(inst => <InstRow key={inst.id} instance={inst} onNavigate={onNavigate} />)}
        </div>
      )}

      {recentDone.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold flex items-center gap-2"><CheckCircle2 className="size-4 text-muted-foreground" />Recently Completed</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('history')} className="text-xs gap-1">Full History <ChevronRight className="size-3" /></Button>
          </div>
          {recentDone.map(inst => <InstRow key={inst.id} instance={inst} onNavigate={onNavigate} />)}
        </div>
      )}

      {myInstances.length === 0 && (
        <Card><CardContent className="py-16 text-center space-y-3">
          <Calendar className="size-10 mx-auto text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">You haven't been assigned to any events yet.</p>
          <Button size="sm" onClick={() => onNavigate('events')}>Browse Events</Button>
        </CardContent></Card>
      )}
    </div>
  )
}

function InstRow({ instance, onNavigate, highlight = false }: {
  instance: { id: string; eventTitle: string; date: string; startTime: string; endTime: string; venue: string; status: string }
  onNavigate: (page: string, params?: Record<string, string>) => void
  highlight?: boolean
}) {
  const dateLabel = new Date(instance.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return (
    <button onClick={() => onNavigate('event-detail', { instanceId: instance.id })}
      className={`w-full text-left rounded-xl border p-3.5 hover:bg-accent transition-colors flex items-center gap-3 ${highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
      <div className={`size-2.5 rounded-full shrink-0 ${instance.status === 'completed' ? 'bg-emerald-500' : highlight ? 'bg-primary' : 'bg-blue-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{instance.eventTitle}</p>
        <p className="text-xs text-muted-foreground">{dateLabel} · {instance.startTime}–{instance.endTime} · {instance.venue}</p>
      </div>
      {instance.status === 'completed' && <Badge variant="success" className="text-xs shrink-0">Done</Badge>}
      <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
    </button>
  )
}
