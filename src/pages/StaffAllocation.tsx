import { useMemo, useState } from 'react'
import type React from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { useApp } from '@/store/AppContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, MapPin, ChevronDown, ChevronRight, Users, AlertTriangle, UserPlus, UserMinus, CheckCircle2, GripVertical } from 'lucide-react'
import type { ConflictWarning } from '@/types'

const DRAG_TYPE = 'STAFF_CARD'
const UNASSIGN_TYPE = 'ASSIGNED_STAFF_CHIP'

interface DragItem {
  staffId: string
  status: 'free' | 'conflict' | 'unavailable'
}

interface UnassignDragItem {
  staffId: string
  instanceId: string
}

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

  const handleAssign = async (instanceId: string, staffId: string) => {
    const result = await assignStaffToInstance(instanceId, staffId)
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
                                <DroppableAssignedZone
                                  entry={entry}
                                  users={users}
                                  getStaffStatusForInstance={getStaffStatusForInstance}
                                  onAssign={handleAssign}
                                  onUnassign={handleUnassign}
                                  isSelected={isOpen}
                                />
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
          <DroppableUnassignPanel onUnassign={handleUnassign}>
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
                      {staffStatuses.map(({ staff, status }) => (
                        <DraggableStaffRow
                          key={staff.id}
                          staff={staff}
                          status={status}
                          instanceId={selectedEntry!.id}
                          onAssign={handleAssign}
                        />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </>
            )}
          </Card>
          </DroppableUnassignPanel>
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

// ── DraggableStaffRow ────────────────────────────────────────────────────────
interface DraggableStaffRowProps {
  staff: { id: string; name: string; availabilityNote?: string }
  status: 'free' | 'conflict' | 'unavailable'
  instanceId: string
  onAssign: (instanceId: string, staffId: string) => void
}

function DraggableStaffRow({ staff, status, instanceId, onAssign }: DraggableStaffRowProps) {
  const canDrag = status !== 'unavailable'

  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { staffId: staff.id, status },
    canDrag,
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  })

  const dotColor =
    status === 'free' ? 'bg-emerald-500' : status === 'conflict' ? 'bg-amber-500' : 'bg-red-500'
  const statusLabel =
    status === 'free' ? 'Available' : status === 'conflict' ? 'Conflict' : 'Unavailable'
  const statusVariant: 'success' | 'warning' | 'destructive' =
    status === 'free' ? 'success' : status === 'conflict' ? 'warning' : 'destructive'

  return (
    <li
      ref={canDrag ? (dragRef as unknown as React.Ref<HTMLLIElement>) : undefined}
      className={`flex items-center gap-3 px-4 py-3 transition-opacity ${
        isDragging ? 'opacity-40' : 'opacity-100'
      } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-60'}`}
    >
      <GripVertical
        className={`size-4 shrink-0 ${
          canDrag ? 'text-muted-foreground/60' : 'text-muted-foreground/20'
        }`}
      />
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
          <p className="text-xs text-amber-500 mt-0.5 pl-4">Shift conflict · drag or assign</p>
        )}
        {status === 'unavailable' && (
          <p className="text-xs text-red-500 mt-0.5 pl-4">
            {(staff as { availabilityNote?: string }).availabilityNote
              ? `"${(staff as { availabilityNote?: string }).availabilityNote}"`
              : 'Marked unavailable'}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={statusVariant} className="text-xs">
          {status === 'conflict' && <AlertTriangle className="size-3" />}
          {statusLabel}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          disabled={status === 'unavailable'}
          onClick={() => onAssign(instanceId, staff.id)}
        >
          <UserPlus className="size-3.5" />Assign
        </Button>
      </div>
    </li>
  )
}

// ── DroppableAssignedZone ────────────────────────────────────────────────────
interface DroppableAssignedZoneProps {
  entry: {
    id: string
    staffAssigned: string[]
    date: string
    startTime: string
    endTime: string
    shiftStartTime?: string
    shiftEndTime?: string
    venueOverride?: string
    event: { title: string; venue: string; requiredStaff: number }
  }
  users: Array<{ id: string; name: string }>
  getStaffStatusForInstance: (instanceId: string, staffId: string) => string
  onAssign: (instanceId: string, staffId: string) => void
  onUnassign: (instanceId: string, staffId: string) => void
  isSelected: boolean
}

