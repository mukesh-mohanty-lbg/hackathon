import { useMemo, useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, MapPin, ChevronDown, ChevronRight, Users, AlertTriangle, UserPlus, UserMinus, CheckCircle2 } from 'lucide-react'
import type { ConflictWarning } from '@/types'

interface StaffAllocationProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

const STATUS_ORDER: Record<'free' | 'conflict' | 'unavailable', number> = { free: 0, conflict: 1, unavailable: 2 }

export function StaffAllocation({ onNavigate }: StaffAllocationProps) {
  const { events, users, getStaffStatusForInstance, assignStaffToInstance, removeStaffFromInstance } = useApp()

  // Flat list of all scheduled instances with parent event info, sorted by date/time
  const allInstances = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return events
      .flatMap(ev =>
        ev.instances
          .filter(i => i.date >= today && i.status === 'scheduled')
          .map(i => ({ ...i, event: ev }))
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  }, [events])

  const activeStaff = useMemo(
    () => users.filter(u => u.role === 'staff' && u.isActive),
    [users]
  )

  // Only one instance can be expanded at a time
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Conflict dialog state (same pattern as EventDetail)
  const [conflictDialog, setConflictDialog] = useState<{ open: boolean; conflicts: ConflictWarning[]; targetStaffId: string; instanceId: string }>({
    open: false, conflicts: [], targetStaffId: '', instanceId: '',
  })
  const [altSuggestions, setAltSuggestions] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState('')

  const selectedEntry = expandedId ? allInstances.find(i => i.id === expandedId) : null

  // For the selected instance: exclude assigned staff, sort free → conflict → unavailable
  const staffStatuses = useMemo(() => {
    if (!selectedEntry) return []
    return activeStaff
      .filter(s => !selectedEntry.staffAssigned.includes(s.id))
      .map(s => ({
        staff: s,
        status: getStaffStatusForInstance(selectedEntry.id, s.id) as 'free' | 'conflict' | 'unavailable',
      }))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  }, [selectedEntry, activeStaff, getStaffStatusForInstance])

  const handleToggle = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const handleAssign = (instanceId: string, staffId: string) => {
    const result = assignStaffToInstance(instanceId, staffId)
    if (result.success) {
      setSuccessMsg('Staff assigned successfully.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } else if (result.conflicts && result.conflicts.length > 0) {
      const entry = allInstances.find(i => i.id === instanceId)
      const alts = entry
        ? activeStaff
          .filter(u => !entry.staffAssigned.includes(u.id) && u.id !== staffId && getStaffStatusForInstance(instanceId, u.id) === 'free')
          .map(u => u.id)
          .slice(0, 3)
        : []
      setAltSuggestions(alts)
      setConflictDialog({ open: true, conflicts: result.conflicts, targetStaffId: staffId, instanceId })
    }
  }

  const handleUnassign = (instanceId: string, staffId: string) => {
    removeStaffFromInstance(instanceId, staffId)
  }

  const handleSelectAlt = (staffId: string) => {
    const { instanceId } = conflictDialog
    setConflictDialog({ open: false, conflicts: [], targetStaffId: '', instanceId: '' })
    handleAssign(instanceId, staffId)
  }

  const handleForceAssign = () => {
    const { instanceId } = conflictDialog
    setConflictDialog({ open: false, conflicts: [], targetStaffId: '', instanceId: '' })
    // Force-assign by directly calling with no conflict check — re-use removeStaffFromInstance trick:
    // We call assignStaffToInstance; since conflicts are already known we just mark success manually
    // The cleanest approach: call assign again (it will return conflicts again), so instead we
    // manipulate via removeStaffFromInstance + re-assign cycle is not right either.
    // The actual AppContext assignStaffToInstance always re-checks — use a workaround:
    // Temporarily remove the conflicting staff assignments won't work. Instead:
    // We just navigate to event-detail for the override button, matching EventDetail behaviour.
    onNavigate('event-detail', { instanceId })
  }

  // Group instances by date for timeline rendering
  const groupedByDate = useMemo(() => {
    const map = new Map<string, typeof allInstances>()
    for (const entry of allInstances) {
      const existing = map.get(entry.date) ?? []
      existing.push(entry)
      map.set(entry.date, existing)
    }
    return Array.from(map.entries()).map(([date, instances]) => ({ date, instances }))
  }, [allInstances])

  const TYPE_BADGE: Record<string, 'info' | 'success' | 'warning' | 'default' | 'secondary'> = {
    workshop: 'info',
    activity: 'success',
    trip: 'warning',
    programme: 'default',
    meeting: 'secondary',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Staff Allocation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Expand an event to see staff availability for that shift.
        </p>
      </div>

      {successMsg && (
        <Alert variant="success"><AlertTitle>{successMsg}</AlertTitle></Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Left: scrollable event list ── */}
        <div className="lg:col-span-2 overflow-y-auto max-h-[calc(100vh-12rem)] pr-1 scrollbar-thin">
          {allInstances.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <Calendar className="size-10 mx-auto text-muted-foreground opacity-40" />
                <p className="text-muted-foreground text-sm">No upcoming scheduled events.</p>
              </CardContent>
            </Card>
          )}

          {/* ── Vertical timeline ── */}
          <div className="relative">
            {/* Continuous vertical line */}
            {groupedByDate.length > 0 && (
              <div className="absolute left-[9px] top-5 bottom-5 w-0.5 bg-border" />
            )}

            <div className="space-y-6">
              {groupedByDate.map(({ date, instances }) => {
                const today = new Date().toISOString().split('T')[0]
                const isToday = date === today
                const fullLabel = new Date(date + 'T00:00').toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })
                const shortLabel = isToday ? 'Today' : fullLabel

                return (
                  <div key={date}>
                    {/* Date header with bullet */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`size-[18px] shrink-0 rounded-full border-2 z-10 relative ${isToday ? 'border-primary bg-primary' : 'border-muted-foreground bg-background'}`} />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                          {shortLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {instances.length} event{instances.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Events indented under this date */}
                    <div className="pl-8 space-y-2">
                      {instances.map(entry => {
                        const { event } = entry
                        const isOpen = expandedId === entry.id
                        const hasUnavailableStaff = entry.staffAssigned.some(
                          sid => getStaffStatusForInstance(entry.id, sid) === 'unavailable'
                        )
                        const understaffed = entry.staffAssigned.length < event.requiredStaff || hasUnavailableStaff
                        const shiftLabel =
                          entry.shiftStartTime && entry.shiftEndTime
                            ? `${entry.shiftStartTime}–${entry.shiftEndTime}`
                            : null

                        return (
                          <Collapsible
                            key={entry.id}
                            open={isOpen}
                            onOpenChange={() => handleToggle(entry.id)}
                          >
                            <div
                              className={`rounded-xl border bg-card transition-colors ${
                                isOpen
                                  ? 'border-secondary-foreground bg-secondary shadow-sm'
                                  : understaffed
                                    ? 'border-border hover:bg-accent'
                                    : 'border-border bg-secondary/60 hover:bg-secondary'
                              }`}
                            >
                              <CollapsibleTrigger asChild>
                                <button className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer">
                                  {/* Event info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                      <Badge variant={TYPE_BADGE[event.type] ?? 'default'} className="text-xs capitalize">
                                        {event.type}
                                      </Badge>
                                    </div>
                                    <p className="text-sm font-medium truncate">{event.title}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="size-3" />{entry.startTime}–{entry.endTime}
                                      </span>
                                      {shiftLabel && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="size-3" />Shift {shiftLabel}
                                        </span>
                                      )}
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="size-3" />{entry.venueOverride ?? event.venue}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Status badge + staff count + chevron */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {understaffed ? (
                                      <Badge variant="warning" className="text-xs gap-1">
                                        <AlertTriangle className="size-3" />Understaffed
                                      </Badge>
                                    ) : (
                                      <Badge variant="success" className="text-xs gap-1">
                                        <CheckCircle2 className="size-3" />Staffed
                                      </Badge>
                                    )}
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {entry.staffAssigned.length}/{event.requiredStaff}
                                    </span>
                                    {isOpen ? (
                                      <ChevronDown className="size-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="size-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </button>
                              </CollapsibleTrigger>

                              {/* ── Expanded content ── */}
                              <CollapsibleContent>
                                <div className="border-t border-border px-4 py-4 space-y-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-muted-foreground">Assigned:</span>
                                    {entry.staffAssigned.length === 0 ? (
                                      <span className="text-xs text-muted-foreground italic">No staff assigned yet</span>
                                    ) : (
                                      entry.staffAssigned.map(sid => {
                                        const u = users.find(x => x.id === sid)
                                        const isUnavailable = getStaffStatusForInstance(entry.id, sid) === 'unavailable'
                                        return u ? (
                                          <div
                                            key={sid}
                                            className={`inline-flex items-center gap-2 text-xs rounded-md px-3 py-1.5 font-medium border ${
                                              isUnavailable
                                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                            }`}
                                          >
                                            <Avatar className="size-5">
                                              <AvatarFallback className="text-[9px] bg-current/10">
                                                {u.name.split(' ').map(n => n[0]).join('')}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span>{u.name}</span>
                                            {isUnavailable && <span className="text-red-500 font-normal">(unavailable)</span>}
                                            <button
                                              onClick={() => handleUnassign(entry.id, sid)}
                                              className="ml-0.5 rounded hover:bg-black/10 p-0.5 transition-colors"
                                              title="Unassign"
                                            >
                                              <UserMinus className="size-3" />
                                            </button>
                                          </div>
                                        ) : null
                                      })
                                    )}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right: sticky Staff Status panel ── */}
        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />Staff Status
            </h2>
            {selectedEntry && (
              <Badge variant="secondary" className="text-xs">
                {new Date(selectedEntry.date + 'T00:00').toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Badge>
            )}
          </div>
          {/* Summary counts */}
          {selectedEntry && staffStatuses.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <SummaryChip
                count={staffStatuses.filter(s => s.status === 'free').length}
                label="Available"
                color="emerald"
              />
              <SummaryChip
                count={staffStatuses.filter(s => s.status === 'conflict').length}
                label="Conflict"
                color="amber"
              />
              <SummaryChip
                count={staffStatuses.filter(s => s.status === 'unavailable').length}
                label="Unavailable"
                color="red"
              />
            </div>
          )}
          <Card>
            {!selectedEntry ? (
              <CardContent className="py-10 text-center space-y-2">
                <Users className="size-8 mx-auto text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">
                  Expand an event to see staff availability for that shift.
                </p>
              </CardContent>
            ) : (
              <>
                <CardHeader className="border-b border-border pb-3 pt-4">
                  <CardTitle className="text-sm font-medium truncate">{selectedEntry.event.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedEntry.shiftStartTime && selectedEntry.shiftEndTime
                      ? `Shift ${selectedEntry.shiftStartTime}–${selectedEntry.shiftEndTime}`
                      : `${selectedEntry.startTime}–${selectedEntry.endTime}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {staffStatuses.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-4 py-4">All active staff are already assigned.</p>
                  ) : (
                    <ul className="divide-y divide-border max-h-[28rem] overflow-y-auto scrollbar-thin">
                      {staffStatuses.map(({ staff, status }) => {
                        const dotColor =
                          status === 'free'
                            ? 'bg-emerald-500'
                            : status === 'conflict'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        const statusLabel =
                          status === 'free' ? 'Available' : status === 'conflict' ? 'Conflict' : 'Unavailable'
                        const statusVariant: 'success' | 'warning' | 'destructive' =
                          status === 'free' ? 'success' : status === 'conflict' ? 'warning' : 'destructive'

                        return (
                          <li key={staff.id} className="flex items-center gap-3 px-4 py-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs bg-secondary/40">
                                {staff.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`size-2 rounded-full shrink-0 ${dotColor}`} />
                                <p className="text-sm font-medium truncate">{staff.name}</p>
                              </div>
                              {status === 'conflict' && (
                                <p className="text-xs text-amber-500 mt-0.5 pl-4">Shift conflict</p>
                              )}
                              {status === 'unavailable' && (
                                <p className="text-xs text-red-500 mt-0.5 pl-4">
                                  {staff.availabilityNote ? `"${staff.availabilityNote}"` : 'Marked unavailable'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant={statusVariant} className="text-xs">
                                {status === 'conflict' && <AlertTriangle className="size-3" />}
                                {statusLabel}
                              </Badge>
                              {selectedEntry && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs"
                                  disabled={status === 'unavailable'}
                                  onClick={() => handleAssign(selectedEntry.id, staff.id)}
                                >
                                  <UserPlus className="size-3.5" />Assign
                                </Button>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Conflict dialog — same pattern as EventDetail */}
      <Dialog open={conflictDialog.open} onOpenChange={o => setConflictDialog(d => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-5" />Scheduling Conflict Detected
            </DialogTitle>
            <DialogDescription>This staff member has an overlapping assignment on this date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {conflictDialog.conflicts.map((c, i) => (
              <div key={i} className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{c.staffName}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Already assigned to "{c.conflictingEventTitle}" at {c.conflictTime}
                </p>
              </div>
            ))}
          </div>
          {altSuggestions.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-2">Suggested alternatives:</p>
              <div className="space-y-2">
                {altSuggestions.map(id => {
                  const u = users.find(x => x.id === id)
                  if (!u) return null
                  return (
                    <button
                      key={id}
                      onClick={() => handleSelectAlt(id)}
                      className="w-full flex items-center gap-3 rounded-xl border border-border p-2.5 hover:bg-accent transition-colors text-left"
                    >
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {u.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium flex-1">{u.name}</span>
                      <Badge variant="success" className="text-xs">Available</Badge>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>No available alternatives found</AlertTitle>
              <AlertDescription>All other staff are unavailable or already assigned.</AlertDescription>
            </Alert>
          )}
          {/* <DialogFooter>
            <Button variant="outline" onClick={() => setConflictDialog({ open: false, conflicts: [], targetStaffId: '', instanceId: '' })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleForceAssign}>
              Override & Assign
            </Button>
          </DialogFooter> */}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryChip({ count, label, color }: { count: number; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <div className={`rounded-xl p-3 text-center ${colorMap[color]}`}>
      <p className="text-lg font-bold font-heading">{count}</p>
      <p className="text-xs">{label}</p>
    </div>
  )
}
