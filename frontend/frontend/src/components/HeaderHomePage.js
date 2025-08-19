import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Paper,
  Toolbar,
  InputBase
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PostAddIcon from '@mui/icons-material/PostAdd';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import party from 'party-js';
import { API_BASE_URL } from '../constants';

// --- Move styled components outside the component so they are stable across renders ---
const SearchContainer = styled('div')(({ theme, isSm }) => ({
  position: 'relative',
  borderRadius: 0,
  backgroundColor: '#fff',
  border: '1px solid #ccc',
  '&:hover': { backgroundColor: '#f9f9f9' },
  flexShrink: 1,
  minWidth: 0,
  width: '100%',
  maxWidth: isSm ? '240px' : '100%',
  display: 'flex',
  alignItems: 'center',
  padding: isSm ? '4px 6px' : '4px 10px',
  marginRight: theme.spacing(1),
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  marginLeft: theme.spacing(1),
  paddingLeft: theme.spacing(1),
  marginRight: -theme.spacing(1),
  color: '#555',
  borderLeft: '1px solid #ddd',
  backgroundColor: '#fff',
  display: 'flex',
  alignItems: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme, isSm }) => ({
  color: '#000',
  width: '100%',
  '& .MuiInputBase-input': {
    fontSize: isSm ? '0.85rem' : '1rem',
    padding: theme.spacing(1, 0),
    backgroundColor: 'transparent',
  },
}));

const heroImages = [
  'https://ik.imagekit.io/ooiob6xdv/20250808_1208_Professional%20Laptop%20Collaboration_simple_compose_01k25ha7qmezabek6ed9zspv69.png?updatedAt=1754683292608',
  'https://ik.imagekit.io/ooiob6xdv/20250808_1126_Calming%20Infographic%20Header_simple_compose_01k25ewce2e0m84m4vv4r8smpp.png?updatedAt=1754678104949',
  'https://ik.imagekit.io/ooiob6xdv/20250808_1126_Calming%20Infographic%20Header_simple_compose_01k25ewce3eq9sq8wj9p3652sr.png?updatedAt=1754678128576'
];

