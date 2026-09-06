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
import PraiseNightScreen    from '../screens/PraiseNightScreen';
import MoreScreen           from '../screens/MoreScreen';
import NotificationsScreen  from '../screens/NotificationsScreen';
import CategoriesScreen     from '../screens/CategoriesScreen';
import MasterLibraryScreen  from '../screens/MasterLibraryScreen';
import ActivityLogsScreen   from '../screens/ActivityLogsScreen';
import AttendanceScreen     from '../screens/AttendanceScreen';
import ChurchesScreen       from '../screens/ChurchesScreen';
import SongDetailScreen     from '../screens/SongDetailScreen';
import AnalyticsScreen      from '../screens/AnalyticsScreen';
import CalendarScreen       from '../screens/CalendarScreen';
import MediaScreen          from '../screens/MediaScreen';
import SupportChatScreen    from '../screens/SupportChatScreen';
import ProgramSongsScreen  from '../screens/ProgramSongsScreen';
import LiveConductorScreen from '../screens/LiveConductorScreen';

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
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AttendanceTab"
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar-number' : 'calendar-number-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PraiseNight"
        component={PraiseNightScreen}
        options={{
          tabBarLabel: 'Programs',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'musical-notes' : 'musical-notes-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Members"
        component={MembersScreen}
        options={{
          tabBarLabel: 'Members',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
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
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Feature Screens — All use unified ZoneHeader */}
      <Stack.Screen name="Songs" component={SubmittedSongsScreen} />
      <Stack.Screen name="PraiseNight" component={PraiseNightScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="Churches" component={ChurchesScreen} />
      <Stack.Screen name="SongDetail" component={SongDetailScreen} />
      <Stack.Screen name="ProgramSongs" component={ProgramSongsScreen} />
      <Stack.Screen name="LiveConductor" component={LiveConductorScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="MediaLibrary" component={MediaScreen} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
      <Stack.Screen name="MasterLibrary" component={MasterLibraryScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="ActivityLogs" component={ActivityLogsScreen} />
    </Stack.Navigator>
  );
}
