import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export const useSupabaseAuthListener = () => {
    const checkAuth = useAuthStore(state => state.checkAuth)

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            checkAuth(data.session as Session ?? null)
          });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session : Session | null) => {
            checkAuth(session)

        })

        return () => subscription.unsubscribe()
    }, [checkAuth])
}