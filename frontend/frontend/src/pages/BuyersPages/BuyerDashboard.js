import React, { useContext } from "react";
import {
  Container,
  Typography,
  Avatar,
  Grid,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Box,
  Toolbar,
  IconButton,
  Button,
  Stack,
  Paper,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { BuyerDashboardContext } from "./index"; 

export default function BuyerDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();

  // Consume context here
  const {
    firstName,
    userAvatar,
    stats,
    recommended_ads,
  } = useContext(BuyerDashboardContext);

  // stat card gradients
  const statGradients = [
    "linear-gradient(135deg,#00c6ff 0%, #0072ff 100%)",
    "linear-gradient(135deg,#8e2de2 0%, #4a00e0 100%)",
    "linear-gradient(135deg,#ffb347 0%, #ffcc33 100%)",
  ];

  // ------------ RENDER ------------
  return (
    <>
      {/* Header inside wrapper */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
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

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => navigate("/buyers/categories")}>
            Browse Ads
          </Button>
          <Button variant="outlined" onClick={() => navigate("/buyers/messages-list")}>
            Messages
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "#cfd8dc", mb: 3 }} />

      {/* Stats row + Quick Links */}
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={8}>
          <Grid
            container
            spacing={2}
            direction={{ xs: "column", sm: "column", md: "row" }}
            justifyContent={{ xs: "center", sm: "center", md: "flex-start" }}
          >
            {[
              {
                title: "Saved Ads",
                value: stats.saved_ads_count || 0,
                cta: "View saved ads",
                onClick: () => navigate("/buyers/my-saved-ads"),
              },
              {
                title: "Messages",
                value: stats.messages_count || 0,
                cta: "View messages",
                onClick: () => navigate("/buyers/messages-list"),
              },
              {
                title: "Recently Viewed",
                value: stats.recently_viewed_count || 0,
                cta: "See recent",
                onClick: () => navigate("/buyers/view-history"),
              },
            ].map((s, idx) => (
              <Grid
                item
                xs={10} 
                sm={8} 
                md={4}
                key={s.title}
              >
                <Card
                  sx={{
                    maxWidth: 320, 
                    margin: "0 auto", 
                    color: "common.white",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: statGradients[idx % statGradients.length],
                    boxShadow: 3,
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-6px)",
                      boxShadow: "0 12px 20px rgba(0,0,0,0.25)",
                    },
                  }}
                  onClick={s.onClick}
                  elevation={6}
                >
                  <CardContent sx={{ flex: 1, textAlign: "center" }}>
                    <Typography variant="subtitle2" sx={{ opacity: 0.95 }}>
                      {s.title}
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
                      {s.value}
                    </Typography>
                    <Button
                      size="small"
                      sx={{ mt: 2, color: "common.white", borderColor: "rgba(255,255,255,0.2)" }}
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        s.onClick();
                      }}
                    >
                      {s.cta}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: 1,
              backgroundColor: "#f0f4f8",
              borderRadius: 2,
              transition: "box-shadow 0.3s ease",
              "&:hover": {
                boxShadow: "0 8px 16px rgba(70, 130, 180, 0.3)",
              },
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1, color: "darkblue" }}>
                Quick Links
              </Typography>
              <Stack spacing={1}>
                {[
                  { label: "Browse categories", path: "/buyers/categories" },
                  { label: "My Saved ads", path: "/buyers/my-saved-ads" },
                  { label: "My Applications", path: "/buyers/my-applications" },
                  { label: "My Messages", path: "/buyers/messages-list" },
                  { label: "My orders", path: "/buyers/orders" },
                ].map(({ label, path }) => (
                  <Button
                    key={label}
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate(path)}
                    sx={{
                      borderColor: "#4a90e2",
                      color: "#4a90e2",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "#e3f2fd",
                        borderColor: "#357ABD",
                      },
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </Stack>
            </Box>
            <Box mt={2}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: "nowrap", overflow: "hidden" }}
              >
                <marquee>
                  Pro tip: Use filters on Browse to narrow results by location, price or category.
                </marquee>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recommended Ads under Orders */}
      <Box mt={9}>
        <Card sx={{ bgcolor: "#f5f7fa" }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ color: "darkblue" }}>
                Recommended Ads
              </Typography>
              <Button size="small" onClick={() => navigate("/buyers/categories")}>
                See all
              </Button>
            </Box>

            {recommended_ads.length === 0 ? (
              <Typography color="text.secondary">
                No recommendations yet. Keep browsing to get personalized picks.
              </Typography>
            ) : (
              <Box sx={{ overflowX: "auto", display: "flex", gap: 1, pb: 1 }}>
                {recommended_ads.slice(0, 10).map((ad) => (
                  <Card
                    key={ad.id}
                    sx={{
                      minWidth: 200,
                      flexShrink: 0,
                      cursor: "pointer",
                      boxShadow: 1,
                      borderRadius: 2,
                      bgcolor: "#fff",
                    }}
                    onClick={() => navigate(`/ads/${ad.id}/details`)}
                  >
                    {ad.header_image_url ? (
                      <CardMedia
                        component="img"
                        height="120"
                        image={ad.header_image_url}
                        alt={ad.title}
                        sx={{ borderTopLeftRadius: 8, borderTopRightRadius: 8, objectFit: "cover" }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 120,
                          bgcolor: "grey.200",
                          borderTopLeftRadius: 8,
                          borderTopRightRadius: 8,
                        }}
                      />
                    )}
                    <CardContent>
                      <Typography variant="subtitle2" noWrap>
                        {ad.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ${ad.price}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
