// src/components/BuyerAppBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Avatar,
  Typography,
  IconButton,
  Badge,
  Button,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  InputBase,
  styled,
  Container,
  ListItemIcon,
  Drawer,
  Tooltip,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ChatIcon from '@mui/icons-material/Chat';
import CategoryIcon from '@mui/icons-material/Category';
import PostAddIcon from '@mui/icons-material/PostAdd';
import BarChartIcon from '@mui/icons-material/BarChart';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { TokenStorage } from '../components/TokenStorage';
import { API_BASE_URL } from '../constants';

const SearchContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.5, 1),
  margin: theme.spacing(0, 2),
  flexGrow: 1,
  maxWidth: 600,
}));

// palette: whitesmoke gradient for light, keep dark fallback
const PALETTES = {
  whitesmoke: {
    light: 'linear-gradient(90deg, #f5f5f5 0%, #ffffff 100%)', // whitesmoke -> white
    dark:  'linear-gradient(90deg,#0b1220 0%, #16202a 100%)',    // dark fallback
  },
};

export default function BuyerAppBar({
  userAvatar,
  firstName,
  notificationCount = 0,
  messagesCount = 0,
  cartCount = 0,
}) {
  const theme = useTheme();
  const mode = theme.palette.mode || 'light';
  const chosen = PALETTES.whitesmoke;
  const background = mode === 'dark' ? chosen.dark : chosen.light;

  // decide text/icon color for readability
  const iconColor = mode === 'dark' ? '#FFFFFF' : 'rgba(0,0,0,0.87)';
  const ctaBg = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const ctaHover = mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isMd = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allAds, setAllAds] = useState([]);
  const [results, setResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const boxRef = useRef();

  const handleLogout = async () => {
    if (!window.confirm('Do you really want to logout?')) return;
    try {
      const refreshToken = TokenStorage.getItem('refresh_token');
      if (!refreshToken) {
        TokenStorage.clear();
        navigate('/');
        return;
      }
      await fetch(`${API_BASE_URL}/api/user/logout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      TokenStorage.clear();
      setIsDrawerOpen(false);
      navigate('/login');
    }
  };

  // Fetch ads for autocomplete
  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE_URL}/api/ads/`)
      .then((res) => res.json())
      .then((data) => mounted && setAllAds(data || []))
      .catch((err) => {
        console.error('Failed to load ads:', err);
        if (mounted) setAllAds([]);
      });
    return () => { mounted = false; };
  }, []);

  // Search filter
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowSuggestions(false);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = (allAds || []).filter(
      ({ title, category, country, city }) =>
        title?.toLowerCase().includes(lowerQuery) ||
        category?.name.toLowerCase().includes(lowerQuery) ||
        country?.toLowerCase().includes(lowerQuery) ||
        city?.toLowerCase().includes(lowerQuery)
    );
    setResults(filtered);
    setShowSuggestions(true);
  }, [query, allAds]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const handleNavigate = (id) => {
    navigate(`/ads/${id}/details`);
    setQuery('');
    setShowSuggestions(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const avatarFallback = (name) => (name ? name.charAt(0).toUpperCase() : 'B');

  return (
    <>
      <AppBar
        position="fixed"
        elevation={3}
        sx={{
          background,
          color: iconColor,
          borderBottom: mode === 'dark' ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
          backdropFilter: 'saturate(120%) blur(6px)',
          zIndex: (t) => t.zIndex.appBar + 1,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            {/* Left logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => navigate('/buyers/dashboard')}>
              <Box
                component="img"
                src="https://ik.imagekit.io/ooiob6xdv/20250808_1023_Vyzio%20Ads%20Logo_simple_compose_01k25bb2xcecfsfnz6zpdg4n0m.png?updatedAt=1754674047122"
                alt="Vyzio"
                sx={{
                  height: 40,
                  width: 40,
                  borderRadius: '50%',
                  filter: mode === 'dark' ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' : 'none'
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                Vyzio
              </Typography>
            </Box>

            {/* Search */}
            {!isXs && (
              <Box ref={boxRef} sx={{ position: 'relative', flexGrow: 1, mx: 2 }}>
                <SearchContainer sx={{ bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)' }}>
                  <InputBase
                    placeholder="Search ads, categories, locations..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    sx={{ ml: 1, flex: 1, color: mode === 'dark' ? '#fff' : 'inherit' }}
                    inputProps={{ 'aria-label': 'search ads' }}
                  />
                  <IconButton size="small" aria-label="search" sx={{ color: iconColor }}>
                    <SearchIcon />
                  </IconButton>
                </SearchContainer>

                {showSuggestions && (
                  <Paper
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1300,
                      maxHeight: 300,
                      overflow: 'auto',
                    }}
                  >
                    <List disablePadding>
                      {results.length === 0 ? (
                        <ListItemButton>
                          <ListItemText primary="No results found" />
                        </ListItemButton>
                      ) : (
                        results.map((m) => (
                          <ListItemButton key={m.id} onClick={() => handleNavigate(m.id)}>
                            <ListItemText primary={m.title} secondary={m.city ? `${m.city} • ${m.category.name}` : m.category.name} />
                          </ListItemButton>
                        ))
                      )}
                    </List>
                    <Divider />
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Button onClick={() => navigate('/buyers/categories')}>View all categories</Button>
                    </Box>
                  </Paper>
                )}
              </Box>
            )}

            {/* Right icons / actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="contained"
                onClick={() => navigate('/buyers/categories')}
                startIcon={<PostAddIcon />}
                sx={{
                  textTransform: 'none',
                  bgcolor: ctaBg,
                  display:{ xs: 'none', sm: 'inline-flex', md: 'inline-flex' },
                  color: iconColor,
                  borderRadius: 2,
                  px: 2,
                  '&:hover': { bgcolor: ctaHover },
                }}
              >
                Browse Ads
              </Button>

              <Tooltip title="Categories">
                <IconButton onClick={() => navigate('/buyers/categories')} aria-label="categories" sx={{ color: iconColor }}>
                  <CategoryIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Messages">
                <IconButton onClick={() => navigate('/buyers/messages-list')} aria-label="messages" sx={{ color: iconColor }}>
                  <Badge badgeContent={messagesCount} color="error">
                    <ChatIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title="Orders">
                <IconButton onClick={() => navigate('/buyers/orders')} aria-label="orders" sx={{ color: iconColor }}>
                  <Badge badgeContent={cartCount} color="error">
                    <ShoppingBagIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Box sx={{ ml: 1 }} />

              <Tooltip title="Notifications">
                <IconButton
                  sx={{
                    color: notificationCount > 0 ? '#FFD166' : iconColor,
                    '&:hover': { color: '#FFD166' },
                  }}
                  onClick={() => navigate('/buyers/notifications-list')}
                  aria-label="notifications"
                >
                  <Badge badgeContent={notificationCount} color="error">
                    <NotificationsIcon sx={{ fontSize: 28 }} />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', sm: 'block' }, borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : undefined }} />

              <IconButton onClick={() => setIsDrawerOpen(true)} sx={{ color: iconColor }} aria-label="open menu">
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>

          {/* Drawer */}
          <Drawer
            anchor="right"
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: 300,
                borderTopLeftRadius: 12,
                borderBottomLeftRadius: 12,
                boxShadow: 6,
                right: 16,
              },
            }}
          >
            <Box sx={{ px: 2, py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar src={userAvatar}>{!userAvatar && avatarFallback(firstName)}</Avatar>
                <Box>
                  <Typography variant="subtitle1" noWrap>{firstName || 'Buyer'}</Typography>
                  <Typography variant="caption" color="text.secondary">{getGreeting()}</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1 }} />

              <List>
                <ListItemButton onClick={() => { navigate('/buyers/dashboard'); setIsDrawerOpen(false); }}>
                  <ListItemIcon><BarChartIcon /></ListItemIcon>
                  <ListItemText primary="Dashboard" />
                </ListItemButton>

                <ListItemButton onClick={() => { navigate('/buyers/my-applications'); setIsDrawerOpen(false); }}>
                  <ListItemIcon><CategoryIcon /></ListItemIcon>
                  <ListItemText primary="My Applications" />
                </ListItemButton>

                <ListItemButton onClick={() => { navigate('/buyers/help'); setIsDrawerOpen(false); }}>
                  <ListItemIcon><HelpOutlineIcon /></ListItemIcon>
                  <ListItemText primary="Help Center" />
                </ListItemButton>

                <Divider sx={{ my: 1 }} />

                <ListItemButton onClick={() => { navigate('/buyers/account'); setIsDrawerOpen(false); }}>
                  <ListItemIcon><SettingsIcon /></ListItemIcon>
                  <ListItemText primary="Account Settings" />
                </ListItemButton>

                <ListItemButton onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon /></ListItemIcon>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              </List>
            </Box>
          </Drawer>
        </Container>
      </AppBar>

      {/* toolbar spacer so content isn't hidden behind fixed AppBar */}
      <Toolbar />
    </>
  );
}