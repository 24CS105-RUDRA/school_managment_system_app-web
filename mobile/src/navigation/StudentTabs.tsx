import CollapsibleSidebar from '../components/CollapsibleSidebar'
import HomeScreen, { type Feature } from '../screens/HomeScreen'
import ListScreen from '../screens/ListScreen'
import ProfileScreen from '../screens/ProfileScreen'

const items = [
  { name: 'Home', icon: 'home' as const },
  { name: 'Notices', icon: 'clipboard-text-outline' as const },
  { name: 'Homework', icon: 'book-open-page-variant' as const },
  { name: 'Timetable', icon: 'calendar-month-outline' as const },
  { name: 'Materials', icon: 'book-open-outline' as const },
  { name: 'Profile', icon: 'account-circle-outline' as const },
]

const features: Feature[] = [
  { label: 'Notices', icon: 'clipboard-text-outline', accent: '#F8A5C2' },
  { label: 'Homework', icon: 'book-open-page-variant', accent: '#A3D977' },
  { label: 'Timetable', icon: 'calendar-month-outline', accent: '#A5D8FF' },
  { label: 'Materials', icon: 'book-open-outline', accent: '#9FE2D9' },
]

export default function StudentTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <CollapsibleSidebar
      items={items}
      onLogout={onLogout}
      renderScreen={(route) => {
        switch (route) {
          case 'Home':
            return <HomeScreen onLogout={onLogout} features={features} />
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
          case 'Timetable':
            return (
              <ListScreen
                endpoint="/api/timetable" title="Timetable" onLogout={onLogout}
                extractItems={(d) => d as any[]}
                renderItem={(t: any) => ({
                  title: t.subject,
                  subtitle: `${t.day_of_week} | ${t.start_time} - ${t.end_time}`,
                  chip: t.teacher_name || t.room,
                })}
              />
            )
          case 'Materials':
            return (
              <ListScreen
                endpoint="/api/study-materials" title="Study Materials" onLogout={onLogout}
                extractItems={(d) => d as any[]}
                renderItem={(m: any) => ({
                  title: m.title,
                  subtitle: `Subject: ${m.subject} | Class ${m.standard}`,
                  chip: m.file_type?.split('/').pop() || 'file',
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
