import { useMemo, useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { WorkingDay } from '@/types'
import {
  BarChart2, Briefcase, CalendarDays, Download,
  Clock, TrendingUp, Users, UserCheck, UserX, Calendar,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAY_LABELS: Record<WorkingDay, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function shiftHours(inst: { shiftStartTime?: string; shiftEndTime?: string; startTime: string; endTime: string }): number {
  const start = inst.shiftStartTime ?? inst.startTime
  const end = inst.shiftEndTime ?? inst.endTime
  return Math.max(0, (timeToMins(end) - timeToMins(start)) / 60)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtHours(h: number) {
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`
}

// ISO week start (Monday) for a given date
function getWeekBounds(d: Date): { weekStart: string; weekEnd: string } {
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1 // 0=Mon
  const mon = new Date(d); mon.setDate(d.getDate() - day)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { weekStart: mon.toISOString().split('T')[0], weekEnd: sun.toISOString().split('T')[0] }
}

function getMonthBounds(d: Date): { monthStart: string; monthEnd: string } {
  const y = d.getFullYear(); const m = d.getMonth()
  const last = new Date(y, m + 1, 0)
  return {
    monthStart: `${y}-${String(m + 1).padStart(2, '0')}-01`,
    monthEnd: last.toISOString().split('T')[0],
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string
  icon: React.FC<React.SVGProps<SVGSVGElement>>; accent: string
}) {
  return (
    <Card size="sm">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold font-heading mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <span className={`size-9 flex items-center justify-center rounded-xl ${accent}`}>
            <Icon className="size-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  ) 
}

// ─── Utilisation bar ──────────────────────────────────────────────────────────
function UtilBar({ pct, label }: { pct: number; label?: string }) {
  const colour = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {label && <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{label}</span>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StaffAvailability() {
  const { users, events } = useApp()
  const [tab, setTab] = useState<'week' | 'month' | 'all'>('week')
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)

  const today = new Date()
  const { weekStart, weekEnd } = getWeekBounds(today)
  const { monthStart, monthEnd } = getMonthBounds(today)

  const staffOnly = users.filter(u => (u.role === 'staff' || u.role === 'admin') && u.isActive)
  const allInstances = useMemo(() => events.flatMap(ev => ev.instances.map(i => ({ ...i, event: ev }))), [events])

  const inRange = (date: string) => {
    if (tab === 'week') return date >= weekStart && date <= weekEnd
    if (tab === 'month') return date >= monthStart && date <= monthEnd
    return true
  }

  // Per-staff stats
  const staffStats = useMemo(() => staffOnly.map(u => {
    const assigned = allInstances.filter(i => i.staffAssigned.includes(u.id) && inRange(i.date))
    const completed = assigned.filter(i => i.status === 'completed')
    const upcoming = assigned.filter(i => i.status === 'scheduled')
    const totalShiftHrs = assigned.reduce((s, i) => s + shiftHours(i), 0)
    const completedHrs = completed.reduce((s, i) => s + shiftHours(i), 0)
    const upcomingHrs = upcoming.reduce((s, i) => s + shiftHours(i), 0)
    const contractHrs = u.contractedHours ?? 0
    // weekly contracted hours (days per week * hours per day estimate, or use contractedHours directly as weekly)
    const periodContractHrs = tab === 'week'
      ? contractHrs
      : tab === 'month'
        ? contractHrs * 4.33
        : contractHrs * 52

    const utilisationPct = periodContractHrs > 0
      ? Math.round((totalShiftHrs / periodContractHrs) * 100)
      : null

    const uniqueEvents = new Set(assigned.map(i => i.eventId)).size
    const longestShift = assigned.length > 0 ? Math.max(...assigned.map(i => shiftHours(i))) : 0

    return { user: u, assigned, completed, upcoming, totalShiftHrs, completedHrs, upcomingHrs, utilisationPct, contractHrs, periodContractHrs, uniqueEvents, longestShift }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [staffOnly, allInstances, tab])

  // Organisation totals
  const sessionCount = useMemo(() =>
    allInstances.filter(i => inRange(i.date) && i.status === 'scheduled').length
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [allInstances, tab])

  const orgTotals = useMemo(() => ({
    totalShiftHrs: staffStats.reduce((s, r) => s + r.totalShiftHrs, 0),
    staffOnLeave: users.filter(u => u.role === 'staff' && u.isActive && u.availability === 'unavailable').length,
    activeStaff: staffOnly.length,
    avgShiftHrs: staffStats.length ? staffStats.reduce((s, r) => s + r.totalShiftHrs, 0) / staffStats.length : 0,
  }), [staffStats, staffOnly, users])

  // Event type breakdown
  const eventTypeTotals = useMemo(() => {
    const map: Record<string, { count: number; hrs: number }> = {}
    allInstances.filter(i => inRange(i.date)).forEach(i => {
      const t = i.event.type
      if (!map[t]) map[t] = { count: 0, hrs: 0 }
      map[t].count += 1
      map[t].hrs += shiftHours(i) * i.staffAssigned.length
    })
    return Object.entries(map).sort((a, b) => b[1].hrs - a[1].hrs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allInstances, tab])

  // Top shifts for selected staff
  const selectedStats = selectedStaffId ? staffStats.find(s => s.user.id === selectedStaffId) : null

  const periodLabel = tab === 'week' ? `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}` : tab === 'month' ? new Date(monthStart).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'All time'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Staff Reporting</h1>
          <p className="text-muted-foreground text-sm mt-1">{periodLabel}</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-xl p-1 self-start sm:self-auto">
          {(['week', 'month', 'all'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'week' ? 'This Week' : t === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Org-level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Staff" value={orgTotals.activeStaff} icon={Users} accent="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="Total Shift Hours" value={fmtHours(orgTotals.totalShiftHrs)} sub={`avg ${fmtHours(orgTotals.avgShiftHrs)} / person`} icon={Clock} accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
        <StatCard label="Staff on Leave" value={orgTotals.staffOnLeave} icon={UserX} accent="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard label="Scheduled Sessions" value={sessionCount} sub="in this period" icon={CalendarDays} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
      </div>

      {/* Staff breakdown table */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2"><BarChart2 className="size-4 text-muted-foreground" />Staff Hours Breakdown</CardTitle>
              <CardDescription>Click a row to see individual shift details</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 text-xs" onClick={() => {
              const rows = [
                ['Name', 'Role', 'Pay Type', 'Contracted Hrs/Wk', 'Total Shift Hrs', 'Completed Hrs', 'Upcoming Hrs', 'Sessions', 'Utilisation %', 'Status'],
                ...staffStats.map(r => [
                  r.user.name,
                  r.user.role,
                  r.user.payType ?? '',
                  r.user.contractedHours ?? '',
                  r.totalShiftHrs.toFixed(1),
                  r.completedHrs.toFixed(1),
                  r.upcomingHrs.toFixed(1),
                  r.assigned.length,
                  r.utilisationPct !== null ? r.utilisationPct : '',
                  r.user.availability,
                ]),
              ]
              const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `staff-hours-${periodLabel.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}>
              <Download className="size-3.5" />Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead className="hidden sm:table-cell">Contract</TableHead>
                <TableHead className="text-right">Shift Hrs</TableHead>
                <TableHead className="hidden md:table-cell text-right">Completed</TableHead>
                <TableHead className="hidden md:table-cell text-right">Upcoming</TableHead>
                <TableHead className="hidden lg:table-cell text-center">Sessions</TableHead>
                <TableHead className="hidden lg:table-cell">Utilisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffStats.map(row => {
                const isSelected = selectedStaffId === row.user.id
                return (
                  <TableRow key={row.user.id}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                    onClick={() => setSelectedStaffId(isSelected ? null : row.user.id)}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{row.user.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{row.user.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{row.user.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {row.user.payType ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="text-xs w-fit capitalize">{row.user.payType === 'fixed-term' ? 'Fixed-term' : row.user.payType}</Badge>
                          {row.user.contractedHours && <span className="text-xs text-muted-foreground">{row.user.contractedHours}h/wk</span>}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmtHours(row.totalShiftHrs)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-muted-foreground">{fmtHours(row.completedHrs)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-muted-foreground">{fmtHours(row.upcomingHrs)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                      <span className="text-sm font-medium">{row.assigned.length}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell w-36">
                      {row.utilisationPct !== null
                        ? <UtilBar pct={row.utilisationPct} label={`${row.utilisationPct}%`} />
                        : <span className="text-xs text-muted-foreground">No contract</span>}
                    </TableCell>
                  </TableRow>
                )
              })}
              {staffStats.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No staff data for this period</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Drill-down panel for selected staff */}
      {selectedStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Avatar className="size-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{selectedStats.user.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback></Avatar>
              {selectedStats.user.name} — Shift Detail
            </CardTitle>
            <CardDescription>
              {selectedStats.assigned.length} shifts · {fmtHours(selectedStats.totalShiftHrs)} total
              {selectedStats.user.workingDays && selectedStats.user.workingDays.length > 0 && (
                <span className="ml-2">· Working days: {selectedStats.user.workingDays.map((d: WorkingDay) => DAY_LABELS[d]).join(', ')}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden sm:table-cell">Shift Times</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStats.assigned
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(inst => {
                    const hrs = shiftHours(inst)
                    const sStart = inst.shiftStartTime ?? inst.startTime
                    const sEnd = inst.shiftEndTime ?? inst.endTime
                    return (
                      <TableRow key={inst.id}>
                        <TableCell className="text-sm">{fmtDate(inst.date)}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{inst.event.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{inst.event.type}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{sStart} – {sEnd}</TableCell>
                        <TableCell className="text-right font-medium text-sm">{fmtHours(hrs)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={inst.status === 'completed' ? 'success' : inst.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-xs capitalize">{inst.status}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Event type breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="size-4 text-muted-foreground" />Staff Hours by Event Type</CardTitle>
            <CardDescription>Total staff-hours across all assigned sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {eventTypeTotals.length === 0 && <p className="text-sm text-muted-foreground">No data for this period.</p>}
            {eventTypeTotals.map(([type, data]) => {
              const maxHrs = eventTypeTotals[0]?.[1].hrs ?? 1
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{type}</span>
                    <span className="text-muted-foreground">{fmtHours(data.hrs)} across {data.count} session{data.count !== 1 ? 's' : ''}</span>
                  </div>
                  <UtilBar pct={Math.round((data.hrs / maxHrs) * 100)} />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-muted-foreground" />Staff Availability Summary</CardTitle>
            <CardDescription>Current availability status across the team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['available', 'unavailable'] as const).map(status => {
              const count = staffOnly.filter(u => u.availability === status || (status === 'available' && u.availability === 'partial')).length
              const pct = staffOnly.length > 0 ? Math.round((count / staffOnly.length) * 100) : 0
              const variant = status === 'available' ? 'success' : 'destructive'
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={variant} className="text-xs capitalize">{status === 'available' ? 'Available' : 'Unavailable'}</Badge>
                    </div>
                    <span className="text-sm font-medium">{count} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              )
            })}
            <Separator />
            <div className="space-y-2">
              {staffOnly.filter(u => u.availabilityNote).map(u => (
                <div key={u.id} className="flex items-start gap-2 text-xs">
                  <Avatar className="size-5 mt-0.5 shrink-0"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{u.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback></Avatar>
                  <div>
                    <span className="font-medium">{u.name}</span>
                    <span className="text-muted-foreground ml-1 italic">"{u.availabilityNote}"</span>
                  </div>
                </div>
              ))}
              {staffOnly.filter(u => u.availabilityNote).length === 0 && (
                <p className="text-xs text-muted-foreground">No availability notes set.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Working pattern overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="size-4 text-muted-foreground" />Working Patterns</CardTitle>
          <CardDescription>Contracted hours and working days per staff member</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Pay Type</TableHead>
                <TableHead className="text-center">Hrs / Week</TableHead>
                <TableHead className="hidden md:table-cell">Working Days</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Longest Shift ({tab === 'week' ? 'wk' : tab === 'month' ? 'mo' : 'all'})</TableHead>
                <TableHead className="text-right">Events Covered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffStats.map(row => (
                <TableRow key={row.user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{row.user.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback></Avatar>
                      <span className="text-sm font-medium">{row.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.user.payType
                      ? <Badge variant="outline" className="text-xs capitalize">{row.user.payType === 'fixed-term' ? 'Fixed-term' : row.user.payType}</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.user.contractedHours !== undefined
                      ? <span className="text-sm font-medium">{row.user.contractedHours}<span className="text-xs text-muted-foreground font-normal"> hrs</span></span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {row.user.workingDays && row.user.workingDays.length > 0
                      ? <div className="flex flex-wrap gap-1">{row.user.workingDays.map((d: WorkingDay) => <Badge key={d} variant="secondary" className="text-xs px-1.5">{DAY_LABELS[d]}</Badge>)}</div>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell text-muted-foreground text-sm">{row.longestShift > 0 ? fmtHours(row.longestShift) : '—'}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium">{row.uniqueEvents}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
    //         <thead>
    //           <tr className="border-b border-border">
    //             <th className="text-left px-4 py-3 text-muted-foreground font-medium w-48">Staff</th>
    //             {nextDays.map(d => {
    //               const label = new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
    //               return (
    //                 <th key={d} className={`text-center px-3 py-3 font-medium text-xs ${d === today ? 'text-primary' : 'text-muted-foreground'}`}>
    //                   <div>{label.split(' ')[0]}</div>
    //                   <div className={`text-base font-bold ${d === today ? 'text-primary' : 'text-foreground'}`}>{label.split(' ')[1]}</div>
    //                 </th>
    //               )
    //             })}
    //           </tr>
    //         </thead>
    //         <tbody>
    //           {staffList.map(u => (
    //             <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
    //               <td className="px-4 py-3">
    //                 <div className="flex items-center gap-2.5">
    //                   <Avatar className="size-7">
    //                     <AvatarFallback className="text-xs bg-primary/10 text-primary">{u.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
    //                   </Avatar>
    //                   <div>
    //                     <p className="font-medium leading-tight text-sm">{u.name}</p>
    //                     <p className="text-xs text-muted-foreground">{getAssignmentCount(u.id)} upcoming</p>
    //                   </div>
    //                 </div>
    //               </td>
    //               {nextDays.map(d => {
    //                 const status = getStaffStatusForDay(u.id, d)
    //                 const meta = STATUS_META[status]
    //                 return (
    //                   <td key={d} className="text-center px-2 py-3">
    //                     <button onClick={() => openOverride(u)} className="mx-auto flex flex-col items-center gap-1 group" title={undefined}>
    //                       <span className={`size-3 rounded-full ${meta.dot} group-hover:ring-2 group-hover:ring-offset-1 transition-all`} />
    //                     </button>
    //                   </td>
    //                 )
    //               })}
    //             </tr>
    //           ))}
    //         </tbody>
    //       </table>
    //     </CardContent>
    //   </Card>

    //   <div className="flex items-center gap-4 text-xs text-muted-foreground">
    //     {(Object.keys(STATUS_META) as Array<'free' | 'conflict' | 'unavailable'>).map(k => (
    //       <span key={k} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${STATUS_META[k].dot}`} />{STATUS_META[k].label}</span>
    //     ))}
    //   </div>

    //   <h2 className="font-heading font-semibold flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" />Current Availability</h2>
    //   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    //     {staffList.map(u => {
    //       const isUnavailable = u.availability === 'unavailable'
    //       return (
    //         <Card key={u.id} size="sm">
    //           <CardContent className="pt-4 pb-3">
    //             <div className="flex items-start justify-between gap-2">
    //               <div className="flex items-center gap-2.5">
    //                 <Avatar className="size-9"><AvatarFallback className="text-xs bg-primary/10 text-primary">{u.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
    //                 <div>
    //                   <p className="font-medium text-sm">{u.name}</p>
    //                   <Badge variant={isUnavailable ? 'destructive' : 'success'} className="text-xs mt-0.5">{isUnavailable ? 'Unavailable' : 'Available'}</Badge>
    //                 </div>
    //               </div>
    //               <Button variant="ghost" size="icon-sm" onClick={() => openOverride(u)}><Pencil className="size-3.5" /></Button>
    //             </div>
    //             {u.availabilityNote && <p className="text-xs text-muted-foreground mt-2 italic">"{u.availabilityNote}"</p>}
    //             <p className="text-xs text-muted-foreground mt-2">{getAssignmentCount(u.id)} upcoming assignments</p>
    //           </CardContent>
    //         </Card>
    //       )
    //     })}
    //   </div>

    //   <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    //     <DialogContent>
    //       <DialogHeader>
    //         <DialogTitle>Override Availability – {selected?.name}</DialogTitle>
    //         <DialogDescription>Set availability status for a specific date or update their general status.</DialogDescription>
    //       </DialogHeader>
    //       <div className="space-y-4">
    //         <div className="space-y-1.5">
    //           <label className="text-sm font-medium">Date</label>
    //           <input type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)}
    //             className="flex h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50" />
    //         </div>
    //         <p className="text-sm text-muted-foreground">This will mark the staff member as <strong>unavailable</strong> on this date (e.g. leave, sickness). Shift conflicts are detected automatically from event assignments.</p>
    //         <div className="space-y-1.5">
    //           <label className="text-sm font-medium">Note (optional)</label>
    //           <Textarea placeholder="e.g. Annual leave" value={overrideNote} onChange={e => setOverrideNote(e.target.value)} rows={2} />
    //         </div>
    //       </div>
    //       <DialogFooter>
    //         <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
    //         <Button onClick={handleSave}>Save Override</Button>
    //       </DialogFooter>
    //     </DialogContent>
    //   </Dialog>
    // </div>
  // )
// }
