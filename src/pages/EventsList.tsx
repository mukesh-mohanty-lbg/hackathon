import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useApp } from '@/store/AppContext'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronRight, TrendingUp, Calendar, CheckCircle2, Clock, Search, PlusCircle, Info, Send, RefreshCw, Loader2, Plus, XCircle } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Progress } from '@/components/ui/progress'
import type { EventInstance } from '@/types'
import { Separator } from '@/components/ui/separator'

interface EventsListProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

const TYPE_BADGE: Record<string, 'info' | 'success' | 'warning' | 'default' | 'secondary'> = {
  workshop: 'info', activity: 'success', trip: 'warning', programme: 'default', meeting: 'secondary'
}

const eventInitials = (title: string) =>
  title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('') || 'EV'

export function EventsList({ onNavigate }: EventsListProps) {
  const { events, currentUser, bookSessionsForCurrentUser, publishEvent, updateEvent } = useApp()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [bookingEventId, setBookingEventId] = useState<string | null>(null)
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  const [bookingName, setBookingName] = useState(currentUser?.name ?? '')
  const [bookingEmail, setBookingEmail] = useState(currentUser?.email ?? '')
  const [bookingPhone, setBookingPhone] = useState(currentUser?.phone ?? '')
  const [bookingFeedback, setBookingFeedback] = useState<{ type: 'success' | 'warning'; message: string } | null>(null)
  const [publishingEventId, setPublishingEventId] = useState<string | null>(null)
  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false)
  const [addSessionEventId, setAddSessionEventId] = useState<string | null>(null)
  const [addSessionForm, setAddSessionForm] = useState({ date: '', startTime: '09:00', endTime: '17:00', shiftStartTime: '08:30', shiftEndTime: '17:30' })
  const [addSessionErrors, setAddSessionErrors] = useState<Record<string, string>>({})

  const openAddSessionDialog = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation()
    const targetEvent = events.find(ev => ev.id === eventId)
    let defaultDate = new Date().toISOString().split('T')[0]
    let defaultStartTime = '09:00'
    let defaultEndTime = '17:00'
    let defaultShiftStart = '08:30'
    let defaultShiftEnd = '17:30'

    if (targetEvent && targetEvent.instances.length > 0) {
      const sorted = [...targetEvent.instances].sort((a, b) => {
        const aMs = new Date(`${a.date}T${a.startTime}`).getTime()
        const bMs = new Date(`${b.date}T${b.startTime}`).getTime()
        return bMs - aMs
      })
      const last = sorted[0]
      defaultStartTime = last.startTime
      defaultEndTime = last.endTime
      defaultShiftStart = last.shiftStartTime ?? last.startTime
      defaultShiftEnd = last.shiftEndTime ?? last.endTime

      const lastDate = new Date(`${last.date}T00:00`)
      const recurrence = targetEvent.recurrence
      if (recurrence === 'daily') {
        lastDate.setDate(lastDate.getDate() + 1)
      } else if (recurrence === 'weekly') {
        lastDate.setDate(lastDate.getDate() + 7)
      } else if (recurrence === 'monthly') {
        lastDate.setMonth(lastDate.getMonth() + 1)
      } else {
        // one-time: use the day after the last session
        lastDate.setDate(lastDate.getDate() + 1)
      }
      const y = lastDate.getFullYear()
      const m = String(lastDate.getMonth() + 1).padStart(2, '0')
      const d = String(lastDate.getDate()).padStart(2, '0')
      defaultDate = `${y}-${m}-${d}`
    }

    setAddSessionEventId(eventId)
    setAddSessionForm({ date: defaultDate, startTime: defaultStartTime, endTime: defaultEndTime, shiftStartTime: defaultShiftStart, shiftEndTime: defaultShiftEnd })
    setAddSessionErrors({})
    setAddSessionDialogOpen(true)
  }

  const handleAddSessionSave = () => {
    const errs: Record<string, string> = {}
    if (!addSessionForm.date) errs.date = 'Date required'
    if (addSessionForm.startTime >= addSessionForm.endTime) errs.time = 'End must be after start'
    setAddSessionErrors(errs)
    if (Object.keys(errs).length > 0) return

    const targetEvent = events.find(e => e.id === addSessionEventId)
    if (!targetEvent) return

    const newInstance: EventInstance = {
      id: `i_${Date.now()}`,
      eventId: targetEvent.id,
      date: addSessionForm.date,
      startTime: addSessionForm.startTime,
      endTime: addSessionForm.endTime,
      shiftStartTime: addSessionForm.shiftStartTime || undefined,
      shiftEndTime: addSessionForm.shiftEndTime || undefined,
      staffAssigned: [],
      maxAttendees: targetEvent.maxAttendees,
      attendees: [],
      status: 'scheduled',
    }

    updateEvent(targetEvent.id, { instances: [...targetEvent.instances, newInstance] })
    toast.success('Session added successfully.')
    setAddSessionDialogOpen(false)
    setAddSessionEventId(null)
  }

  const handleCancelSession = (e: React.MouseEvent, eventId: string, instanceId: string) => {
    e.stopPropagation()
    const targetEvent = events.find(ev => ev.id === eventId)
    if (!targetEvent) return
    const updatedInstances = targetEvent.instances.map(i =>
      i.id === instanceId ? { ...i, status: 'cancelled' as const } : i
    )
    updateEvent(eventId, { instances: updatedInstances })
    toast.success('Session cancelled.')
  }

  const handlePublish = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setPublishingEventId(id)
    setTimeout(() => {
      try {
        publishEvent(id)
        toast.success('Event published successfully.')
      } catch {
        toast.error('Failed to publish event. Please try again.')
      } finally {
        setPublishingEventId(null)
      }
    }, 1200)
  }

  const myEvents = useMemo(() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'individual') return events
    return events.filter(e => e.instances.some(i => i.staffAssigned.includes(currentUser?.id ?? '')))
  }, [events, currentUser])

  const filtered = useMemo(() => myEvents.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.venue.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || e.type === typeFilter
    const matchStatus = statusFilter === 'all' || e.instances.some(i => i.status === statusFilter)
    return matchSearch && matchType && matchStatus
  }), [myEvents, search, typeFilter, statusFilter])

  const stats = useMemo(() => {
    const all = myEvents.flatMap(e => e.instances)
    const today = new Date().toISOString().split('T')[0]
    return { total: myEvents.length, upcoming: all.filter(i => i.date >= today && i.status === 'scheduled').length, completed: all.filter(i => i.status === 'completed').length }
  }, [myEvents])

  const bookingEvent = useMemo(() => {
    if (!bookingEventId) return null
    return events.find(e => e.id === bookingEventId) ?? null
  }, [bookingEventId, events])

  const bookingCompletedCount = useMemo(() => {
    if (!bookingEvent) return 0
    return bookingEvent.instances.filter(i => i.status === 'completed').length
  }, [bookingEvent])

  const bookingSessions = useMemo(() => {
    if (!bookingEvent) return []
    return bookingEvent.instances
      .filter(i => i.status === 'scheduled')
      .sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.startTime}`).getTime()
        const bTime = new Date(`${b.date}T${b.startTime}`).getTime()
        return aTime - bTime
      })
  }, [bookingEvent])

  const formatBookingSession = (session: EventInstance) => {
    const dayLabel = new Date(`${session.date}T${session.startTime}`).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return `${dayLabel} ${session.startTime}`
  }

  const openBookingDialog = (eventId: string) => {
    const targetEvent = events.find(e => e.id === eventId)
    const preselectedBookedSessionIds = targetEvent
      ? targetEvent.instances
          .filter(i => i.status === 'scheduled' && i.attendees.some(a => a.youngPersonId === currentUser?.id))
          .map(i => i.id)
      : []

    setBookingEventId(eventId)
    setSelectedSessionIds(preselectedBookedSessionIds)
    setBookingName(currentUser?.name ?? '')
    setBookingEmail(currentUser?.email ?? '')
    setBookingPhone(currentUser?.phone ?? '')
    setBookingDialogOpen(true)
    setBookingFeedback(null)
  }

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds(prev => (
      prev.includes(sessionId) ? prev.filter(id => id !== sessionId) : [...prev, sessionId]
    ))
  }

  const handleBookingSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedSessionIds.length === 0) return

    const result = bookSessionsForCurrentUser(selectedSessionIds, {
      name: bookingName,
      email: bookingEmail,
      phone: bookingPhone,
    })

    setBookingFeedback({
      type: result.success ? 'success' : 'warning',
      message: result.message,
    })

    if (result.success) {
      setBookingDialogOpen(false)
      setSelectedSessionIds([])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">{currentUser?.role === 'admin' || currentUser?.role === 'individual' ? "What's On?" : 'My Events'}</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} event(s)</p>
        </div>{
          currentUser?.role === 'admin' && (
            <Button onClick={() => onNavigate('create-event')} className="gap-2 self-start sm:self-auto"><PlusCircle className="size-4" />Create Event</Button>
          )
        }
      </div>

      {bookingFeedback && (
        <Alert variant={bookingFeedback.type === 'success' ? 'success' : 'warning'}>
          <AlertTitle>{bookingFeedback.message}</AlertTitle>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={<Calendar className="size-4" />} label="Total" value={stats.total} />
        <MiniStat icon={<Clock className="size-4" />} label="Upcoming" value={stats.upcoming} color="blue" />
        <MiniStat icon={<CheckCircle2 className="size-4" />} label="Completed" value={stats.completed} color="emerald" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {['activity','workshop','trip','programme','meeting'].map(t => <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground"><TrendingUp className="size-10 mx-auto opacity-30 mb-3" />No events found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ev => {
            const today = new Date().toISOString().split('T')[0]
            const upcoming = ev.instances.filter(i => i.date >= today && i.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date))
            const cancelledFuture = ev.instances.filter(i => i.date >= today && i.status === 'cancelled').sort((a, b) => a.date.localeCompare(b.date))
            const completed = ev.instances.filter(i => i.status === 'completed')
            const nonCompleted = ev.instances.filter(i => i.status !== 'completed')
            const allNonCompletedBooked = currentUser?.role === 'individual'
              && nonCompleted.length > 0
              && nonCompleted.every(i => i.attendees.some(a => a.youngPersonId === currentUser.id))
            const next = upcoming[0]
            return (
              <Card key={ev.id} className="hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer" onClick={() => next && onNavigate('event-detail', { instanceId: next.id })}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-right shrink-0 px-6">
                      {next ? (
                        <>
                          <h1 className="text-4xl border-none">{new Date(next.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</h1>
                          <p className="text-xl text-muted-foreground mt-1">{next.startTime}–{next.endTime}</p>
                        </>
                      ) : (
                        <div className="relative inline-flex">
                          <Badge variant="success" className="text-xs pr-6">All Complete</Badge>
                          <Avatar className="size-6 absolute -right-2 -top-2 ring-2 ring-background">
                            <AvatarFallback className="bg-emerald-600 text-white">
                              <CheckCircle2 className="size-5" />
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{completed.length}/{ev.instances.length} sessions done</p>
                    </div>
                    <Separator orientation="vertical" className="h-28" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Badge variant={TYPE_BADGE[ev.type] ?? 'secondary'} className="text-xs capitalize">{ev.type}</Badge>
                        {ev.ageGroup && <Badge variant="outline" className="text-xs">{ev.ageGroup} years</Badge>}
                        {ev.recurrence !== 'none' && <Badge variant="secondary" className="text-xs capitalize">{ev.recurrence}</Badge>}
                      </div>
                      <h3 className="font-heading font-semibold text-left p-1 mt-3">{ev.title}</h3>
                      {ev.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 text-left pl-1">{ev.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>📍 {ev.venue}</span>
                        <span>👥 {ev.requiredStaff} staff</span>
                        <span>📆 {ev.instances.length} session(s)</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex justify-center">
                        <Avatar className="size-12 ring-2 ring-emerald-500/30">
                          <AvatarImage src={ev.imageUrl} alt={ev.title} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                            {eventInitials(ev.title)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      {/* <p className="text-xs text-muted-foreground mt-1">{completed.length}/{ev.instances.length} sessions done</p> */}
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2 mt-3">

                  {(upcoming.length > 0 || completed.length > 0 || currentUser?.role === 'admin') && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {completed.map(i => {
                        const pct = i.maxAttendees > 0 ? Math.round((i.attendees.length / i.maxAttendees) * 100) : 0
                        return (
                          <button key={i.id} onClick={e => { e.stopPropagation(); onNavigate('event-detail', { instanceId: i.id }) }}
                            className={`flex flex-col gap-1 text-xs rounded-lg bg-zinc-300 hover:bg-accent px-3 py-2.5 transition-colors hover:cursor-pointer ${currentUser?.role === 'individual' && i.attendees.some(a => a.youngPersonId === currentUser.id) ? 'border-b-4 border-b-primary' : ''}`}>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="size-4" />
                              <Calendar className="size-3" />{new Date(i.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {i.startTime}-{i.endTime}<ChevronRight className="size-3" />
                            </div>
                            <div className="w-full space-y-0.5 mt-2">
                              <Progress value={pct} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground text-right">{i.attendees.length}/{i.maxAttendees} seats</p>
                            </div>
                          </button>
                        )
                      })}
                      {upcoming.map(i => {
                        const pct = i.maxAttendees > 0 ? Math.round((i.attendees.length / i.maxAttendees) * 100) : 0
                        return (
                          <div key={i.id} onClick={e => { e.stopPropagation(); onNavigate('event-detail', { instanceId: i.id }) }}
                            className={`flex flex-col gap-1 text-xs rounded-lg border border-zinc-300 bg-muted/60 hover:bg-accent px-3 py-2.5 transition-colors hover:cursor-pointer ${currentUser?.role === 'individual' && i.attendees.some(a => a.youngPersonId === currentUser.id) ? 'border-b-4 border-b-primary' : ''}`}>
                            <div className="flex items-center gap-1.5 justify-between">
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-4" />
                                <Calendar className="size-3" />{new Date(i.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {i.startTime}-{i.endTime}<ChevronRight className="size-3" />
                              </div>
                              {currentUser?.role === 'admin' && (
                                <button
                                  onClick={e => handleCancelSession(e, ev.id, i.id)}
                                  className="ml-2 text-destructive hover:text-destructive/80 transition-colors"
                                  title="Cancel session"
                                >
                                  <XCircle className="size-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="w-full space-y-0.5 mt-2">
                              <Progress value={pct} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground text-right">{i.attendees.length}/{i.maxAttendees} seats occupied</p>
                            </div>
                          </div>
                        )
                      })}
                      {cancelledFuture.map(i => {
                        const pct = i.maxAttendees > 0 ? Math.round((i.attendees.length / i.maxAttendees) * 100) : 0
                        return (
                          <div key={i.id}
                            className="flex flex-col gap-1 text-xs rounded-lg border border-zinc-300 bg-muted/30 px-3 py-2.5 opacity-50 cursor-not-allowed">
                            <div className="flex items-center gap-1.5 justify-between">
                              <div className="flex items-center gap-1.5 line-through text-muted-foreground">
                                <XCircle className="size-4" />
                                <Calendar className="size-3" />{new Date(i.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {i.startTime}-{i.endTime}
                              </div>
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">Cancelled</Badge>
                            </div>
                            <div className="w-full space-y-0.5 mt-2">
                              <Progress value={pct} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground text-right">{i.attendees.length}/{i.maxAttendees} seats</p>
                            </div>
                          </div>
                        )
                      })}
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={e => openAddSessionDialog(e, ev.id)}
                          className="flex flex-col gap-1 text-xs rounded-lg border border-dashed border-zinc-400 bg-muted/30 hover:bg-accent px-3 py-2.5 transition-colors hover:cursor-pointer items-center justify-center min-w-[80px]"
                        >
                          <Plus className="size-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Add Session</span>
                        </button>
                      )}
                    </div>
                  )}
                    <div>
                      { currentUser?.role === 'admin' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            disabled={publishingEventId === ev.id}
                            onClick={e => handlePublish(e, ev.id)}
                          >
                            {publishingEventId === ev.id ? <Loader2 className="size-3.5 animate-spin" /> : ev.isPublished ? <RefreshCw className="size-3.5" /> : <Send className="size-3.5" />}
                            {ev.isPublished ? 'Sync to Bookeo' : 'Publish to Bookeo'}
                          </Button>
                        </div>
                      )}
                      {
                        currentUser?.role === 'individual' && (
                          <div className="flex flex-col sm:flex-row gap-2">
                          <Button variant={'secondary'} onClick={() => onNavigate('book-event')} 
                            className="gap-2 self-start sm:self-auto border">
                            <Info className="size-4" />Info
                          </Button>
                          <Button
                            onClick={e => {
                              e.stopPropagation()
                              if (allNonCompletedBooked) return
                              openBookingDialog(ev.id)
                            }}
                            disabled={allNonCompletedBooked}
                            className="gap-2 self-start sm:self-auto"
                          >
                            <PlusCircle className="size-4" />{allNonCompletedBooked ? 'Booked' : 'Book session'}
                          </Button>
                          </div>
                        )
                      }
                      </div>
                    </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={addSessionDialogOpen} onOpenChange={setAddSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Session</DialogTitle>
            <DialogDescription>Add a new session to this event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-session-date">Date {addSessionErrors.date && <span className="text-destructive text-xs ml-1">{addSessionErrors.date}</span>}</Label>
              <Input id="add-session-date" type="date" value={addSessionForm.date} onChange={e => setAddSessionForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-session-start">Event Start {addSessionErrors.time && <span className="text-destructive text-xs ml-1">{addSessionErrors.time}</span>}</Label>
                <Input id="add-session-start" type="time" value={addSessionForm.startTime} onChange={e => setAddSessionForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-session-end">Event End</Label>
                <Input id="add-session-end" type="time" value={addSessionForm.endTime} onChange={e => setAddSessionForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-session-shift-start">Shift Start</Label>
                <Input id="add-session-shift-start" type="time" value={addSessionForm.shiftStartTime} onChange={e => setAddSessionForm(f => ({ ...f, shiftStartTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-session-shift-end">Shift End</Label>
                <Input id="add-session-shift-end" type="time" value={addSessionForm.shiftEndTime} onChange={e => setAddSessionForm(f => ({ ...f, shiftEndTime: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSessionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSessionSave}>Save Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Session</DialogTitle>
            <DialogDescription>
              {bookingEvent ? `Book places for ${bookingEvent.title}` : 'Select sessions and complete your details.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            {bookingEvent && bookingEvent.instances.length > 1 && (
              <p className="text-sm text-muted-foreground">The class you selected is part of a course.</p>
            )}
            {bookingCompletedCount > 2 && (
              <p className="text-sm text-amber-700">It is too late to enroll in the full course, but you can enroll in single classes.</p>
            )}

            <div className="space-y-2">
              <Label>Select sessions to book</Label>
              {bookingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scheduled sessions are currently available.</p>
              ) : (
                <div className="space-y-2">
                  {bookingSessions.map(session => (
                    <label
                      key={session.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSessionIds.includes(session.id)}
                        onChange={() => toggleSessionSelection(session.id)}
                        className="size-4"
                      />
                      <span>{formatBookingSession(session)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booker-name">Name</Label>
              <Input id="booker-name" value={bookingName} onChange={e => setBookingName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booker-email">Email</Label>
              <Input id="booker-email" type="email" value={bookingEmail} onChange={e => setBookingEmail(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booker-phone">Phone</Label>
              <Input id="booker-phone" value={bookingPhone} onChange={e => setBookingPhone(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={bookingSessions.length === 0 || selectedSessionIds.length === 0}>Book Selected</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  const c: Record<string, string> = { blue: 'text-blue-600', emerald: 'text-emerald-600' }
  return (
    <Card size="sm"><CardContent className="pt-3 pb-3">
      <div className={`flex items-center gap-1.5 mb-1 ${color ? c[color] : 'text-muted-foreground'}`}>{icon}<span className="text-xs">{label}</span></div>
      <p className={`font-bold font-heading text-xl ${color ? c[color] : 'text-foreground'}`}>{value}</p>
    </CardContent></Card>
  )
}
