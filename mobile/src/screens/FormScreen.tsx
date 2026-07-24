import { useState } from 'react'
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native'
import { Card, Text, Button, TextInput, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

export interface FormField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'date' | 'textarea'
  required?: boolean
  options?: { label: string; value: string }[]
  placeholder?: string
}

interface FormScreenProps {
  route: any
  navigation: any
}

export default function FormScreen({ route, navigation }: FormScreenProps) {
  const {
    fields: rawFields,
    endpoint,
    title,
    editItem,
    method = 'POST',
  } = route.params as {
    fields: FormField[]
    endpoint: string
    title: string
    editItem?: Record<string, any>
    method?: 'POST' | 'PUT'
  }

  const fields: FormField[] = rawFields
  const isEdit = !!editItem
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (editItem) {
      const initial: Record<string, string> = {}
      for (const f of fields) {
        const val = editItem[f.key]
        initial[f.key] = val !== null && val !== undefined ? String(val) : ''
      }
      return initial
    }
    const initial: Record<string, string> = {}
    for (const f of fields) initial[f.key] = ''
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      if (f.required && !form[f.key]?.trim()) {
        errs[f.key] = `${f.label} is required`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    const body: Record<string, any> = {}
    for (const f of fields) {
      const val = form[f.key]
      if (f.type === 'number') {
        body[f.key] = val ? Number(val) : undefined
      } else if (f.type === 'date' && val) {
        body[f.key] = val
      } else {
        body[f.key] = val || undefined
      }
    }
    const url = isEdit ? `${endpoint}/${editItem.id}` : endpoint
    const res = isEdit ? await api.put(url, body) : await api.post(url, body)
    setSubmitting(false)
    if (!res.success) {
      setErrors({ _form: res.error || 'Submission failed' })
      return
    }
    navigation.goBack()
  }

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>
          Back
        </Button>
        <Text
          variant="titleMedium"
          style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }}
          numberOfLines={1}
        >
          {isEdit ? `Edit ${title}` : `New ${title}`}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {errors._form ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer, marginBottom: spacing.md }]}>
            <Card.Content>
              <Text style={{ color: theme.colors.error }}>{errors._form}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {fields.map((f) => (
          <View key={f.key} style={{ marginBottom: spacing.md }}>
            {f.type === 'select' ? (
              <>
                <Text
                  variant="bodySmall"
                  style={{ color: '#666', marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  {f.label}{f.required ? ' *' : ''}
                </Text>
                <View style={styles.optionsRow}>
                  {(f.options || []).map((opt) => {
                    const selected = form[f.key] === opt.value
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setField(f.key, selected ? '' : opt.value)}
                        style={[
                          styles.optionChip,
                          selected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            selected && { color: '#fff' },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
                {errors[f.key] ? (
                  <Text style={{ color: theme.colors.error, fontSize: 12, marginTop: 2 }}>{errors[f.key]}</Text>
                ) : null}
              </>
            ) : (
              <TextInput
                mode="outlined"
                label={`${f.label}${f.required ? ' *' : ''}`}
                value={form[f.key]}
                onChangeText={(v) => setField(f.key, v)}
                keyboardType={f.type === 'number' ? 'numeric' : 'default'}
                multiline={f.type === 'textarea'}
                numberOfLines={f.type === 'textarea' ? 3 : 1}
                placeholder={f.placeholder}
                error={!!errors[f.key]}
                style={styles.input}
                outlineStyle={{ borderRadius: radius.md }}
              />
            )}
          </View>
        ))}

        <Button
          mode="contained"
          onPress={submit}
          loading={submitting}
          disabled={submitting}
          style={{ marginTop: spacing.md, borderRadius: radius.md }}
          contentStyle={{ paddingVertical: 6 }}
        >
          {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
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
    paddingBottom: spacing.sm,
  },
  card: { borderRadius: radius.md },
  input: { backgroundColor: '#fff', fontSize: 14 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  optionChipText: { fontSize: 13, fontWeight: '600', color: '#333' },
})
