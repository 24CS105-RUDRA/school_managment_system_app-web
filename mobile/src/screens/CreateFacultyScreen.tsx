import FormScreen, { type FormField } from './FormScreen'

const fields: FormField[] = [
  { key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { key: 'phone_number', label: 'Phone Number', type: 'text', required: true, placeholder: '10-digit mobile number' },
  { key: 'employee_id', label: 'Employee ID', type: 'text' },
  { key: 'department', label: 'Department', type: 'text' },
  { key: 'subject', label: 'Subject', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'assigned_standard', label: 'Assigned Standard', type: 'text' },
  { key: 'assigned_division', label: 'Assigned Division', type: 'text' },
]

export default function CreateFacultyScreen(props: any) {
  return (
    <FormScreen
      {...props}
      route={{
        ...props.route,
        params: {
          fields,
          endpoint: '/api/faculty',
          title: 'Faculty',
          ...props.route.params,
        },
      }}
    />
  )
}
