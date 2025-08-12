import React, { useEffect, useState, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Container,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  InputBase,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../constants';

const SearchContainer = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: "#f1f1f1",
  border: "1px solid white",
  "&:hover": {
    backgroundColor: "#e0e0e0",
  },
  flexShrink: 1,
  minWidth: 0,
  width: "100%",
  display: "flex",
  alignItems: "center",
  padding: "4px 10px",
}));

const SearchIconWrapper = styled("div")({
  marginLeft: 8,
  paddingLeft: 8,
  marginRight: -8,
  color: "#888",
  borderLeft: "1px solid #ccc",
  display: "flex",
  alignItems: "center",
});

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "black",
  width: "100%",
  "& .MuiInputBase-input": {
    fontSize: "1rem",
    padding: theme.spacing(1, 0),
  },
}));

export default function VyzionHomePageAppBar() {
  const navigate = useNavigate();
  const theme = useTheme();

  // Responsive breakpoints from MUI
  const isXs = useMediaQuery(theme.breakpoints.down("sm")); // <600px
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md")); // 600-900
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg")); // 900-1200
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg")); // >=1200

  const [anchorElNav, setAnchorElNav] = useState(null);
  const [allAds, setAllAds] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const boxRef = useRef();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ads/`) 
      .then((res) => res.json())
      .then((data) => setAllAds(data))
      .catch((err) => console.error("Failed to load ads:", err));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowSuggestions(false);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = allAds.filter(
      ({ title, category_name, country, city }) =>
        title?.toLowerCase().includes(lowerQuery) ||
        category_name?.toLowerCase().includes(lowerQuery) ||
        country?.toLowerCase().includes(lowerQuery) ||
        city?.toLowerCase().includes(lowerQuery)
    );
    setResults(filtered);
    setShowSuggestions(true);
  }, [query, allAds]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleOpenNavMenu = (e) => setAnchorElNav(e.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);

  const handleNavigate = (id) => {
    navigate(`/ads/${id}/details`);
    setQuery("");
    setShowSuggestions(false);
  };

  // Main nav links
  const mainNavLinks = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
  ];

  return (
    <>
     <AppBar position="fixed" sx={{ background: 'linear-gradient(to right, #fff, #f7f7f7)', boxShadow: 1 }}>
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1, 
            }}
          >
            {/* Branding */}
            <Box
              component="a"
              href="/"
              sx={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                color: "black",
                mr: 2,
              }}
            >
              <Box
                component="img"
                src="https://ik.imagekit.io/ooiob6xdv/20250808_1023_Vyzio%20Ads%20Logo_simple_compose_01k25bb2xcecfsfnz6zpdg4n0m.png?updatedAt=1754674047122"
                alt="Vyzion Ads Logo"
                sx={{ height: 40, width: 40, borderRadius: "50%", mr: 1 }}
              />
            </Box>

            {/* Hamburger menu for xs and sm */}
            {(isXs || isSm) && (
              <>
                <IconButton
                  size="large"
                  onClick={handleOpenNavMenu}
                  color="inherit"
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorElNav}
                  open={Boolean(anchorElNav)}
                  onClose={handleCloseNavMenu}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                >
                  {mainNavLinks.map(({ label, href }) => (
                    <MenuItem
                      key={label}
                      component="a"
                      href={href}
                      onClick={handleCloseNavMenu}
                    >
                      {label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}

            {/* Search bar - hidden on xs */}
            {!isXs && (
              <Box
                sx={{
                  flexGrow: 1,
                  maxWidth: { sm: 400, md: 600, lg: 700 },
                  position: "relative",
                  mr: 2,
                }}
                ref={boxRef}
              >
                <SearchContainer>
                  <StyledInputBase
                    placeholder="Search ads by title, category, country, city..."
                    inputProps={{ "aria-label": "search ads" }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <SearchIconWrapper>
                    <SearchIcon />
                  </SearchIconWrapper>
                </SearchContainer>

                {showSuggestions && (
                  <Paper
                    sx={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      width: "100%",
                      mt: 1,
                      maxHeight: 300,
                      overflowY: "auto",
                      zIndex: 1300,
                    }}
                  >
                    <List>
                      {results.length === 0 ? (
                        <ListItem>
                          <ListItemText primary="No results found" />
                        </ListItem>
                      ) : (
                        results.map(({ id, title }) => (
                          <ListItem key={id} disablePadding>
                            <ListItemButton
                              onClick={() => handleNavigate(id)}
                            >
                              <ListItemText primary={title} />
                            </ListItemButton>
                          </ListItem>
                        ))
                      )}
                    </List>
                    <Divider />
                    <Box sx={{ textAlign: "center", py: 1 }}>
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{ cursor: "pointer" }}
                        onClick={() => {
                          navigate('/categories');
                          setShowSuggestions(false);
                        }}
                      >
                        View all ads categories
                      </Typography>
                    </Box>
                  </Paper>
                )}
              </Box>
            )}

            {/* Nav buttons for md and up */}
            {(isMd || isLgUp) && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  color: "black",
                }}
              >
                {mainNavLinks.map(({ label, href }) => (
                  <Button
                    key={label}
                    href={href}
                    color="inherit"
                    sx={{ textTransform: "none", fontWeight: 400 }}
                  >
                    {label}
                  </Button>
                ))}
              </Box>
            )}

            {/* Auth buttons */}
           <Box
  sx={{
    display: 'flex',
    gap: { xs: 1, sm: 2 },
    flexWrap: 'nowrap',
    overflowX: 'auto',
  }}
>
  <Button
    onClick={() => navigate("/login")}
    variant="outlined"
    sx={{
      textTransform: 'none',
      fontSize: { xs: '0.7rem', sm: '0.875rem' }, 
      borderRadius: 2,
      fontWeight: 400,
      whiteSpace: 'nowrap',
      flexShrink: 1,
      minWidth: 'auto',
      px: { xs: 1, sm: 2 }, 
      '&:hover': { bgcolor: '#34c274', color: '#fff' },
    }}
  >
    Post An Ad
  </Button>
  <Button
    onClick={() => navigate("/login")}
    variant="contained"
    sx={{
      textTransform: 'none',
      fontSize: { xs: '0.7rem', sm: '0.875rem' },
      borderRadius: 2,
      bgcolor: 'primary.main',
      fontWeight: 400,
      whiteSpace: 'nowrap',
      flexShrink: 1,
      minWidth: 'auto',
      px: { xs: 1, sm: 2 },
      '&:hover': { bgcolor: '#2e7d32' },
    }}
  >
    Become An Advertiser
  </Button>
</Box>
          </Toolbar>
        </Container>
      </AppBar>
    
      <Toolbar />
    </>
  );
}
