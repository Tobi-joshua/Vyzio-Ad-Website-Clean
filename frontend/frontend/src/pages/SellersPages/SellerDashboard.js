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

export default function SellerDashboard() {
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
  } = useContext(SellerDashboardContext);

  // chat drawer / quick reply state
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
        // Ideally trigger context refresh — for now, reload or navigate
        window.location.reload();
      } else {
        console.error("Delete failed", await resp.text());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // small reusable card for stat
  const StatCard = ({ title, value, cta, onClick }) => (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        p: 2,
        borderRadius: 2,
        boxShadow: 3,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
        {value ?? 0}
      </Typography>
      {cta && (
        <Button
          size="small"
          variant="outlined"
          sx={{ mt: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            onClick && onClick();
          }}
        >
          {cta}
        </Button>
      )}
    </Card>
  );

  return (
    <>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={user?.avatar || user?.avatar_url} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Welcome back, {user?.firstname || "Seller"}
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
            onClick={() => navigate("/seller/ads/new")}
          >
            Post New Ad
          </Button>
          <Button variant="outlined" onClick={() => setDrawerOpen(true)} startIcon={<ChatIcon />}>
            Messages
          </Button>
          <Button variant="text" onClick={() => navigate("/seller/earnings")}>
            Earnings
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "#e0e7ef", mb: 3 }} />

      {/* Stats row */}
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Active Ads"
                value={stats.total_active_ads}
                cta="View Ads"
                onClick={() => navigate("/seller/ads")}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Views (this month)"
                value={stats.total_views_this_month}
                cta="View analytics"
                onClick={() => navigate("/seller/analytics")}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Messages"
                value={stats.messages_count}
                cta="Open messages"
                onClick={() => setDrawerOpen(true)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Leads"
                value={stats.total_leads}
                cta="View leads"
                onClick={() => navigate("/seller/leads")}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              Earnings
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {earnings_total ?? "$0.00"}
            </Typography>
            <Button sx={{ mt: 1 }} size="small" onClick={() => navigate("/seller/earnings")}>
              View transactions
            </Button>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Performance
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
              <Typography variant="body2">Conversion</Typography>
              <Chip
                label={`${performance_insights.conversion_rate_percent ?? 0}%`}
                size="small"
                color="primary"
              />
            </Stack>
            {performance_insights.most_viewed_ad ? (
              <Box mt={2} display="flex" gap={1} alignItems="center">
                <Avatar
                  variant="square"
                  src={performance_insights.most_viewed_ad.header_image_url}
                  sx={{ width: 64, height: 48, borderRadius: 1 }}
                />
                <Box>
                  <Typography variant="subtitle2" noWrap>
                    {performance_insights.most_viewed_ad.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {performance_insights.most_viewed_ad.views ?? 0} views
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" mt={2}>
                No views yet — share your listing to get traffic.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Main content: My Ads + Messages */}
      <Grid container spacing={2} mt={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">My Ads</Typography>
              <Button size="small" onClick={() => navigate("/seller/ads")}>
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
                    <Card sx={{ display: "flex", height: "100%" }}>
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
                            <Chip label={ad.status} size="small" />
                            <Typography variant="caption" color="text.secondary">
                              {ad.view_count ?? 0} views
                            </Typography>
                          </Stack>
                        </CardContent>
                        <Box sx={{ display: "flex", gap: 1, p: 1 }}>
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => onEditAd(ad.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => onDeleteAd(ad.id)}
                          >
                            Delete
                          </Button>
                          <Button
                            size="small"
                            onClick={() => navigate(`/ads/${ad.id}/details`)}
                          >
                            View
                          </Button>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Inquiries</Typography>
              <Button size="small" onClick={() => navigate("/seller/messages")}>
                See all
              </Button>
            </Box>

            <List dense>
              {messages.length === 0 ? (
                <Typography color="text.secondary">No buyer messages yet.</Typography>
              ) : (
                messages.slice(0, 6).map((m) => (
                  <React.Fragment key={m.id}>
                    <ListItem
                      secondaryAction={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Tooltip title="Open chat">
                            <IconButton edge="end" size="small" onClick={() => openChat(m.chat_id || m.chat_id || m.chat)}>
                              <ChatIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
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
                    <Divider component="li" />
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Orders summary */}
      <Box mt={3}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">Recent Orders</Typography>
            <Button size="small" onClick={() => navigate("/seller/orders")}>View all</Button>
          </Box>

          {orders.length === 0 ? (
            <Typography color="text.secondary">No recent orders.</Typography>
          ) : (
            <Grid container spacing={1}>
              {orders.slice(0, 5).map((o) => (
                <Grid item xs={12} sm={6} md={3} key={o.id}>
                  <Paper sx={{ p: 1 }}>
                    <Typography variant="subtitle2">Order #{o.id}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {o.status} • {o.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(o.created_at).toLocaleDateString()}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
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
            <Button size="small" onClick={() => navigate("/seller/messages")}>All</Button>
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
