import React, { useEffect, useState,useContext } from "react";
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
  Toolbar,
  IconButton,
  InputAdornment
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CategoryIcon from "@mui/icons-material/Category";
import { useNavigate } from "react-router-dom";
import DataLoader from "../../components/DataLoader";
import SellerAppBar from "../../components/SellerAppBar";


// MUI Icons imports...
import HandymanIcon from "@mui/icons-material/Handyman";
import HomeIcon from "@mui/icons-material/Home";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import DevicesIcon from "@mui/icons-material/Devices";
import StyleIcon from "@mui/icons-material/Style";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import PetsIcon from "@mui/icons-material/Pets";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import GrassIcon from "@mui/icons-material/Grass";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import PaletteIcon from "@mui/icons-material/Palette";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import EventIcon from "@mui/icons-material/Event";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import CloseIcon from "@mui/icons-material/Close";
import { API_BASE_URL } from "../../constants";
import { SellerDashboardContext } from "./index"; 







const iconMap = {
  handyman: HandymanIcon,
  home: HomeIcon,
  work: WorkIcon,
  school: SchoolIcon,
  directions_car: DirectionsCarIcon,
  devices: DevicesIcon,
  style: StyleIcon,
  health_and_safety: HealthAndSafetyIcon,
  pets: PetsIcon,
  more_horiz: MoreHorizIcon,
  grass: GrassIcon,
  sports_soccer: SportsSoccerIcon,
  child_care: ChildCareIcon,
  restaurant: RestaurantIcon,
  flight_takeoff: FlightTakeoffIcon,
  palette: PaletteIcon,
  smartphone: SmartphoneIcon,
  event: EventIcon,
  account_balance: AccountBalanceIcon,
  cleaning_services: CleaningServicesIcon,
};

export default function SellerAdsCategories() {
  const {firstName, email, userAvatar, userId,notificationCount } = useContext(SellerDashboardContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <DataLoader visible={true} />;

  // Filter categories by search text (case insensitive)
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

    // visuals
  const pageBg = () => {
    const mode = theme.palette.mode || "light";
    return mode === "dark"
      ? "linear-gradient(180deg,#071120 0%, #0b1724 100%)"
      : "linear-gradient(180deg,#f6f9fc 0%, #97999bff 100%)";
  };

  return (
     <Box sx={{ minHeight: "100vh", background: pageBg(), pb: 8 }}>
            <SellerAppBar userAvatar={userAvatar} firstName={firstName} notificationCount={notificationCount} />
            <Toolbar />
    <Box sx={{ width: '100%', backgroundColor: 'transparent', ml: 0, mt: -11 }}>
      <Box
        sx={{
          width: {
            xs: '88%',
            sm: '69%',
            md: '70%',
            lg: '75%',
          },
          maxWidth: '1000px',
          mx: 'auto',
          p: 0,
          borderRadius: 0,
          boxShadow: 'none',
          backgroundColor: 'transparent',
          border: 'none',
          mb: 0,
          mt: 0,
          position: 'static',
          zIndex: 'auto',
          transition: 'none',
        }}
      >
     <Container maxWidth="md" sx={{ my: 4 }}>
        {/* Title */}
        <Typography
          variant={isMobile ? "h4" : "h3"}
          fontWeight={700}
          gutterBottom
          sx={{ color: "#003366", fontFamily: "'Roboto Slab', serif" }}
        >
          Ads Categories
        </Typography>

        {/* Description below title */}
<Typography
  variant="body1"
  color="textSecondary"
  sx={{ mb: 3, maxWidth: 600, mx: "auto", textAlign: "center" }}
>
  Explore a wide range of advertising categories to find the perfect ads for your needs. Use the search below to quickly find specific categories.
</Typography>

        {/* Search Bar */}
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
            maxWidth: 600,
            mx: "auto",
          }}
        >
          <TextField
            variant="standard"
            placeholder="Search categories..."
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

        {/* Categories Grid */}
        <Grid container spacing={3} justifyContent="center" sx={{ mt: 1 }}>
  {filteredCategories.length === 0 && (
    <Typography
      variant="body1"
      color="text.secondary"
      textAlign="center"
      sx={{ width: "100%", mt: 4 }}
    >
      No categories found.
    </Typography>
  )}

  {filteredCategories.map(({ id, name, icon, description }) => {
  const IconComponent = iconMap[icon] || CategoryIcon;
  const cardWidth = 280;  
  const cardHeight = 300;

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
          width: cardWidth,
          height: cardHeight,
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
        onClick={() => navigate(`/sellers/create/${id}/${encodeURIComponent(name)}/ads`)}
      >
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
            }}
          >
            {name}
          </Typography>

          {/* Description text */}
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{
              mt: 1,
              display: "-webkit-box",
              WebkitLineClamp: 3, 
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
              maxWidth: "100%",
            }}
          >
            {description}
          </Typography>
        </CardContent>

        <CardActions sx={{ px: 3, pb: 2 }}>
          <Button
            size="small"
            variant="contained"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sellers/create/${id}/${encodeURIComponent(name)}/ads`);
            }}
          >
            Create Ads
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );
})}
</Grid>
      </Container>
      </Box>
    </Box>
    
          </Box>

  );
}
