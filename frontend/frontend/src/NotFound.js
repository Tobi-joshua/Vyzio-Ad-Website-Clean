import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container } from '@mui/material';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
      <Box
        component="img"
        src="https://ik.imagekit.io/ooiob6xdv/404.png?updatedAt=1754672570184"
        alt="404 Not Found"
        sx={{
          width: '100%',
          maxHeight: 400,
          objectFit: 'contain',
          mb: 3,
        }}
      />
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        This page doesn't exist.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate(-1)}
        sx={{
          mt: 4,
          borderRadius: 5,
          px: 4,
          py: 1.5,
          fontSize: '1rem',
          backgroundColor: '#1976d2',
          '&:hover': {
            backgroundColor: '#115293',
          },
        }}
      >
        Go Back
      </Button>
    </Container>
  );
}