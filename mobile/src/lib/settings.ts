import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
  API_URL: '@school/api_url',
}

const DEFAULT_API_URL = 'https://schoolmanagmentsystemapp-web-production.up.railway.app'

export const settingsStore = {
  async getApiUrl(): Promise<string> {
    try {
      const stored = await AsyncStorage.getItem(KEYS.API_URL)
      return stored || DEFAULT_API_URL
    } catch {
      return DEFAULT_API_URL
    }
  },

  async setApiUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.API_URL, url)
  },

  async resetApiUrl(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.API_URL)
  },

  getDefaultApiUrl(): string {
    return DEFAULT_API_URL
  },
}
