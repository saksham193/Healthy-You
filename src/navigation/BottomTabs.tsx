import React, { useState } from "react";
import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FloatingMedibotButton from "../components/home/FloatingMedibotButton";
import HomeScreen from "../screens/Home/HomeScreen";
import NutritionScreen from "../screens/Nutrition/NutritionScreen";
import FitnessScreen from "../screens/Fitness/FitnessScreen";
import ScheduleScreen from "../screens/Schedule/ScheduleScreen";
import AssistantScreen from "../screens/Assistant/AssistantScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import { COLORS } from "../theme/colors";
import { TYPOGRAPHY } from "../theme/typography";
import type { IconName, RootTabParamList } from "../types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const navigationRef = createNavigationContainerRef<RootTabParamList>();

const tabIcons: Record<keyof RootTabParamList, IconName> = {
  Chat: "chatbubble-outline",
  Nutrition: "nutrition-outline",
  Fitness: "barbell-outline",
  Data: "stats-chart",
  Schedule: "calendar-outline",
  Profile: "person-circle-outline",
};

function TabIcon({ focused, name }: { focused: boolean; name: keyof RootTabParamList }) {
  return (
    <View style={[styles.icon, focused && styles.iconActive]}>
      <Ionicons
        color={focused ? COLORS.primary : COLORS.textMuted}
        name={tabIcons[name]}
        size={22}
      />
    </View>
  );
}

export default function BottomTabs() {
  const [currentRoute, setCurrentRoute] = useState<keyof RootTabParamList>("Data");

  return (
    <View style={styles.root}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          setCurrentRoute(navigationRef.getCurrentRoute()?.name ?? "Data");
        }}
        onStateChange={() => {
          setCurrentRoute(navigationRef.getCurrentRoute()?.name ?? "Data");
        }}
      >
        <Tab.Navigator
          initialRouteName="Data"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textMuted,
            tabBarLabelStyle: styles.label,
            tabBarStyle: styles.tabBar,
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name={route.name} />
            ),
          })}
        >
          <Tab.Screen name="Chat" component={AssistantScreen} />
          <Tab.Screen name="Nutrition" component={NutritionScreen} />
          <Tab.Screen name="Fitness" component={FitnessScreen} />
          <Tab.Screen name="Data" component={HomeScreen} />
          <Tab.Screen name="Schedule" component={ScheduleScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      {currentRoute !== "Chat" ? (
        <FloatingMedibotButton
          onPress={() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate("Chat");
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.border,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: 78,
    paddingBottom: 9,
    paddingTop: 8,
    position: "absolute",
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  icon: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 38,
  },
  iconActive: {
    backgroundColor: COLORS.primaryLight,
  },
});
