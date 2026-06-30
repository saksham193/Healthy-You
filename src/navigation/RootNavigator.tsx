import React, { useEffect, useRef, useState } from "react";
import AuthLoadingScreen from "../screens/Auth/AuthLoadingScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import { useAuthStore } from "../store/authStore";
import BottomTabs from "./BottomTabs";

type AuthRoute = "login" | "register" | "forgot-password";

function AuthStack() {
  const [route, setRoute] = useState<AuthRoute>("login");

  if (route === "register") {
    return <RegisterScreen onLogin={() => setRoute("login")} />;
  }

  if (route === "forgot-password") {
    return <ForgotPasswordScreen onBackToLogin={() => setRoute("login")} />;
  }

  return (
    <LoginScreen
      onForgotPassword={() => setRoute("forgot-password")}
      onRegister={() => setRoute("register")}
    />
  );
}

export default function RootNavigator() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrationStarted = useRef(false);

  useEffect(() => {
    if (hydrationStarted.current) return;

    hydrationStarted.current = true;
    void hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  return <BottomTabs />;
}
