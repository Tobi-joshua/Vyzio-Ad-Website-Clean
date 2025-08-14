import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, CardContent, CardMedia, Avatar,
  Grid, CircularProgress, Toolbar, IconButton, Container, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ReplyIcon from "@mui/icons-material/Reply";
import { API_BASE_URL } from "../../constants";

const SellerAdsDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Reply dialog state
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null); 
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const token = localStorage.getItem("token");
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/seller/ads/${id}/`, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (!r.ok) throw new Error("Failed to fetch ad");
        const data = await r.json();
        setAd(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchAd();
  }, [id]);

  // Fetch messages for this ad
  useEffect(() => {
    const fetchMessages = async () => {
      if (!ad) return;
      try {
        const r = await fetch(`${API_BASE_URL}/api/chats/ad/${ad.id}/messages/`, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (!r.ok) throw new Error("Failed to fetch messages");
        const data = await r.json();
        setMessages(data || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [ad]);


  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const chatId = ad?.chat_id || null;
      if (!chatId) {
        console.warn("No chat id available to send message");
        throw new Error("No chat id available");
      }

      const r = await fetch(`${API_BASE_URL}/api/messages/send/`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          chat_id: chatId,
          sender_id: ad.seller_id || ad.user_id || null,
          text: newMessage.trim(),
        }),
      });
      if (!r.ok) throw new Error("Failed to send message");
      const msg = await r.json();
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // --- Reply dialog handlers ---
  const openReplyDialog = (msg) => {
    setReplyTo(msg);
    setReplyText(`@${msg.sender_name || "user"} `);
    setReplyOpen(true);
  };

  const closeReplyDialog = () => {
    setReplyOpen(false);
    setReplyTo(null);
    setReplyText("");
    setSendingReply(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || sendingReply || !replyTo) return;
    setSendingReply(true);
    try {
      // find chat id from message or ad
      const chatId = replyTo.chat || replyTo.chat_id || ad?.chat_id || null;
      if (!chatId) {
        console.warn("No chat id available for reply");
        throw new Error("No chat id available");
      }
      const r = await fetch(`${API_BASE_URL}/api/messages/send/`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          chat_id: chatId,
          sender_id: ad.seller_id || ad.user_id || null,
          text: replyText.trim(),
        }),
      });
      if (!r.ok) throw new Error("Failed to send reply");
      const msg = await r.json();
      // append reply to messages
      setMessages((prev) => [...prev, msg]);
      closeReplyDialog();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    } catch (err) {
      console.error("handleSendReply error:", err);
      setSendingReply(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>;

  if (!ad) return <Typography color="error" align="center" mt={5}>Ad not found</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Toolbar disableGutters sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate("/seller/ads")} sx={{ mr: 1, backgroundColor: "#fff" }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">Your Ad</Typography>
      </Toolbar>

      <Card sx={{ mb: 3 }}>
        <CardMedia
          component="img"
          height="400"
          image={ad.header_image_url || "https://via.placeholder.com/900x400?text=No+Image"}
          alt={ad.title}
        />
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold">{ad.title}</Typography>
              <Typography variant="h6" color="primary" fontWeight="bold">{ad.currency} {Number(ad.price || 0).toLocaleString()}</Typography>
              <Typography sx={{ whiteSpace: "pre-wrap", my: 1 }}>{ad.description}</Typography>
              <Typography variant="body2">📍 {ad.city}</Typography>
              <Typography variant="body2">📅 {ad.created_at ? new Date(ad.created_at).toLocaleDateString() : "N/A"}</Typography>
              <Typography variant="body2">👁️ Views: {ad.view_count ?? 0}</Typography>
              <Typography variant="body2">💬 Messages: {ad.message_count ?? messages.length}</Typography>
            </CardContent>
          </Card>

          <Box sx={{ mb: 2 }}>
            <Button variant="contained" color="primary" sx={{ mr: 1 }} onClick={() => navigate(`/seller/ads/${ad.id}/edit`)}>Edit</Button>
            <Button variant="outlined" color="error" onClick={() => {
              // keep delete hook - replace with confirmation / API call as needed
              if (window.confirm("Delete this ad? This action cannot be undone.")) {
                fetch(`${API_BASE_URL}/seller/ads/${ad.id}/`, {
                  method: "DELETE",
                  headers: getAuthHeaders(),
                  credentials: "include"
                })
                  .then(res => {
                    if (res.ok) navigate("/seller/ads");
                    else alert("Failed to delete ad");
                  })
                  .catch(err => { console.error(err); alert("Error deleting ad"); });
              }
            }}>Delete</Button>
          </Box>

          <Card sx={{ p: 2, maxHeight: "48vh", overflowY: "auto" }}>
            {messages.length === 0 ? (
              <Typography variant="body2" color="textSecondary">No messages yet.</Typography>
            ) : (
              messages.map((msg) => {
                const isMine = String(msg.sender) === String(ad.seller_id) || String(msg.sender_id) === String(ad.seller_id);
                return (
                  <Box key={msg.id || `${msg.created_at}-${Math.random()}`} sx={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", mb: 1 }}>
                    <Box sx={{
                      maxWidth: "78%",
                      backgroundColor: isMine ? "primary.main" : "#f1f1f1",
                      color: isMine ? "white" : "black",
                      p: 1.25, borderRadius: 2, boxShadow: 1
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{msg.sender_name || msg.sender_username || (isMine ? "You" : "User")}</Typography>
                      <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>{msg.text}</Typography>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                        </Typography>
                        {/* Reply button only shown to seller for incoming messages */}
                        {!isMine && (
                          <Button size="small" startIcon={<ReplyIcon />} onClick={() => openReplyDialog(msg)}>
                            Reply
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </Card>

          <Box sx={{ display: "flex", mt: 1, gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            />
            <Button variant="contained" color="primary" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
              <SendIcon />
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Reply Dialog */}
      <Dialog fullScreen={fullScreen} open={replyOpen} onClose={closeReplyDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReplyIcon />
            <Typography>Reply to {replyTo?.sender_name || "user"}</Typography>
          </Box>
          <IconButton onClick={closeReplyDialog}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">Original message:</Typography>
            <Card sx={{ p: 1, mt: 1 }}>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{replyTo?.text}</Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.7 }}>
                {replyTo?.created_at ? new Date(replyTo.created_at).toLocaleString() : ""}
              </Typography>
            </Card>
          </Box>

          <TextField
            autoFocus
            multiline
            minRows={3}
            fullWidth
            placeholder="Write your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeReplyDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSendReply} disabled={sendingReply || !replyText.trim()}>
            Send Reply
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SellerAdsDetails;
