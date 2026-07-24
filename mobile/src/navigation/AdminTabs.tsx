import { View } from 'react-native'
import CollapsibleSidebar from '../components/CollapsibleSidebar'
import HomeScreen, { type Feature } from '../screens/HomeScreen'
import ListScreen from '../screens/ListScreen'
import ProfileScreen from '../screens/ProfileScreen'
import FacultyAttendanceScreen from '../screens/FacultyAttendanceScreen'
import { useNavigation } from '@react-navigation/native'

const items = [
  { name: 'Home', icon: 'home' as const },
  { name: 'Students', icon: 'account-group-outline' as const },
  { name: 'Faculty', icon: 'badge-account-outline' as const },
  { name: 'Attendance', icon: 'calendar-check-outline' as const },
  { name: 'Homework', icon: 'book-open-page-variant' as const },
  { name: 'Notices', icon: 'clipboard-text-outline' as const },
  { name: 'Fee', icon: 'currency-inr' as const },
  { name: 'Materials', icon: 'book-open-outline' as const },
  { name: 'Gallery', icon: 'image-multiple-outline' as const },
  { name: 'Profile', icon: 'account-circle-outline' as const },
]

const features: Feature[] = [
  { label: 'Students', icon: 'account-group-outline', accent: '#A5D8FF' },
  { label: 'Faculty', icon: 'badge-account-outline', accent: '#D6B4FC' },
  { label: 'Attendance', icon: 'calendar-check-outline', accent: '#AED581' },
  { label: 'Homework', icon: 'book-open-page-variant', accent: '#A3D977' },
  { label: 'Notices', icon: 'clipboard-text-outline', accent: '#F8A5C2' },
  { label: 'Fee', icon: 'currency-inr', accent: '#FFB86C' },
  { label: 'Materials', icon: 'book-open-outline', accent: '#9FE2D9' },
  { label: 'Gallery', icon: 'image-multiple-outline', accent: '#F48FB1' },
]

export default function AdminTabs({ onLogout }: { onLogout: () => void }) {
  const navigation = useNavigation<any>()

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
                canAdd canEdit canDelete
                onAddPress={() => navigation.navigate('CreateStudent')}
                extractItems={(d) => d as any[]}
                renderItem={(s: any) => ({
                  title: s.student_name,
                  subtitle: `Class ${s.standard || ''}-${s.division || ''} | Roll ${s.roll_number || ''}`,
                  chip: s.phone_number,
                })}
              />
            )
          case 'Faculty':
            return (
              <ListScreen
                endpoint="/api/faculty" title="Faculty" onLogout={onLogout}
                canAdd canDelete
                onAddPress={() => navigation.navigate('CreateFaculty')}
                extractItems={(d) => d as any[]}
                renderItem={(f: any) => ({
                  title: f.faculty_name,
                  subtitle: `${f.department || ''}${f.subject ? ' — ' + f.subject : ''}`,
                  chip: f.phone_number,
                })}
              />
            )
          case 'Attendance':
            return (
              <View style={{ flex: 1 }}>
                <FacultyAttendanceScreen navigation={navigation} />
              </View>
            )
          case 'Homework':
            return (
              <ListScreen
                endpoint="/api/homework" title="Homework" onLogout={onLogout}
                canAdd
                onAddPress={() => navigation.navigate('CreateHomework')}
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
                canAdd canEdit canDelete
                onAddPress={() => navigation.navigate('CreateNotice')}
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
          case 'Fee':
            return (
              <ListScreen
                endpoint="/api/fees" title="Fee Records" onLogout={onLogout}
                canAdd
                onAddPress={() => navigation.navigate('CreateFee')}
                extractItems={(d) => d as any[]}
                renderItem={(f: any) => ({
                  title: f.student_name || f.student_id?.slice(0, 8) || 'Unknown',
                  subtitle: `₹${f.amount} | ${f.fee_type}`,
                  chip: f.status,
                  chipColor: f.status === 'paid' ? '#C8E6C9' :
                            f.status === 'partial' ? '#FFE0B2' : '#FFCDD2',
                  rightText: f.due_date ? new Date(f.due_date).toLocaleDateString() : undefined,
                })}
                onItemPress={(fee: any) => navigation.navigate('FeePay', { fee })}
              />
            )
          case 'Materials':
            return (
              <ListScreen
                endpoint="/api/study-materials" title="Study Materials" onLogout={onLogout}
                canAdd
                onAddPress={() => navigation.navigate('CreateMaterial')}
                extractItems={(d) => d as any[]}
                renderItem={(m: any) => ({
                  title: m.title,
                  subtitle: `Subject: ${m.subject} | Class ${m.standard}`,
                  chip: m.file_type?.split('/').pop() || 'file',
                })}
              />
            )
          case 'Gallery':
            return (
              <ListScreen
                endpoint="/api/gallery" title="Gallery" onLogout={onLogout}
                canAdd
                onAddPress={() => navigation.navigate('CreateGallery')}
                extractItems={(d) => d as any[]}
                renderItem={(g: any) => ({
                  title: g.event_name,
                  subtitle: g.description?.slice(0, 100),
                  chip: g.event_date ? new Date(g.event_date).toLocaleDateString() : undefined,
                  avatarColor: '#E65100',
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
