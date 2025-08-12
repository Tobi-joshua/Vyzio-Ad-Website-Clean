import React, { useEffect, useState, useContext } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useMediaQuery,
  Link,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import { BuyerDashboardContext } from "./index";
import { API_BASE_URL } from "../../constants";

export default function BuyerViewHistoryList() {
  const { userId, token } = useContext(BuyerDashboardContext);
  const [viewHistory, setViewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state for ad details
  const [selectedAd, setSelectedAd] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!token || !userId) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/buyer/${userId}/view-history/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load view history");
        return res.json();
      })
      .then((data) => {
        setViewHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Error loading view history");
        setLoading(false);
      });
  }, [token, userId]);

  // Open modal with ad details
  const handleOpenModal = (ad) => {
    setSelectedAd(ad);
    setOpenModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedAd(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" align="center" sx={{ mt: 4 }}>
        {error}
      </Typography>
    );
  }

  if (viewHistory.length === 0) {
    return (
      <Typography align="center" sx={{ mt: 4 }}>
        You have no view history yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", mt: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: 700, mb: 2, color: "darkblue" }}
      >
        My View History
      </Typography>

      <List>
        {viewHistory.map(({ id, ad, viewed_at }) => (
          <React.Fragment key={id}>
            <ListItem
              sx={{
                backgroundColor: "white",
                borderRadius: 2,
                boxShadow: 1,
                mb: 1,
                alignItems: "center",
                justifyContent: "space-between",
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={ad.header_image_url || ""}
                  alt={ad.title}
                  variant="rounded"
                  sx={{ width: 64, height: 64 }}
                >
                  {ad.title.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                sx={{ ml: 2 }}
                primary={ad.title}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      Price: {ad.price} {ad.currency}
                    </Typography>
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                      Viewed on: {new Date(viewed_at).toLocaleString()}
                    </Typography>
                  </>
                }
              />
              <Button variant="outlined" onClick={() => handleOpenModal(ad)}>
                View Ad Details
              </Button>
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      {/* Modal for ad details */}
      <Dialog
        fullScreen={fullScreen}
        open={openModal}
        onClose={handleCloseModal}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        aria-labelledby="ad-details-title"
      >
        <DialogTitle id="ad-details-title" sx={{ position: "relative" }}>
          {selectedAd?.title}
          <IconButton
            aria-label="close"
            onClick={handleCloseModal}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAd ? (
            <>
              {selectedAd.header_image_url && (
                <Box
                  component="img"
                  src={selectedAd.header_image_url}
                  alt={selectedAd.title}
                  sx={{
                    width: "100%",
                    height: "auto",
                    mb: 2,
                    borderRadius: 1,
                    objectFit: "cover",
                  }}
                />
              )}

              <Typography variant="body1" gutterBottom>
                <strong>Price:</strong> {selectedAd.price} {selectedAd.currency}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                No further details available.
              </Typography>

              <Box mt={2}>
                <Link
                  href={`buyers/ads/${selectedAd.id}/details`}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  color="primary"
                >
                  Go to Ad Page
                </Link>
              </Box>
            </>
          ) : (
            <Typography>No ad details to display.</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
