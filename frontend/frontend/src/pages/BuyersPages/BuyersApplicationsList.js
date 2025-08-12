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
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import { BuyerDashboardContext } from "./index";
import { API_BASE_URL } from "../../constants";

export default function BuyerApplicationsList() {
  const { userId, token } = useContext(BuyerDashboardContext);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Fetch applications on mount
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


  // Handle opening modal
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
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
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
              }}
            >
              <ListItemText
                primary={`${app.ad.title} — Status: ${app.status}`}
                secondary={`Applied on: ${new Date(app.applied_at).toLocaleDateString()}`}
              />
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
                <strong>Status:</strong> {selectedApplication.status}
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
                  ? `$${selectedApplication.expected_salary}`
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
