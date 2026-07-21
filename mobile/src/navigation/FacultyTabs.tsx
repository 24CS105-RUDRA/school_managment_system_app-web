import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { useTheme } from 'react-native-paper'
import ListScreen from '../screens/ListScreen'
import HomeScreen from '../screens/HomeScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Tab = createBottomTabNavigator()

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠', Students: '👨‍🎓', Attendance: '✅',
    Homework: '📝', Notices: '📢', Profile: '👤',
  }
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>
      {icons[label] || '📋'}
    </Text>
  )
}

export default function FacultyTabs({ onLogout }: { onLogout: () => void }) {
  const theme = useTheme()
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { paddingBottom: 4, height: 56 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home">
        {() => <HomeScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Students">
        {() => (
          <ListScreen
            endpoint="/api/students" title="Students" onLogout={onLogout}
            extractItems={(d) => d as any[]}
            renderItem={(s: any) => ({
              title: s.student_name,
              subtitle: `Class ${s.standard || ''}-${s.division || ''} | Roll ${s.roll_number || ''}`,
              chip: s.phone_number,
            })}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Attendance">
        {() => (
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
        )}
      </Tab.Screen>
      <Tab.Screen name="Homework">
        {() => (
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
        )}
      </Tab.Screen>
      <Tab.Screen name="Notices">
        {() => (
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
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => <ProfileScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}
