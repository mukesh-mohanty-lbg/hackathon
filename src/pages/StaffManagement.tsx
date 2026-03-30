import { useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { User } from '@/types'
import { PlusCircle, Search, Phone, Mail, ShieldCheck, UserX, Pencil } from 'lucide-react'

interface StaffManagementProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

const EMPTY_FORM = {
  name: '', email: '', phone: '', role: 'staff' as User['role'],
  availability: 'available' as User['availability'], availabilityNote: '',
  isActive: true, joinedDate: new Date().toISOString().split('T')[0],
}

export function StaffManagement({ onNavigate: _onNavigate }: StaffManagementProps) {
  const { users, addUser, updateUser, toggleUserAccess } = useApp()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => { setEditUser(null); setForm({ ...EMPTY_FORM }); setErrors({}); setDialogOpen(true) }
  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, phone: u.phone ?? '', role: u.role, availability: u.availability, availabilityNote: u.availabilityNote ?? '', isActive: u.isActive, joinedDate: u.joinedDate })
    setErrors({}); setDialogOpen(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email is required'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    if (editUser) updateUser(editUser.id, { ...form })
    else addUser({ ...form })
    setDialogOpen(false)
  }

  const field = (key: keyof typeof form, value: string | boolean) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.filter(u => u.isActive).length} active · {users.filter(u => !u.isActive).length} inactive</p>
        </div>
        <Button onClick={openCreate} className="gap-2 self-start sm:self-auto"><PlusCircle className="size-4" />Add Staff Member</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['available', 'partial', 'unavailable'] as const).map(s => (
          <Card key={s} size="sm">
            <div className="px-4 pt-4 pb-3 flex flex-col items-center text-center">
              <p className="text-xl font-bold font-heading">{users.filter(u => u.isActive && u.availability === s).length}</p>
              <Badge variant={s === 'available' ? 'success' : s === 'partial' ? 'warning' : 'destructive'} className="mt-1 text-xs capitalize">{s}</Badge>
            </div>
          </Card>
        ))}
        <Card size="sm">
          <div className="px-4 pt-4 pb-3 flex flex-col items-center text-center">
            <p className="text-xl font-bold font-heading">{users.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Staff</p>
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-center">Availability</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No staff members found</TableCell></TableRow>
            )}
            {filtered.map(u => (
              <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{u.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="size-3" />{u.email}</span>
                    {u.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{u.phone}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize gap-1">
                    {u.role === 'admin' && <ShieldCheck className="size-3" />}{u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center">
                    <Badge variant={u.availability === 'available' ? 'success' : u.availability === 'partial' ? 'warning' : 'destructive'} className="text-xs capitalize">
                      {u.availability}
                    </Badge>
                    {u.availabilityNote && <p className="text-xs text-muted-foreground max-w-[120px] truncate mt-0.5">{u.availabilityNote}</p>}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Switch checked={u.isActive} onCheckedChange={() => toggleUserAccess(u.id)} aria-label={`Toggle access for ${u.name}`} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(u)}><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => toggleUserAccess(u.id)} className={u.isActive ? 'text-destructive hover:text-destructive' : ''}>
                    <UserX className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
            <DialogDescription>{editUser ? 'Update staff details and permissions.' : 'Fill in the details to create a new staff account.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FF label="Full Name *" error={errors.name}>
              <Input placeholder="Jane Smith" value={form.name} onChange={e => field('name', e.target.value)} aria-invalid={!!errors.name} />
            </FF>
            <FF label="Email *" error={errors.email}>
              <Input type="email" placeholder="jane@oyci.org.uk" value={form.email} onChange={e => field('email', e.target.value)} aria-invalid={!!errors.email} />
            </FF>
            <FF label="Phone (optional)">
              <Input placeholder="07700 900000" value={form.phone} onChange={e => field('phone', e.target.value)} />
            </FF>
            <div className="grid grid-cols-2 gap-3">
              <FF label="Role">
                <Select value={form.role} onValueChange={v => field('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </FF>
              <FF label="Start Date">
                <Input type="date" value={form.joinedDate} onChange={e => field('joinedDate', e.target.value)} />
              </FF>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch id="active-toggle" checked={form.isActive} onCheckedChange={v => field('isActive', v)} />
              <label htmlFor="active-toggle" className="text-sm cursor-pointer select-none">Account active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editUser ? 'Save Changes' : 'Create Staff'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FF({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
