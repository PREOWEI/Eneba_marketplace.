import { useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '../marketplace'

export default function AuthPage({ user, error: accountError, onAuthenticate, onNavigate }: {
  user: User | null
  error: string
  onAuthenticate: (mode: 'login' | 'register', values: { name: string; email: string; password: string }) => Promise<void>
  onNavigate: (path: string) => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>(() => new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const cleanName = name.trim()

  const nameError = mode !== 'register' ? ''
    : !cleanName ? 'Please enter your name.'
    : !/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(cleanName)
      ? 'Your name should contain letters, not numbers or other symbols.'
    : new TextEncoder().encode(cleanName).length > 80
      ? 'Your name is too long.'
    : ''

 const emailError = !email
  ? 'Please enter your email address.'
  : /\s/.test(email)
    ? 'Email addresses cannot contain spaces.'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Please enter a valid email address.'
      : ''

  const passwordError = !password
    ? 'Please enter your password.'
    : mode === 'register' && /\s/u.test(password)
      ? 'Password cannot contain spaces.'
    : mode === 'register' && password.length < 8
      ? 'Use at least 8 characters.'
    : mode === 'register' && new TextEncoder().encode(password).length > 72
      ? 'Your password is too long. Choose a shorter one.'
    : ''

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')

    if (nameError || emailError || passwordError) return

    setBusy(true)
    try {
      await onAuthenticate(mode, {
        name: cleanName,
        email,
        password
      })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (user) return <main className="content-page account-page">
    <p className="section-kicker">YOUR ACCOUNT</p>
    <h1>Welcome back, {user.name}</h1>
    <p>{user.email}</p>
    <p>Your demo purchases and keys are available in your order history.</p>
    <button className="primary-button" onClick={() => onNavigate('/orders')}>
      View order history
    </button>
  </main>

  return <main className="content-page auth-page">
    <p className="section-kicker">PLAYER ACCOUNT</p>
    <h1>{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
    <p>Sign in to complete checkout and keep your purchase history together.</p>

    {(error || accountError) && (
      <p className="form-error" role="alert">{error || accountError}</p>
    )}

    <form noValidate onSubmit={submit}>
      {mode === 'register' && (
        <label>
          Your name
          <input
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={event => setName(event.target.value)}
            onBlur={() => setTouched(previous => ({ ...previous, name: true }))}
            aria-invalid={Boolean((touched.name || submitted) && nameError)}
          />
          {(touched.name || submitted) && nameError && (
            <span className="field-error">{nameError}</span>
          )}
        </label>
      )}

      <label>
        Email
        <input
          type="text"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={email}
         onChange={event => setEmail(event.target.value)}
          onBlur={() => setTouched(previous => ({ ...previous, email: true }))}
          aria-invalid={Boolean((touched.email || submitted) && emailError)}
        />
        {(touched.email || submitted) && emailError && (
          <span className="field-error">{emailError}</span>
        )}
      </label>

      <label>
        Password
        <span className="password-input">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={event => setPassword(event.target.value)}
            onBlur={() => setTouched(previous => ({ ...previous, password: true }))}
            aria-invalid={Boolean((touched.password || submitted) && passwordError)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </span>
        {(touched.password || submitted) && passwordError && (
          <span className="field-error">{passwordError}</span>
        )}
      </label>

      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>
    </form>

    <p className="auth-switch">
      {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
      <button type="button" onClick={() => {
        setError('')
        setSubmitted(false)
        setTouched({ name: false, email: false, password: false })
        setPassword('')
        setShowPassword(false)
        setMode(mode === 'login' ? 'register' : 'login')
      }}>
        {mode === 'login' ? 'Create account' : 'Sign in'}
      </button>
    </p>
  </main>
}
