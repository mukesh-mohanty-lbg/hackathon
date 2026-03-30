import { useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AvailabilityStatus, User } from '@/types'
import { CalendarDays, Pencil, Info } from 'lucide-react'

const STATUS_META: Record<AvailabilityStatus, { label: string; variant: 'success' | 'warning' | 'destructive'; dot: string }> = {
  available: { label: 'Available', variant: 'success', dot: 'bg-emerald-500' },
  partial: { label: 'Partial', variant: 'warning', dot: 'bg-amber-500' },
  unavailable: { label: 'Unavailable', variant: 'destructive', dot: 'bg-red-500' },
}

export function StaffAvailability() {
  const { users, events, setAvailabilityOverride, updateAvailability, availabilityOverrides } = useApp()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)
  const [overrideDate, setOverrideDate] = useState(new Date().toISOString().split('T')[0])
  const [overrideStatus, setOverrideStatus] = useState<AvailabilityStatus>('available')
  const [overrideNote, setOverrideNote] = useState('')

  const staffList = users.filter(u => u.isActive)
  const today = new Date().toISOString().split('T')[0]
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d.toISOString().split('T')[0]
  })

  const getAssignmentCount = (staffId: string) =>
    events.flatMap(e => e.instances).filter(i => i.staffAssigned.includes(staffId) && i.status === 'scheduled').length

  const getOverride = (staffId: string, date: string) =>
    availabilityOverrides.find(o => o.staffId === staffId && o.date === date)

  const openOverride = (u: User) => {
    setSelected(u)
    setOverrideStatus(u.availability)
    setOverrideNote(u.availabilityNote ?? '')
    setOverrideDate(today)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!selected) return
    setAvailabilityOverride({ staffId: selected.id, date: overrideDate, status: overrideStatus, note: overrideNote })
    updateAvailability(selected.id, overrideStatus, overrideNote)
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-left">Staff Availability Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">View and override staff availability for the next 7 days.</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium w-48">Staff</th>
                {nextDays.map(d => {
                  const label = new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
                  return (
                    <th key={d} className={`text-center px-3 py-3 font-medium text-xs ${d === today ? 'text-primary' : 'text-muted-foreground'}`}>
                      <div>{label.split(' ')[0]}</div>
                      <div className={`text-base font-bold ${d === today ? 'text-primary' : 'text-foreground'}`}>{label.split(' ')[1]}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {staffList.map(u => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{u.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-tight text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{getAssignmentCount(u.id)} upcoming</p>
                      </div>
                    </div>
                  </td>
                  {nextDays.map(d => {
                    const override = getOverride(u.id, d)
                    const status: AvailabilityStatus = override?.status ?? u.availability
                    const meta = STATUS_META[status]
                    return (
                      <td key={d} className="text-center px-2 py-3">
                        <button onClick={() => openOverride(u)} className="mx-auto flex flex-col items-center gap-1 group" title={override?.note ?? undefined}>
                          <span className={`size-3 rounded-full ${meta.dot} group-hover:ring-2 group-hover:ring-offset-1 transition-all`} />
                          {override?.note && <Info className="size-3 text-muted-foreground" />}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(STATUS_META).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${v.dot}`} />{v.label}</span>
        ))}
      </div>

      <h2 className="font-heading font-semibold flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" />Current Availability</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map(u => {
          const meta = STATUS_META[u.availability]
          return (
            <Card key={u.id} size="sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9"><AvatarFallback className="text-xs bg-primary/10 text-primary">{u.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <Badge variant={meta.variant} className="text-xs mt-0.5">{meta.label}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => openOverride(u)}><Pencil className="size-3.5" /></Button>
                </div>
                {u.availabilityNote && <p className="text-xs text-muted-foreground mt-2 italic">"{u.availabilityNote}"</p>}
                <p className="text-xs text-muted-foreground mt-2">{getAssignmentCount(u.id)} upcoming assignments</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Availability – {selected?.name}</DialogTitle>
            <DialogDescription>Set availability status for a specific date or update their general status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <input type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)}
                className="flex h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={overrideStatus} onValueChange={v => setOverrideStatus(v as AvailabilityStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">🟢 Available</SelectItem>
                  <SelectItem value="partial">🟡 Partial availability</SelectItem>
                  <SelectItem value="unavailable">🔴 Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea placeholder="e.g. Available mornings only" value={overrideNote} onChange={e => setOverrideNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
