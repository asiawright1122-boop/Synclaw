/**
 * useAuth.ts — React hook wrapper for authService
 */

import { useEffect, useState } from 'react'
import authService, { AuthState, LoginCredentials, RegisterData } from '../lib/auth'

export function useAuth() {
  const [state, setState] = useState<AuthState>(authService.getState())

  useEffect(() => {
    const unsubscribe = authService.subscribe(setState)
    return () => { unsubscribe() }
  }, [])

  return {
    ...state,
    login: (credentials: LoginCredentials) => authService.login(credentials),
    register: (data: RegisterData) => authService.register(data),
    logout: () => authService.logout(),
    refreshAuth: () => authService.refreshAuth(),
    fetchCurrentUser: () => authService.fetchCurrentUser(),
    getToken: () => authService.getToken(),
  }
}

export default useAuth
