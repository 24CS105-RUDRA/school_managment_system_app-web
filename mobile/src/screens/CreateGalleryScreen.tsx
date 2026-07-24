import FormScreen, { type FormField } from './FormScreen'

const fields: FormField[] = [
  { key: 'title', label: 'Event Title', type: 'text', required: true },
  { key: 'event_date', label: 'Event Date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'cover_image_url', label: 'Cover Image URL', type: 'text', placeholder: 'URL for cover image' },
]

export default function CreateGalleryScreen(props: any) {
  return (
    <FormScreen
      {...props}
      route={{
        ...props.route,
        params: {
          fields,
          endpoint: '/api/gallery/events',
          title: 'Gallery Event',
          ...props.route.params,
        },
      }}
    />
  )
}
