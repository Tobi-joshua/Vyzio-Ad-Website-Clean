import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Stack,
  Button,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Paper,
  useTheme,
  useMediaQuery,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import BarChartIcon from "@mui/icons-material/BarChart";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import MessageIcon from "@mui/icons-material/Message";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { SellerDashboardContext } from "./index";
import { API_BASE_URL } from "../../constants";
import { useWebToast } from "../../hooks/useWebToast";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Cell,
} from "recharts";

// section colors (used for accents and soft backgrounds)
const SECTION_COLORS = [
  "#6C5CE7",
  "#00B894",
  "#0984e3",
  "#fdcb6e",
  "#e17055",
  "#00cec9",
  "#636e72",
];

function formatCurrency(val) {
  if (val == null || Number.isNaN(Number(val))) return "-";
  return `$${Number(val).toFixed(2)}`;
}

export default function SellerAdsAnalytics() {
  const { token } = useContext(SellerDashboardContext || {});
  const showToast = useWebToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const isMd = useMediaQuery(theme.breakpoints.down("md"));

  const getAuthHeaders = useCallback(() => {
    const h = { "Content-Type": "application/json" };
    const t = token || localStorage.getItem("token");
    if (t) h["Authorization"] = `Bearer ${t}`;
    return h;
  }, [token]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/seller/analytics/`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to load analytics");
      }
      const payload = await res.json();
      setData(payload);
    } catch (err) {
      console.error(err);
      showToast({ message: err.message || "Failed to load analytics", severity: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">No analytics available</Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            setRefreshing(true);
            fetchAnalytics();
          }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // datasets
  const monthlyViews = (data.monthly_views_last_12 || []).map((x) => ({ name: x.label, views: x.views }));
  const dailyViews = (data.daily_views_last_30 || []).map((x) => ({ name: x.label.slice(5), views: x.views }));
  const monthlyEarnings = (data.monthly_earnings_last_12 || []).map((x) => ({ name: x.label, earnings: Number(x.earnings || 0) }));
  const ordersByStatus = data.orders_by_status || {};
  const ordersStatusArray = Object.keys(ordersByStatus).map((k, i) => ({ name: k, value: ordersByStatus[k], color: SECTION_COLORS[i % SECTION_COLORS.length] }));

  const topAds = data.top_ads || [];
  const recentMessages = data.recent_messages || [];
  const recentOrders = data.recent_orders || [];

  // responsive heights
  const mainChartHeight = isSm ? 220 : isMd ? 300 : 380;
  const smallChartHeight = isSm ? 160 : 200;

  // helper to render a colored section container with accent on the left
  const Section = ({ color, title, icon, children }) => (
    <Paper
      elevation={1}
      sx={{
        display: "flex",
        flexDirection: "column",
        p: 2,
        position: "relative",
        overflow: "hidden",
        background: alpha(color, 0.04),
        borderLeft: `6px solid ${color}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Chip label={title.split(" ")[0]} size="small" sx={{ ml: 1, bgcolor: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.2)}` }} />
      </Stack>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ width: "100%" }}>{children}</Box>
    </Paper>
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Seller analytics
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: { xs: 2, sm: 0 } }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { setRefreshing(true); fetchAnalytics(); }} disabled={refreshing}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<MonetizationOnIcon />} onClick={() => showToast({ message: 'Open payments settings', severity: 'info' })}>
            Payments
          </Button>
        </Stack>
      </Stack>

      {/* Summary row - color each tile different */}
      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="stretch">
        {[
          { label: "Active ads", value: data.summary?.total_active_ads ?? 0, color: SECTION_COLORS[0], icon: <BarChartIcon /> },
          { label: "Views (this month)", value: data.summary?.total_views_this_month ?? 0, color: SECTION_COLORS[1], icon: <BarChartIcon /> },
          { label: "Leads", value: data.summary?.total_leads ?? 0, color: SECTION_COLORS[2], icon: <MessageIcon /> },
          { label: "Earnings (all time)", value: formatCurrency(data.summary?.earnings_total ?? 0), color: SECTION_COLORS[3], icon: <MonetizationOnIcon /> },
        ].map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Paper elevation={0} sx={{ p: 0 }}>
              <Paper elevation={1} sx={{ p: 2, background: alpha(card.color, 0.06), borderLeft: `6px solid ${card.color}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack>
                    <Typography variant="subtitle2" color="text.secondary">
                      {card.label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {card.value}
                    </Typography>
                  </Stack>
                  <Avatar sx={{ bgcolor: card.color, width: 44, height: 44 }}>{card.icon}</Avatar>
                </Stack>
              </Paper>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {/* Left: main charts */}
        <Grid item xs={12} md={8}>
          <Section color={SECTION_COLORS[4]} title="Monthly views (last 12 months)" icon={<BarChartIcon />}> 
            <Box sx={{ width: '100%', height: mainChartHeight }}>
              {monthlyViews.length === 0 ? (
                <Typography color="text.secondary">No monthly views data</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyViews} margin={{ top: 8, right: 12, left: -8, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} label={{ value: 'Month', position: 'bottom', offset: 12 }} />
                    <YAxis label={{ value: 'Views', angle: -90, position: 'insideLeft', offset: 8 }} />
                    <Tooltip />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="views">
                      {monthlyViews.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={SECTION_COLORS[idx % SECTION_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Section>

          <Box sx={{ height: 12 }} />

          <Section color={SECTION_COLORS[0]} title="Daily views (last 30 days)" icon={<BarChartIcon />}>
            <Box sx={{ width: '100%', height: smallChartHeight }}>
              {dailyViews.length === 0 ? (
                <Typography color="text.secondary">No daily views data</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyViews} margin={{ top: 8, right: 12, left: -8, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} label={{ value: 'Day (MM-DD)', position: 'bottom', offset: 8 }} />
                    <YAxis label={{ value: 'Views', angle: -90, position: 'insideLeft', offset: 8 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke={SECTION_COLORS[1]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Section>
        </Grid>

        {/* Right column: small charts + top ads */}
        <Grid item xs={12} md={4}>
          <Section color={SECTION_COLORS[2]} title="Orders by status" icon={<ShoppingCartIcon />}>
            <Box sx={{ width: '100%', height: 180 }}>
              {ordersStatusArray.length === 0 ? (
                <Typography color="text.secondary">No orders data</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersStatusArray} layout="vertical" margin={{ left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip />
                    <Bar dataKey="value">
                      {ordersStatusArray.map((entry, i) => (
                        <Cell key={`cell-status-${i}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Section>

          <Box sx={{ height: 12 }} />

          <Section color={SECTION_COLORS[3]} title="Monthly earnings (last 12 months)" icon={<MonetizationOnIcon />}>
            <Box sx={{ width: '100%', height: 160 }}>
              {monthlyEarnings.length === 0 ? (
                <Typography color="text.secondary">No earnings data</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyEarnings} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'bottom', offset: 12 }} />
                    <YAxis label={{ value: 'Earnings ($)', angle: -90, position: 'insideLeft', offset: 8 }} />
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Bar dataKey="earnings">
                      {monthlyEarnings.map((entry, idx) => (
                        <Cell key={`earn-${idx}`} fill={SECTION_COLORS[idx % SECTION_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Section>

          <Box sx={{ height: 12 }} />

          <Section color={SECTION_COLORS[5]} title="Top ads" icon={<BarChartIcon />}>
            <List dense>
              {topAds.length === 0 && <Typography color="text.secondary">No ads yet</Typography>}
              {topAds.map((ad, idx) => (
                <React.Fragment key={ad.id || idx}>
                  <ListItem alignItems="center" secondaryAction={<Button size="small" href={`/sellers/ads/${ad.id}/details`}>View</Button>} sx={{ py: 1 }}>
                    <Avatar src={ad.header_image_url} sx={{ width: 48, height: 48, mr: 1 }} alt={ad.title} variant="rounded" />
                    <ListItemText primary={ad.title} secondary={`Views: ${ad.views} • ${formatCurrency(ad.earnings || 0)}`} />
                  </ListItem>
                  {idx < topAds.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Section>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Section color={SECTION_COLORS[6]} title="Recent messages" icon={<MessageIcon />}>
            {recentMessages.length === 0 ? (
              <Typography color="text.secondary">No messages</Typography>
            ) : (
              recentMessages.map((m, i) => (
                <Box key={m.id || i} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {m.sender_username} — <Typography component="span" variant="caption" color="text.secondary">{new Date(m.created_at).toLocaleString()}</Typography>
                  </Typography>
                  <Typography variant="body2">{m.text}</Typography>
                  {i < recentMessages.length - 1 && <Divider sx={{ my: 1 }} />}
                </Box>
              ))
            )}
          </Section>
        </Grid>

        <Grid item xs={12} md={6}>
          <Section color={SECTION_COLORS[1]} title="Recent orders" icon={<ShoppingCartIcon />}>
            {recentOrders.length === 0 ? (
              <Typography color="text.secondary">No orders yet</Typography>
            ) : (
              recentOrders.map((o, i) => (
                <Box key={o.id || i} sx={{ mb: 1 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle2">{o.ad_title}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(o.created_at).toLocaleString()}</Typography>
                  </Stack>
                  <Typography variant="body2">Total: {formatCurrency(o.total)} • Status: {o.status}</Typography>
                  {i < recentOrders.length - 1 && <Divider sx={{ my: 1 }} />}
                </Box>
              ))
            )}
          </Section>
        </Grid>
      </Grid>
    </Box>
  );
}