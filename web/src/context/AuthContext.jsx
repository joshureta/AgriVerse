import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AuthContext } from './auth-context.js'
import { supabase } from '../lib/supabase.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, mobile_number, country, region, province, city_municipality, barangay, role, worker_category',
      )
      .eq('id', userId)
      .single()

    if (error) {
      setProfile(null)
      setProfileError(error.message)
      return null
    }

    setProfile(data)
    setProfileError('')
    return data
  }, [])

  const applySession = useCallback(async (nextSession) => {
    setSession(nextSession)

    if (nextSession?.user) {
      await loadProfile(nextSession.user.id)
    } else {
      setProfile(null)
      setProfileError('')
    }

    setLoading(false)
  }, [loadProfile])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        applySession(data.session)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setTimeout(() => applySession(nextSession), 0)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySession])

  const value = useMemo(
    () => ({
      loading,
      profile,
      profileError,
      refreshProfile: () => session?.user ? loadProfile(session.user.id) : null,
      session,
      signOut: () => supabase.auth.signOut(),
      user: session?.user ?? null,
    }),
    [loading, loadProfile, profile, profileError, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