const VyzioHomePageHeroSection = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const theme = useTheme();

  // Media queries for breakpoints
  const isXs = useMediaQuery(theme.breakpoints.down('xs'));
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));
  const isMd = useMediaQuery(theme.breakpoints.down('md'));

  const boxRef = useRef(null);
  const navigate = useNavigate();

  // Ads data for search suggestions
  const [allAds, setAllAds] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Fetch all active ads for search suggestions (once)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ads/`)
      .then(res => res.json())
      .then(data => setAllAds(data))
      .catch(err => console.error('Failed to load ads:', err));
  }, []);

  // Debounced filter to reduce re-renders
  useEffect(() => {
    const handler = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        setShowSuggestions(false);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const filtered = allAds.filter(({ title, category, city, description }) =>
        title?.toLowerCase().includes(lowerQuery) ||
        category?.name?.toLowerCase().includes(lowerQuery) ||
        city?.toLowerCase().includes(lowerQuery) ||
        description?.toLowerCase().includes(lowerQuery)
      );

      setResults(filtered);
      setShowSuggestions(true);
    }, 200); // debounce

    return () => clearTimeout(handler);
  }, [query, allAds]);

  // Hide suggestions if click outside search box
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigate to ad details page
  const handleNavigate = (id) => {
    navigate(`/ads/${id}/details`);
    setQuery('');
    setShowSuggestions(false);
  };

  // Hero image slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeOut(true);
      setTimeout(() => {
        setCurrentImage(prev => (prev + 1) % heroImages.length);
        setFadeOut(false);
      }, 1000);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Animations on button clicks
  const handlePostAdClick = (event) => {
    party.sparkles(event.currentTarget, { count: 10, spread: 15, size: 2 });
    setTimeout(() => navigate('/login'), 400);
  };

  const handleBrowseAdsClick = (event) => {
    party.confetti(event.currentTarget, { count: 10, spread: 15, size: 2 });
    setTimeout(() => navigate('/categories'), 400);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: isXs ? 460 : isSm ? 500 : 550,
        overflow: 'visible',
        mx: 'auto',
      }}
    >
      {/* Current Image */}
      <Box
        component="img"
        src={heroImages[currentImage]}
        alt="Current"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          mt: -8,
          left: 0,
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 1s ease-in-out',
          zIndex: 1,
          filter: 'brightness(0.5)',
        }}
      />

      {/* Next Image */}
      <Box
        component="img"
        src={heroImages[(currentImage + 1) % heroImages.length]}
        alt="Next"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: fadeOut ? 1 : 0,
          transition: 'opacity 1s ease-in-out',
          zIndex: 0,
          filter: 'brightness(0.5)',
        }}
      />

      {/* Overlay Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          px: 2,
        }}
      >
        <Typography
          variant={isXs ? 'h6' : isSm ? 'h5' : 'h4'}
          fontWeight={700}
          color="#fff"
          sx={{ mb: 1 }}
        >
          POST & TRACK ADS EASILY WITH VYZIO
        </Typography>

        <Typography
          variant="body1"
          color="#fff"
          sx={{
            maxWidth: 600,
            mb: 3,
            fontSize: isSm ? '0.9rem' : '1rem',
          }}
        >
          Browse ads by category, city, or special features — all in one place.
        </Typography>

        {/* Buttons */}
        <Box sx={{
          display: 'flex',
          gap: 1,
          mb: 5,
          mr: -1,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <Button variant="contained" startIcon={<PostAddIcon />} onClick={handlePostAdClick} sx={{ backgroundColor: '#1E88E5' }}>
            POST AN AD
          </Button>
          <Button variant="contained" startIcon={<LocalOfferIcon />} onClick={handleBrowseAdsClick} sx={{ backgroundColor: '#43A047' }}>
            BROWSE ADS
          </Button>
        </Box>

        {/* Search Toolbar */}
        <Toolbar sx={{
          position: 'absolute',
          bottom: 70,
          left: 0,
          right: 0,
          mx: 'auto',
          width: '100%',
          maxWidth: 700,
          justifyContent: 'center',
          px: 2,
          zIndex: 3,
          mt:-5,
        }}>
          <Box sx={{ flexGrow: 1, maxWidth: { sm: 400, md: 600, lg: 700 }, position: "relative", mr: 2 }} ref={boxRef}>
            {/* Pass isSm prop so the styled component can be responsive */}
            <SearchContainer isSm={isSm}>
              <StyledInputBase
                isSm={isSm}
                placeholder="Search ads by title, category, country, city..."
                inputProps={{ "aria-label": "search ads" }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
            </SearchContainer>

            {/* Suggestions (always mounted; hide with display) */}
            <Paper sx={{
              display: showSuggestions ? 'block' : 'none',
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '100%',
              mt: 1,
              maxHeight: 300,
              overflowY: 'auto',
              zIndex: 1300,
            }}>
              <List>
                {results.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No results found" />
                  </ListItem>
                ) : (
                  results.map(({ id, title }) => (
                    <ListItem key={id} disablePadding>
                      <ListItemButton autoFocus={false} onClick={() => handleNavigate(id)}>
                        <ListItemText primary={title} />
                      </ListItemButton>
                    </ListItem>
                  ))
                )}
              </List>
              <Divider />
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }} onClick={() => { navigate('/categories'); setShowSuggestions(false); }}>
                  View all ads categories
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Toolbar>
      </Box>

      {/* Dot Indicators */}
      <Box sx={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 1,
        zIndex: 2,
      }}>
        {heroImages.map((_, index) => (
          <Box key={index} sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: currentImage === index ? '#fff' : '#ccc' }} />
        ))}
      </Box>
    </Box>
  );
};

export default VyzioHomePageHeroSection;