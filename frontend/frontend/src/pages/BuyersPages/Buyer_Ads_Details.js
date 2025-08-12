import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, CardContent, CardMedia, Avatar, Grid,
  CircularProgress, Toolbar, IconButton, Container, Dialog, DialogTitle,
  DialogContent, TextField, useMediaQuery
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { useTheme } from "@mui/material/styles";
import { API_BASE_URL } from "../../constants";
import { BuyerDashboardContext } from "./index";

/**
 * Buyers_Ads_Details
 * - Uses ad.seller_id (primary) to create/get chat
 * - If seller name missing, fetches /api/users/<seller_id>/ for display name
 * - Opens modal optimistically; creates chat server-side in background
 * - If no server chat exists on send, creates chat on-send then sends message
 */
const Buyers_Ads_Details = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const { userId, token } = useContext(BuyerDashboardContext) || {};
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasRecordedView, setHasRecordedView] = useState(false);

  // chats + modal
  const [chats, setChats] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const getAuthHeaders = () => {
    const h = { "Content-Type": "application/json" };
    const localToken = token || localStorage.getItem("token");
    if (localToken) h["Authorization"] = `Bearer ${localToken}`;
    return h;
  };

  const recordView = async (adObj) => {
    if (!adObj || hasRecordedView) return;
    const adId = adObj.id || adObj.ad_id || id;
    if (!adId) return;
    try {
      const payload = {};
      if (userId) payload.user_id = userId;
      const res = await fetch(`${API_BASE_URL}/api/ads/${adId}/view/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
        credentials: "include",
      });
      setHasRecordedView(true);
      if (!res.ok) console.warn("recordView status:", res.status);
    } catch (err) {
      console.warn("recordView error:", err);
      setHasRecordedView(true);
    }
  };

  // fetch ad
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/ads/${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch ad");
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        setAd(data);
        setLoading(false);
        recordView(data);
      })
      .catch((err) => {
        console.error("Error fetching ad:", err);
        if (mounted) setLoading(false);
      });
    return () => (mounted = false);
  }, [id, userId]);

  // fetch chats list
  const fetchChats = async () => {
    if (!userId) return;
    try {
      const r = await fetch(`${API_BASE_URL}/api/buyer/${userId}/chats/`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!r.ok) {
        console.warn("fetchChats non-OK", r.status);
        return;
      }
      const data = await r.json();
      setChats(data || []);
    } catch (err) {
      console.error("fetchChats error:", err);
    }
  };
  useEffect(() => { fetchChats(); }, [userId]);

  // poll chats only when modal closed (to avoid UI shake)
  useEffect(() => {
    if (openModal) return;
    const idt = setInterval(fetchChats, 15000);
    return () => clearInterval(idt);
  }, [openModal, userId]);

  // fetch messages for a chat
  const fetchMessages = async (chatId) => {
    if (!chatId) return;
    setLoadingMessages(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages/`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!r.ok) {
        console.warn("fetchMessages non-OK", r.status);
        setChatMessages([]);
        return;
      }
      const data = await r.json();
      setChatMessages(data || []);
      setTimeout(() => scrollToBottom(), 120);
    } catch (err) {
      console.error("fetchMessages error:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // polling messages while modal open
  useEffect(() => {
    if (!openModal || !selectedChat) return;
    if (selectedChat.chat_id) fetchMessages(selectedChat.chat_id);
    const idt = setInterval(() => {
      if (selectedChat.chat_id) fetchMessages(selectedChat.chat_id);
    }, 4000);
    return () => clearInterval(idt);
  }, [openModal, selectedChat]);

  const scrollToBottom = () => {
    try { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }
    catch (e) { /* ignore */ }
  };

  // create/get chat on server
  const createOrGetChatOnServer = async (buyer_id, seller_id, ad_id) => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/chats/create/`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ buyer_id, seller_id, ad_id }),
      });
      if (!r.ok) {
        console.warn("createOrGetChatOnServer failed:", r.status);
        return null;
      }
      return await r.json();
    } catch (err) {
      console.error("createOrGetChatOnServer error:", err);
      return null;
    }
  };

  // if seller name missing, fetch user info
  const fetchSellerName = async (sellerId) => {
    if (!sellerId) return "";
    try {
      const r = await fetch(`${API_BASE_URL}/api/users/${sellerId}/`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!r.ok) return "";
      const u = await r.json();
      return u.first_name || u.username || "";
    } catch (err) {
      return "";
    }
  };

  // open chat UI (optimistic)
  const openChatUI = (chatForUI) => {
    setSelectedChat(chatForUI);
    setOpenModal(true);
    setChats((prev) => {
      const exists = prev.some((c) => c.chat_id && c.chat_id === chatForUI.chat_id);
      if (exists) return prev.map((c) => (c.chat_id === chatForUI.chat_id ? { ...c, ...chatForUI } : c));
      // prepend
      return [chatForUI, ...prev];
    });
  };

  // contact seller -> open optimistically then create/get chat
  const handleContactSeller = async () => {
    if (!ad) return;
    const sellerId = ad.seller_id || ad.user_id || (ad.user && (ad.user.id || ad.user));
    if (!sellerId) {
      console.warn("No seller id in ad payload.");
      return;
    }

    let sellerName = ad.user_first_name || (ad.user && (ad.user.first_name || ad.user.username)) || "";
    if (!sellerName) {
      sellerName = await fetchSellerName(sellerId);
    }

    const tempChat = {
      chat_id: null,
      temp: true,
      ad_id: ad.id,
      ad_title: ad.title,
      seller_name: sellerName || "Seller",
      unread_count: 0,
    };
    openChatUI(tempChat);

    // create/get chat in background
    const serverChat = await createOrGetChatOnServer(userId, sellerId, ad.id);
    if (serverChat && (serverChat.id || serverChat.chat_id)) {
      const realChat = {
        chat_id: serverChat.id || serverChat.chat_id,
        ad_id: serverChat.ad || serverChat.ad_id || ad.id,
        ad_title: serverChat.ad_title || ad.title,
        seller_name: serverChat.seller_name || sellerName || "Seller",
        unread_count: serverChat.unread_count || 0,
        last_message: serverChat.last_message || "",
      };
      // replace temp with real
      setChats((prev) => {
        const filtered = prev.filter((c) => !(c.temp && c.ad_id === realChat.ad_id));
        const exists = filtered.some((c) => c.chat_id === realChat.chat_id);
        if (exists) return filtered.map((c) => (c.chat_id === realChat.chat_id ? { ...c, ...realChat } : c));
        return [realChat, ...filtered];
      });
      setSelectedChat(realChat);
      fetchMessages(realChat.chat_id);
    } else {
      console.warn("create_chat failed; user can still send — chat will be created on-send.");
    }
  };

  // mark-read helper (best-effort)
  const markChatAsRead = async (chat) => {
    if (!chat || !chat.chat_id) return;
    try {
      await fetch(`${API_BASE_URL}/api/chats/${chat.chat_id}/mark-read/`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
    } catch (err) {
      // ignore errors
    }
  };

  // send message (create chat first if needed)
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedChat) return;
    setSending(true);
    const textToSend = newMessage.trim();

    try {
      let realChatId = selectedChat.chat_id;
      // create if missing
      if (!realChatId) {
        const sellerId = ad.seller_id || ad.user_id || (ad.user && (ad.user.id || ad.user));
        const chatData = await createOrGetChatOnServer(userId, sellerId, ad.id);
        if (!chatData || (!chatData.id && !chatData.chat_id)) {
          throw new Error("Could not create chat before sending message");
        }
        realChatId = chatData.id || chatData.chat_id;
        const realChat = {
          chat_id: realChatId,
          ad_id: chatData.ad || chatData.ad_id || ad.id,
          ad_title: chatData.ad_title || ad.title,
          seller_name: chatData.seller_name || selectedChat.seller_name || "Seller",
        };
        setChats((prev) => {
          const exists = prev.some((c) => c.chat_id === realChat.chat_id);
          if (exists) return prev.map((c) => (c.chat_id === realChat.chat_id ? { ...c, ...realChat } : c));
          // remove temp for same ad
          const filtered = prev.filter((c) => !(c.temp && c.ad_id === realChat.ad_id));
          return [realChat, ...filtered];
        });
        setSelectedChat((s) => ({ ...s, chat_id: realChatId }));
      }

      // send message
      const r = await fetch(`${API_BASE_URL}/api/messages/send/`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          chat_id: realChatId,
          sender_id: userId,
          text: textToSend,
        }),
      });
      if (!r.ok) throw new Error("send message failed: " + r.status);
      const message = await r.json();
      setChatMessages((prev) => [...prev, message]);

      // update chats last_message
      setChats((prev) =>
        prev.map((c) => (c.chat_id === realChatId ? { ...c, last_message: textToSend, last_message_time: message.created_at || new Date().toISOString() } : c))
      );

      // mark as read (best-effort)
      markChatAsRead({ chat_id: realChatId });

      setNewMessage("");
      setTimeout(() => scrollToBottom(), 120);
    } catch (err) {
      console.error("handleSendMessage error:", err);
    } finally {
      setSending(false);
    }
  };



  const APPLY_KEYWORDS = [
  "job",
  "jobs",
  "training",
  "education",
  "intern",
  "internship",
  "career",
  "careers"
];

const isApplyCategory = (catName) => {
  if (!catName) return false;
  const n = catName.toLowerCase();
  return APPLY_KEYWORDS.some((kw) => n.includes(kw));
};

const getApplyRoute = (ad) => {
  const name = (ad?.category?.name || "").toLowerCase();
  if (name.includes("job") || name.includes("jobs")) return `/buyers/jobs/${ad.id}/apply`;
  if (name.includes("training") || name.includes("education")) return `/buyers/training/${ad.id}/apply`;
  return `/buyers/apply/${ad.id}`;
};



  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }
  if (!ad) {
    return (
      <Typography color="error" align="center" mt={5}>Ad not found.</Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        <Toolbar disableGutters sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate("/buyers/categories")} aria-label="Go back" sx={{ mr: 1, backgroundColor: "#fff", boxShadow: 1, "&:hover": { backgroundColor: "#f0f0f0" } }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold">{ad.category?.name || "Ad Details"}</Typography>
        </Toolbar>

        <Card sx={{ mb: 3, borderRadius: 3, overflow: "hidden", boxShadow: 3 }}>
          <CardMedia component="img" height="500" image={ad.header_image_url || "https://via.placeholder.com/900x500?text=No+Image"} alt={ad.title} />
        </Card>

        {ad.images?.length > 0 && (
          <Box sx={{ display: "flex", overflowX: "auto", gap: 2, pb: 1, mb: 4, "&::-webkit-scrollbar": { display: "none" } }}>
            {ad.images.map((img) => (
              <Card key={img.id} sx={{ flex: "0 0 auto", width: 150, height: 100, borderRadius: 2, overflow: "hidden", boxShadow: 2 }}>
                <CardMedia component="img" height="100" image={img.image_url} alt={`Image ${img.id}`} sx={{ objectFit: "cover" }} />
              </Card>
            ))}
          </Box>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>{ad.title}</Typography>
                <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>{ad.currency} {Number(ad.price).toLocaleString()}</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{ad.description}</Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>📍 {ad.city}</Typography>
                <Typography variant="body2" color="textSecondary">📅 {new Date(ad.created_at).toLocaleDateString()}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar src={ad.user_avatar_url || ""} alt={ad.user_first_name || "Seller"} sx={{ width: 60, height: 60, mr: 2, border: "2px solid #eee" }} />
                  <Box>
                    <Typography fontWeight="bold">{ad.user_first_name || "Seller"}</Typography>
                    <Typography variant="body2" color="textSecondary">Member since {ad.member_since || "N/A"}</Typography>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ mb: 1 }}>📦 Total Ads Posted: {ad.total_ads_posted || 0}</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>⭐ Average Rating: {ad.average_rating ? Number(ad.average_rating).toFixed(1) : "0.0"} of 5</Typography>
                {isApplyCategory(ad?.category?.name) ? (
  <Button
    variant="contained"
    color="primary"
    fullWidth
    sx={{ borderRadius: 2 }}
    onClick={() => {
      if (!userId) return navigate("/login");
      navigate(getApplyRoute(ad));
    }}
    aria-label="Apply"
  >
    Apply
  </Button>
) : (
  <Button
    variant="contained"
    color="primary"
    fullWidth
    sx={{ borderRadius: 2 }}
    onClick={handleContactSeller}
    aria-label="Contact seller"
  >
    Contact Seller
  </Button>
)}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Chat Modal */}
      <Dialog fullScreen={fullScreen} open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar>{(selectedChat?.seller_name || "S").charAt(0)}</Avatar>
            <Typography>{selectedChat?.seller_name || "Chat"}</Typography>
          </Box>
          <IconButton onClick={() => setOpenModal(false)} aria-label="close"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", height: "70vh" }}>
          <Box sx={{ flex: 1, overflowY: "auto", mb: 2 }}>
            {loadingMessages ? (
              <Box display="flex" justifyContent="center" mt={2}><CircularProgress /></Box>
            ) : (
              chatMessages.map((msg) => {
                const isMine = String(msg.sender) === String(userId) || msg.sender === userId;
                return (
                  <Box key={msg.id || `${msg.created_at}-${Math.random()}`} sx={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", mb: 1 }}>
                    <Box sx={{ maxWidth: "78%", backgroundColor: isMine ? "primary.main" : "#f1f1f1", color: isMine ? "white" : "black", p: 1.25, borderRadius: 2, boxShadow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{msg.sender_name}</Typography>
                      <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>{msg.text}</Typography>
                      <Typography variant="caption" sx={{ display: "block", textAlign: "right", mt: 0.5, opacity: 0.8 }}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField fullWidth size="small" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} />
            <IconButton color="primary" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}><SendIcon /></IconButton>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Buyers_Ads_Details;