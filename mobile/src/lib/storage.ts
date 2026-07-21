import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

const TOKEN_KEY = 'sms_token'
const USER_KEY = 'sms_user'

async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value)
  } catch {
    await AsyncStorage.setItem(key, value)
  }
}

async function getItem(key: string): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(key)
    if (v) return v
  } catch {
    // fall through
  }
  return AsyncStorage.getItem(key)
}

async function deleteItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key)
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(key)
}

export interface AuthUser {
  id: string
  username: string
  full_name: string
  email: string
  role: 'student' | 'faculty' | 'admin'
  standard?: string | null
  division?: string | null
}

export const tokenStore = {
  async saveToken(token: string) {
    await setItem(TOKEN_KEY, token)
  },
  async getToken(): Promise<string | null> {
    return getItem(TOKEN_KEY)
  },
  async saveUser(user: AuthUser) {
    await setItem(USER_KEY, JSON.stringify(user))
  },
  async getUser(): Promise<AuthUser | null> {
    const raw = await getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  },
  async clear() {
    await deleteItem(TOKEN_KEY)
    await deleteItem(USER_KEY)
  },
}
