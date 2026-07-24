import React, { createContext, useContext, useRef, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Animated, PanResponder, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'

const SWIPE_THRESHOLD = 50
const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.75

interface SidebarItem {
  name: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
}

interface SidebarContextType {
  openSidebar: () => void
  navigate: (name: string) => void
}

const SidebarContext = createContext<SidebarContextType>({
  openSidebar: () => {},
  navigate: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

interface Props {
  items: SidebarItem[]
  onLogout: () => void
  renderScreen: (activeRoute: string) => React.ReactNode
}

export default function CollapsibleSidebar({ items, onLogout, renderScreen }: Props) {
  const [activeRoute, setActiveRoute] = useState(items[0]?.name || '')
  const [isOpen, setIsOpen] = useState(false)
  const isOpenRef = useRef(false)
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const animateTo = useCallback((visible: boolean) => {
    isOpenRef.current = visible
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: visible ? 0 : -SIDEBAR_WIDTH,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }),
      Animated.timing(overlayOpacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
    setIsOpen(visible)
  }, [translateX, overlayOpacity])

  const openSidebar = useCallback(() => animateTo(true), [animateTo])
  const closeSidebar = useCallback(() => animateTo(false), [animateTo])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        const open = isOpenRef.current
        return !open ? g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy)
                     : g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy)
      },
      onPanResponderMove: (_, g) => {
        const open = isOpenRef.current
        const pos = open ? Math.max(-SIDEBAR_WIDTH, g.dx) : Math.min(0, g.dx - SIDEBAR_WIDTH)
        translateX.setValue(pos)
        overlayOpacity.setValue(Math.min(1, Math.max(0, (pos + SIDEBAR_WIDTH) / SIDEBAR_WIDTH)))
      },
      onPanResponderRelease: (_, g) => {
        const open = isOpenRef.current
        if (!open && g.dx > SWIPE_THRESHOLD) animateTo(true)
        else if (open && g.dx < -SWIPE_THRESHOLD) animateTo(false)
        else animateTo(open)
      },
    })
  ).current

  const handleNavPress = (name: string) => {
    setActiveRoute(name)
    animateTo(false)
  }

  return (
      <SidebarContext.Provider value={{ openSidebar, navigate: handleNavPress }}>
      <View style={styles.container} {...panResponder.panHandlers}>
        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <Pressable style={{ flex: 1 }} onPress={closeSidebar} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sidebar,
            { backgroundColor: theme.colors.surface, transform: [{ translateX }] },
          ]}
        >
          <View style={[styles.sidebarHeader, { backgroundColor: theme.colors.primary, paddingTop: insets.top + 20 }]}>
            <Text style={styles.sidebarTitle}>School Management</Text>
            <Text style={styles.sidebarSubtitle}>Navigation</Text>
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const isActive = activeRoute === item.name
              return (
                <Pressable
                  key={item.name}
                  onPress={() => handleNavPress(item.name)}
                  style={[
                    styles.navItem,
                    isActive && { backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color={isActive ? theme.colors.primary : '#fff'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.navLabel,
                      {
                        color: isActive ? theme.colors.primary : theme.colors.onSurface,
                        fontWeight: isActive ? '700' : '400',
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {isActive && <View style={[styles.activeDot, { backgroundColor: theme.colors.primary }]} />}
                </Pressable>
              )
            })}
          </ScrollView>
          <Pressable onPress={onLogout} style={[styles.logoutItem, { paddingBottom: insets.bottom + 16 }]}>
            <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} />
            <Text style={[styles.logoutLabel, { color: theme.colors.error }]}>Logout</Text>
          </Pressable>
        </Animated.View>

        <View style={{ flex: 1 }}>
          <View style={[styles.topBar, { backgroundColor: theme.colors.primary, paddingTop: insets.top + 12 }]}>
            {activeRoute === 'Home' ? (
              <Pressable onPress={openSidebar} style={styles.topBarBtn}>
                <MaterialCommunityIcons name="menu" size={24} color="#fff" />
              </Pressable>
            ) : (
              <Pressable onPress={() => handleNavPress('Home')} style={styles.topBarBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
              </Pressable>
            )}
            <Text style={styles.topBarTitle}>{activeRoute}</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={{ flex: 1 }}>
            {renderScreen(activeRoute)}
          </View>
        </View>
      </View>
    </SidebarContext.Provider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10,
  },
  sidebar: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: SIDEBAR_WIDTH, zIndex: 11,
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  sidebarHeader: {
    paddingBottom: 24, paddingHorizontal: 20,
  },
  sidebarTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sidebarSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20, position: 'relative',
  },
  navIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  navIconWrapActive: { backgroundColor: '#fff' },
  navLabel: { fontSize: 15, marginLeft: 14, flex: 1 },
  activeDot: {
    width: 6, height: 6, borderRadius: 3,
    position: 'absolute', right: 16,
  },
  logoutItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: '#E0E0E0',
  },
  logoutLabel: { fontSize: 15, marginLeft: 14 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 12, paddingHorizontal: 8,
  },
  topBarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: {
    flex: 1, color: '#fff', fontSize: 18, fontWeight: '600',
    textAlign: 'center',
  },
})
