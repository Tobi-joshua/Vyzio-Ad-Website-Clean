import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Grid,
  CircularProgress,
  Toolbar,
  IconButton,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { API_BASE_URL } from "../constants";
import VyzionHomePageAppBar from "../components/ResponsiveAppBar";





const Ads_Details = () => {
  const {id} = useParams();
  const navigate = useNavigate();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ads/${id}/`)
      .then((res) => res.json())
      .then((data) => {
        setAd(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching ad:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (!ad) {
    return (
      <Typography color="error" align="center" mt={5}>
        Ad not found.
      </Typography>
    );
  }

  return (
  
<Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <VyzionHomePageAppBar />
<Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        {/* Top Toolbar */}
        <Toolbar disableGutters sx={{ mb: 2 }}>
          <IconButton
            onClick={() => navigate("/categories")}
            aria-label="Go back"
            sx={{
              mr: 1,
              backgroundColor: "#fff",
              boxShadow: 1,
              "&:hover": { backgroundColor: "#f0f0f0" },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold">
            {ad.category?.name || "Ad Details"}
          </Typography>
        </Toolbar>

        {/* Main Image */}
        <Card sx={{ mb: 3, borderRadius: 3, overflow: "hidden", boxShadow: 3 }}>
          <CardMedia
            component="img"
            height="500"
            image={ad.header_image_url || "https://via.placeholder.com/900x500?text=No+Image"}
            alt={ad.title}
          />
        </Card>

        {/* Scrollable Thumbnails */}
        {ad.images?.length > 0 && (
          <Box
            sx={{
              display: "flex",
              overflowX: "auto",
              gap: 2,
              pb: 1,
              mb: 4,
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {ad.images.map((img) => (
              <Card
                key={img.id}
                sx={{
                  flex: "0 0 auto",
                  width: 150,
                  height: 100,
                  borderRadius: 2,
                  overflow: "hidden",
                  boxShadow: 2,
                }}
              >
                <CardMedia
                  component="img"
                  height="100"
                  image={img.image_url}
                  alt={`Image ${img.id}`}
                  sx={{ objectFit: "cover" }}
                />
              </Card>
            ))}
          </Box>
        )}


<Grid container spacing={3}>
          {/* Left - Ad Details */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {ad.title}
                </Typography>
                <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>
                  {ad.currency} {Number(ad.price).toLocaleString()}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {ad.description}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  📍 {ad.city}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  📅 {new Date(ad.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

         {/* Right - Seller Info */}
<Grid item xs={12} md={4}>
  <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={2}>
        <Avatar
          src={ad.user_avatar_url || ""}
          alt={ad.user_first_name || "Seller"}
          sx={{
            width: 60,
            height: 60,
            mr: 2,
            border: "2px solid #eee",
          }}
        />
        <Box>
          <Typography fontWeight="bold">
            {ad.user_first_name || "Unknown Seller"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Member since {ad.member_since}
          </Typography>
        </Box>
      </Box>

      {/* Seller Stats */}
      <Typography variant="body2" sx={{ mb: 1 }}>
        📦 Total Ads Posted: {ad.total_ads_posted}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        ⭐ Average Rating: {Number(ad.average_rating).toFixed(1) || 0.00} of 5
      </Typography>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        sx={{ borderRadius: 2 }}
        onClick={() => setOpen(true)}
      >
        Contact Seller
      </Button>
    </CardContent>
  </Card>
</Grid>
        </Grid>
      </Container>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Login Required</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            You must be logged in to contact the seller.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => (window.location.href = "/login")}
            color="secondary"
            variant="outlined"
          >
            Register
          </Button>
          <Button
            onClick={() => (window.location.href = "/login")}
            color="primary"
            variant="contained"
          >
            Login
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Ads_Details;
