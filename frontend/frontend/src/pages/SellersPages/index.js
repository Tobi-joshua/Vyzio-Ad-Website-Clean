import React, { useEffect, useState, useRef, createContext } from "react";
import {
  Box,
  Toolbar,
  useTheme,
} from "@mui/material";
import { useNavigate, Outlet } from "react-router-dom";
import SellerAppBar from "../../components/SellerAppBar";
import useAuthToken from "../../hooks/useAuthToken";
import DataLoader from "../../components/DataLoader";
import { db } from "../../firebase/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import notification from "../../assets/notification.mp3";
import { API_BASE_URL } from "../../constants";

export const SellerDashboardContext = createContext();

export default function SellersPagesWrapper() {
  const theme = useTheme();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token, isLoading: authLoading } = useAuthToken();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userId, setUserId] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const notificationAudio = useRef(null);
  useEffect(() => {
    notificationAudio.current = new Audio(notification);
    notificationAudio.current.preload = "auto";
  }, []);

  const playNotificationSound = () => {
    try {
      notificationAudio.current.currentTime = 0;
      notificationAudio.current.play().catch(() => {});
    } catch (e) {}
  };

  // Fetch dashboard data from API (seller endpoint)
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/sellers-dashboard/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        return res.json();
      })
      .then((data) => {
        setDashboardData(data || {});
        setFirstName(data.user?.firstname || "");
        setEmail(data.user?.email || "");
        setUserAvatar(data.user?.avatar || data.user?.avatar_url || "");
        setUserId(data.user?.userId || null);
      })
      .catch((err) => {
        console.error("Error fetching dashboard:", err);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Listen for notification count changes from Firestore
  const fetchBellCount = (uid) => {
    if (!uid) return () => {};
    const bellRef = doc(db, "Seller_Notifications", String(uid));
    let lastSoundTrigger = null;
    let isFirstLoad = true;
    return onSnapshot(bellRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setNotificationCount(data.count || 0);
        if (isFirstLoad) {
          lastSoundTrigger = data.soundTrigger || "";
          isFirstLoad = false;
        } else if (data.soundTrigger && data.soundTrigger !== lastSoundTrigger) {
          lastSoundTrigger = data.soundTrigger;
          playNotificationSound();
        }
      }
    });
  };

  useEffect(() => {
    if (!userId) return;
    const unsub = fetchBellCount(userId);
    return () => unsub();
  }, [userId]);

  // Extract data slices for context — match the seller payload
  const stats = dashboardData?.stats || {};
  const messages = dashboardData?.messages || [];
  const my_ads = dashboardData?.my_ads || [];
  const performance_insights = dashboardData?.performance_insights || {};
  const orders = dashboardData?.orders || [];
  const earnings_total = dashboardData?.earnings_total ?? null;

  // Background gradient based on theme mode
  const pageBg = () => {
    const mode = theme.palette.mode || "light";
    return mode === "dark"
      ? "linear-gradient(180deg,#071120 0%, #0b1724 100%)"
      : "linear-gradient(180deg,#f6f9fc 0%, #97999bff 100%)";
  };

  if (loading || authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <DataLoader visible />
      </Box>
    );
  }

  return (
    <SellerDashboardContext.Provider
      value={{
        firstName,
        email,
        userAvatar,
        userId,
        notificationCount,
        stats,
        messages,
        my_ads,
        performance_insights,
        orders,
        earnings_total,
        token,
      }}
    >
      <Box sx={{ minHeight: "100vh", background: pageBg(), pb: 8 }}>
        <SellerAppBar
          userAvatar={userAvatar}
          firstName={firstName}
          notificationCount={notificationCount}
        />
        <Toolbar />
        <Box sx={{ width: "100%", backgroundColor: "transparent", ml: 0, mt: -11 }}>
          <Box
            sx={{
              width: {
                xs: "88%",
                sm: "69%",
                md: "70%",
                lg: "75%",
              },
              maxWidth: "1000px",
              mx: "auto",
              p: 0,
              borderRadius: 0,
              boxShadow: "none",
              backgroundColor: "transparent",
              border: "none",
              mb: 0,
              mt: 0,
              position: "static",
              zIndex: "auto",
              transition: "none",
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </SellerDashboardContext.Provider>
  );
}
