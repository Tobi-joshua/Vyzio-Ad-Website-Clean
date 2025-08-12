import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Typography,
  TextField,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  useMediaQuery,
  useTheme,Fade,
    List,
    ListItem,
    ListItemButton,
    ListItemText,Divider,Paper,Toolbar,
} from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import SearchIcon from "@mui/icons-material/Search";
import { styled } from '@mui/material/styles';
import { InputBase} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import party from 'party-js';
import DataLoader from '../components/DataLoader';
import VyzionHomePageAppBar from '../components/ResponsiveAppBar';
import VyzioHomePageHeroSection from '../components/HeaderHomePage';
import HomePageStatsBar from "../components/HomePageStatsBar";
import HowItWorksHome from "../components/HowItsWorkHome";
import ClientReviewsCarousel from "../components/ClientReviewsCarousel";


export default function Homepage() {
  const [loading, setLoading] = useState(true);

  // Loader effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <DataLoader visible={true} />;


  return (
    <Container
  maxWidth='1440px'
  sx={{
    width: '100%',
    mt: { xs: 0, sm: 0 },
    mb: { xs: 4, sm: 6 },
    px: { xs: 0, sm: 0 },
  }}
>
 {/* Top Navbar */}
      <VyzionHomePageAppBar/>
     <VyzioHomePageHeroSection/>
     <HomePageStatsBar/>
     <HowItWorksHome/>
     <ClientReviewsCarousel/>

      
    </Container>
  );
}
