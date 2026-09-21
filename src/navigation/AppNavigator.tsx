import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

import LoginScreen          from '../screens/LoginScreen';
import DashboardScreen      from '../screens/DashboardScreen';
import SubmittedSongsScreen from '../screens/SubmittedSongsScreen';
import ScheduleScreen       from '../screens/ScheduleScreen';
import MembersScreen        from '../screens/MembersScreen';
import ProgramsScreen       from '../screens/ProgramsScreen';
import PraiseNightScreen    from '../screens/PraiseNightScreen';
import MoreScreen           from '../screens/MoreScreen';
import NotificationsScreen  from '../screens/NotificationsScreen';
import CategoriesScreen     from '../screens/CategoriesScreen';
import MasterLibraryScreen  from '../screens/MasterLibraryScreen';
import AttendanceScreen     from '../screens/AttendanceScreen';
import ChurchesScreen       from '../screens/ChurchesScreen';
import SongDetailScreen     from '../screens/SongDetailScreen';
import AnalyticsScreen      from '../screens/AnalyticsScreen';
import CalendarScreen       from '../screens/CalendarScreen';
import MediaLibraryScreen   from '../screens/MediaLibraryScreen';
import SupportChatScreen    from '../screens/SupportChatScreen';
import ProgramSongsScreen  from '../screens/ProgramSongsScreen';
import GeofenceScreen      from '../screens/GeofenceScreen';
import ModePickerScreen from '../screens/ModePickerScreen';
import { withErrorBoundary } from '../components/ScreenErrorBoundary';

// Safe wrapped variants for all full-page screens
const SafeLoginScreen          = withErrorBoundary(LoginScreen,          'LoginScreen');
const SafeModePickerScreen     = withErrorBoundary(ModePickerScreen,     'ModePickerScreen');
const SafeDashboardScreen      = withErrorBoundary(DashboardScreen,      'DashboardScreen');
const SafeAttendanceScreen     = withErrorBoundary(AttendanceScreen,     'AttendanceScreen');
const SafeProgramsScreen       = withErrorBoundary(ProgramsScreen,       'ProgramsScreen');
const SafeMembersScreen        = withErrorBoundary(MembersScreen,        'MembersScreen');
const SafeMoreScreen           = withErrorBoundary(MoreScreen,           'MoreScreen');
const SafeSubmittedSongsScreen = withErrorBoundary(SubmittedSongsScreen, 'SubmittedSongsScreen');
const SafeScheduleScreen       = withErrorBoundary(ScheduleScreen,       'ScheduleScreen');
const SafeChurchesScreen       = withErrorBoundary(ChurchesScreen,       'ChurchesScreen');
const SafeSongDetailScreen     = withErrorBoundary(SongDetailScreen,     'SongDetailScreen');
const SafeProgramSongsScreen   = withErrorBoundary(ProgramSongsScreen,   'ProgramSongsScreen');
const SafeAnalyticsScreen      = withErrorBoundary(AnalyticsScreen,      'AnalyticsScreen');
const SafeCalendarScreen       = withErrorBoundary(CalendarScreen,       'CalendarScreen');
const SafeMediaLibraryScreen   = withErrorBoundary(MediaLibraryScreen,   'MediaLibraryScreen');
const SafeSupportChatScreen    = withErrorBoundary(SupportChatScreen,    'SupportChatScreen');
const SafeMasterLibraryScreen  = withErrorBoundary(MasterLibraryScreen,  'MasterLibraryScreen');
const SafeNotificationsScreen  = withErrorBoundary(NotificationsScreen,  'NotificationsScreen');
const SafeCategoriesScreen     = withErrorBoundary(CategoriesScreen,     'CategoriesScreen');
const SafeGeofenceScreen       = withErrorBoundary(GeofenceScreen,       'GeofenceScreen');
const SafePraiseNightScreen    = withErrorBoundary(PraiseNightScreen,    'PraiseNightScreen');

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.tabBorder,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={SafeDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AttendanceTab"
        component={SafeAttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar-number' : 'calendar-number-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Programs"
        component={SafeProgramsScreen}
        options={{
          tabBarLabel: 'Programs',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'musical-notes' : 'musical-notes-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Members"
        component={SafeMembersScreen}
        options={{
          tabBarLabel: 'Members',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={SafeMoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'} size={size || 22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ initialRoute = 'Login' }: { initialRoute?: string }) {
  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={SafeLoginScreen} />
      <Stack.Screen name="ModePicker" component={SafeModePickerScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />

      <Stack.Screen name="Programs" component={SafeProgramsScreen} />
      <Stack.Screen name="Program" component={SafeProgramsScreen} />
      <Stack.Screen name="PraiseNight" component={SafePraiseNightScreen} />
      <Stack.Screen name="SubmittedSongs" component={SafeSubmittedSongsScreen} />
      <Stack.Screen name="Songs" component={SafeSubmittedSongsScreen} />
      <Stack.Screen name="Schedule" component={SafeScheduleScreen} />
      <Stack.Screen name="Attendance" component={SafeAttendanceScreen} />
      <Stack.Screen name="Churches" component={SafeChurchesScreen} />
      <Stack.Screen name="SongDetail" component={SafeSongDetailScreen} />
      <Stack.Screen name="ProgramSongs" component={SafeProgramSongsScreen} />
      <Stack.Screen name="Analytics" component={SafeAnalyticsScreen} />
      <Stack.Screen name="Calendar" component={SafeCalendarScreen} />
      <Stack.Screen name="MediaLibrary" component={SafeMediaLibraryScreen} />
      <Stack.Screen name="Media" component={SafeMediaLibraryScreen} />
      <Stack.Screen name="SupportChat" component={SafeSupportChatScreen} />
      <Stack.Screen name="MasterLibrary" component={SafeMasterLibraryScreen} />
      <Stack.Screen name="Notifications" component={SafeNotificationsScreen} />
      <Stack.Screen name="Categories" component={SafeCategoriesScreen} />
      <Stack.Screen name="Geofence" component={SafeGeofenceScreen} />
    </Stack.Navigator>
  );
}
