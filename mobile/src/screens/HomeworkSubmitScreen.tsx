import { useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Card, Text, Button, TextInput, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokenStore } from '../lib/storage'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

export default function HomeworkSubmitScreen({ route, navigation }: any) {
  const { homework } = route.params
  const [content, setContent] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const submit = async () => {
    if (!content.trim() && !fileUrl.trim()) {
      setError('Add content or a file URL')
      return
    }
    setSubmitting(true)
    setError('')
    const user = await tokenStore.getUser()
    if (!user) { setError('Not logged in'); setSubmitting(false); return }
    const res = await api.post('/api/homework/submit', {
      homework_id: homework.id,
      student_id: user.id,
      content: content || undefined,
      file_url: fileUrl || undefined,
    })
    setSubmitting(false)
    if (!res.success) { setError(res.error || 'Submission failed'); return }
    navigation.goBack()
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>Back</Button>
        <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }}>Submit Homework</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>{homework.title}</Text>
            <Text variant="bodyMedium" style={{ color: '#666', marginTop: 4 }}>{homework.subject}</Text>
            {homework.description ? <Text variant="bodyMedium" style={{ marginTop: 8 }}>{homework.description}</Text> : null}
            <Text variant="bodySmall" style={{ color: '#888', marginTop: 8 }}>Due: {homework.due_date ? new Date(homework.due_date).toLocaleDateString() : 'N/A'}</Text>
          </Card.Content>
        </Card>

        {error ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer, marginTop: spacing.md }]}>
            <Card.Content><Text style={{ color: theme.colors.error }}>{error}</Text></Card.Content>
          </Card>
        ) : null}

        <TextInput
          mode="outlined"
          label="Your Answer / Content"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
          style={[styles.input, { marginTop: spacing.lg }]}
          outlineStyle={{ borderRadius: radius.md }}
        />
        <TextInput
          mode="outlined"
          label="File URL (optional)"
          value={fileUrl}
          onChangeText={setFileUrl}
          placeholder="Link to uploaded file"
          style={[styles.input, { marginTop: spacing.md }]}
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
          {submitting ? 'Submitting...' : 'Submit Homework'}
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
})
