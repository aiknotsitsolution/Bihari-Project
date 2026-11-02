import React from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { ToastProvider } from "./src/context/ToastContext";
import { WishlistProvider } from "./src/context/WishlistContext";
import AnimatedPressable from "./src/components/AnimatedPressable";
import TabIcon from "./src/components/TabIcon";

import AIChatScreen from "./src/screens/AIChatScreen";
import AddressesScreen from "./src/screens/AddressesScreen";
import CartScreen from "./src/screens/CartScreen";
import CategoriesScreen from "./src/screens/CategoriesScreen";
import CheckoutScreen from "./src/screens/CheckoutScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import OrderSuccessScreen from "./src/screens/OrderSuccessScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import ProductDetailScreen from "./src/screens/ProductDetailScreen";
import ProductsScreen from "./src/screens/ProductsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import WishlistScreen from "./src/screens/WishlistScreen";
import { colors } from "./src/theme";
import type { RootStackParams, TabParams } from "./src/types";

const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootStackParams>();

type IconName = keyof typeof Ionicons.glyphMap;
const TAB_ICONS: Record<keyof TabParams, [IconName, IconName]> = {
  Home: ["home-outline", "home"],
  Products: ["pricetags-outline", "pricetags"],
  Categories: ["grid-outline", "grid"],
  Profile: ["person-outline", "person"],
};

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.paper, primary: colors.primary, card: "#fff", text: colors.text, border: colors.border },
};

const stackHeader = {
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "700" as const },
  headerStyle: { backgroundColor: "#fff" },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal" as const,
};

function Tabs() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          ...stackHeader,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.faint,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
          tabBarStyle: { borderTopColor: colors.border },
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={TAB_ICONS[route.name][0]}
              activeName={TAB_ICONS[route.name][1]}
              focused={focused}
              color={color}
              size={size}
            />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Products" component={ProductsScreen} options={{ title: "Products" }} />
        <Tab.Screen name="Categories" component={CategoriesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      </Tab.Navigator>
      <AnimatedPressable
        onPress={() => navigation.navigate("AIChat")}
        style={[s.aiButton, { bottom: insets.bottom + 72 }]}
        accessibilityRole="button"
        accessibilityLabel="Open AI shopping assistant"
        haptic
      >
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.aiButtonGradient}>
          <Ionicons name="sparkles" size={23} color={colors.saffron} />
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

function Splash() {
  return (
    <LinearGradient colors={[colors.primary, colors.pine]} style={[StyleSheet.absoluteFill, s.splash]}>
      <Animated.View entering={ZoomIn.springify().damping(12)} style={s.logo}>
        <Ionicons name="bag-handle" size={44} color={colors.primary} />
      </Animated.View>
      <Animated.Text entering={FadeIn.delay(250)} style={s.splashText}>
        AI Knots Marketplace
      </Animated.Text>
    </LinearGradient>
  );
}

function Root() {
  const { loading } = useAuth();
  if (loading) return <Splash />;
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ ...stackHeader, animation: "slide_from_right" }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Products" component={ProductsScreen} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: "My cart" }} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ title: "Wishlist" }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Checkout" }} />
        <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: "My addresses" }} />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: "My orders" }} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "Order details" }} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ headerShown: false, gestureEnabled: false, animation: "fade" }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} options={{ title: "Shopping assistant" }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <WishlistProvider>
                <View style={{ flex: 1 }}>
                  <StatusBar style="dark" />
                  <Root />
                </View>
              </WishlistProvider>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  splash: { alignItems: "center", justifyContent: "center", gap: 18 },
  aiButton: {
    position: "absolute",
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    elevation: 8,
    shadowColor: colors.pine,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  aiButtonGradient: { flex: 1, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  logo: { width: 96, height: 96, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  splashText: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
});
