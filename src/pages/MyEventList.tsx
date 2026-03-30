import { useMemo } from 'react'
import { useApp } from '@/store/AppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CheckCircle2, ChevronRight, Clock, Users } from 'lucide-react'

interface MyEventListProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export function MyEventList({ onNavigate }: MyEventListProps) {
  const { currentUser, events } = useApp()

  const booked = useMemo(() => {
    if (!currentUser) return []

    return events
      .map(event => {
        const sessions = event.instances
          .filter(instance => instance.attendees.some(a => a.youngPersonId === currentUser.id))
          .sort((a, b) => {
            const aTime = new Date(`${a.date}T${a.startTime}`).getTime()
            const bTime = new Date(`${b.date}T${b.startTime}`).getTime()
            return aTime - bTime
          })

        return { event, sessions }
      })
      .filter(group => group.sessions.length > 0)
  }, [currentUser, events])

  if (!currentUser) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">My Booked Sessions</h1>
        <p className="text-muted-foreground text-sm mt-1">{booked.reduce((acc, group) => acc + group.sessions.length, 0)} booking(s) across {booked.length} course(s)</p>
      </div>

      {booked.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Calendar className="size-10 mx-auto opacity-40 mb-2" />
            <p className="font-medium">You have not booked any sessions yet.</p>
            <p className="text-sm mt-1">Go to What's On and use Book session to add classes.</p>
            <Button onClick={() => onNavigate('events')} className="mt-4">Browse Events</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {booked.map(({ event, sessions }) => (
            <Card key={event.id} className="p-0">
              <CardHeader className="border-b border-border bg-zinc-100 pt-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>{event.venue} • {event.type}</CardDescription>
                  </div>
                  <Badge variant="secondary">{sessions.length} session(s)</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {sessions.map(session => {
                    const attendee = session.attendees.find(a => a.youngPersonId === currentUser.id)
                    const attendanceBadge = attendee?.present === true
                      ? <Badge variant="success">Present</Badge>
                      : attendee?.present === false
                        ? <Badge variant="destructive">Absent</Badge>
                        : <Badge variant="outline">Pending</Badge>
                    const statusBadge = session.status === 'completed'
                      ? <Badge variant="success" className="capitalize">Session {session.status}</Badge>
                      : session.status === 'cancelled'
                        ? <Badge variant="destructive" className="capitalize">Session {session.status}</Badge>
                        : <Badge variant="secondary" className="capitalize">Session {session.status}</Badge>

                    return (
                      <li key={session.id} className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {statusBadge}
                          </div>
                          <p className="text-sm font-medium">
                            {new Date(`${session.date}T${session.startTime}`).toLocaleDateString('en-GB', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1"><Clock className="size-3" />{session.startTime}-{session.endTime}</span>
                            <span className="inline-flex items-center gap-1"><Users className="size-3" />{session.attendees.length} attendees</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {attendanceBadge}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigate('attendance', { instanceId: session.id })}
                            className="gap-1.5"
                          >
                            Attendance Details
                            <ChevronRight className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onNavigate('event-detail', { instanceId: session.id })}
                            className="gap-1.5"
                          >
                            Session Details
                            <CheckCircle2 className="size-4" />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
