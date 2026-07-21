import { View, ScrollView, StyleSheet } from 'react-native'
import { Card, Text, Button, Chip, useTheme } from 'react-native-paper'
import { spacing, radius } from '../lib/theme'

const HIDDEN_KEYS = new Set(['id', '_id', '__v', 'user_id', 'faculty_id', 'student_id', 'marked_by'])
const SKIP_EMPTY = new Set(['created_at', 'updated_at'])

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(key: string, value: any): string {
  if (key === 'amount' || key === 'paid_amount') return `₹${Number(value).toLocaleString()}`
  if (key.includes('date') && value) return new Date(value).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function getValueColor(key: string, value: any): string | undefined {
  if (value === 'paid') return '#2E7D32'
  if (value === 'pending' || value === 'overdue') return '#C62828'
  if (value === 'partial') return '#E65100'
  if (value === 'present') return '#2E7D32'
  if (value === 'absent') return '#C62828'
  if (key === 'status' || key === 'notice_type') return undefined
  return undefined
}

export default function DetailScreen({ route, navigation }: any) {
  const { item, title } = route.params
  const theme = useTheme()

  const fields = Object.entries(item).filter(
    ([k, v]) =>
      !HIDDEN_KEYS.has(k) &&
      v !== null &&
      v !== '' &&
      (typeof v !== 'object' || v === null)
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>
          Back
        </Button>
        <Text
          variant="titleMedium"
          style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {fields.map(([key, value]) => (
              <View key={key} style={styles.fieldRow}>
                <Text
                  variant="bodySmall"
                  style={{ color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  {formatLabel(key)}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    fontWeight: '500',
                    marginTop: 2,
                    color: getValueColor(key, value) || '#1a1a1a',
                  }}
                >
                  {formatValue(key, value)}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
        {item.attendance_records && Array.isArray(item.attendance_records) && (
          <Card style={[styles.card, { marginTop: spacing.md }]} mode="elevated">
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                Attendance Records ({item.attendance_records.length})
              </Text>
              {item.attendance_records.map((rec: any, i: number) => (
                <View key={i} style={styles.attendanceRow}>
                  <Text variant="bodyMedium" style={{ flex: 1 }}>
                    {rec.student_id?.slice(0, 8) || `Student ${i + 1}`}
                  </Text>
                  <Chip
                    mode="flat"
                    compact
                    style={{
                      backgroundColor: rec.status === 'present' ? '#C8E6C9' : '#FFCDD2',
                    }}
                    textStyle={{ fontSize: 11, fontWeight: '600' }}
                  >
                    {rec.status}
                  </Chip>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  card: { marginHorizontal: spacing.md, borderRadius: radius.md },
  fieldRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
})
