import React, { useEffect, useState, useContext } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  CircularProgress,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  useMediaQuery,
  Badge
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { useTheme } from "@mui/material/styles";
import { SellerDashboardContext } from "./index";
import { API_BASE_URL } from "../../constants";

export default function SellerMessages() {
  const { userId, userAvatar, firstName } = useContext(SellerDashboardContext);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal & messages state
  const [openModal, setOpenModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const fetchChats = () => {
    fetch(`${API_BASE_URL}/api/seller/${userId}/chats/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load chats");
        return res.json();
      })
      .then((data) => {
        setChats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchChats();
  }, [userId]);


  useEffect(() => {
  if (!openModal) {
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }
}, [openModal]);


  const fetchMessages = async (chatId) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages/`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      setChatMessages(data);
    } catch (error) {
      console.error(error);
    }
    setLoadingMessages(false);
  };

  const handleOpenChat = async (chat) => {
    setSelectedChat(chat);
    setOpenModal(true);

    // Mark as read in backend
    try {
      await fetch(`${API_BASE_URL}/api/chats/${chat.chat_id}/mark-read/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      // Update local state unread count instantly
      setChats((prevChats) =>
        prevChats.map((c) =>
          c.chat_id === chat.chat_id
            ? { ...c, unread: false, unread_count: 0 }
            : c
        )
      );
    } catch (error) {
      console.error("Error marking chat as read", error);
    }

    // Fetch messages
    fetchMessages(chat.chat_id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedChat) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/send/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: selectedChat.chat_id,
          sender_id: userId,
          text: newMessage
        })
      });
      if (!res.ok) throw new Error("Failed to send message");
      const data = await res.json();

      setChatMessages((prev) => [...prev, data]);
      setNewMessage("");
    } catch (error) {
      console.error(error);
    }
    setSending(false);
  };

  // Polling for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChats();
      if (selectedChat) {
        fetchMessages(selectedChat.chat_id);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={userAvatar} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Welcome back, {firstName || "Buyer"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Find services, products and local jobs — tailored for you.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "#cfd8dc", mb: 3 }} />

      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: 700, mb: 2, color: "darkblue" }}
      >
        My Messages
      </Typography>

      <List>
        {chats.length === 0 && (
          <Typography
            variant="body1"
            color="textSecondary"
            align="center"
            sx={{ mt: 4 }}
          >
            No messages yet.
          </Typography>
        )}
        {chats.map((chat) => (
          <React.Fragment key={chat.chat_id}>
           <ListItem
  button
  onClick={() => handleOpenChat(chat)}
  sx={{
    backgroundColor: "white",
    borderRadius: 2,
    boxShadow: 1,
    mb: 1,
    "&:hover": {
      backgroundColor: "#f5f5f5"
    }
  }}
>
  <ListItemAvatar>
    <Badge
      color="error"
      badgeContent={chat.unread_count}
      invisible={chat.unread_count === 0}
    >
      <Avatar>{chat.buyer_name.charAt(0)}</Avatar>
    </Badge>
  </ListItemAvatar>
  <ListItemText
    primaryTypographyProps={{
      fontWeight: chat.unread ? "bold" : "normal"
    }}
    secondaryTypographyProps={{
      color: chat.unread ? "text.primary" : "text.secondary"
    }}
    primary={`${chat.buyer_name} — ${chat.ad_title}`}
    secondary={chat.last_message || "No messages yet"}
  />
</ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      {/* Chat Modal */}
      <Dialog
        fullScreen={fullScreen}
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedChat?.buyer_name}
          <IconButton
            aria-label="close"
            onClick={() => setOpenModal(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500]
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", height: "70vh" }}>
          <Box sx={{ flex: 1, overflowY: "auto", mb: 2 }}>
            {loadingMessages ? (
              <CircularProgress />
            ) : (
              chatMessages.map((msg, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: msg.sender === userId ? "bold" : "normal",
                      color:
                        msg.sender === userId ? "darkblue" : "text.primary"
                    }}
                  >
                    {msg.sender_name}:
                  </Typography>
                  <Typography variant="body1">{msg.text}</Typography>
                </Box>
              ))
            )}
          </Box>

          {/* Send Message Box */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={sending}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}