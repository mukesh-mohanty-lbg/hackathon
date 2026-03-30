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
      <div
        className="flex-1 flex items-center justify-center p-8 relative bg-cover bg-center"
        style={{ backgroundImage: "url('./youth-bg.jpg'), url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop')" }}
      >
        {/* Teal overlay */}
        <div className="absolute inset-0 bg-cyan-500/40 pointer-events-none" />
        <div className="relative z-10 w-full max-w-md">
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
                  <label htmlFor="email" className="block w-full text-sm font-medium text-left mb-2">Email address</label>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@oyci.org.uk"
                    value={email} onChange={e => { setEmail(e.target.value); setError('') }} required aria-invalid={!!error} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block w-full text-sm font-medium text-left mb-2">Password</label>
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
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-sm text-primary font-medium hover:underline"
                    onClick={() => setError('Password reset is not available in demo mode.')}
                  >
                    I forgot my password!
                  </button>
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

              {/* Social login divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground font-medium">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Social login buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true)
                    await new Promise(r => setTimeout(r, 600))
                    login('admin@oyci.org.uk', 'abc123')
                    setLoading(false)
                  }}
                  disabled={loading}
                  className="flex w-full items-center rounded-md overflow-hidden border border-[#4285F4] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <span className="flex items-center justify-center bg-white p-2.5">
                    <svg className="size-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </span>
                  <span className="flex-1 text-center text-sm font-medium text-white bg-[#4285F4] py-2.5">
                    Sign in with Google
                  </span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true)
                    await new Promise(r => setTimeout(r, 600))
                    login('staff@oyci.org.uk', 'abc123')
                    setLoading(false)
                  }}
                  disabled={loading}
                  className="flex w-full items-center rounded-md overflow-hidden border border-[#3b5998] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <span className="flex items-center justify-center bg-white p-2.5">
                    <svg className="size-5" viewBox="0 0 24 24" fill="#3b5998">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </span>
                  <span className="flex-1 text-center text-sm font-medium text-white bg-[#3b5998] py-2.5">
                    Sign in with Facebook
                  </span>
                </button>
              </div>


            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

