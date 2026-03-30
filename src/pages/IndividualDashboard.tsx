import { useMemo } from 'react'
import { useApp } from '@/store/AppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CalendarCheck, ChevronRight, Clock, CheckCircle2, UserCheck } from 'lucide-react'

interface IndividualDashboardProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export function IndividualDashboard({ onNavigate }: IndividualDashboardProps) {
  const { currentUser, events } = useApp()
  if (!currentUser) return null

  const bookedSessions = useMemo(() => {
    return events
      .flatMap(event =>
        event.instances
          .filter(instance => instance.attendees.some(a => a.youngPersonId === currentUser.id))
          .map(instance => ({
            ...instance,
            eventTitle: event.title,
            venue: instance.venueOverride ?? event.venue,
            type: event.type,
          }))
      )
      .sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.startTime}`).getTime()
        const bTime = new Date(`${b.date}T${b.startTime}`).getTime()
        return aTime - bTime
      })
  }, [currentUser.id, events])

  const today = new Date().toISOString().split('T')[0]

  const upcoming = bookedSessions.filter(s => s.status === 'scheduled' && s.date >= today)
  const completed = bookedSessions.filter(s => s.status === 'completed')
  const cancelled = bookedSessions.filter(s => s.status === 'cancelled')

  const attendanceStats = useMemo(() => {
    const attendance = bookedSessions.map(s => s.attendees.find(a => a.youngPersonId === currentUser.id)?.present ?? null)
    const present = attendance.filter(v => v === true).length
    const absent = attendance.filter(v => v === false).length
    const pending = attendance.filter(v => v === null).length
    return { present, absent, pending }
  }, [bookedSessions, currentUser.id])

  const nextSession = upcoming[0]

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Welcome back, {currentUser.name.split(' ')[0]}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your bookings, attendance, and next sessions in one place.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onNavigate('events')} className="gap-2">
            <Calendar className="size-4" />What's On
          </Button>
          <Button onClick={() => onNavigate('my-events')} className="gap-2">
            <CalendarCheck className="size-4" />My Events
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Booked Sessions" value={bookedSessions.length} icon={<Calendar className="size-4" />} tone="blue" />
        <MetricCard label="Upcoming" value={upcoming.length} icon={<Clock className="size-4" />} tone="amber" />
        <MetricCard label="Completed" value={completed.length} icon={<CheckCircle2 className="size-4" />} tone="emerald" />
        <MetricCard label="Attendance Marked" value={attendanceStats.present + attendanceStats.absent} icon={<UserCheck className="size-4" />} tone="violet" />
      </div>

      {nextSession && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Next Session</CardTitle>
            <CardDescription>Be ready for your upcoming class</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-medium">{nextSession.eventTitle}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(`${nextSession.date}T${nextSession.startTime}`).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })} · {nextSession.startTime}-{nextSession.endTime}
              </p>
            </div>
            <Button variant="outline" onClick={() => onNavigate('event-detail', { instanceId: nextSession.id })} className="gap-1.5">
              View Session <ChevronRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">Booked Events</CardTitle>
            <CardDescription>Your next scheduled sessions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground text-center">No upcoming bookings yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.slice(0, 6).map(session => (
                  <li key={session.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{session.eventTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(`${session.date}T${session.startTime}`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {session.startTime}-{session.endTime} · {session.venue}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onNavigate('event-detail', { instanceId: session.id })} className="gap-1 text-xs">
                      Open <ChevronRight className="size-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">Attendance Snapshot</CardTitle>
            <CardDescription>Read-only summary of your attendance outcomes</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Badge variant="success" className="justify-center py-1.5">Present: {attendanceStats.present}</Badge>
              <Badge variant="destructive" className="justify-center py-1.5">Absent: {attendanceStats.absent}</Badge>
              <Badge variant="secondary" className="justify-center py-1.5">Pending: {attendanceStats.pending}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border p-3">
                <p className="text-muted-foreground text-xs mb-1">Completed Sessions</p>
                <p className="font-semibold text-emerald-600">{completed.length}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-muted-foreground text-xs mb-1">Cancelled Sessions</p>
                <p className="font-semibold text-red-600">{cancelled.length}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onNavigate('profile')} className="flex-1">Full Attendance</Button>
              <Button onClick={() => onNavigate('my-events')} className="flex-1">My Events</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {bookedSessions.length === 0 && (
        <Card>
          <CardContent className="py-14 text-center space-y-3 text-muted-foreground">
            <Calendar className="size-10 mx-auto opacity-40" />
            <h3 className="text-sm">No booked sessions yet.</h3>
            <h5 className="text-xs m-4">Browse available activities and book your first session.</h5>
            <Button onClick={() => onNavigate('events')}>Explore Events</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: 'blue' | 'amber' | 'emerald' | 'violet'
}) {
  const toneClass = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    violet: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20',
  }[tone]

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-2xl font-bold font-heading">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
          <div className={`rounded-lg p-2 ${toneClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
