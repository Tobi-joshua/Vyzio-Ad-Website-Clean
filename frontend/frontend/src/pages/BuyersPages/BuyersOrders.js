import React, { useEffect, useState, useContext } from "react";
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
  Button
} from "@mui/material";
import { BuyerDashboardContext } from "./index";
import { API_BASE_URL } from "../../constants";

const statusColors = {
  pending: "warning",
  paid: "info",
  shipped: "primary",
  completed: "success",
  cancelled: "error",
};

export default function BuyerOrders() {
  const { userId } = useContext(BuyerDashboardContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    fetch(`${API_BASE_URL}/api/buyer/${userId}/orders/`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load orders");
        return res.json();
      })
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: 700, mb: 2, color: "darkblue" }}
      >
        My Orders
      </Typography>

      <List>
        {orders.length === 0 && (
          <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
            No orders yet.
          </Typography>
        )}
        {orders.map(order => (
          <React.Fragment key={order.order_id}>
            <ListItem
              sx={{
                backgroundColor: "white",
                borderRadius: 2,
                boxShadow: 1,
                mb: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <Box>
                <ListItemText
                  primary={`${order.ad_title}`}
                  secondary={`Ordered on ${order.created_at}`}
                />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  ${order.total}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={order.status}
                  color={statusColors[order.status] || "default"}
                  size="small"
                />
                {order.ad_id && (
                  <Button
                    href={`/ads/${order.ad_id}`}
                    variant="outlined"
                    size="small"
                  >
                    View Ad
                  </Button>
                )}
              </Stack>
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}
