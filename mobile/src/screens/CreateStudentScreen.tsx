import FormScreen, { type FormField } from './FormScreen'

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const DIVISIONS = ['A','B','C','D','E']

const fields: FormField[] = [
  { key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { key: 'phone_number', label: 'Phone Number', type: 'text', required: true, placeholder: '10-digit mobile number' },
  { key: 'standard', label: 'Standard', type: 'select', required: true, options: STANDARDS.map(s => ({ label: s, value: s })) },
  { key: 'division', label: 'Division', type: 'select', options: DIVISIONS.map(d => ({ label: d, value: d })) },
  { key: 'roll_number', label: 'Roll Number', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'father_mobile', label: "Father's Mobile", type: 'text' },
  { key: 'mother_mobile', label: "Mother's Mobile", type: 'text' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date', placeholder: 'YYYY-MM-DD' },
]

export default function CreateStudentScreen(props: any) {
  return (
    <FormScreen
      {...props}
      route={{
        ...props.route,
        params: {
          fields,
          endpoint: '/api/students',
          title: 'Student',
          ...props.route.params,
        },
      }}
    />
  )
}
