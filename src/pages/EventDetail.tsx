import { useMemo, useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { ConflictWarning } from '@/types'
import { ArrowLeft, Users, MapPin, Clock, Calendar, UserPlus, UserMinus, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react'
import BookingQRCode from '@/components/custom/BookingQRCode'
import { ProgressBar } from '@/components/custom/ProgressBar'

interface EventDetailProps {
  instanceId: string
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export function EventDetail({ instanceId, onNavigate }: EventDetailProps) {
  const { users, getInstanceById, getEventByInstanceId, assignStaffToInstance, removeStaffFromInstance, currentUser, bookSessionsForCurrentUser } = useApp()
  const [conflictDialog, setConflictDialog] = useState<{ open: boolean; conflicts: ConflictWarning[]; targetStaffId: string }>({ open: false, conflicts: [], targetStaffId: '' })
  const [successMsg, setSuccessMsg] = useState('')
  const [warningMsg, setWarningMsg] = useState('')
  const [altSuggestions, setAltSuggestions] = useState<string[]>([])

  const instance = getInstanceById(instanceId)
  const event = getEventByInstanceId(instanceId)
  const isAdmin = currentUser?.role === 'admin'

  const assignedStaff = useMemo(() => (instance?.staffAssigned ?? []).map(id => users.find(u => u.id === id)).filter(Boolean), [instance, users])
  const availableStaff = useMemo(() => users.filter(u => u.isActive && u.role !== 'admin' && !instance?.staffAssigned.includes(u.id)), [users, instance])
  const isUnderstaffed = event && instance && instance.staffAssigned.length < event.requiredStaff
  const isIndividual = currentUser?.role === 'individual'
  const isBookedByCurrentUser = !!currentUser && instance?.attendees.some(a => a.youngPersonId === currentUser.id)

  if (!instance || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-muted-foreground">
        <AlertTriangle className="size-10 opacity-40" />
        <p>Event instance not found.</p>
        <Button variant="outline" onClick={() => onNavigate('events')}>Go to Events</Button>
      </div>
    )
  }

  const dateLabel = new Date(instance.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const handleAssign = (staffId: string) => {
    const result = assignStaffToInstance(instanceId, staffId)
    if (result.success) {
      setSuccessMsg('Staff member assigned successfully.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } else if (result.conflicts && result.conflicts.length > 0) {
      const alts = availableStaff.filter(u => u && u.id !== staffId && u.availability !== 'unavailable').map(u => u!.id).slice(0, 3)
      setAltSuggestions(alts)
      setConflictDialog({ open: true, conflicts: result.conflicts, targetStaffId: staffId })
    }
  }

  const handleSelectAlt = (staffId: string) => {
    setConflictDialog({ open: false, conflicts: [], targetStaffId: '' })
    handleAssign(staffId)
  }

  const handleBookSession = () => {
    if (!currentUser) return
    const result = bookSessionsForCurrentUser([instanceId], {
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
    })

    if (result.success) {
      setWarningMsg('')
      setSuccessMsg(isBookedByCurrentUser ? 'You are already enrolled in this session.' : 'Session booked successfully.')
      setTimeout(() => setSuccessMsg(''), 3000)
      return
    }

    setSuccessMsg('')
    setWarningMsg(result.message)
    setTimeout(() => setWarningMsg(''), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className='flex w-full justify-start'>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('events')} className="gap-2 -ml-2">
          <ArrowLeft className="size-4" />Back to Events
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="info" className="capitalize">{event.type}</Badge>
            <Badge variant={instance.status === 'completed' ? 'success' : instance.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">{instance.status}</Badge>
            {isUnderstaffed && <Badge variant="warning">Understaffed</Badge>}
          </div>
          
        <div className="flex justify-center gap-6 mt-6">
          <BookingQRCode sessionId={instance.id} />
          <div>
            <h1 className="font-heading text-3xl font-bold">{event.title}</h1>
            {event.description && <p className="text-muted-foreground text-sm mt-1 max-w-lg">{event.description}</p>}
          </div>
        </div>

        </div>
        {instance.status === 'scheduled' && (
          isIndividual ? (
            <Button onClick={handleBookSession} className="gap-2 shrink-0" disabled={isBookedByCurrentUser}>
              <CheckCircle2 className="size-4" />{isBookedByCurrentUser ? 'Booked' : 'Book session'}
            </Button>
          ) : (
            <Button onClick={() => onNavigate('attendance', { instanceId })} className="gap-2 shrink-0"><CheckCircle2 className="size-4" />Mark Completed</Button>
          )
        )}
      </div>

      {successMsg && <Alert variant="success"><AlertTitle>{successMsg}</AlertTitle></Alert>}
      {warningMsg && <Alert variant="warning"><AlertTitle>{warningMsg}</AlertTitle></Alert>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoTile icon={<Calendar className="size-4" />} label="Date" value={dateLabel} />
        <InfoTile icon={<Clock className="size-4" />} label="Time" value={`${instance.startTime}–${instance.endTime}`} />
        <InfoTile icon={<MapPin className="size-4" />} label="Venue" value={instance.venueOverride ?? event.venue} />
        <InfoTile icon={<Users className="size-4" />} label="Attendees" value={`${instance.attendees.length} / ${event.maxAttendees}`} />
        <ProgressBar label={'Attendees'} labeledValue={`${instance.attendees.length} / ${event.maxAttendees}`} value={(instance.attendees.length / event.maxAttendees) * 100} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div><CardTitle>Assigned Staff</CardTitle><CardDescription>{instance.staffAssigned.length} / {event.requiredStaff} required</CardDescription></div>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${isUnderstaffed ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isUnderstaffed ? <><AlertTriangle className="size-3.5" />Needs {event.requiredStaff - instance.staffAssigned.length} more</> : <><CheckCircle2 className="size-3.5" />Fully staffed</>}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {assignedStaff.length === 0 ? <p className="text-sm text-muted-foreground px-6 py-4">No staff assigned yet</p> : (
              <ul className="divide-y divide-border">
                {assignedStaff.map(s => !s ? null : (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="size-12"><AvatarFallback className="text-xs bg-primary/10 text-primary">{s.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium">{s.name}</p>
                      <Badge variant={s.availability === 'available' ? 'success' : s.availability === 'partial' ? 'warning' : 'destructive'} className="text-xs mt-0.5">{s.availability}</Badge>
                    </div>
                    {isAdmin && instance.status === 'scheduled' && (
                      <Button variant="ghost" size="icon-sm" onClick={() => removeStaffFromInstance(instanceId, s.id)} className="text-destructive hover:text-destructive"><UserMinus className="size-3.5" /></Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {isAdmin && instance.status === 'scheduled' && (
          <Card>
            <CardHeader className="border-b border-border"><CardTitle>Assign Staff</CardTitle><CardDescription>Click to assign available staff members</CardDescription></CardHeader>
            <CardContent className="p-0">
              {availableStaff.length === 0 ? <p className="text-sm text-muted-foreground px-6 py-4">All active staff already assigned</p> : (
                <ul className="divide-y divide-border max-h-72 overflow-y-auto">
                  {availableStaff.map(s => !s ? null : (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar className="size-12"><AvatarFallback className="text-xs bg-secondary/40">{s.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium">{s.name}</p>
                        <Badge variant={s.availability === 'available' ? 'success' : s.availability === 'partial' ? 'warning' : 'destructive'} className="text-xs mt-0.5">{s.availability}</Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleAssign(s.id)} className="gap-1.5 text-xs shrink-0" disabled={s.availability === 'unavailable'}>
                        <UserPlus className="size-3.5" />Assign
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {instance.attendees.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div><CardTitle>Attendees</CardTitle><CardDescription>{instance.attendees.length} registered</CardDescription></div>
              {instance.status !== 'completed' && !isIndividual && (
                <Button size="sm" variant="outline" onClick={() => onNavigate('attendance', { instanceId })} className="gap-2">
                  <CheckCircle2 className="size-4" />Take Attendance<ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {instance.attendees.map(a => (
                <li key={a.youngPersonId} className="flex items-center justify-between gap-3 p-4 w-full">
                  <div className="flex items-center gap-6 px-6">
                    <span className="text-sm font-bold flex-1">{a.youngPersonId} </span>
                    <div>
                    <span className="text-sm font-bold flex-1">{a.name}</span>
                    </div>
                  </div>
                    {a.present === null ? <Badge variant="outline" className="text-xs">Pending</Badge>
                      : a.present ? <Badge variant="success" className="text-xs">Present</Badge>
                        : <Badge variant="destructive" className="text-xs">Absent</Badge>}

                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={conflictDialog.open} onOpenChange={o => setConflictDialog(d => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="size-5" />Scheduling Conflict Detected</DialogTitle>
            <DialogDescription>This staff member has an overlapping assignment on this date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {conflictDialog.conflicts.map((c, i) => (
              <div key={i} className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{c.staffName}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Already assigned to "{c.conflictingEventTitle}" at {c.conflictTime}</p>
              </div>
            ))}
          </div>
          {altSuggestions.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-2">Suggested alternatives:</p>
              <div className="space-y-2">
                {altSuggestions.map(id => {
                  const u = users.find(u => u.id === id)
                  if (!u) return null
                  return (
                    <button key={id} onClick={() => handleSelectAlt(id)} className="w-full flex items-center gap-3 rounded-xl border border-border p-2.5 hover:bg-accent transition-colors text-left">
                      <Avatar className="size-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{u.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                      <span className="text-sm font-medium flex-1">{u.name}</span>
                      <Badge variant="success" className="text-xs">Available</Badge>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <Alert variant="destructive"><AlertTitle>No available alternatives found</AlertTitle><AlertDescription>All other staff are unavailable or already assigned.</AlertDescription></Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictDialog({ open: false, conflicts: [], targetStaffId: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={() => setConflictDialog({ open: false, conflicts: [], targetStaffId: '' })}>Override & Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card size="sm"><CardContent className="pt-3 pb-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">{icon}<span className="text-xs">{label}</span></div>
      <p className="text-sm font-medium leading-snug">{value}</p>
    </CardContent></Card>
  )
}
