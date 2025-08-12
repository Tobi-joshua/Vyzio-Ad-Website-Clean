import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  Avatar,
  useMediaQuery,
  useTheme,
  TextField,
  IconButton,
  InputAdornment,
  Toolbar,Chip,Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate } from "react-router-dom";
import VyzionHomePageAppBar from "../components/ResponsiveAppBar";
import DataLoader from "../components/DataLoader";
import CategoryIcon from "@mui/icons-material/Category";
import { API_BASE_URL } from "../constants";
import StarIcon from '@mui/icons-material/Star';

const statusColors = {
  draft: 'default',
  pending: 'warning',
  active: 'success',
  paused: 'info',
  sold: 'secondary',
  archived: 'default',
};

const iconMap = {
  handyman: require("@mui/icons-material/Handyman").default,
  home: require("@mui/icons-material/Home").default,
  work: require("@mui/icons-material/Work").default,
  school: require("@mui/icons-material/School").default,
  directions_car: require("@mui/icons-material/DirectionsCar").default,
  devices: require("@mui/icons-material/Devices").default,
  style: require("@mui/icons-material/Style").default,
  health_and_safety: require("@mui/icons-material/HealthAndSafety").default,
  pets: require("@mui/icons-material/Pets").default,
  more_horiz: require("@mui/icons-material/MoreHoriz").default,
  grass: require("@mui/icons-material/Grass").default,
  sports_soccer: require("@mui/icons-material/SportsSoccer").default,
  child_care: require("@mui/icons-material/ChildCare").default,
  restaurant: require("@mui/icons-material/Restaurant").default,
  flight_takeoff: require("@mui/icons-material/FlightTakeoff").default,
  palette: require("@mui/icons-material/Palette").default,
  smartphone: require("@mui/icons-material/Smartphone").default,
  event: require("@mui/icons-material/Event").default,
  account_balance: require("@mui/icons-material/AccountBalance").default,
  cleaning_services: require("@mui/icons-material/CleaningServices").default,
};

export default function AdsByCategory() {
  const {id,name} = useParams();
  const CategoryName = decodeURIComponent(name);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");


  useEffect(() => {
    // Fetch ads for category
    setLoading(true);
    fetch(`${API_BASE_URL}/api/categories/${id}/ads/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch ads");
        return res.json();
      })
      .then((data) => {
        setAds(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);


  const filteredAds = ads.filter((ad) =>
    ad.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <DataLoader visible={true} />;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <VyzionHomePageAppBar />
      <Container maxWidth="md" sx={{ py: 4, flexGrow: 1 }}>
        {/* Toolbar with back button and category title */}
        <Toolbar disableGutters sx={{ mb: 2 }}>
          <IconButton
            onClick={() => navigate("/categories")}
            aria-label="Go back to categories"
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            fontWeight={700}
            sx={{ color: "#003366", fontFamily: "'Roboto Slab', serif" }}
          >
            {CategoryName || "Category"}
          </Typography>
        </Toolbar>

        {/* Search bar */}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            alignItems: "center",
            border: "1px solid #ccc",
            borderRadius: "50px",
            backgroundColor: "#fff",
            boxShadow: 1,
            height: isMobile ? 40 : 48,
            px: 2,
          }}
        >
          <TextField
            variant="standard"
            placeholder="Search ads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#6A1B9A" }} />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearch("")}
                    aria-label="clear search"
                  >
                    <CloseIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                fontSize: isMobile ? "0.85rem" : "1rem",
                py: 1,
              },
            }}
          />
        </Box>

{filteredAds.map(({ 
  id, title, header_image_url, category, city, price, currency, 
  status, user_first_name, user_avatar_url, total_ads_posted, member_since, average_rating 
}) => {
  const categoryName = category?.name || "Unknown";
  const categoryIcon = category?.icon || "CategoryIcon";
  const IconComponent = iconMap[categoryIcon] || CategoryIcon;

  const currencySymbols = {
    USD: "$",
    NGN: "₦",
    EUR: "€",
    GBP: "£",
  };

  return (
    <Grid
      item
      key={id}
      xs="auto"
      sx={{ display: "flex", justifyContent: "center" }}
    >
      <Card
        variant="outlined"
        sx={{
          width: 280,
          height: 380, 
          borderRadius: 3,
          overflow: "hidden",
          cursor: "pointer",
          backgroundColor: "#fff",
          border: "2px solid",
          borderColor: "#e0e0e0",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          transition: "transform 0.2s ease-in-out, border-color 0.2s ease-in-out",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          "&:hover": {
            transform: "scale(1.03)",
            borderColor: "#6A1B9A",
            boxShadow: "0 8px 20px rgba(106,27,154,0.3)",
          },
        }}
        onClick={() => navigate(`/ads/${id}/details`)}
      >
        {/* Header Image or Category Icon */}
        {header_image_url ? (
          <Box
            component="img"
            src={header_image_url}
            alt={title}
            sx={{
              width: "100%",
              height: 140,
              objectFit: "cover",
              borderRadius: "3px 3px 0 0",
            }}
          />
        ) : (
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              width: 64,
              height: 64,
              mt: 3,
              mx: "auto",
            }}
          >
            <IconComponent fontSize="large" />
          </Avatar>
        )}

        {/* Card Content */}
        <CardContent sx={{ flexGrow: 1, px: 3, pt: 2 }}>
          <Typography
            variant="h6"
            component="div"
            align="center"
            fontWeight={700}
            sx={{
              overflowWrap: "break-word",
              wordBreak: "break-word",
              whiteSpace: "normal",
              mb: 1,
            }}
          >
            {title}
          </Typography>

          <Typography variant="body2" color="text.secondary" align="center">
            {categoryName} — {city}
          </Typography>

          <Typography
            variant="subtitle1"
            align="center"
            sx={{ fontWeight: "bold", mt: 1, color: theme.palette.primary.main }}
          >
            {currencySymbols[currency] || currency} {price}
          </Typography>

          {/* Status Chip */}
          <Box textAlign="center" mt={1}>
            <Chip
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              color={statusColors[status] || 'default'}
              size="small"
            />
          </Box>
        </CardContent>

        {/* Seller Info */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            pb: 1,
            borderTop: "1px solid #eee",
          }}
        >
          <Tooltip title={user_first_name}>
            <Avatar
              src={user_avatar_url}
              alt={user_first_name}
              sx={{ width: 32, height: 32 }}
            />
          </Tooltip>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              {user_first_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Member since {new Date(member_since).toLocaleDateString()}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <StarIcon fontSize="small" sx={{ color: "#fbc02d" }} />
            <Typography variant="body2" ml={0.5}>
              {average_rating.toFixed(1)}
            </Typography>
          </Box>
        </Box>

        {/* Actions */}
        <CardActions sx={{ px: 3, pb: 2 }}>
          <Button
            size="small"
            variant="contained"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/ads/${id}/details`);
            }}
          >
            View Details
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );
})}
      </Container>
    </Box>
  );
}