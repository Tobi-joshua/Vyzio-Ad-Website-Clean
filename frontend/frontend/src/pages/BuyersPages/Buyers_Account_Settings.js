import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { BuyerDashboardContext } from "./index"; 
import { API_BASE_URL } from "../../constants";

export default function BuyerAccountSettings() {
  const {userId, token, userAvatar} = useContext(BuyerDashboardContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    country: "",
    bio: "",
    preferred_currency: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(userAvatar || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    fetch(`${API_BASE_URL}/api/buyer/account-settings/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load account info");
        return res.json();
      })
      .then((data) => {
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          country: data.country || "",
          bio: data.bio || "",
          preferred_currency: data.preferred_currency || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Error loading account info");
        setLoading(false);
      });
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((fd) => ({ ...fd, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = new FormData();
    Object.entries(formData).forEach(([key, val]) => {
      payload.append(key, val);
    });
    if (avatarFile) {
      payload.append("avatar", avatarFile); // make sure your backend supports avatar upload
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/buyer/account-settings/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update account info");
      }
      const data = await res.json();
      setSuccess("Account updated successfully!");
      setSaving(false);
    } catch (err) {
      setError(err.message || "Error updating account info");
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 500,
        mx: "auto",
        mt: 4,
        p: 3,
        boxShadow: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h4" gutterBottom>
        Account Settings
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mb: 3,
        }}
      >
        <Avatar
          src={avatarPreview}
          alt="User Avatar"
          sx={{ width: 96, height: 96 }}
        />
      </Box>

      <Button variant="contained" component="label" fullWidth sx={{ mb: 3 }}>
        Upload New Avatar
        <input
          type="file"
          hidden
          accept="image/*"
          onChange={handleAvatarChange}
        />
      </Button>

      <TextField
        label="First Name"
        name="first_name"
        value={formData.first_name}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Last Name"
        name="last_name"
        value={formData.last_name}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Phone"
        name="phone"
        value={formData.phone}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Country"
        name="country"
        value={formData.country}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Preferred Currency"
        name="preferred_currency"
        value={formData.preferred_currency}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Bio"
        name="bio"
        value={formData.bio}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        multiline
        rows={3}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={saving}
        fullWidth
        sx={{ mt: 2 }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </Button>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
      >
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess("")}
      >
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
