import React, { useEffect, useState, useContext } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import PaymentIcon from "@mui/icons-material/Payment";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { SellerDashboardContext } from "./index";
import { API_BASE_URL } from "../../constants";

const typeIcons = {
  message: <ChatIcon color="primary" />,
  payment: <PaymentIcon color="success" />,
  default: <NotificationsIcon color="action" />
};

export default function SellerNotifications() {
  const { userId } = useContext(SellerDashboardContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchNotifications = () => {
    fetch(`${API_BASE_URL}/api/seller/${userId}/notifications/`)
      .then(res => res.json())
      .then(data => {
        setNotifications(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load notifications", err);
        setLoading(false);
      });
  };

  const markAsRead = (id) => {
    fetch(`${API_BASE_URL}/api/seller/notifications/${id}/mark-read/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to mark as read");
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
      })
      .catch(err => console.error(err));
  };

  const handleNotificationClick = (notif) => {
    setSelectedNotif(notif);
    setModalOpen(true);
  };

  useEffect(() => {
    if (modalOpen && selectedNotif && !selectedNotif.is_read) {
      markAsRead(selectedNotif.id);
    }
  }, [modalOpen, selectedNotif]);

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", mt: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 2, color: "darkblue" }}>
        Notifications
      </Typography>

      <List>
        {notifications.length === 0 && (
          <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
            No notifications yet.
          </Typography>
        )}

        {notifications.map(notif => (
          <React.Fragment key={notif.id}>
            <ListItem
              onClick={() => handleNotificationClick(notif)}
              sx={{
                backgroundColor: notif.is_read ? "#f9f9f9" : "#e3f2fd",
                borderRadius: 2,
                boxShadow: 1,
                mb: 1,
                cursor: "pointer",
                alignItems: "flex-start"
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: notif.is_read ? "grey.400" : "primary.main" }}>
                  {typeIcons[notif.notification_type] || typeIcons.default}
                </Avatar>
              </ListItemAvatar>

              <ListItemText
                primary={
                  <Typography sx={{ fontWeight: notif.is_read ? 400 : 700 }}>
                    {notif.header || notif.notification_type.toUpperCase()}
                  </Typography>
                }
                secondary={
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {notif.message || notif.message_chat}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ textAlign: "right", display: "block", color: "gray" }}
                    >
                      {new Date(notif.timestamp).toLocaleString()}
                    </Typography>
                  </Stack>
                }
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      {/* Modal for Notification Details */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedNotif?.header || selectedNotif?.notification_type?.toUpperCase()}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {selectedNotif?.message || selectedNotif?.message_chat}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedNotif && new Date(selectedNotif.timestamp).toLocaleString()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}