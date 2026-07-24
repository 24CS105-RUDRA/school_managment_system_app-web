import FormScreen, { type FormField } from './FormScreen'

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const DIVISIONS = ['A','B','C','D','E']
const SUBJECTS = ['Maths','Science','English','Hindi','Sanskrit','Social Studies','Computer','Physics','Chemistry','Biology']

const fields: FormField[] = [
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'subject', label: 'Subject', type: 'select', required: true, options: SUBJECTS.map(s => ({ label: s, value: s })) },
  { key: 'standard', label: 'Standard', type: 'select', required: true, options: STANDARDS.map(s => ({ label: s, value: s })) },
  { key: 'division', label: 'Division', type: 'select', options: DIVISIONS.map(d => ({ label: d, value: d })) },
  { key: 'due_date', label: 'Due Date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Details about the homework' },
]

export default function CreateHomeworkScreen(props: any) {
  return (
    <FormScreen
      {...props}
      route={{
        ...props.route,
        params: {
          fields,
          endpoint: '/api/homework',
          title: 'Homework',
          ...props.route.params,
        },
      }}
    />
  )
}
