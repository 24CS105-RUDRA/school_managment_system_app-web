import FormScreen, { type FormField } from './FormScreen'

const NOTICE_TYPES = [
  { label: 'General', value: 'general' },
  { label: 'Exam', value: 'exam' },
  { label: 'Event', value: 'event' },
  { label: 'Urgent', value: 'urgent' },
]
const PRIORITIES = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const fields: FormField[] = [
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'content', label: 'Content', type: 'textarea', required: true },
  { key: 'notice_type', label: 'Notice Type', type: 'select', options: NOTICE_TYPES },
  { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
]

export default function CreateNoticeScreen(props: any) {
  return (
    <FormScreen
      {...props}
      route={{
        ...props.route,
        params: {
          fields,
          endpoint: '/api/notices',
          title: 'Notice',
          ...props.route.params,
        },
      }}
    />
  )
}
