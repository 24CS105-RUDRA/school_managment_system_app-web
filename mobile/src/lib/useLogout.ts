import { tokenStore } from '../lib/storage'

export function useLogout(onLogout: () => void) {
  return async () => {
    await tokenStore.clear()
    onLogout()
  }
}
