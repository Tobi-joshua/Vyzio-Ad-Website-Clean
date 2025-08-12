import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';

const steps = [
  {
    title: 'POST AN AD',
    description: 'Create your ad with details like title, description, price, and location.',
    image: 'https://cdn-icons-png.flaticon.com/512/1250/1250686.png', // ad post icon
  },
  {
    title: 'REACH YOUR AUDIENCE',
    description: 'Your ad gets displayed to targeted users browsing categories and locations.',
    image: 'https://cdn-icons-png.flaticon.com/512/1484/1484906.png', // audience icon
  },
  {
    title: 'CONNECT WITH BUYERS',
    description: 'Communicate directly with interested buyers through secure messaging.',
    image: 'https://cdn-icons-png.flaticon.com/512/561/561127.png', // chat icon
  },
  {
    title: 'SELL OR PROMOTE',
    description: 'Close deals quickly or promote your ads for extra visibility.',
    image: 'https://cdn-icons-png.flaticon.com/512/633/633610.png', // promotion icon
  },
];

const HowItWorksHome = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 6, sm: 8 },
        mt: '-30px',
        backgroundColor: '#fff',
        textAlign: 'center',
      }}
    >
      {/* Title */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 'bold',
          color: '#1E88E5',
          mb: 6,
          display: 'inline-block',
          textTransform: 'uppercase',
          pb: 1,
          fontSize: {
            xs: '1.5rem',
            sm: '2rem',
            md: '2.2rem',
          },
        }}
      >
        How Vyzio Ads Works
      </Typography>

      {/* Steps Grid */}
      <Grid container spacing={4} sx={{ maxWidth: '1000px', mx: 'auto' }}>
        {steps.map((step, index) => (
          <Grid item xs={12} sm={6} md={6} key={index}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  backgroundColor: '#fff',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <img
                  src={step.image}
                  alt={step.title}
                  style={{
                    maxWidth: '60%',
                    maxHeight: '60%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
              <Box sx={{ textAlign: 'left', maxWidth: 220 }}>
                <Typography
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: '#1565C0',
                    mb: 0.5,
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {step.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.95rem',
                    color: '#444',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'normal',
                  }}
                >
                  {step.description}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Call-to-Action Button */}
      <Box sx={{ mt: 6 }}>
        <Button
          variant="contained"
          sx={{
            backgroundColor: '#1E88E5',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '1rem',
            px: 4,
            py: 1.5,
            borderRadius: '8px',
            width: { xs: '80%', sm: '40%' },
            '&:hover': {
              backgroundColor: '#1565C0',
            },
          }}
          onClick={() => window.location.href = '/login'}
        >
          Post An Ad
        </Button>
      </Box>
    </Box>
  );
};

export default HowItWorksHome;
