import React, { useContext, useState } from "react";
import {
  Box,
  Avatar,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Stack,
  Paper,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Drawer,
  Chip,
  Tooltip,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ChatIcon from "@mui/icons-material/Chat";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useNavigate } from "react-router-dom";
import { SellerDashboardContext } from "./index";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid,Cell } from "recharts";

export default function SellerDashboard(){
  const theme = useTheme();
  const navigate = useNavigate();

  const {
    user,
    stats = {},
    my_ads = [],
    performance_insights = {},
    messages = [],
    orders = [],
    earnings_total,
    firstName,
    email,
    userAvatar,
    userId,
    token,
  } = useContext(SellerDashboardContext);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // helper: open chat drawer and set chat id (chat_id should come from messages.chat_id)
  const openChat = (chatId) => {
    setActiveChatId(chatId);
    setDrawerOpen(true);
    setReplyText("");
  };

  // quick send using Fetch API — adapt URL to your backend
  const sendQuickReply = async (chatId) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/messages/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText }),
      });
      if (!res.ok) {
        // optionally show toast/snackbar
        console.error("Failed to send message", await res.text());
      } else {
        // optimistic UX: clear reply and optionally refetch messages in parent context
        setReplyText("");
      }
    } catch (err) {
      console.error("Network error sending message", err);
    } finally {
      setSending(false);
    }
  };

  // ad action handlers
  const onEditAd = (adId) => navigate(`/seller/ads/${adId}/edit`);
  const onDeleteAd = async (adId) => {
    if (!window.confirm("Delete this ad? This action cannot be undone.")) return;
    try {
      const resp = await fetch(`/api/ads/${adId}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (resp.ok) {
        window.location.reload();
      } else {
        console.error("Delete failed", await resp.text());
      }
    } catch (err) {
      console.error(err);
    }
  };

const StatCard = ({ title, value, onClick, bgColor, width }) => (
  <Card
    onClick={onClick}
    sx={{
      width: width || 120,          // smaller width
      minHeight: 100,               // optional for consistent height
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",         // center horizontally
      p: 2,
      textAlign: "center",
      gap: 1,                       // small spacing between title and value
      borderRadius: 2,
      boxShadow: 3,
      cursor: onClick ? "pointer" : "default",
      backgroundColor: bgColor || "#fff",
      transition: "transform 0.2s",
      "&:hover": { transform: "scale(1.05)" }, // subtle hover effect
    }}
  >
    <Typography variant="subtitle2" color="text.secondary">
      {title}
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: 700 }}>
      {value ?? 0}
    </Typography>
  </Card>
);



const StatsBarChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar
  dataKey="value"
  fill="#1976d2" // fallback
  >
  {data.map((entry) => {
    let color = "#1976d2"; // default
    if (entry.name === "Active Ads") color = "#FFD700";
    else if (entry.name === "Views") color = "#90EE90";
    else if (entry.name === "Messages") color = "#ADD8E6";
    else if (entry.name === "Leads") color = "#FFB6C1";
    return <Cell key={entry.name} fill={color} />;
  })}
</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const chartData = [
  { name: "Active Ads", value: stats.total_active_ads || 0 },
  { name: "Views", value: stats.total_views_this_month || 0 },
  { name: "Messages", value: stats.messages_count || 0 },
  { name: "Leads", value: stats.total_leads || 0 },
];


  return (
    <>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={user?.avatar || user?.avatar_url} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Welcome back, {firstName || "Seller"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your listings, respond to buyers and track performance.
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<AddCircleOutlineIcon />}
            variant="contained"
            onClick={() => navigate("/sellers/ads/new")}
          >
            Post New Ad
          </Button>
          <Button variant="outlined" onClick={() => setDrawerOpen(true)} startIcon={<ChatIcon />}>
            Messages
          </Button>
          <Button variant="text" onClick={() => navigate("/sellers/earnings")}>
            Earnings
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "#e0e7ef", mb: 3 }} />

   
   <Grid container spacing={4}>
  {/* First row */}
  <Grid item xs={12} sm={6}>
    <StatCard
      title="Active Ads"
      value={stats.total_active_ads}
      cta="View Ads"
      bgColor="#FFD700" // gold
      onClick={() => navigate("/sellers/ads")}
    />
  </Grid>
  <Grid item xs={12} sm={6}>
    <StatCard
      title="Views (this month)"
      value={stats.total_views_this_month}
      cta="View analytics"
      bgColor="#90EE90" // light green
      onClick={() => navigate("/sellers/analytics")}
    />
  </Grid>

  {/* Second row */}
  <Grid item xs={12} sm={6}>
    <StatCard
      title="Messages"
      value={stats.messages_count}
      cta="Open messages"
      bgColor="#ADD8E6" // light blue
      onClick={() => setDrawerOpen(true)}
    />
  </Grid>
  <Grid item xs={12} sm={6} >
    <StatCard
      title="Leads"
      value={stats.total_leads}
      cta="View leads"
      bgColor="#FFB6C1" 
      onClick={() => navigate("/sellers/leads")}
    />
  </Grid>
</Grid>

{/* Main content: My Ads + Messages */}
<Grid container spacing={2} mt={5}>
  {/* My Ads */}
  <Grid item xs={12} md={7}>
    <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "#f5f5f5" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">My Ads</Typography>
        <Button size="small" onClick={() => navigate("/sellers/ads")}>
          View all
        </Button>
      </Box>

      <Grid container spacing={2}>
        {my_ads.length === 0 ? (
          <Grid item xs={12}>
            <Typography color="text.secondary">You have no active ads — post one now.</Typography>
          </Grid>
        ) : (
          my_ads.slice(0, 8).map((ad) => (
            <Grid item xs={12} sm={6} key={ad.id}>
              <Card
                sx={{
                  display: "flex",
                  height: "100%",
                  borderRadius: 2,
                  overflow: "hidden",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "scale(1.02)", boxShadow: 6 },
                  bgcolor: "#fffbe6"
                }}
              >
                {ad.header_image_url ? (
                  <CardMedia
                    component="img"
                    image={ad.header_image_url}
                    alt={ad.title}
                    sx={{ width: 140, objectFit: "cover" }}
                  />
                ) : (
                  <Box sx={{ width: 140, bgcolor: "grey.100" }} />
                )}
                <Box sx={{ flex: 1 }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="subtitle1" noWrap>
                      {ad.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ad.currency ? `${ad.currency} ` : "$"}{ad.price ?? ""}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1} alignItems="center">
                      <Chip label={ad.status} size="small" color="primary" />
                      <Typography variant="caption" color="text.secondary">
                        {ad.view_count ?? 0} views
                      </Typography>
                    </Stack>
                  </CardContent>
                  <Box sx={{ display: "flex", gap: 1, p: 1 }}>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => onEditAd(ad.id)}>Edit</Button>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onDeleteAd(ad.id)}>Delete</Button>
                    <Button size="small" onClick={() => navigate(`sellers/ads/${ad.id}/details`)}>View</Button>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Paper>
  </Grid>

  {/* Recent Inquiries */}
  <Grid item xs={12} md={5}>
    <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "#e8f4ff" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Recent Inquiries</Typography>
        <Button size="small" onClick={() => navigate("/sellers/messages")}>See all</Button>
      </Box>

      <List dense>
        {messages.length === 0 ? (
          <Typography color="text.secondary">No buyer messages yet.</Typography>
        ) : (
          messages.slice(0, 6).map((m) => (
            <React.Fragment key={m.id}>
              <ListItem
                secondaryAction={
                  <Tooltip title="Open chat">
                    <IconButton edge="end" size="small" onClick={() => openChat(m.chat_id || m.chat)}>
                      <ChatIcon />
                    </IconButton>
                  </Tooltip>
                }
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: "#ffffff",
                  "&:hover": { bgcolor: "#dbeeff" }
                }}
              >
                <ListItemAvatar>
                  <Avatar src={m.sender_avatar || undefined}>{m.sender_username?.[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={m.sender_username || "Buyer"}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary" noWrap>
                        {m.text}
                      </Typography>
                      <Typography component="div" variant="caption" color="text.secondary">
                        {m.ad_title ? ` — ${m.ad_title}` : ""}{" "}
                        <span style={{ whiteSpace: "nowrap" }}>{new Date(m.created_at).toLocaleString()}</span>
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))
        )}
      </List>
    </Paper>
  </Grid>
</Grid>

{/* Orders summary */}
<Box mt={5}>
  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "#fff4e6" }}>
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
      <Typography variant="h6">Recent Orders</Typography>
      <Button size="small" onClick={() => navigate("/sellers/orders")}>View all</Button>
    </Box>

    {orders.length === 0 ? (
      <Typography color="text.secondary">No recent orders.</Typography>
    ) : (
      <Grid container spacing={1}>
        {orders.slice(0, 5).map((o) => (
          <Grid item xs={12} sm={6} md={3} key={o.id}>
            <Paper
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: "#fff",
                "&:hover": { boxShadow: 6, bgcolor: "#fff7e6" },
                transition: "all 0.2s"
              }}
            >
              <Typography variant="subtitle2">Order #{o.id}</Typography>
              <Typography variant="body2" color="text.secondary">{o.status} • {o.total}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(o.created_at).toLocaleDateString()}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    )}
  </Paper>
</Box>


  <Divider sx={{ borderColor: "#e0e7ef", mb: 3 }} />
    <Divider sx={{ borderColor: "#e0e7ef", mb: 3 }} />
<Box mt={4} mb={4}>
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="h6" mb={2}>
      Dashboard Overview
    </Typography>
    <StatsBarChart data={chartData} />
  </Paper>
</Box>


      {/* Floating chat button */}
      <Box
        sx={{
          position: "fixed",
          right: 20,
          bottom: 24,
          zIndex: 1400,
        }}
      >
        <Tooltip title="Open Chat">
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{
              bgcolor: theme.palette.primary.main,
              color: "#fff",
              "&:hover": { bgcolor: theme.palette.primary.dark },
              boxShadow: 3,
            }}
            size="large"
          >
            <ChatIcon />
          </IconButton>
        </Tooltip>
      </Box>



      {/* Chat Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 380, p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Messages</Typography>
            <Button size="small" onClick={() => navigate("/sellers/messages")}>All</Button>
          </Box>

          {/* If activeChatId is set show quick reply panel */}
          {activeChatId ? (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Quick reply
              </Typography>
              <TextField
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a quick message..."
                multiline
                minRows={2}
                fullWidth
              />
              <Stack direction="row" spacing={1} mt={1}>
                <Button
                  variant="contained"
                  onClick={() => sendQuickReply(activeChatId)}
                  disabled={sending}
                >
                  Send
                </Button>
                <Button onClick={() => { setActiveChatId(null); setReplyText(""); }}>Close</Button>
              </Stack>
            </>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Recent Inquiries
              </Typography>
              <List>
                {(messages || []).slice(0, 20).map((m) => (
                  <ListItem key={m.id} button onClick={() => openChat(m.chat_id || m.chat || m.chat_id)}>
                    <ListItemAvatar>
                      <Avatar>{m.sender_username?.[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={m.sender_username}
                      secondary={
                        <>
                          <Typography noWrap variant="body2" color="text.primary">{m.text}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {m.ad_title ? `— ${m.ad_title} • ` : ""}
                            {new Date(m.created_at).toLocaleString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}
