import { useState, useEffect, useRef } from 'react';
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
  ListItem,
  ListItemIcon,
  Drawer,
  Tooltip,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import CategoryIcon from '@mui/icons-material/Category';
import PostAddIcon from '@mui/icons-material/PostAdd';
import BarChartIcon from '@mui/icons-material/BarChart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
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

export default function SellerAppBar({
  userAvatar,
  firstName,
  notificationCount = 0,
  messagesCount = 0,
  cartCount = 0,
}) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isMd = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allAds, setAllAds] = useState([]);
  const [results, setResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const boxRef = useRef();

  // Logout handling (keeps your existing behavior)
  const handleLogout = async () => {
    if (!window.confirm('Do you really want to logout?')) return;
    try {
      const refreshToken = TokenStorage.getItem('refresh_token');
      if (!refreshToken) {
        TokenStorage.clear();
        navigate('/');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/user/logout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      TokenStorage.clear();
      setIsDrawerOpen(false);
      navigate(response.ok ? '/login' : '/');
    } catch (error) {
      console.error('Logout error:', error);
      TokenStorage.clear();
      navigate('/');
    }
  };

  // Fetch ads for search/autocomplete
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ads/`)
      .then((res) => res.json())
      .then(setAllAds)
      .catch((err) => console.error('Failed to load ads:', err));
  }, []);

  // Search filter
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

  // Click outside to close suggestions
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

  return (
    <AppBar position="fixed" color="default" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
      <Container maxWidth="xl">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left: logo + optionally small nav */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => navigate('/buyer-home')}>
            <Box
              component="img"
              src="https://ik.imagekit.io/ooiob6xdv/20250808_1023_Vyzio%20Ads%20Logo_simple_compose_01k25bb2xcecfsfnz6zpdg4n0m.png?updatedAt=1754674047122"
              alt="Vyzio"
              sx={{ height: 40, width: 40, borderRadius: '50%' }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
              Vyzio
            </Typography>
          </Box>

          {/* Search */}
          {!isXs && (
            <Box ref={boxRef} sx={{ position: 'relative', flexGrow: 1, mx: 2 }}>
              <SearchContainer>
                <InputBase
                  placeholder="Search ads, categories, locations..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  sx={{ ml: 1, flex: 1 }}
                  inputProps={{ 'aria-label': 'search ads' }}
                />
                <IconButton size="small" aria-label="search">
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
                          <ListItemText primary={m.title} secondary={m.city ? `${m.city} • ${m.category_name}` : m.category_name} />
                        </ListItemButton>
                      ))
                    )}
                  </List>
                  <Divider />
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Button onClick={() => navigate('/categories')}>View all categories</Button>
                  </Box>
                </Paper>
              )}
            </Box>
          )}

          {/* Right icons / actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Post Ad CTA */}
            <Button
              variant="contained"
              color="primary"
              startIcon={<PostAddIcon />}
              onClick={() => navigate('/post-ad')}
              sx={{ textTransform: 'none', display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Post an Ad
            </Button>

            {/* Categories quick link */}
            <Tooltip title="Categories">
              <IconButton onClick={() => navigate('/categories')} aria-label="categories">
                <CategoryIcon />
              </IconButton>
            </Tooltip>

            {/* Messages */}
            <Tooltip title="Messages">
              <IconButton onClick={() => navigate('/buyer-messages')} aria-label="messages">
                <Badge badgeContent={messagesCount} color="error">
                  <ChatIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Orders / Cart */}
            <Tooltip title="Orders">
              <IconButton onClick={() => navigate('/buyer-orders')} aria-label="orders">
                <Badge badgeContent={cartCount} color="error">
                  <ShoppingBagIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Notifications (with comfortable spacing) */}
            <Box sx={{ ml: 1 }} /> {/* extra spacing so bell isn't jammed to icons */}
            <Tooltip title="Notifications">
              <IconButton
                sx={{
                  color: notificationCount > 0 ? '#187fe6' : 'gray',
                  '&:hover': { color: 'blue' },
                }}
                onClick={() => navigate('/buyer-notifications-list')}
                aria-label="notifications"
              >
                <Badge badgeContent={notificationCount} color="error">
                  <NotificationsIcon sx={{ fontSize: 28 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Vertical divider (visual) */}
            <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }} />

            {/* Account / Menu Drawer */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => setIsDrawerOpen(true)} aria-label="open menu">
                <MenuIcon />
              </IconButton>
            </Box>
          </Box>
        </Toolbar>

        {/* Drawer: Vyzio Ads menu */}
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
              <Avatar src={userAvatar} sx={{ width: 56, height: 56 }} />
              <Box>
                <Typography variant="subtitle1" noWrap>{firstName || 'Buyer'}</Typography>
                <Typography variant="caption" color="text.secondary">{getGreeting()}</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            <List>
              <ListItemButton onClick={() => { navigate('/buyer-dashboard'); setIsDrawerOpen(false); }}>
                <ListItemIcon><BarChartIcon /></ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItemButton>

              <ListItemButton onClick={() => { navigate('/post-ad'); setIsDrawerOpen(false); }}>
                <ListItemIcon><PostAddIcon /></ListItemIcon>
                <ListItemText primary="Browse an Ad" />
              </ListItemButton>

              <ListItemButton onClick={() => { navigate('/my-ads'); setIsDrawerOpen(false); }}>
                <ListItemIcon><CategoryIcon /></ListItemIcon>
                <ListItemText primary="My Ads" />
              </ListItemButton>

              <ListItemButton onClick={() => { navigate('/buyer-orders'); setIsDrawerOpen(false); }}>
                <ListItemIcon><ShoppingBagIcon /></ListItemIcon>
                <ListItemText primary="Orders & Purchases" />
              </ListItemButton>

              <ListItemButton onClick={() => { navigate('/payments'); setIsDrawerOpen(false); }}>
                <ListItemIcon><MonetizationOnIcon /></ListItemIcon>
                <ListItemText primary="Payments" />
              </ListItemButton>

              <ListItemButton onClick={() => { navigate('/analytics'); setIsDrawerOpen(false); }}>
                <ListItemIcon><BarChartIcon /></ListItemIcon>
                <ListItemText primary="Ad Performance" />
              </ListItemButton>

              <ListItemButton onClick={() => { navigate('/help'); setIsDrawerOpen(false); }}>
                <ListItemIcon><HelpOutlineIcon /></ListItemIcon>
                <ListItemText primary="Help Center" />
              </ListItemButton>

              <Divider sx={{ my: 1 }} />

              <ListItemButton onClick={() => { navigate('/account'); setIsDrawerOpen(false); }}>
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
  );
}
