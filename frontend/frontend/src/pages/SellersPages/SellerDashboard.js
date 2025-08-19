import React, { useContext, useState, useMemo } from "react";
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
  useMediaQuery,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ChatIcon from "@mui/icons-material/Chat";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";
import { SellerDashboardContext } from "./index";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { API_BASE_URL } from "../../constants";

/* Palette */
const COLORS = ["#6C5CE7", "#00B894", "#0984e3", "#fdcb6e", "#e17055", "#00cec9", "#636e72"];

function formatCurrency(val) {
  if (val == null || Number.isNaN(Number(val))) return "-";
  return `$${Number(val).toFixed(2)}`;
}

/* Reusable Section wrapper with left accent and label */
const Section = ({ title, color = COLORS[0], actions = null, children, sx = {}, role }) => (
  <Paper
    elevation={1}
    role={role || "region"}
    aria-label={title}
    sx={{
      borderLeft: `6px solid ${color}`,
      p: { xs: 1, sm: 1.5 },
      backgroundColor: `${color}0F`, // subtle tint
      ...sx,
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
      </Box>
      {actions}
    </Stack>
    <Divider sx={{ mb: 1 }} />
    <Box sx={{ mt: 1 }}>{children}</Box>
  </Paper>
);

/* Stat card (uniform) */
const StatCard = ({ title, value, onClick, color = "#fff", cta }) => (
  <Card
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 2,
      p: 2,
      minHeight: 100,
      cursor: onClick ? "pointer" : "default",
      borderRadius: 2,
      boxShadow: 3,
      transition: "transform 0.12s ease",
      "&:hover": onClick ? { transform: "translateY(-3px)" } : {},
      backgroundColor: `${color}20`,
    }}
  >
    <Box sx={{ width: 8, height: 56, backgroundColor: color, borderRadius: 1 }} />
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {value ?? 0}
      </Typography>
      {cta && (
        <Typography variant="caption" color="text.secondary">
          {cta}
        </Typography>
      )}
    </Box>
  </Card>
);

