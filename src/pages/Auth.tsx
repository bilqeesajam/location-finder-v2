import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { z } from 'zod'
import LegalConfirmModal from '@/components/LegalConfirmModal'
import { supabase } from '@/lib/supabaseClient' // ✅ ADDED

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.1-.1-2.2-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.2 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.3 35.6 26.8 36 24 36c-5.3 0-9.8-3.4-11.4-8.1l-6.5 5C9.3 39.7 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.4 5.5-6.3 7l6.3 5.2C38.9 36.8 44 31.3 44 24c0-1.1-.1-2.2-.4-3.5z"/>
  </svg>
)

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signupSchema = loginSchema.extend({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
})

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [authError, setAuthError] = useState('')
  const [acceptedTos, setAcceptedTos] = useState(false)
  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | null>(null)

  const { user, signIn, signUp, isLoading } = useAuth()
  const navigate = useNavigate()

  // ✅ GOOGLE AUTH HANDLER (FROM YOUR FILE)
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) setAuthError(error.message)
  }

  useEffect(() => {
    if (user && !isLoading) navigate('/')
  }, [user, isLoading, navigate])

  const validatePassword = (value: string) => {
    if (value.length > 0 && value.length < 6) {
      setErrors((prev) => ({
        ...prev,
        password: 'Password must be at least 6 characters',
      }))
    } else {
      setErrors((prev) => ({ ...prev, password: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setAuthError('')

    const schema = mode === 'login' ? loginSchema : signupSchema
    const data =
      mode === 'login'
        ? { email, password }
        : { email, password, displayName }

    const result = schema.safeParse(data)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setAuthError('Passwords do not match')
      return
    }

    if (mode === 'signup' && !acceptedTos) {
      setAuthError('You must accept the Terms & Conditions to continue')
      return
    }

    setIsSubmitting(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setAuthError('Invalid email or password')
    } else {
      const { error } = await signUp(email, password, displayName)
      if (error) setAuthError(error.message)
    }

    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 pt-20">
      <div className="w-full max-w-md relative">
        <Link to="/" className="absolute -top-14 left-0 z-20">
          <Button variant="ghost" size="sm" className="gap-2 text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Button>
        </Link>

        <div className="rounded-2xl bg-card/80 border border-white/10 shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 mx-auto mb-4 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>

            <p className="text-muted-foreground">
              {mode === 'login'
                ? 'Sign in to add and share locations'
                : 'Join MapExplorer to start exploring'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                  className="pl-10 rounded-full bg-input/80 border border-white/10 text-foreground"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10 rounded-full bg-input/80 border border-white/10 text-foreground"
              />
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    validatePassword(e.target.value)
                  }}
                  placeholder="Enter your password"
                  className="pl-10 rounded-full bg-input/80 border border-white/10 text-foreground"
                />
              </div>

              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password}</p>
              )}
            </div>

            {mode === 'signup' && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="pl-10 rounded-full bg-input/80 border border-white/10 text-foreground"
                />
              </div>
            )}

            {authError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {authError}
              </div>
            )}

            {mode === 'signup' && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={acceptedTos}
                  onChange={(e) => setAcceptedTos(e.target.checked)}
                  className="accent-primary"
                />
                <span>
                  I agree to the{' '}
                  <button type="button" onClick={() => setShowLegalModal('terms')} className="text-primary underline">
                    Terms & Conditions
                  </button>{' '}
                  and{' '}
                  <button type="button" onClick={() => setShowLegalModal('privacy')} className="text-primary underline">
                    Privacy Policy
                  </button>
                </span>
              </label>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || (mode === 'signup' && !acceptedTos)}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-muted/40" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-muted/40" />
            </div>

            {/* ✅ GOOGLE BUTTON NOW WORKS */}
            <Button
              type="button"
              onClick={signInWithGoogle}
              className="w-full rounded-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-3"
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setErrors({})
                setAuthError('')
                setAcceptedTos(false)
              }}
              className="text-primary underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      <LegalConfirmModal
        type={showLegalModal}
        onClose={() => setShowLegalModal(null)}
      />
    </div>
  )
}
