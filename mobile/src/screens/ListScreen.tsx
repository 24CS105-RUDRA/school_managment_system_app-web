import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import {
  Card,
  Text,
  ActivityIndicator,
  Button,
  Chip,
  Searchbar,
  useTheme,
} from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { api } from '../lib/api'
import { useLogout } from '../lib/useLogout'
import { spacing, radius } from '../lib/theme'

interface ListScreenProps<T> {
  endpoint: string
  title: string
  onLogout: () => void
  extractItems: (data: unknown) => T[]
  renderItem: (item: T, index: number) => {
    title: string
    subtitle?: string
    chip?: string
    chipColor?: string
    rightText?: string
    avatarColor?: string
  }
  detailKey?: string
  showSearch?: boolean
}

function getKey(item: any): string {
  return item.id || item._id || Math.random().toString()
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  '#1565C0', '#7B1FA2', '#00897B', '#E65100', '#C62828',
  '#283593', '#00695C', '#4E342E', '#37474F', '#558B2F',
]

function AvatarCircle({ name, color }: { name: string; color?: string }) {
  const bg = color || AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <View style={[styles.avatar, { backgroundColor: bg }]}>
      <Text style={styles.avatarText}>{getInitials(name)}</Text>
    </View>
  )
}

function SkeletonCard() {
  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content style={styles.cardContent}>
        <View style={styles.skeletonAvatar} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
        </View>
      </Card.Content>
    </Card>
  )
}

export default function ListScreen<T extends Record<string, any>>({
  endpoint,
  title,
  onLogout,
  extractItems,
  renderItem,
  detailKey = 'id',
  showSearch = true,
}: ListScreenProps<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const logout = useLogout(onLogout)
  const navigation = useNavigation<any>()
  const theme = useTheme()

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    const res = await api.get<unknown>(endpoint)
    setLoading(false)
    setRefreshing(false)
    if (!res.success) {
      if (res.error === 'Authentication required') {
        logout()
        return
      }
      setError(res.error || 'Failed to load')
      return
    }
    setItems(extractItems(res.data))
  }, [endpoint])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter((item) => {
      const r = renderItem(item, 0)
      return (
        r.title.toLowerCase().includes(q) ||
        (r.subtitle || '').toLowerCase().includes(q) ||
        (r.chip || '').toLowerCase().includes(q)
      )
    })
  }, [items, searchQuery])

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ fontWeight: '700' }}>{title}</Text>
          <Button onPress={logout} compact mode="text">Logout</Button>
        </View>
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ fontWeight: '700' }}>{title}</Text>
          <Button onPress={logout} compact mode="text">Logout</Button>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.error, textAlign: 'center', marginBottom: spacing.md }}>
            {error}
          </Text>
          <Button mode="contained" onPress={() => load()}>
            Retry
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: '700' }}>{title}</Text>
        <Button onPress={logout} compact mode="text">Logout</Button>
      </View>
      {showSearch && items.length > 0 && (
        <Searchbar
          placeholder="Search..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ fontSize: 14 }}
        />
      )}
      {filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>
            {searchQuery ? '🔍' : '📭'}
          </Text>
          <Text variant="bodyLarge" style={{ color: '#888' }}>
            {searchQuery ? 'No matching records' : 'No records found'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => getKey(item)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          renderItem={({ item, index }) => {
            const r = renderItem(item, index)
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (item[detailKey]) {
                    navigation.navigate('Detail', {
                      item,
                      title: r.title,
                      endpoint,
                    })
                  }
                }}
              >
                <Card style={styles.card} mode="elevated">
                  <Card.Content style={styles.cardContent}>
                    <AvatarCircle name={r.title} color={r.avatarColor} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                        {r.title}
                      </Text>
                      {r.subtitle ? (
                        <Text
                          variant="bodyMedium"
                          style={{ color: '#666', marginTop: 2 }}
                          numberOfLines={2}
                        >
                          {r.subtitle}
                        </Text>
                      ) : null}
                      <View style={styles.chipRow}>
                        {r.chip ? (
                          <Chip
                            mode="flat"
                            compact
                            style={{
                              backgroundColor: r.chipColor || theme.colors.primaryContainer,
                              marginTop: spacing.xs,
                            }}
                            textStyle={{ fontSize: 11, fontWeight: '500' }}
                          >
                            {r.chip}
                          </Chip>
                        ) : null}
                      </View>
                    </View>
                    {r.rightText ? (
                      <Text
                        variant="bodySmall"
                        style={{
                          color: theme.colors.primary,
                          fontWeight: '600',
                          marginLeft: spacing.sm,
                        }}
                      >
                        {r.rightText}
                      </Text>
                    ) : null}
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  searchBar: {
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    elevation: 0,
    backgroundColor: '#fff',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: spacing.sm, borderRadius: radius.md },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  chipRow: { flexDirection: 'row' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
  },
  skeletonTitle: {
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: radius.sm,
    width: '60%',
    marginBottom: 6,
  },
  skeletonSubtitle: {
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: radius.sm,
    width: '80%',
  },
  errorIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
})
