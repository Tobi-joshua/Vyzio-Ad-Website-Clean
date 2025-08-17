// SellerOrders.jsx
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  CircularProgress,
  Chip,
  Stack,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  IconButton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { SellerDashboardContext } from "./index";
import { API_BASE_URL } from "../../constants";
import { useWebToast } from "../../hooks/useWebToast";

const STATUS_CHOICES = ["pending", "paid", "shipped", "completed", "cancelled"];

const statusColors = {
  pending: "warning",
  paid: "info",
  shipped: "primary",
  completed: "success",
  cancelled: "error",
};

export default function SellerOrders() {
  const { userId, token } = useContext(SellerDashboardContext || {});
  const showToast = useWebToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // map of orderId -> updating boolean
  const [updatingMap, setUpdatingMap] = useState({});
  // local edit buffer: orderId -> newStatus
  const [editStatus, setEditStatus] = useState({});

  // helpers for headers (uses token if present)
  const getAuthHeaders = useCallback(() => {
    const h = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const getJsonHeaders = useCallback(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/api/seller/${userId}/orders/`;
      const res = await fetch(url, { headers: getAuthHeaders(), credentials: "include" });
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      // initialize local edit buffer to current statuses
      const initial = {};
      (data || []).forEach(o => { initial[o.order_id] = o.status; });
      setEditStatus(initial);
    } catch (err) {
      console.error(err);
      showToast({ message: "Failed to load orders", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchOrders();
  }, [userId, token]);

  const updateOrderStatus = async (orderId, newStatus) => {
    if (!orderId) return;
    if (!STATUS_CHOICES.includes(newStatus)) {
      showToast({ message: "Invalid status", severity: "error" });
      return;
    }

    // optimistic update
    setUpdatingMap(m => ({ ...m, [orderId]: true }));
    const prevOrders = orders;
    const nextOrders = orders.map(o => (o.order_id === orderId ? { ...o, status: newStatus } : o));
    setOrders(nextOrders);

    try {
      const url = `${API_BASE_URL}/api/seller/orders/${orderId}/`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: getJsonHeaders(),
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Failed to update order");
      }

      const updated = await res.json();
      // Update orders array with response (best authoritative)
      setOrders(prev => prev.map(o => (o.order_id === orderId ? ({ ...o, status: updated.status || newStatus }) : o)));
      showToast({ message: "Order status updated", severity: "success" });
    } catch (err) {
      console.error("Update order status error:", err);
      setOrders(prevOrders);
      showToast({ message: err.message || "Failed to update order", severity: "error" });
      setEditStatus(s => ({ ...s, [orderId]: prevOrders.find(p => p.order_id === orderId)?.status || "pending" }));
    } finally {
      setUpdatingMap(m => {
        const c = { ...m };
        delete c[orderId];
        return c;
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 820, mx: "auto", mt: 4, px: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "darkblue" }}>
          My Orders
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchOrders} size="small">
          Refresh
        </Button>
      </Stack>

      <List>
        {orders.length === 0 && (
          <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
            No orders yet.
          </Typography>
        )}

        {orders.map(order => {
          const {
            order_id: orderId,
            ad_id: adId,
            ad_title: adTitle,
            total,
            status,
            created_at,
          } = order;

          const currentEdit = editStatus[orderId] ?? status;
          const isUpdating = !!updatingMap[orderId];

          // Decide whether to show the "Pay & Publish" / "Approve" button:
          // You asked: sellers should not see "Pay and publish" if ad is active already.
          // This logic is about orders, so we just show the status control for all.
          // If you have additional business rules (e.g. only allow "paid"->"shipped"), enforce them here.

          return (
            <React.Fragment key={orderId}>
              <ListItem
                sx={{
                  backgroundColor: "white",
                  borderRadius: 2,
                  boxShadow: 1,
                  mb: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                secondaryAction={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={status} color={statusColors[status] || "default"} size="small" />

                    {/* Select to change status */}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel id={`status-label-${orderId}`} sx={{ fontSize: 12 }}>Status</InputLabel>
                      <Select
                        labelId={`status-label-${orderId}`}
                        value={currentEdit}
                        label="Status"
                        onChange={(e) => setEditStatus(s => ({ ...s, [orderId]: e.target.value }))}
                        disabled={isUpdating}
                      >
                        {STATUS_CHOICES.map(st => (
                          <MenuItem key={st} value={st}>
                            {st.charAt(0).toUpperCase() + st.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => updateOrderStatus(orderId, currentEdit)}
                      disabled={isUpdating || currentEdit === status}
                    >
                      {isUpdating ? <CircularProgress size={16} color="inherit" /> : "Update"}
                    </Button>

                    {adId && (
                      <Button
                        size="small"
                        variant="outlined"
                        href={`/buyers/ads/${adId}/details`}
                      >
                        View Ad
                      </Button>
                    )}
                  </Stack>
                }
              >
                <Box>
                  <ListItemText
                    primary={adTitle || "Ad Deleted"}
                    secondary={`Ordered on ${created_at}`}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    ${total}
                  </Typography>
                </Box>
              </ListItem>
              <Divider />
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
}
