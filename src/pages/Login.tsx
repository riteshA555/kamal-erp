import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [msgType, setMsgType] = useState<'error' | 'success'>('error')
    const navigate = useNavigate()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setMsgType('error')

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) {
                    setMessage(error.message)
                } else {
                    setMsgType('success')
                    setMessage('Registration successful! Check your email for the confirmation link.')
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) {
                    setMessage(error.message)
                } else {
                    navigate('/')
                }
            }
        } catch (err: any) {
            setMessage(err.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: 'var(--color-bg)'
        }}>
            <div style={{
                background: 'var(--color-surface)',
                padding: '2rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h1 style={{ marginTop: 0, textAlign: 'center' }}>
                    {isSignUp ? 'Create Account' : 'ERP Login'}
                </h1>
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                    {isSignUp ? 'Sign up to get started' : 'Sign in to manage orders'}
                </p>

                {message && (
                    <div style={{
                        color: msgType === 'error' ? 'var(--color-error)' : 'var(--color-success)',
                        marginBottom: '1rem',
                        textAlign: 'center',
                        background: msgType === 'error' ? 'var(--color-error-light)' : 'var(--color-success-light)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-sm)'
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            placeholder="name@company.com"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            placeholder="••••••••"
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
                        {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp)
                            setMessage('')
                        }}
                        style={{
                            background: 'transparent',
                            color: 'var(--color-primary)',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            marginLeft: '0.25rem',
                            padding: 0,
                            fontSize: 'inherit'
                        }}
                    >
                        {isSignUp ? 'Log In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    )
}
