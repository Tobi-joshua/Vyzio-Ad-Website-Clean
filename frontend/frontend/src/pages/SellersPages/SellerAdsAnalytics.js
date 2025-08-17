import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  Box, Typography, Grid, Card, CardContent, CircularProgress, Stack, Button, Divider, Avatar, List, ListItem, ListItemText
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { SellerDashboardContext } from "./index";
import { API_BASE_URL } from "../../constants";
import { useWebToast } from "../../hooks/useWebToast";

import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, Cell, PieChart, Pie
} from "recharts";

// small palette
const COLORS = ['#6C5CE7','#00B894','#0984e3','#fdcb6e','#e17055','#00cec9','#636e72'];

export default function SellerAdsAnalytics() {
  const { token } = useContext(SellerDashboardContext || {});
  const showToast = useWebToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
        <Button startIcon={<RefreshIcon />} onClick={() => { setRefreshing(true); fetchAnalytics(); }}>Retry</Button>
      </Box>
    );
  }

  // Prepare datasets for charts
  const monthlyViews = (data.monthly_views_last_12 || []).map(x => ({ name: x.label, views: x.views }));
  const dailyViews = (data.daily_views_last_30 || []).map(x => ({ name: x.label.slice(5), views: x.views })); // show MM-DD
  const monthlyEarnings = (data.monthly_earnings_last_12 || []).map(x => ({ name: x.label, earnings: Number(x.earnings || 0) }));
  const ordersByStatus = data.orders_by_status || {};
  const ordersStatusArray = Object.keys(ordersByStatus).map((k, i) => ({ name: k, value: ordersByStatus[k], color: COLORS[i % COLORS.length] }));

  const topAds = data.top_ads || [];
  const recentMessages = data.recent_messages || [];
  const recentOrders = data.recent_orders || [];

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Seller analytics</Typography>
        <Button startIcon={<RefreshIcon />} onClick={() => { setRefreshing(true); fetchAnalytics(); }} disabled={refreshing}>
          Refresh
        </Button>
      </Stack>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Active ads</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{data.summary?.total_active_ads ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Views (this month)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{data.summary?.total_views_this_month ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Leads</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{data.summary?.total_leads ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Earnings (all time)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>${Number(data.summary?.earnings_total ?? 0).toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Left: Monthly views bar and daily line */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Monthly views (last 12 months)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyViews}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" fill={COLORS[0]}>
                    {monthlyViews.map((entry, idx) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Daily views (last 30 days)</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyViews}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke={COLORS[1]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: earnings & orders & top ads */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1">Orders by status</Typography>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ordersStatusArray} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" />
                  <Tooltip />
                  <Bar dataKey="value" >
                    {ordersStatusArray.map((entry, i) => (
                      <Cell key={`cell-status-${i}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Monthly earnings (last 12 months)</Typography>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(val) => `$${Number(val).toFixed(2)}`} />
                  <Bar dataKey="earnings" fill={COLORS[2]}>
                    {monthlyEarnings.map((entry, idx) => <Cell key={`earn-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Top ads</Typography>
              <List dense>
                {topAds.length === 0 && <Typography color="text.secondary">No ads yet</Typography>}
                {topAds.map((ad, idx) => (
                  <ListItem key={ad.id} sx={{ py: 1 }}>
                    <Avatar src={ad.header_image_url} sx={{ width: 48, height: 48, mr: 1 }} />
                    <ListItemText primary={ad.title} secondary={`Views: ${ad.views} • $${Number(ad.earnings || 0).toFixed(2)}`} />
                    <Button size="small" href={`/sellers/ads/${ad.id}/details`}>View</Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Recent messages</Typography>
              <Divider sx={{ my: 1 }} />
              {recentMessages.length === 0 ? (
                <Typography color="text.secondary">No messages</Typography>
              ) : (
                recentMessages.map(m => (
                  <Box key={m.id} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">{m.sender_username} — <Typography component="span" variant="caption" color="text.secondary">{new Date(m.created_at).toLocaleString()}</Typography></Typography>
                    <Typography variant="body2">{m.text}</Typography>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Recent orders</Typography>
              <Divider sx={{ my: 1 }} />
              {recentOrders.length === 0 ? (
                <Typography color="text.secondary">No orders yet</Typography>
              ) : (
                recentOrders.map(o => (
                  <Box key={o.id} sx={{ mb: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="subtitle2">{o.ad_title}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(o.created_at).toLocaleString()}</Typography>
                    </Stack>
                    <Typography variant="body2">Total: ${Number(o.total).toFixed(2)} • Status: {o.status}</Typography>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
