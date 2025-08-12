import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Paper,
  Container,
} from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer'; 
import PersonIcon from '@mui/icons-material/Person'; 
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; 
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import { API_BASE_URL } from '../constants';

const HomePageStatsBar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('xs'));

  const [stats, setStats] = useState({
    total_ads: 0,
    total_users: 0,
    active_ads: 0,
    total_advertisers:0,
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/homepage/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
      })
      .catch((err) => console.error('Failed to load stats:', err));
  }, []);

  const items = [
    {
      icon: <LocalOfferIcon sx={{ fontSize: 32, color: '#333' }} />,
      value: stats.total_ads,
      label: 'Total Ads',
    },
    {
      icon: <PersonIcon sx={{ fontSize: 32, color: '#333' }} />,
      value: stats.total_users,
      label: 'Registered Users',
    },
    {
      icon: <CheckCircleIcon sx={{ fontSize: 32, color: '#333' }} />,
      value: stats.active_ads,
      label: 'Active Ads',
    },
    {
    icon: <BusinessCenterIcon sx={{ fontSize: 32, color: '#333' }} />,
    value: stats.total_advertisers,
    label: 'Advertisers',
  },
  ];

  if (isMobile) return null;

const itemsToShow = isMobile ? items.slice(0, 3) : items;

return (
  <Box
    sx={{
      width: '100%',
      backgroundColor: '#f9f9fb',
      py: 3,
      borderTop: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
      mt: { xs: 0, sm: 0, md: 0 },
      mb: { xs: 2, sm: 2, md: 2 },
    }}
  >
    <Container maxWidth="lg">
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',  
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: 2,
          flexDirection: isMobile ? 'row' : 'row', 
        }}
      >
        {itemsToShow.map((item, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:'center',
              gap: 1.5,
              minWidth: isMobile ? '50%' : 'auto',  
              flexGrow: 1,
            }}
          >
            <Paper
              elevation={1}
              sx={{
                backgroundColor: '#e0e0e0',
                borderRadius: 2,
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </Paper>
            <Box>
              <Typography
                sx={{ fontSize: '1.3rem', fontWeight: 700, color: '#111' }}
              >
                {item.value}
                {item.value !== 'N/A' ? '+' : ''}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  color: '#666',
                  fontStyle: 'italic',
                }}
              >
                {item.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Container>
  </Box>
);
};

export default HomePageStatsBar;