import { useState } from "react";
import { Box, Typography, Avatar, useTheme } from "@mui/material";
import Slider from "react-slick";
import countries from "i18n-iso-countries";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

const CLIENTS = [
  {
    id: 1,
    uri: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Michael Okoro",
    role: "Seller",
    country: "Nigeria",
    rating: 4.7,
    comment:
      "Vyzio Ads helped me quickly find buyers for my electronics. The platform is easy to use and reliable.",
  },
  {
    id: 2,
    uri: "https://randomuser.me/api/portraits/women/65.jpg",
    name: "Sarah Johnson",
    role: "Buyer",
    country: "United States",
    rating: 4.9,
    comment:
      "I found exactly what I needed in just a few clicks. The variety of ads and user communication features are top-notch.",
  },
  {
    id: 3,
    uri: "https://randomuser.me/api/portraits/men/85.jpg",
    name: "Rajesh Kumar",
    role: "Seller",
    country: "India",
    rating: 4.8,
    comment:
      "Great platform to promote my services locally and internationally. Customer support was helpful when I needed it.",
  },
];

const CountryDisplay = ({ countryName }) => {
  const code = countries.getAlpha2Code(countryName, "en")?.toLowerCase();
  return (
    <Box display="flex" alignItems="center" mt={0.5}>
      {code && (
        <img
          src={`https://flagcdn.com/24x18/${code}.png`}
          alt={countryName}
          style={{ marginRight: 6, borderRadius: 2 }}
        />
      )}
      <Typography color="text.secondary" fontSize={12}>
        {countryName}
      </Typography>
    </Box>
  );
};

const ReviewCard = ({ item }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        padding: 2,
        borderRadius: 2,
        background: "linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)",
        color: "#333",
        minHeight: 180,
        boxShadow: 2,
        gap: 4,
        width: "100%",
        mb: 3,
      }}
    >
      <Avatar
        src={item.uri}
        alt={item.name}
        sx={{ width: 60, height: 60, border: "2px solid #1E88E5" }}
      />
      <Box flex={1}>
        <Typography fontWeight="bold" fontSize={14} color="#1E88E5">
          {item.name}
        </Typography>
        <Typography fontSize={12} color="#555">
          {item.role}
        </Typography>
        {item.country && <CountryDisplay countryName={item.country} />}
        <Typography
          fontSize={12}
          fontStyle="italic"
          mt={1}
          sx={{
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: expanded ? "unset" : 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          “{item.comment}”
        </Typography>
        <Typography
          onClick={() => setExpanded(!expanded)}
          sx={{
            cursor: "pointer",
            mt: 0.5,
            fontSize: 11,
            fontWeight: "bold",
            color: "primary.main",
          }}
        >
          {expanded ? "View Less ▲" : "View More ▼"}
        </Typography>
      </Box>

      <Box
        sx={{
          background: "#1E88E5",
          color: "#fff",
          px: 1.5,
          py: 0.5,
          borderRadius: "20px",
          fontWeight: "bold",
          fontSize: 11,
        }}
      >
        ★ {item.rating}
      </Box>
    </Box>
  );
};

const ClientReviewsCarousel = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 600,
    autoplay: true,
    autoplaySpeed: 6000,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    arrows: false,
    responsive: [
      {
        breakpoint: 768, 
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          centerMode: false,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          centerMode: false,
        },
      },
    ],
  };

  return (
    <Box
      sx={{
        display: {
          xs: "block",
          sm: "block",
          md: "none",
          lg: "none",
        },
        width: "90%",
        maxWidth: 500,
        mx: "auto",
        mt: 4,
        mb: 8,
        textAlign: "center",
      }}
    >
      {/* Title */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: "bold",
          color: "#1E88E5",
          mb: 2,
          textTransform: "uppercase",
          fontSize: { xs: "1.3rem", sm: "1.5rem" },
        }}
      >
        What Our Users Say
      </Typography>

      {/* Subtitle */}
      <Typography
        sx={{
          color: "#1E88E5",
          fontWeight: 500,
          mb: 3,
          fontSize: { xs: "0.85rem", sm: "0.95rem" },
        }}
      >
        Real feedback from Vyzio Ads buyers and sellers across the globe.
      </Typography>

      <Box
        sx={{
          "& .slick-track": {
            display: "flex !important",
          },
          "& .slick-slide": {
            display: "flex !important",
            justifyContent: "center",
          },
          "& .slick-dots": {
            mt: 2,
            display: "flex !important",
            justifyContent: "center",
            gap: "10px",
          },
          "& .slick-dots li button:before": {
            fontSize: "10px",
            color: "#1E88E5",
            opacity: 0.6,
          },
          "& .slick-dots li.slick-active button:before": {
            color: "#1565C0",
            opacity: 1,
          },
        }}
      >
        <Slider {...settings}>
          {CLIENTS.map((item) => (
            <Box
              key={item.id}
              px={1}
              py={0}
              sx={{ display: "flex", justifyContent: "center" }}
            >
              <ReviewCard item={item} />
            </Box>
          ))}
        </Slider>
      </Box>
    </Box>
  );
};

export default ClientReviewsCarousel;