function DroppableAssignedZone({
  entry, users, getStaffStatusForInstance, onAssign, onUnassign, isSelected,
}: DroppableAssignedZoneProps) {
  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, unknown, { isOver: boolean; canDrop: boolean }>({
    accept: DRAG_TYPE,
    canDrop: item => item.status !== 'unavailable' && !entry.staffAssigned.includes(item.staffId),
    drop: item => {
      onAssign(entry.id, item.staffId)
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const isActive = isOver && canDrop

  return (
    <div
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      className={`border-t border-border px-4 py-4 space-y-3 transition-colors rounded-b-xl ${
        isActive
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
          : isOver && !canDrop
            ? 'bg-red-50 dark:bg-red-900/10'
            : ''
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Assigned:</span>
        {isActive && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
            Drop to assign
          </span>
        )}
        {isOver && !canDrop && (
          <span className="text-xs text-red-500 font-medium">Cannot assign here</span>
        )}
        {!isActive && !isOver && entry.staffAssigned.length === 0 && (
          <span className="text-xs text-muted-foreground italic">
            No staff assigned yet · drag a staff card here
          </span>
        )}
        {entry.staffAssigned.map(sid => {
          const u = users.find(x => x.id === sid)
          const isUnavailable = getStaffStatusForInstance(entry.id, sid) === 'unavailable'
          return u ? (
            <DraggableAssignedChip
              key={sid}
              staffId={sid}
              instanceId={entry.id}
              user={u}
              isUnavailable={isUnavailable}
              onUnassign={onUnassign}
            />
          ) : null
        })}
      </div>
      {!isActive && !isOver && entry.staffAssigned.length === 0 && isSelected && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border py-3 text-xs text-muted-foreground gap-2">
          <UserPlus className="size-3.5" />Drag a staff member here
        </div>
      )}
    </div>
  )
}

// ── DraggableAssignedChip ─────────────────────────────────────────────────────
interface DraggableAssignedChipProps {
  staffId: string
  instanceId: string
  user: { id: string; name: string }
  isUnavailable: boolean
  onUnassign: (instanceId: string, staffId: string) => void
}

function DraggableAssignedChip({ staffId, instanceId, user, isUnavailable, onUnassign }: DraggableAssignedChipProps) {
  const [{ isDragging }, dragRef] = useDrag<UnassignDragItem, unknown, { isDragging: boolean }>({
    type: UNASSIGN_TYPE,
    item: { staffId, instanceId },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  })

  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      className={`inline-flex items-center gap-2 text-xs rounded-md px-2 py-1.5 font-medium border cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging ? 'opacity-40' : 'opacity-100'
      } ${
        isUnavailable
          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
      }`}
      title="Drag to unassign"
    >
      <GripVertical className="size-3 shrink-0 opacity-50" />
      <Avatar className="size-5">
        <AvatarFallback className="text-[9px] bg-current/10">
          {user.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <span>{user.name}</span>
      {isUnavailable && <span className="text-red-500 font-normal">(unavailable)</span>}
      <button
        onClick={() => onUnassign(instanceId, staffId)}
        className="ml-0.5 rounded hover:bg-black/10 p-0.5 transition-colors"
        title="Unassign"
      >
        <UserMinus className="size-3" />
      </button>
    </div>
  )
}

// ── DroppableUnassignPanel ────────────────────────────────────────────────────
interface DroppableUnassignPanelProps {
  onUnassign: (instanceId: string, staffId: string) => void
  children: React.ReactNode
}

function DroppableUnassignPanel({ onUnassign, children }: DroppableUnassignPanelProps) {
  const [{ isOver, canDrop }, dropRef] = useDrop<UnassignDragItem, unknown, { isOver: boolean; canDrop: boolean }>({
    accept: UNASSIGN_TYPE,
    canDrop: () => true,
    drop: item => {
      onUnassign(item.instanceId, item.staffId)
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const isActive = isOver && canDrop

  return (
    <div ref={dropRef as unknown as React.Ref<HTMLDivElement>} className="relative">
      {isActive && (
        <div className="absolute inset-0 z-10 rounded-xl border-2 border-dashed border-red-400 bg-red-50/60 dark:bg-red-900/20 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
            <UserMinus className="size-4" />Drop to unassign
          </span>
        </div>
      )}
      {children}
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
