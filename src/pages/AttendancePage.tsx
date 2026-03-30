import { useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, ArrowLeft, Save, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttendancePageProps {
  instanceId: string
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export function AttendancePage({ instanceId, onNavigate }: AttendancePageProps) {
  const { getInstanceById, getEventByInstanceId, markAttendance, saveAttendance } = useApp()
  const [saved, setSaved] = useState(false)

  const instance = getInstanceById(instanceId)
  const event = getEventByInstanceId(instanceId)

  if (!instance || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-muted-foreground">
        <p>Session not found.</p>
        <Button variant="outline" onClick={() => onNavigate('events')}>Go to Events</Button>
      </div>
    )
  }

  const presentCount = instance.attendees.filter(a => a.present === true).length
  const absentCount = instance.attendees.filter(a => a.present === false).length
  const pendingCount = instance.attendees.filter(a => a.present === null).length
  const total = instance.attendees.length
  const dateLabel = new Date(instance.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const handleSave = () => { saveAttendance(instanceId); setSaved(true); onNavigate('event-detail', { instanceId }) }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className='flex w-full justify-start'>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('event-detail', { instanceId })} className="gap-2 -ml-2"><ArrowLeft className="size-4" />Back to Event</Button>
      </div>
      <div>
        <h1 className="font-heading text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">{event.title} · {dateLabel} · {instance.startTime}–{instance.endTime}</p>
      </div>

      {saved && <Alert variant="success"><AlertTitle>Attendance locked</AlertTitle><AlertDescription>Session has been marked as completed.</AlertDescription></Alert>}

      <div className="grid grid-cols-4 gap-3">
        {[['Total', total, 'text-foreground'], ['Present', presentCount, 'text-emerald-600'], ['Absent', absentCount, 'text-red-600'], ['Pending', pendingCount, 'text-muted-foreground']].map(([l, v, c]) => (
          <Card key={String(l)} size="sm"><CardContent className="pt-3 pb-3 text-center">
            <p className={cn('text-2xl font-bold font-heading', String(c))}>{v}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{l}</p>
          </CardContent></Card>
        ))}
      </div>

      {total > 0 && (
        <div className="rounded-xl bg-muted overflow-hidden h-2">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(presentCount / total) * 100}%` }} />
        </div>
      )}

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2"><Users className="size-4" />Attendee List</CardTitle>
          <CardDescription>Click ✓ or ✗ to mark each young person</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {instance.attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-8 text-center">No attendees registered for this session</p>
          ) : (
            <ul className="divide-y divide-border">
              {instance.attendees.map(a => (
                <li key={a.youngPersonId} className={cn('flex items-center gap-3 px-4 py-3 transition-colors',
                  a.present === true && 'bg-emerald-50/50 dark:bg-emerald-900/10',
                  a.present === false && 'bg-red-50/50 dark:bg-red-900/10')}>
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">{a.name[0]}</div>
                  <span className="text-sm flex-1 font-medium">{a.name}</span>
                  {a.present === null && <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>}
                  {a.present === true && <Badge variant="success" className="text-xs shrink-0">Present</Badge>}
                  {a.present === false && <Badge variant="destructive" className="text-xs shrink-0">Absent</Badge>}
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => markAttendance(instanceId, a.youngPersonId, true)} disabled={saved}
                      className={cn('size-8 rounded-lg flex items-center justify-center transition-colors',
                        a.present === true ? 'bg-emerald-500 text-white' : 'bg-muted/60 text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700',
                        saved && 'cursor-not-allowed opacity-50')} aria-label={`Mark ${a.name} present`}>
                      <CheckCircle2 className="size-4" />
                    </button>
                    <button onClick={() => markAttendance(instanceId, a.youngPersonId, false)} disabled={saved}
                      className={cn('size-8 rounded-lg flex items-center justify-center transition-colors',
                        a.present === false ? 'bg-red-500 text-white' : 'bg-muted/60 text-muted-foreground hover:bg-red-100 hover:text-red-700',
                        saved && 'cursor-not-allowed opacity-50')} aria-label={`Mark ${a.name} absent`}>
                      <XCircle className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!saved && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-muted-foreground">{pendingCount > 0 ? `${pendingCount} attendee(s) still unmarked` : 'All attendees marked'}</p>
          <Button onClick={handleSave} className="gap-2" disabled={pendingCount > 0}><Save className="size-4" />Lock Attendance</Button>
        </div>
      )}
    </div>
  )
}
