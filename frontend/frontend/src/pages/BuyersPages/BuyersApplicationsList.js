import React, { useEffect, useState, useContext } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import { BuyerDashboardContext } from "./index";
import { API_BASE_URL } from "../../constants";

// Helper to get color based on status
const getStatusColor = (status) => {
  switch (status) {
    case "pending":
      return "#fbc02d"; // yellow
    case "reviewed":
      return "#0288d1"; // blue
    case "accepted":
      return "#388e3c"; // green
    case "rejected":
      return "#d32f2f"; // red
    default:
      return "#757575"; // grey
  }
};

export default function BuyerApplicationsList() {
  const { token } = useContext(BuyerDashboardContext);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/buyer-applications-list/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load applications");
        return res.json();
      })
      .then((data) => {
        setApplications(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Error loading applications");
        setLoading(false);
      });
  }, [token]);

  const handleOpenModal = (application) => {
    setSelectedApplication(application);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedApplication(null);
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

  if (applications.length === 0) {
    return (
      <Typography align="center" sx={{ mt: 4 }}>
        You have no applications yet.
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
        My Applications
      </Typography>

      <List>
        {applications.map((app) => (
          <React.Fragment key={app.id}>
            <ListItem
              button
              onClick={() => handleOpenModal(app)}
              sx={{
                backgroundColor: "white",
                borderRadius: 2,
                boxShadow: 1,
                mb: 1,
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                py: 1.5,
                px: 2,
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  {app.ad.title}
                </Typography>

                {/* Status badge */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "12px",
                    fontWeight: "bold",
                    fontSize: 12,
                    color: "white",
                    bgcolor: getStatusColor(app.status),
                    textTransform: "capitalize",
                    minWidth: 80,
                    textAlign: "center",
                  }}
                >
                  {app.status}
                </Box>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Applied on: {new Date(app.applied_at).toLocaleDateString()}
              </Typography>
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      {/* Details Modal */}
      <Dialog
        fullScreen={fullScreen}
        open={openModal}
        onClose={handleCloseModal}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <DialogTitle>
          Application Details
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
          {selectedApplication && (
            <>
              <Typography variant="h6" gutterBottom>
                Ad Title: {selectedApplication.ad.title}
              </Typography>
              <Typography gutterBottom>
                <strong>Status:</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    px: 1,
                    py: 0.3,
                    borderRadius: "8px",
                    color: "white",
                    bgcolor: getStatusColor(selectedApplication.status),
                    textTransform: "capitalize",
                  }}
                >
                  {selectedApplication.status}
                </Box>
              </Typography>
              <Typography gutterBottom>
                <strong>Cover Letter:</strong>{" "}
                {selectedApplication.cover_letter || "N/A"}
              </Typography>
              <Typography gutterBottom>
                <strong>Phone Number:</strong>{" "}
                {selectedApplication.phone_number || "N/A"}
              </Typography>
              <Typography gutterBottom>
                <strong>Portfolio URL:</strong>{" "}
                {selectedApplication.portfolio_url ? (
                  <a
                    href={selectedApplication.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selectedApplication.portfolio_url}
                  </a>
                ) : (
                  "N/A"
                )}
              </Typography>
              <Typography gutterBottom>
                <strong>LinkedIn URL:</strong>{" "}
                {selectedApplication.linkedin_url ? (
                  <a
                    href={selectedApplication.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selectedApplication.linkedin_url}
                  </a>
                ) : (
                  "N/A"
                )}
              </Typography>
              <Typography gutterBottom>
                <strong>Expected Salary:</strong>{" "}
                {selectedApplication.expected_salary
                  ? `${selectedApplication.expected_salary} ${selectedApplication.ad.currency}`
                  : "N/A"}
              </Typography>
              <Typography gutterBottom>
                <strong>Available Start Date:</strong>{" "}
                {selectedApplication.available_start_date
                  ? new Date(selectedApplication.available_start_date).toLocaleDateString()
                  : "N/A"}
              </Typography>
              <Typography gutterBottom>
                <strong>Willing to Relocate:</strong>{" "}
                {selectedApplication.is_willing_to_relocate ? "Yes" : "No"}
              </Typography>
              <Typography gutterBottom>
                <strong>Notes:</strong>{" "}
                {selectedApplication.notes || "N/A"}
              </Typography>
              <Typography gutterBottom>
                <strong>Resume:</strong>{" "}
                {selectedApplication.resume_url ? (
                  <a
                    href={selectedApplication.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Resume
                  </a>
                ) : selectedApplication.resume ? (
                  <a
                    href={selectedApplication.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download Resume
                  </a>
                ) : (
                  "N/A"
                )}
              </Typography>
              <Typography gutterBottom>
                <strong>Applied At:</strong>{" "}
                {new Date(selectedApplication.applied_at).toLocaleString()}
              </Typography>
              <Typography gutterBottom>
                <strong>Last Updated:</strong>{" "}
                {new Date(selectedApplication.updated_at).toLocaleString()}
              </Typography>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
