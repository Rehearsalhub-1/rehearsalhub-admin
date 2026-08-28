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

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const headerOpts = {
  headerShown: true,
  headerStyle: { backgroundColor: Colors.background },
  headerTintColor: Colors.textPrimary,
  headerTitleStyle: { color: Colors.textPrimary, fontWeight: '700' as const },
  headerShadowVisible: false,
};

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

      {/* Feature Screens */}
      <Stack.Screen name="Songs" component={SubmittedSongsScreen} options={{ ...headerOpts, title: 'Submitted Songs' }} />
      <Stack.Screen name="PraiseNight" component={PraiseNightScreen} options={{ ...headerOpts, title: 'Programs & Praise Nights' }} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ ...headerOpts, title: 'Schedule Manager' }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ ...headerOpts, title: 'Attendance' }} />
      <Stack.Screen name="Churches" component={ChurchesScreen} options={{ ...headerOpts, title: 'Churches & Subgroups' }} />
      <Stack.Screen name="SongDetail" component={SongDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ ...headerOpts, title: 'Analytics & Reports' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ ...headerOpts, title: 'Rehearsal Calendar' }} />
      <Stack.Screen name="Media" component={MediaScreen} options={{ ...headerOpts, title: 'Media Library' }} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} options={{ ...headerOpts, title: 'Support Desk' }} />
      <Stack.Screen name="MasterLibrary" component={MasterLibraryScreen} options={{ ...headerOpts, title: 'Master Library' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ ...headerOpts, title: 'Broadcast Notification' }} />
      <Stack.Screen name="Categories" component={CategoriesScreen} options={{ ...headerOpts, title: 'Categories' }} />
      <Stack.Screen name="ActivityLogs" component={ActivityLogsScreen} options={{ ...headerOpts, title: 'Activity Logs' }} />
    </Stack.Navigator>
  );
}