/* Colored bar chart for overview */
const StatsBarChart = ({ data }) => {
  const getColor = (name) => {
    if (name === "Active Ads") return "#FFD700";
    if (name === "Views") return "#90EE90";
    if (name === "Messages") return "#ADD8E6";
    if (name === "Leads") return "#FFB6C1";
    return "#1976d2";
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 12, right: 12, bottom: 6, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis />
        <RechartsTooltip />
        <Legend verticalAlign="top" />
        <Bar dataKey="value" name="Count">
          {data.map((entry) => (
            <Cell key={entry.name} fill={getColor(entry.name)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default function SellerDashboard() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const isMd = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const {
    user,
    stats = {},
    my_ads = [],
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

  const openChat = (chatId) => {
    setActiveChatId(chatId);
    setDrawerOpen(true);
    setReplyText("");
  };

  const sendQuickReply = async (chatId) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/send/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: replyText, chat_id: chatId, sender_id: userId }),
      });
      if (!res.ok) {
        console.error("Failed to send message", await res.text());
      } else {
        setReplyText("");
      }
    } catch (err) {
      console.error("Network error sending message", err);
    } finally {
      setSending(false);
    }
  };

  const onEditAd = (adId, catName) => navigate(`/sellers/edit/${adId}/${encodeURIComponent(catName)}/ads`);

  const onDeleteAd = async (adId) => {
    if (!window.confirm("Delete this ad? This action cannot be undone.")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/seller/delete/ads/${adId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  const chartData = useMemo(
    () => [
      { name: "Active Ads", value: stats.total_active_ads || 0 },
      { name: "Views", value: stats.total_views_this_month || 0 },
      { name: "Messages", value: stats.messages_count || 0 },
      { name: "Leads", value: stats.total_leads || 0 },
    ],
    [stats]
  );

  return (
    <>
      {/* Header */}
      <Box display="flex" flexDirection={isSm ? "column" : "row"} alignItems="center" justifyContent="space-between" gap={2} mb={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={user?.avatar || userAvatar} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Welcome back, {firstName || user?.first_name || "Seller"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage listings, respond to buyers, and track performance — quick overview below.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate("/sellers/categories")} startIcon={<ChatIcon />}>
            Post New Ads
          </Button>
          <Button variant="outlined" startIcon={<VisibilityIcon />} onClick={() => navigate("/sellers/analytics")}>
            Analytics
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "#0c0d0eff", mb: 2 }} />

      {/* Summary stat cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Ads" value={stats.total_active_ads} onClick={() => navigate("/sellers/ads/list")} color="#FFD700" cta="View ads" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Views (this month)" value={stats.total_views_this_month} onClick={() => navigate("/sellers/analytics")} color="#90EE90" cta="Analytics" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Messages" value={stats.messages_count} onClick={() => setDrawerOpen(true)} color="#ADD8E6" cta="Open messages" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Leads" value={stats.total_leads} onClick={() => navigate("/sellers/orders")} color="#FFB6C1" cta="View leads" />
        </Grid>
      </Grid>

      {/* Main content */}
      <Grid container spacing={2}>
        {/* Left: My Ads */}
        <Grid item xs={12} lg={7}>
          <Section title="My Ads" color={COLORS[0]} actions={<Button size="small" onClick={() => navigate("/sellers/ads/list")}>View all</Button>} role="region">
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
                        transition: "transform 0.12s ease, box-shadow 0.12s ease",
                        "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
                        backgroundColor: "#fff",
                      }}
                    >
                      {ad.header_image_url ? (
                        <CardMedia component="img" image={ad.header_image_url} alt={ad.title} sx={{ width: 140, objectFit: "cover" }} />
                      ) : (
                        <Box sx={{ width: 140, bgcolor: "grey.100" }} />
                      )}

                      <Box sx={{ flex: 1 }}>
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                            {ad.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {ad.currency ? `${ad.currency} ` : "$"}
                            {ad.price ?? ""}
                          </Typography>
                          <Stack direction="row" spacing={1} mt={1} alignItems="center">
                            <Chip label={ad.status || "status"} size="small" />
                            <Typography variant="caption" color="text.secondary">
                              {ad.view_count ?? 0} views
                            </Typography>
                          </Stack>
                        </CardContent>

                        <Box sx={{ display: "flex", gap: 1, p: 1, pt: 0 }}>
                          <Button size="small" startIcon={<EditIcon />} onClick={() => onEditAd(ad.id, ad.catName)}>
                            Edit
                          </Button>
                          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onDeleteAd(ad.id)}>
                            Delete
                          </Button>
                          <Button size="small" onClick={() => navigate(`/sellers/ads/${ad.id}/details`)}>
                            View
                          </Button>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Section>
        </Grid>

        {/* Right: Recent Inquiries + orders preview */}
        <Grid item xs={12} lg={5}>
          <Stack spacing={2}>
            <Section title="Recent Inquiries" color={COLORS[1]} actions={<Button size="small" onClick={() => navigate("/sellers/messages")}>See all</Button>}>
              <List sx={{ p: 0 }}>
                {messages.length === 0 ? (
                  <Typography color="text.secondary">No buyer messages yet.</Typography>
                ) : (
                  messages.slice(0, 6).map((m) => (
                    <ListItem
                      key={m.id}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: "#ffffff",
                        "&:hover": { bgcolor: "#eef9f3" },
                        cursor: "pointer",
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar src={m.sender_avatar || undefined}>{m.sender_username?.[0]}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography sx={{ fontWeight: 700 }}>{m.sender_username || "Buyer"}</Typography>}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary" noWrap>
                              {m.text}
                            </Typography>
                            <Typography component="div" variant="caption" color="text.secondary">
                              {m.ad_title ? ` — ${m.ad_title}` : ""} <span style={{ whiteSpace: "nowrap" }}>{new Date(m.created_at).toLocaleString()}</span>
                            </Typography>
                          </>
                        }
                      />
                      <Box>
                        <Tooltip title="Open chat">
                          <IconButton size="small" onClick={() => openChat(m.chat_id || m.chat)}>
                            <ChatIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  ))
                )}
              </List>
            </Section>

            <Section title="Recent Orders" color={COLORS[2]} actions={<Button size="small" onClick={() => navigate("/sellers/orders")}>View all</Button>}>
              {orders.length === 0 ? (
                <Typography color="text.secondary">No recent orders.</Typography>
              ) : (
                <Grid container spacing={1}>
                  {orders.slice(0, 6).map((o) => (
                    <Grid item xs={12} sm={6} key={o.id}>
                      <Paper
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: "#fff",
                          "&:hover": { boxShadow: 6, bgcolor: "#fff7e6" },
                          transition: "all 0.12s",
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Order #{o.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {o.status} • {formatCurrency(o.total)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(o.created_at).toLocaleDateString()}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Section>
          </Stack>
        </Grid>
      </Grid>

      {/* Small spacer */}
      <Box mt={3} />

      {/* Overview chart */}
      <Section title="Dashboard Overview" color={COLORS[3]} sx={{ mb: 2 }}>
        <StatsBarChart data={chartData} />
      </Section>

      {/* Floating chat FAB */}
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
            aria-label="open chat"
          >
            <ChatIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Chat Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: isSm ? "100%" : 420 } }}>
        <Box sx={{ p: 2 }} role="dialog" aria-label="messages drawer">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Messages</Typography>
            <Button size="small" onClick={() => navigate("/sellers/messages")}>
              All
            </Button>
          </Box>

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
                minRows={3}
                fullWidth
                aria-label="quick reply"
              />
              <Stack direction="row" spacing={1} mt={1}>
                <Button variant="contained" onClick={() => sendQuickReply(activeChatId)} disabled={sending}>
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
                  <ListItem button key={m.id} onClick={() => openChat(m.chat_id || m.chat)}>
                    <ListItemAvatar>
                      <Avatar>{m.sender_username?.[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={m.sender_username}
                      secondary={
                        <>
                          <Typography noWrap variant="body2" color="text.primary">
                            {m.text}
                          </Typography>
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
