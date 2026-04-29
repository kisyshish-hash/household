'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { LogIn } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { Household, Member } from '@/lib/types'

type AuthContextValue = {
  loading: boolean
  session: Session | null
  user: User | null
  member: Member | null
  household: Household | null
  householdId: string | null
  refreshMember: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  loading: true,
  session: null,
  user: null,
  member: null,
  household: null,
  householdId: null,
  refreshMember: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)

  async function loadLinkedMember(userId: string | null) {
    if (!userId) {
      setMember(null)
      setHousehold(null)
      return
    }

    const { data } = await supabase
      .from('members')
      .select('*, households(*)')
      .eq('auth_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      const memberData = data as Member & { households?: Household | null }
      setMember(memberData)
      setHousehold(memberData.households ?? null)
      return
    }

    await createInitialHousehold(userId)
  }

  async function createInitialHousehold(userId: string) {
    const user = (await supabase.auth.getUser()).data.user
    const displayName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      '나'

    const { data: newHousehold, error: householdError } = await supabase
      .from('households')
      .insert({
        name: '우리 가족',
        owner_user_id: userId,
        invite_code: crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase(),
      })
      .select('*')
      .single()

    if (householdError || !newHousehold) {
      setMember(null)
      setHousehold(null)
      return
    }

    const { data: newMember } = await supabase
      .from('members')
      .insert({
        household_id: newHousehold.id,
        auth_user_id: userId,
        name: displayName,
        role: '나',
      })
      .select('*')
      .single()

    setHousehold(newHousehold)
    setMember(newMember ?? null)
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadLinkedMember(data.session?.user.id ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      loadLinkedMember(nextSession?.user.id ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    user: session?.user ?? null,
    member,
    household,
    householdId: household?.id ?? member?.household_id ?? null,
    refreshMember: () => loadLinkedMember(session?.user.id ?? null),
    signInWithGoogle: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
      if (error) throw error
    },
    signOut: async () => {
      await supabase.auth.signOut()
      setMember(null)
      setHousehold(null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [household, loading, member, session])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, session, signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  async function handleGoogleLogin() {
    setError(null)
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 요청을 시작하지 못했습니다.')
      setSigningIn(false)
    }
  }

  if (loading) {
    return <div className="py-24 text-center text-sm text-amber-400">로그인 상태를 확인하는 중...</div>
  }

  if (!session) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-amber-100 bg-white p-6 text-center shadow-sm">
        <Image src="/icon-180.png" alt="홈 오퍼레이션" width={80} height={80} className="h-20 w-20 rounded-2xl object-contain" />
        <h1 className="mt-4 text-2xl font-bold text-gray-800">홈 오퍼레이션</h1>
        <p className="mt-2 text-sm text-gray-500">Google 계정으로 로그인하고 가족 루틴을 관리하세요.</p>
        <button
          onClick={handleGoogleLogin}
          disabled={signingIn}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-white hover:bg-amber-500"
        >
          <LogIn size={16} />
          {signingIn ? 'Google로 이동 중...' : 'Google로 로그인'}
        </button>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
            {error}
          </p>
        )}
      </div>
    )
  }

  return <>{children}</>
}

export const useAuth = () => useContext(AuthContext)
