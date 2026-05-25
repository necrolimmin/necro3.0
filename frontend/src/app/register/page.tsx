'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Tv2, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.register(form.email, form.username, form.password)
      toast.success('Account created! Please sign in.')
      router.push('/login')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#030712]">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-900/50">
            <Tv2 size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Nova<span className="text-violet-400">Stream</span></span>
        </div>

        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-1">Create account</h1>
          <p className="text-white/50 text-sm mb-8">Join NovaStream today</p>

          <form onSubmit={handle} className="flex flex-col gap-4">
            {[
              { label: 'Email', key: 'email', type: 'email', placeholder: 'you@example.com' },
              { label: 'Username', key: 'username', type: 'text', placeholder: 'johndoe' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">{label}</label>
                <input type={type} value={(form as any)[key]} onChange={e => setForm({...form, [key]: e.target.value})} required
                  placeholder={placeholder}
                  className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 focus:bg-white/10 transition-all" />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
                  placeholder="Min. 8 characters"
                  className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 focus:bg-white/10 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={loading}
              className="btn-nova w-full flex items-center justify-center gap-2.5 mt-2"
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
