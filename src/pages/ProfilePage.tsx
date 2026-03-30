import { useMemo, useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AvailabilityStatus } from '@/types'
import { CheckCircle2, Mail, Phone, Calendar, Shield, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProfilePage() {
  const { currentUser, updateAvailability, events, availabilityOverrides, setAvailabilityOverride } = useApp()
  const [selectedStatus, setSelectedStatus] = useState<'available' | 'unavailable'>(
    currentUser?.availability === 'unavailable' ? 'unavailable' : 'available'
  )
  const [note, setNote] = useState(currentUser?.availabilityNote ?? '')
  const [saved, setSaved] = useState(false)
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0])
  const [isFullDay, setIsFullDay] = useState(true)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [calViewDate, setCalViewDate] = useState(new Date())
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null)

  if (!currentUser) return null

  const isIndividual = currentUser.role === 'individual'

  const handleSave = () => {
    if (!isFullDay && startTime >= endTime) return

    updateAvailability(currentUser.id, selectedStatus, note)
    setAvailabilityOverride({
      staffId: currentUser.id,
      date: blockDate,
      status: selectedStatus,
      note,
      isFullDay,
      startTime: isFullDay ? undefined : startTime,
      endTime: isFullDay ? undefined : endTime,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const STATUS_CONFIG: Record<'available' | 'unavailable', { label: string; desc: string; colorClass: string; badgeVariant: 'success' | 'destructive'; icon: string }> = {
    available: { label: 'Available', desc: 'Fully available and can be assigned to events', colorClass: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700', badgeVariant: 'success', icon: '🟢' },
    unavailable: { label: 'Unavailable', desc: 'Not available — use this for leave or sickness', colorClass: 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700', badgeVariant: 'destructive', icon: '🔴' },
  }

  const activeStatus: 'available' | 'unavailable' = currentUser.availability === 'unavailable' ? 'unavailable' : 'available'
  const currentConfig = STATUS_CONFIG[activeStatus]

  const attendanceRows = useMemo(() => {
    if (!isIndividual) return []

    return events
      .flatMap(event =>
        event.instances
          .filter(instance => instance.attendees.some(a => a.youngPersonId === currentUser.id))
          .map(instance => {
            const record = instance.attendees.find(a => a.youngPersonId === currentUser.id)
            return {
              id: instance.id,
              eventTitle: event.title,
              date: instance.date,
              time: `${instance.startTime}-${instance.endTime}`,
              sessionStatus: instance.status,
              attendance: record?.present ?? null,
            }
          })
      )
      .sort((a, b) => new Date(`${b.date}T00:00`).getTime() - new Date(`${a.date}T00:00`).getTime())
  }, [currentUser.id, events, isIndividual])

  const attendanceCounts = useMemo(() => {
    const present = attendanceRows.filter(r => r.attendance === true).length
    const absent = attendanceRows.filter(r => r.attendance === false).length
    const pending = attendanceRows.filter(r => r.attendance === null).length
    return { present, absent, pending, total: attendanceRows.length }
  }, [attendanceRows])

  const manualBlocks = useMemo(() => {
    if (isIndividual) return []
    return availabilityOverrides
      .filter(o => o.staffId === currentUser.id)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '00:00').localeCompare(b.startTime ?? '00:00'))
      .map(o => ({
        id: `manual-${o.staffId}-${o.date}-${o.startTime ?? 'full'}-${o.endTime ?? 'day'}`,
        date: o.date,
        slot: o.isFullDay || (!o.startTime && !o.endTime) ? 'Full day' : `${o.startTime}-${o.endTime}`,
        status: o.status,
        source: 'Manual',
        note: o.note ?? '',
      }))
  }, [availabilityOverrides, currentUser.id, isIndividual])

  const assignedBlocks = useMemo(() => {
    if (isIndividual) return []
    return events
      .flatMap(event =>
        event.instances
          .filter(instance => instance.staffAssigned.includes(currentUser.id) && instance.status === 'scheduled')
          .map(instance => ({
            id: `assigned-${instance.id}`,
            date: instance.date,
            slot: `${instance.startTime}-${instance.endTime}`,
            status: 'unavailable' as AvailabilityStatus,
            source: 'Assigned Event',
            note: event.title,
          }))
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot))
  }, [currentUser.id, events, isIndividual])

  const blockedSlots = useMemo(() => [...manualBlocks, ...assignedBlocks], [manualBlocks, assignedBlocks])

  const filteredSlots = useMemo(() =>
    selectedCalDay ? blockedSlots.filter(s => s.date === selectedCalDay) : blockedSlots,
    [blockedSlots, selectedCalDay]
  )

  const manualBlockDates = useMemo(() => new Set(manualBlocks.map(s => s.date)), [manualBlocks])
  const assignedBlockDates = useMemo(() => new Set(assignedBlocks.map(s => s.date)), [assignedBlocks])

  const calYear = calViewDate.getFullYear()
  const calMonth = calViewDate.getMonth()
  const calFirstDay = new Date(calYear, calMonth, 1).getDay()
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const calDayCells = Array.from({ length: calFirstDay + calDaysInMonth }, (_, i) => {
    if (i < calFirstDay) return null
    const d = i - calFirstDay + 1
    return String(calYear) + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
  })
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">{isIndividual ? 'Review your attendance records and session outcomes' : 'Manage your profile and availability status'}</p>
      </div>

      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-xl bg-primary/10 text-primary font-heading">{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-heading font-bold text-xl text-left">{currentUser.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={currentUser.role === 'admin' ? 'default' : 'secondary'} className="gap-1 text-xs">
                  {currentUser.role === 'admin' && <Shield className="size-3" />}{currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                </Badge>
                <Badge variant={currentConfig.badgeVariant} className="text-xs">{currentConfig.icon} {currentConfig.label}</Badge>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Mail className="size-4" />{currentUser.email}</span>
            {currentUser.phone && <span className="flex items-center gap-2"><Phone className="size-4" />{currentUser.phone}</span>}
            <span className="flex items-center gap-2"><Calendar className="size-4" />Joined {new Date(currentUser.joinedDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
          </div>
        </CardContent>
      </Card>

      {!isIndividual && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Availability Status</CardTitle>
            <CardDescription>Set your current availability. Admins can see this when assigning you to events.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {saved && <Alert variant="success"><CheckCircle2 className="size-4" /><AlertTitle>Status updated successfully</AlertTitle><AlertDescription>Your availability and blocking slot are now visible to admins.</AlertDescription></Alert>}

            <div className={`rounded-xl border-2 p-4 ${currentConfig.colorClass}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentConfig.icon}</span>
                <div>
                  <p className="font-medium text-sm">{currentConfig.label}</p>
                  <p className="text-xs text-muted-foreground">{currentConfig.desc}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Change Status</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['available', 'unavailable'] as const).map(status => {
                  const config = STATUS_CONFIG[status]
                  return (
                    <button key={status} onClick={() => setSelectedStatus(status)}
                      className={cn('rounded-xl border-2 p-3 text-left transition-all',
                        selectedStatus === status ? config.colorClass + ' ring-2 ring-offset-2 ring-primary/30' : 'border-border hover:border-primary/40')}>
                      <p className="text-sm font-medium">{config.icon} {config.label}</p>                        <p className="text-xs text-muted-foreground mt-0.5">{config.desc}</p>                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea placeholder="e.g. Available mornings only this week" value={note} onChange={e => setNote(e.target.value)} rows={2} />
              <p className="text-xs text-muted-foreground">This note will be visible to admins</p>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-sm font-medium">Block by date and time slot</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={blockDate}
                    onChange={e => setBlockDate(e.target.value)}
                    className="flex h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Block type</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFullDay(true)}
                      className={cn('rounded-lg border px-3 py-2 text-xs', isFullDay ? 'border-primary bg-primary/10' : 'border-border')}
                    >
                      Full day
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFullDay(false)}
                      className={cn('rounded-lg border px-3 py-2 text-xs', !isFullDay ? 'border-primary bg-primary/10' : 'border-border')}
                    >
                      Time slot
                    </button>
                  </div>
                </div>
              </div>

              {!isFullDay && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Start time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="flex h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">End time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="flex h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleSave} className="gap-2" disabled={!isFullDay && startTime >= endTime}><CheckCircle2 className="size-4" />Save Status</Button>
          </CardContent>
        </Card>
      )}

      {!isIndividual && (
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Availability Calendar</CardTitle>
                <CardDescription>Blocked dates overview. Click a day to filter the table below.</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalViewDate(new Date(calYear, calMonth - 1, 1))}
                  className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-medium px-2">
                  {calViewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setCalViewDate(new Date(calYear, calMonth + 1, 1))}
                  className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-7 mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {calDayCells.map((dateStr, idx) => {
                if (!dateStr) return <div key={`empty-${idx}`} />
                const hasManual = manualBlockDates.has(dateStr)
                const hasAssigned = assignedBlockDates.has(dateStr)
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedCalDay
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedCalDay(prev => prev === dateStr ? null : dateStr)}
                    className={cn(
                      'flex flex-col items-center rounded-lg py-1 text-sm transition-colors hover:bg-muted/60',
                      isSelected && 'bg-primary/15 ring-1 ring-primary',
                      isToday && !isSelected && 'font-bold text-primary'
                    )}
                  >
                    <span>{Number(dateStr.split('-')[2])}</span>
                    <div className="flex gap-0.5 mt-0.5 h-1.5">
                      {hasManual && <span className="size-1.5 rounded-full bg-red-500" />}
                      {hasAssigned && <span className="size-1.5 rounded-full bg-amber-500" />}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500" />Manual block</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" />Assigned event</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isIndividual && (
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Blocked Slots</CardTitle>
                <CardDescription>Includes manual profile blocks and automatic blocks from assigned events.</CardDescription>
              </div>
              {selectedCalDay && (
                <button
                  onClick={() => setSelectedCalDay(null)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear filter ({new Date(selectedCalDay + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredSlots.length === 0 ? (
              <Alert>
                <Clock className="size-4" />
                <AlertTitle>{selectedCalDay ? 'No blocks on this day' : 'No blocked slots'}</AlertTitle>
                <AlertDescription>{selectedCalDay ? 'Select another day or clear the filter.' : 'Add a date/time block or get assigned to an event to see entries here.'}</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlots.map(slot => (
                    <TableRow key={slot.id}>
                      <TableCell>{new Date(`${slot.date}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                      <TableCell>{slot.slot}</TableCell>
                      <TableCell>{slot.source}</TableCell>
                      <TableCell>
                        <Badge variant={slot.status === 'unavailable' ? 'destructive' : 'success'} className="capitalize">
                          {slot.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{slot.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {isIndividual && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Attendance Overview</CardTitle>
            <CardDescription>Read-only view of your attendance across booked sessions.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Badge variant="outline" className="justify-center py-1.5">Total: {attendanceCounts.total}</Badge>
              <Badge variant="success" className="justify-center py-1.5">Present: {attendanceCounts.present}</Badge>
              <Badge variant="destructive" className="justify-center py-1.5">Absent: {attendanceCounts.absent}</Badge>
              <Badge variant="secondary" className="justify-center py-1.5">Pending: {attendanceCounts.pending}</Badge>
            </div>

            {attendanceRows.length === 0 ? (
              <Alert>
                <Clock className="size-4" />
                <AlertTitle>No attendance records yet</AlertTitle>
                <AlertDescription>Your booked session attendance will appear here once sessions are tracked.</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRows.map(row => (
                    <TableRow key={row.id} className="text-left">
                      <TableCell className="font-medium">{row.eventTitle}</TableCell>
                      <TableCell>{new Date(`${row.date}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} {row.time}</TableCell>
                      <TableCell>
                        <Badge variant={row.sessionStatus === 'completed' ? 'success' : row.sessionStatus === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">
                          {row.sessionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.attendance === true && <Badge variant="success">Present</Badge>}
                        {row.attendance === false && <Badge variant="destructive">Absent</Badge>}
                        {row.attendance === null && <Badge variant="outline">Pending</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
