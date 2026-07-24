import FormScreen, { type FormField } from './FormScreen'

const FEE_TYPES = [
  { label: 'Tuition', value: 'Tuition' },
  { label: 'Transport', value: 'Transport' },
  { label: 'Library', value: 'Library' },
  { label: 'Labs', value: 'Labs' },
  { label: 'Sports', value: 'Sports' },
  { label: 'Exam', value: 'Exam' },
  { label: 'Other', value: 'Other' },
]

const fields: FormField[] = [
  { key: 'student_id', label: 'Student ID', type: 'text', required: true },
  { key: 'fee_type', label: 'Fee Type', type: 'select', required: true, options: FEE_TYPES },
  { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
  { key: 'due_date', label: 'Due Date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
  { key: 'paid_amount', label: 'Paid Amount (₹)', type: 'number' },
  { key: 'payment_method', label: 'Payment Method', type: 'text' },
]

export default function CreateFeeScreen(props: any) {
  return (
    <FormScreen
      {...props}
      route={{
        ...props.route,
        params: {
          fields,
          endpoint: '/api/fees',
          title: 'Fee',
          ...props.route.params,
        },
      }}
    />
  )
}
