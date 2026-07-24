import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Card, Text, Button, Chip, ActivityIndicator, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokenStore } from '../lib/storage'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

export default function StudentFeesScreen({ navigation }: any) {
  const [fees, setFees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    ;(async () => {
      const user = await tokenStore.getUser()
      if (!user) { setError('Not logged in'); setLoading(false); return }
      const res = await api.get<any[]>(`/api/fees/student/${user.id}`)
      setLoading(false)
      if (!res.success) { setError(res.error || 'Failed to load'); return }
      setFees(res.data || [])
    })()
  }, [])

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>Back</Button>
        <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }}>My Fees</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error, marginBottom: spacing.md }}>{error}</Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>Back</Button>
        </View>
      ) : fees.length === 0 ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" style={{ color: '#888' }}>No fee records found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <Text style={styles.total}>
            Total Due: ₹{fees.reduce((s, f) => s + (f.amount - (f.paid_amount || 0)), 0)}
          </Text>
          {fees.map((f) => {
            const remaining = f.amount - (f.paid_amount || 0)
            return (
              <Card key={f.id} style={styles.card} mode="elevated">
                <Card.Content>
                  <View style={styles.row}>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }}>{f.fee_type}</Text>
                    <Chip
                      mode="flat" compact
                      style={{
                        backgroundColor: f.status === 'paid' ? '#C8E6C9' : f.status === 'partial' ? '#FFE0B2' : '#FFCDD2',
                      }}
                      textStyle={{ fontSize: 11, fontWeight: '600' }}
                    >
                      {f.status || 'pending'}
                    </Chip>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>₹{f.amount}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Paid</Text>
                    <Text style={styles.detailValue}>₹{f.paid_amount || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Remaining</Text>
                    <Text style={[styles.detailValue, { color: remaining > 0 ? '#C62828' : '#2E7D32', fontWeight: '700' }]}>₹{remaining}</Text>
                  </View>
                  {f.due_date ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Due Date</Text>
                      <Text style={styles.detailValue}>{new Date(f.due_date).toLocaleDateString()}</Text>
                    </View>
                  ) : null}
                </Card.Content>
              </Card>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: spacing.sm, borderRadius: radius.md },
  total: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: spacing.md, color: '#333' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { color: '#888', fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500' },
})
