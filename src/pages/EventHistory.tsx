import { useMemo, useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronRight, TrendingUp, Calendar, CheckCircle2, Clock } from 'lucide-react'

interface EventHistoryProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

const TYPE_BADGE: Record<string, 'info' | 'success' | 'warning' | 'default' | 'secondary'> = {
  workshop: 'info', activity: 'success', trip: 'warning', programme: 'default', meeting: 'secondary'
}

export function EventHistory({ onNavigate }: EventHistoryProps) {
  const { events, currentUser } = useApp()
  const [dateFilter, setDateFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const myAssignments = useMemo(() => {
    const result: Array<{ event: import('@/types').Event; instance: import('@/types').EventInstance }> = []
    for (const ev of events) {
      for (const inst of ev.instances) {
        if (currentUser?.role === 'admin' || inst.staffAssigned.includes(currentUser?.id ?? ''))
          result.push({ event: ev, instance: inst })
      }
    }
    return result.sort((a, b) => b.instance.date.localeCompare(a.instance.date))
  }, [events, currentUser])

  const filtered = useMemo(() => {
    const today = new Date()
    return myAssignments.filter(({ event: ev, instance: inst }) => {
      if (typeFilter !== 'all' && ev.type !== typeFilter) return false
      if (dateFilter === 'this-month') { const d = new Date(inst.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() }
      if (dateFilter === 'last-month') { const d = new Date(inst.date); const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear() }
      if (dateFilter === 'this-year') { return new Date(inst.date).getFullYear() === today.getFullYear() }
      return true
    })
  }, [myAssignments, dateFilter, typeFilter])

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const done = filtered.filter(f => f.instance.status === 'completed')
    return {
      total: filtered.length,
      completed: done.length,
      upcoming: filtered.filter(f => f.instance.status === 'scheduled' && f.instance.date >= today).length,
      totalAttendees: done.reduce((sum, f) => sum + f.instance.attendees.filter(a => a.present).length, 0),
    }
  }, [filtered])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">My Event History</h1>
        <p className="text-muted-foreground text-sm mt-1">{currentUser?.role === 'admin' ? 'All event sessions' : 'Sessions you have been assigned to'}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total Sessions', stats.total, Calendar, ''], ['Completed', stats.completed, CheckCircle2, 'emerald'], ['Upcoming', stats.upcoming, Clock, 'blue'], ['Attendees Reached', stats.totalAttendees, TrendingUp, 'purple']].map(([l, v, I, c]) => {
          const Icon = I as React.FC<React.SVGProps<SVGSVGElement>>
          const colorMap: Record<string, string> = { emerald: 'text-emerald-600', blue: 'text-blue-600', purple: 'text-purple-600' }
          return (
            <Card key={String(l)} size="sm"><CardContent className="pt-3 pb-3">
              <div className={`flex items-center gap-1.5 mb-1 ${c ? colorMap[String(c)] : 'text-muted-foreground'}`}><Icon className="size-4" /><span className="text-xs">{l}</span></div>
              <p className={`font-bold font-heading text-xl ${c ? colorMap[String(c)] : 'text-foreground'}`}>{v}</p>
            </CardContent></Card>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Date range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {['activity','workshop','trip','programme','meeting'].map(t => <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No sessions found for the selected filters</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ event: ev, instance: inst }) => {
            const dateLabel = new Date(inst.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            const parts = dateLabel.split(' ')
            return (
              <button key={inst.id} onClick={() => onNavigate('event-detail', { instanceId: inst.id })} className="w-full text-left">
                <Card className="hover:ring-2 hover:ring-primary/20 transition-all">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="text-center min-w-[48px]">
                          <p className="text-xs text-muted-foreground">{parts[0]}</p>
                          <p className="font-bold text-lg font-heading leading-none">{parts[1]}</p>
                          <p className="text-xs text-muted-foreground">{parts.slice(2).join(' ')}</p>
                        </div>
                        <div className="w-px bg-border self-stretch mx-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant={TYPE_BADGE[ev.type] ?? 'secondary'} className="text-xs capitalize">{ev.type}</Badge>
                            <Badge variant={inst.status === 'completed' ? 'success' : inst.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-xs capitalize">{inst.status}</Badge>
                          </div>
                          <h3 className="font-medium text-sm">{ev.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{inst.startTime}–{inst.endTime} · {ev.venue}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {inst.status === 'completed' && <p className="text-sm font-bold">{inst.attendees.filter(a => a.present).length} attendees</p>}
                        <ChevronRight className="size-4 text-muted-foreground mt-1 ml-auto" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
