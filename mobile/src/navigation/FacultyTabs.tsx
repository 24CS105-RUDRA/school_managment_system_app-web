import CollapsibleSidebar from '../components/CollapsibleSidebar'
import HomeScreen, { type Feature } from '../screens/HomeScreen'
import ListScreen from '../screens/ListScreen'
import ProfileScreen from '../screens/ProfileScreen'

const items = [
  { name: 'Home', icon: 'home' as const },
  { name: 'Students', icon: 'account-group-outline' as const },
  { name: 'Attendance', icon: 'calendar-check-outline' as const },
  { name: 'Homework', icon: 'book-open-page-variant' as const },
  { name: 'Notices', icon: 'clipboard-text-outline' as const },
  { name: 'Profile', icon: 'account-circle-outline' as const },
]

const features: Feature[] = [
  { label: 'Students', icon: 'account-group-outline', accent: '#A5D8FF' },
  { label: 'Attendance', icon: 'calendar-check-outline', accent: '#AED581' },
  { label: 'Homework', icon: 'book-open-page-variant', accent: '#A3D977' },
  { label: 'Notices', icon: 'clipboard-text-outline', accent: '#F8A5C2' },
]

export default function FacultyTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <CollapsibleSidebar
      items={items}
      onLogout={onLogout}
      renderScreen={(route) => {
        switch (route) {
          case 'Home':
            return <HomeScreen onLogout={onLogout} features={features} />
          case 'Students':
            return (
              <ListScreen
                endpoint="/api/students" title="Students" onLogout={onLogout}
                extractItems={(d) => d as any[]}
                renderItem={(s: any) => ({
                  title: s.student_name,
                  subtitle: `Class ${s.standard || ''}-${s.division || ''} | Roll ${s.roll_number || ''}`,
                  chip: s.phone_number,
                })}
              />
            )
          case 'Attendance':
            return (
              <ListScreen
                endpoint="/api/attendance" title="Attendance" onLogout={onLogout}
                extractItems={(d) => d as any[]}
                renderItem={(a: any) => ({
                  title: `Class ${a.standard || ''}-${a.division || ''}`,
                  subtitle: a.subject,
                  chip: new Date(a.attendance_date).toLocaleDateString(),
                  rightText: `${a.attendance_records?.length || 0} students`,
                })}
              />
            )
          case 'Homework':
            return (
              <ListScreen
                endpoint="/api/homework" title="Homework" onLogout={onLogout}
                extractItems={(d) => d as any[]}
                renderItem={(h: any) => ({
                  title: h.title,
                  subtitle: `${h.subject}${h.description ? ' — ' + h.description.slice(0, 80) : ''}`,
                  chip: h.subject,
                  rightText: h.due_date ? new Date(h.due_date).toLocaleDateString() : undefined,
                })}
              />
            )
          case 'Notices':
            return (
              <ListScreen
                endpoint="/api/notices" title="Notices" onLogout={onLogout}
                extractItems={(d) => d as any[]}
                renderItem={(n: any) => ({
                  title: n.title,
                  subtitle: n.content?.slice(0, 100),
                  chip: n.notice_type,
                  chipColor: n.notice_type === 'exam' ? '#FFE0B2' :
                            n.notice_type === 'event' ? '#D1E4FF' : '#E8F5E9',
                  rightText: n.published_date
                    ? new Date(n.published_date).toLocaleDateString()
                    : new Date(n.created_at).toLocaleDateString(),
                })}
              />
            )
          case 'Profile':
            return <ProfileScreen onLogout={onLogout} />
          default:
            return <HomeScreen onLogout={onLogout} features={features} />
        }
      }}
    />
  )
}
