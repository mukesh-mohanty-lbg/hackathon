import { useState } from 'react'
import { useApp } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Eye, EyeOff, HelpingHand } from 'lucide-react'
import { USERS } from '@/store/mockData'

export function LoginPage() {
  const { login } = useApp()
  const [email, setEmail] = useState('admin@oyci.org.uk')
  const [password, setPassword] = useState('abc123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    await new Promise(r => setTimeout(r, 600))

    const normalizedEmail = email.trim().toLowerCase()
    const ok = login(normalizedEmail, password)

    if (!ok) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    const mockUser = USERS.find(u => u.email.toLowerCase() === normalizedEmail)
    if (!mockUser) {
      setError('User record not found.')
      setLoading(false)
      return
    }

    // User successfully logged in
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2.2 flex-col justify-between p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="absolute rounded-full border border-secondary-foreground"
              style={{ width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            />
          ))}
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <img src="./logo.png" alt="OYCI Logo" className="size-16" />
              {/* <HelpingHand className="size-5 fill-white text-white" /> */}
            </div>
            {/* <span className="font-heading font-bold text-xl text-primary">OYCI</span> */}
          </div>
          <h1 className="font-heading text-5xl font-bold leading-tight mb-4 text-chart-3 mt-32">
            Ochil Youths Community <br/>Improvement
          </h1>
          <p className="text-chart-2 text-md font-medium">
            OYCI exist to help young people in Clacks flourish. We create space and opportunity for <br />
            young people to be themselves while they figure out what is important to them, and what <br />
            they might want to learn and achieve.
          </p>
          <p className="text-chart-2 text-md font-medium italic mt-6">
            Ensuring every young person in Clackmannanshire can flourish — with the right people, in the right place, at the right time.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4 text-chart-2 mb-16">
          {[{ label: 'Young people supported', value: '500+' }, { label: 'Staff members', value: '15' }, { label: 'Since', value: '2017' }].map(stat => (
            <div key={stat.label} className="rounded-xl bg-secondary-foreground/10 p-4 backdrop-blur-sm">
              <div className="font-heading text-primary/70 text-2xl font-bold">{stat.value}</div>
              <div className="text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
              <HelpingHand className="size-4 fill-white text-white" />
            </div>
            <span className="font-heading font-bold text-lg">OYCI Portal</span>
          </div>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2 justify-center">
              <img src="./logo-full.png" alt="OYCI Logo" className="w-32 mb-6" />
              {/* <CardTitle className="text-2xl font-heading">Welcome</CardTitle> */}
              <CardDescription>Sign in to your OYCI account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />{error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-left mb-2">Email address</label>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@oyci.org.uk"
                    value={email} onChange={e => { setEmail(e.target.value); setError('') }} required aria-invalid={!!error} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-left mb-2">Password</label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                      placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                      required aria-invalid={!!error} className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Signing in…
                    </span>
                  ) : 'Sign in'}
                </Button>
              </form>
              <div className="mt-6 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-xs mb-1.5">Demo credentials</p>
                <p>Admin: <span className="font-mono text-foreground">admin@oyci.org.uk</span> / <span className="font-mono text-foreground">abc123</span></p>
                <Button type="submit" className="w-full mt-2" variant={'secondary'} onClick={() => {
                  setEmail('admin@oyci.org.uk'); setPassword('abc123'); setError('');
                }}>
                  Sign in as Admin
                </Button>
                <p>Staff: <span className="font-mono text-foreground">staff@oyci.org.uk</span> / <span className="font-mono text-foreground">abc123</span></p>
                <Button type="submit" className="w-full mt-2" variant={'secondary'} onClick={() => {
                  setEmail('staff@oyci.org.uk'); setPassword('abc123'); setError('');
                }}>
                  Sign in as Staff
                </Button>
                <p>YoungPeople: <span className="font-mono text-foreground">tomf@oyci.org.uk</span> / <span className="font-mono text-foreground">abc123</span></p>
                <Button type="submit" className="w-full mt-2" variant={'secondary'} onClick={() => {
                  setEmail('tomf@oyci.org.uk'); setPassword('abc123'); setError('');
                }}>
                  Sign in as YoungPeople
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

