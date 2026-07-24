import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { tokenStore, type AuthUser } from '../lib/storage'
import { colors, spacing, radius } from '../lib/theme'
import { useSidebar } from '../components/CollapsibleSidebar'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = (SCREEN_W - spacing.lg * 2 - spacing.md) / 2

export interface Feature {
  label: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  accent: string
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export default function HomeScreen({ onLogout, features }: { onLogout: () => void; features: Feature[] }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const { navigate } = useSidebar()

  useEffect(() => {
    ;(async () => {
      const u = await tokenStore.getUser()
      setUser(u)
    })()
  }, [])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.greetingSection}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {((user?.full_name || user?.username || 'U')[0]).toUpperCase()}
            </Text>
          </View>
          <View style={styles.greetingTextWrap}>
            <Text style={styles.greetingTime}>{greeting()}</Text>
            <Text style={styles.userName} numberOfLines={1}>{user?.full_name || user?.username || 'User'}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{(user?.role || '').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.grid}>
          {features.map((f) => (
            <Pressable key={f.label} onPress={() => navigate(f.label)} style={[styles.card, { borderColor: f.accent + '40' }]}>
              <View style={[styles.iconCircle, { backgroundColor: f.accent + '1A' }]}>
                <MaterialCommunityIcons name={f.icon} size={22} color={f.accent} />
              </View>
              <Text style={styles.cardLabel} numberOfLines={2}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 100 },

  greetingSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  greetingTextWrap: { marginLeft: spacing.md, flex: 1 },
  greetingTime: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  userName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  roleBadge: {
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roleText: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },

  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '600', color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: CARD_W,
    height: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 11, fontWeight: '600', color: colors.textPrimary,
    textAlign: 'center', marginTop: spacing.sm,
  },
})
