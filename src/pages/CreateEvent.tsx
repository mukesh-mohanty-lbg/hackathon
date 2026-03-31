import { useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Event, EventType, RecurrenceType, EventInstance } from '@/types'
import { CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface CreateEventProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

type Step = 1 | 2 | 3 | 4

interface FormState {
  title: string; description: string; type: EventType; venue: string; ageGroup: string; tags: string
  instances: Array<{ date: string; startTime: string; endTime: string; shiftStartTime: string; shiftEndTime: string }>
  recurrence: RecurrenceType; requiredStaff: number; maxAttendees: number
}

const INITIAL: FormState = {
  title: '', description: '', type: 'activity', venue: '', ageGroup: '', tags: '',
  instances: [{ date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', shiftStartTime: '08:30', shiftEndTime: '17:30' }],
  recurrence: 'none', requiredStaff: 2, maxAttendees: 20,
}

const STEPS = ['Information', 'Schedule', 'Rules', 'Review']

export function CreateEvent({ onNavigate }: CreateEventProps) {
  const { addEvent, currentUser } = useApp()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({ ...INITIAL })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [created, setCreated] = useState<Event | null>(null)

  const field = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm(f => ({ ...f, [key]: val }))

  const validateStep = (s: Step) => {
    const e: Record<string, string> = {}
    if (s === 1) { if (!form.title.trim()) e.title = 'Title required'; if (!form.venue.trim()) e.venue = 'Venue required' }
    if (s === 2) {
      if (form.instances.length === 0) e.instances = 'At least one session required'
      form.instances.forEach((inst, i) => { if (inst.startTime >= inst.endTime) e[`time_${i}`] = 'End must be after start' })
    }
    if (s === 3) { if (form.requiredStaff < 1) e.requiredStaff = 'Min 1'; if (form.maxAttendees < 1) e.maxAttendees = 'Min 1' }
    setErrors(e); return Object.keys(e).length === 0
  }

  const next = () => { if (!validateStep(step)) return; setStep(s => (s < 4 ? (s + 1) as Step : s)) }
  const back = () => setStep(s => (s > 1 ? (s - 1) as Step : s))

  const submit = async (confirm: boolean) => {
    if (!confirm) { setStep(1); return }
    const instances: EventInstance[] = form.instances.map((inst, i) => ({
      id: `i_${Date.now()}_${i}`, eventId: '', date: inst.date, startTime: inst.startTime, endTime: inst.endTime,
      shiftStartTime: inst.shiftStartTime || undefined, shiftEndTime: inst.shiftEndTime || undefined,
      staffAssigned: [], maxAttendees: form.maxAttendees, attendees: [], status: 'scheduled' as const,
    }))
    const ev = await addEvent({
      title: form.title, description: form.description, type: form.type, venue: form.venue,
      ageGroup: form.ageGroup || undefined, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      recurrence: form.recurrence, requiredStaff: form.requiredStaff, maxAttendees: form.maxAttendees,
      instances, createdBy: currentUser?.id ?? 'unknown',
    })
    setCreated(ev)
  }

  if (created) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center">
        <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 className="size-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold">Event Created!</h2>
          <p className="text-muted-foreground mt-1">"{created.title}" with {created.instances.length} session(s)</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setCreated(null); setForm({ ...INITIAL }); setStep(1) }}>Create Another</Button>
          <Button onClick={() => onNavigate('events')}><Calendar className="size-4 mr-2" />View Events</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Create Event</h1>
        <p className="text-muted-foreground text-sm mt-1">Add a new event or programme session</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step; const active = n === step; const done = n < step
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn('size-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground')}>
                  {done ? <CheckCircle2 className="size-4" /> : n}
                </div>
                <span className={cn('text-xs hidden sm:block', active ? 'text-primary font-medium' : 'text-muted-foreground')}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn('flex-1 h-0.5 mx-2 mb-4', done ? 'bg-primary' : 'bg-border')} />}
            </div>
          )
        })}
      </div>

      <Card><CardContent className="pt-6 pb-6">
        {step === 1 && <Step1 form={form} field={field} errors={errors} />}
        {step === 2 && <Step2 form={form} field={field} errors={errors} />}
        {step === 3 && <Step3 form={form} field={field} errors={errors} />}
        {step === 4 && <Step4 form={form} />}
      </CardContent></Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={step === 1} className="gap-2"><ChevronLeft className="size-4" />Back</Button>
        {step < 4 ? (
          <Button onClick={next} className="gap-2">Next <ChevronRight className="size-4" /></Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => submit(false)} className="gap-2"><ChevronLeft className="size-4" />Begin Again</Button>
            <Button onClick={() => submit(true)}><CheckCircle2 className="size-4 mr-2" />Create Event</Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Step1({ form, field, errors }: { form: FormState; field: <K extends keyof FormState>(k: K, v: FormState[K]) => void; errors: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold">Step 1 – Event Information</h2>
      <FF label="Event Title" required={true} error={errors.title}><Input placeholder="e.g. Summer Holiday Programme" value={form.title} onChange={e => field('title', e.target.value)} /></FF>
      <FF label="Description" required={false}><Textarea placeholder="What will participants experience?" value={form.description} onChange={e => field('description', e.target.value)} rows={3} /></FF>
      <div className="grid grid-cols-2 gap-3">
        <FF label="Event Type" required={true}>
          <Select value={form.type} onValueChange={v => field('type', v as EventType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(['activity', 'workshop', 'trip', 'programme', 'meeting'] as EventType[]).map(t => <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        </FF>
        <FF label="Age Group" required={false}><Input placeholder="e.g. 8–16" value={form.ageGroup} onChange={e => field('ageGroup', e.target.value)} /></FF>
      </div>
      <FF label="Venue" required={true} error={errors.venue}><Input placeholder="e.g. Alloa Community Centre" value={form.venue} onChange={e => field('venue', e.target.value)} /></FF>
      <FF label="Tags (comma separated)" required={false}><Input placeholder="e.g. outdoor, arts, holiday" value={form.tags} onChange={e => field('tags', e.target.value)} /></FF>
    </div>
  )
}

function Step2({ form, field, errors }: { form: FormState; field: <K extends keyof FormState>(k: K, v: FormState[K]) => void; errors: Record<string, string> }) {
  const addInstance = () => field('instances', [...form.instances, { date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', shiftStartTime: '08:30', shiftEndTime: '17:30' }])
  const removeInstance = (i: number) => field('instances', form.instances.filter((_, idx) => idx !== i))
  const updateInstance = (i: number, key: 'date' | 'startTime' | 'endTime' | 'shiftStartTime' | 'shiftEndTime', val: string) =>
    field('instances', form.instances.map((inst, idx) => idx === i ? { ...inst, [key]: val } : inst))

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold">Step 2 – Schedule</h2>
      <FF label="Recurrence" required={true}>
        <Select value={form.recurrence} onValueChange={v => field('recurrence', v as RecurrenceType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">One-time</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </FF>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Sessions</label>
          <Button type="button" variant="outline" size="sm" onClick={addInstance} className="gap-1.5 text-xs"><Plus className="size-3" />Add Session</Button>
        </div>
        {errors.instances && <p className="text-xs text-destructive">{errors.instances}</p>}
        {form.instances.map((inst, i) => (
          <div key={i} className="rounded-xl border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Session {i + 1}</span>
              {form.instances.length > 1 && <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeInstance(i)}><Trash2 className="size-3.5 text-destructive" /></Button>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <FF label="Date" required={true}><Input type="date" value={inst.date} onChange={e => updateInstance(i, 'date', e.target.value)} /></FF>
              <FF label="Event Start" required={true} error={errors[`time_${i}`]}><Input type="time" value={inst.startTime} onChange={e => updateInstance(i, 'startTime', e.target.value)} /></FF>
              <FF label="Event End" required={true}><Input type="time" value={inst.endTime} onChange={e => updateInstance(i, 'endTime', e.target.value)} /></FF>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FF label="Shift Start" required={false}><Input type="time" value={inst.shiftStartTime} onChange={e => updateInstance(i, 'shiftStartTime', e.target.value)} /></FF>
              <FF label="Shift End" required={false}><Input type="time" value={inst.shiftEndTime} onChange={e => updateInstance(i, 'shiftEndTime', e.target.value)} /></FF>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Step3({ form, field, errors }: { form: FormState; field: <K extends keyof FormState>(k: K, v: FormState[K]) => void; errors: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold">Step 3 – Rules & Capacity</h2>
      <div className="grid grid-cols-2 gap-4">
        <FF label="Required Staff" required={true} error={errors.requiredStaff}>
          <Input type="number" min={1} value={form.requiredStaff} onChange={e => field('requiredStaff', parseInt(e.target.value) || 1)} />
        </FF>
        <FF label="Max Attendees" required={true} error={errors.maxAttendees}>
          <Input type="number" min={1} value={form.maxAttendees} onChange={e => field('maxAttendees', parseInt(e.target.value) || 1)} />
        </FF>
      </div>
      <div className="rounded-xl bg-muted/50 border border-border p-4 text-sm text-muted-foreground space-y-1.5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-left">Type</TableCell>
              <TableCell className="text-left">{form.type}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-left">Venue</TableCell>
              <TableCell className="text-left">{form.venue}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-left">Sessions</TableCell>
              <TableCell className="text-left">{form.instances.length}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function Step4({ form }: { form: FormState }) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold">Step 4 – Review</h2>
      <div className="space-y-3">
        {[['Title', form.title], ['Type', form.type], ['Venue', form.venue], ['Recurrence', form.recurrence], ['Required Staff', String(form.requiredStaff)], ['Max Attendees', String(form.maxAttendees)]].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-sm text-muted-foreground">{l}</span>
            <span className="text-sm font-medium capitalize">{v || '—'}</span>
          </div>
        ))}
        {form.description && <div><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm">{form.description}</p></div>}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Sessions ({form.instances.length})</p>
          <div className="space-y-1.5">
            {form.instances.map((inst, i) => (
              <div key={i} className="flex items-center gap-2 text-sm rounded-lg bg-muted/50 px-3 py-1.5">
                <Badge variant="outline" className="text-xs">#{i + 1}</Badge>
                <span>{new Date(inst.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="text-muted-foreground">{inst.startTime}–{inst.endTime}</span>
              </div>
            ))}
          </div>
        </div>
        {form.tags && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FF({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <Field data-invalid={!!error} className="space-y-1.5">
      <FieldLabel htmlFor="input-required">
        {label} {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      {children}
      {error && <FieldDescription>{error}</FieldDescription>}
    </Field>
  )
}
