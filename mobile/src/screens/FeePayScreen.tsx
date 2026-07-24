import { useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Card, Text, Button, TextInput, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

export default function FeePayScreen({ route, navigation }: any) {
  const { fee } = route.params
  const [amount, setAmount] = useState(String(fee.amount - (fee.paid_amount || 0)))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const remaining = fee.amount - (fee.paid_amount || 0)

  const submit = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) { setError('Enter a valid amount'); return }
    if (val > remaining) { setError(`Amount exceeds remaining ₹${remaining}`); return }
    setSubmitting(true)
    setError('')
    const res = await api.post(`/api/fees/${fee.id}/pay`, { amount: val })
    setSubmitting(false)
    if (!res.success) { setError(res.error || 'Payment failed'); return }
    navigation.goBack()
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>Back</Button>
        <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }}>Record Payment</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.row}><Text style={styles.label}>Fee Type</Text><Text style={styles.value}>{fee.fee_type}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Total Amount</Text><Text style={styles.value}>₹{fee.amount}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Paid So Far</Text><Text style={styles.value}>₹{fee.paid_amount || 0}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Remaining</Text><Text style={[styles.value, { color: remaining > 0 ? '#C62828' : '#2E7D32', fontWeight: '700' }]}>₹{remaining}</Text></View>
          </Card.Content>
        </Card>

        {error ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer, marginTop: spacing.md }]}>
            <Card.Content><Text style={{ color: theme.colors.error }}>{error}</Text></Card.Content>
          </Card>
        ) : null}

        <TextInput
          mode="outlined"
          label="Payment Amount (₹)"
          value={amount}
          onChangeText={(v) => { setAmount(v); setError('') }}
          keyboardType="numeric"
          style={[styles.input, { marginTop: spacing.lg }]}
          outlineStyle={{ borderRadius: radius.md }}
        />

        <Button
          mode="contained"
          onPress={submit}
          loading={submitting}
          disabled={submitting}
          style={{ marginTop: spacing.lg, borderRadius: radius.md }}
          contentStyle={{ paddingVertical: 6 }}
        >
          {submitting ? 'Processing...' : 'Record Payment'}
        </Button>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  card: { borderRadius: radius.md },
  input: { backgroundColor: '#fff', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  label: { color: '#888', fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500' },
})
