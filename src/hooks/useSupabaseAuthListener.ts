import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

export const useSupabaseAuthListener = () => {
    const checkAuth = useAuthStore(state => state.checkAuth)

    useEffect(() => {
        // Obtener sesión inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            checkAuth(session)
        })

        // Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            checkAuth(session)
        })

        return () => subscription.unsubscribe()
    }, [checkAuth])
}
