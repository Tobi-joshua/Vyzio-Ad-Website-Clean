// SellerCreateAdFormTwoStep.jsx
import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Typography, TextField, Button, CircularProgress,
  Stack, Alert, InputAdornment, Avatar, IconButton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, FormControl, InputLabel, Select, LinearProgress
} from "@mui/material";
import AddPhotoIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import { API_BASE_URL } from "../../constants";
import { SellerDashboardContext } from "./index";
import { useWebToast } from '../../hooks/useWebToast';
import { usePaystackPayment } from "react-paystack";

// helpers
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const isAllowedSize = (file) => {
  if (!file || !file.size) return false;
  const { name, size } = file;
  const extension = name.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) return size <= MAX_IMAGE_SIZE;
  return true;
};

const CURRENCY_OPTIONS = ["USD", "NGN", "CAD", "GBP", "EUR", "XEN"];

/* ---------- Component ---------- */
export default function SellerCreateAdFormTwoStep() {
  const { id: categoryId, name: catName } = useParams();
  const navigate = useNavigate();
  const showToast = useWebToast();
  const { userId, token, firstName, email } = useContext(SellerDashboardContext || {});

  // metadata step
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NGN");

  // images step
  const [headerImageFile, setHeaderImageFile] = useState(null);
  const [extraImages, setExtraImages] = useState([]);

  const [step, setStep] = useState(1); // 1 metadata, 2 images, 3 payment/summary

  // network states
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [adData, setAdData] = useState(null);

  // payment
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const getAuthHeaders = () => {
    const h = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  // file handlers
  const handleHeaderImageChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!isAllowedSize(f)) {
      showToast({ message: "Header image too large or not supported (max 10MB)", severity: "error" });
      return;
    }
    setHeaderImageFile(f);
  };

  const handleExtraImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    const allowed = [];
    for (const f of files) {
      if (!isAllowedSize(f)) {
        showToast({ message: `${f.name} is too large or not supported`, severity: "error" });
        continue;
      }
      allowed.push(f);
    }
    if (allowed.length) setExtraImages((prev) => [...prev, ...allowed]);
  };

  const removeExtraImage = (index) => setExtraImages((prev) => prev.filter((_, i) => i !== index));
  const clearForm = () => {
    setTitle(""); setDescription(""); setCity(""); setPrice(""); setHeaderImageFile(null); setExtraImages([]); setAdData(null); setStep(1);
  };


  // create metadata only
  const createAdMetadata = async () => {
    setError(""); setCreating(true);
    try {
      const payload = {
        title, description, city,
        price: price || "0",
        currency: currency || "NGN",
      };
      if (categoryId) payload.category = categoryId;

      const res = await fetch(`${API_BASE_URL}/api/seller/ads/create-metadata/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed creating ad metadata");
      }
      const data = await res.json();
      setAdData(data);
      setStep(2);
      showToast({ message: "Ad metadata created — proceed to upload images", severity: "success" });
      return data;
    } catch (err) {
      setError(err.message || "Unknown error creating ad");
      throw err;
    } finally {
      setCreating(false);
    }
};


// upload images to ad (call after metadata creation)
const uploadImagesToAd = async (adIdArg) => {
    if (!adIdArg && !adData?.id) throw new Error("No ad ID for image upload");
    setUploading(true);
    try {
      const fd = new FormData();
      if (headerImageFile) fd.append("header_image", headerImageFile);
      extraImages.forEach((img) => fd.append("images", img));

      const res = await fetch(`${API_BASE_URL}/api/seller/ads/${adIdArg || adData.id}/upload-images/`, {
        method: "POST",
        headers: { ...getAuthHeaders() }, // do NOT set Content-Type for FormData
        body: fd,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed uploading images");
      }
      const json = await res.json();
      showToast({ message: "Images uploaded", severity: "success" });
      setStep(3);
      return json;
    } catch (err) {
      setError(err.message || "Image upload failed");
      throw err;
    } finally {
      setUploading(false);
    }
  };


  // create payment instance (same as your create_ad_payment endpoint)
  const createPaymentInstance = async (adIdArg) => {
    if (!adIdArg && !adData?.id) throw new Error("No ad ID for payment");
    setCreatingPayment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/seller/ads/${adIdArg || adData.id}/create-payment/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create payment instance");
      }
      const json = await res.json();
      setPaymentDetails(json);
      setPaymentDialogOpen(true);
      return json;
    } finally {
      setCreatingPayment(false);
    }
  };

  // confirm payment on server
  const confirmPaymentOnServer = async ({ payment_reference, ad_id }) => {
    const res = await fetch(`${API_BASE_URL}/api/seller/payments/confirm/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ payment_reference, ad_id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to confirm payment on server");
    }
    return res.json();
  };

  // Paystack launcher
  const PaymentLauncher = ({ config, onSuccess, onClose }) => {
    const initializePayment = usePaystackPayment(config || {});
    if (!config || !config.amount || !config.publicKey) return;
      initializePayment(onSuccess, onClose);
    return null;
  };

  // submit metadata step
  const handleMetadataSubmit = async (e) => {
    e?.preventDefault?.();
    try {
      await createAdMetadata();
    } catch (err) {
    }
  };

  // submit images step
  const handleImagesSubmit = async (e) => {
    e?.preventDefault?.();
    try {
      await uploadImagesToAd();
    } catch (err) {
    }
  };

  // pay now - ensure paymentDetails exist
const handlePayNow = async () => {
    if (!adData?.id) {
      showToast({ message: "No ad to pay for", severity: "error" });
      return;
    }
    try {
      if (!paymentDetails) {
        await createPaymentInstance(adData.id);
      } else {
        setPaymentDialogOpen(false);
        creatingPayment(false);
      }
    } catch (err) {
      showToast({ message: err.message || "Payment initialization failed", severity: "error" });
    }
  };


  // Success callback - synchronous
const handlePaySuccess = (response) => {
  // Call async logic separately
  confirmPaymentAndRedirect(response);
};

// Close callback - synchronous
const handlePayClose = () => {
  showToast({ message: "Payment was cancelled or closed.", severity: "info" });
  setPaymentDialogOpen(false);
  window.location.href = `/sellers/dashboard`;
};

// Async function to handle verification and redirect
async function confirmPaymentAndRedirect(response) {
  try {
    const serverResp = await confirmPaymentOnServer({
      payment_reference: response.reference,
      ad_id: adData?.id,
    });
    setPaymentDialogOpen(false);
    showToast({
      message: serverResp.detail || "Payment successful. Your ad is now active!",
      severity: "success"
    });
    navigate(`/sellers/ads/${adData?.id}/details`);
  } catch (err) {
    showToast({
      message: err.message || "Payment confirmation failed",
      severity: "error"
    });
  }
}

const CloseDialogAndNavigate =() =>{
  setPaymentDialogOpen(false); 
  navigate("/sellers/dashboard");
}

  // UI
  const accent = "#6C5CE7"; // soft purple accent

  return (
    <Box maxWidth={980} mx="auto" my={4} p={3}
      sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: 2, borderLeft: `6px solid ${accent}` }}>
      <Typography variant="h5" mb={2} color="text.primary">Create ad {catName ? `in ${decodeURIComponent(catName)}` : ""}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Step indicator */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ px: 2, py: 0.5, bgcolor: step >= 1 ? accent : "grey.200", color: "white", borderRadius: 1 }}>1. Metadata</Box>
        <Box sx={{ px: 2, py: 0.5, bgcolor: step >= 2 ? accent : "grey.200", color: step >= 2 ? "white" : "text.secondary", borderRadius: 1 }}>2. Images</Box>
        <Box sx={{ px: 2, py: 0.5, bgcolor: step >= 3 ? accent : "grey.200", color: step >= 3 ? "white" : "text.secondary", borderRadius: 1 }}>3. Publish</Box>
      </Stack>

      {step === 1 && (
        <form onSubmit={handleMetadataSubmit}>
          <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2 }} required />
          <TextField label="Description" multiline rows={6} fullWidth value={description} onChange={(e) => setDescription(e.target.value)} sx={{ mb: 2 }} required />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} fullWidth />
            <TextField label="Price" value={price} onChange={(e) => setPrice(e.target.value)} type="number"
              InputProps={{ startAdornment: <InputAdornment position="start">{currency}</InputAdornment> }} />
          </Stack>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="ad-currency-label">Advertised Currency</InputLabel>
            <Select labelId="ad-currency-label" value={currency} label="Advertised Currency" onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
            <Typography variant="caption" color="text.secondary">
              This is the currency buyers see. Listing fee is determined separately.
            </Typography>
          </FormControl>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => navigate(-1)} disabled={creating}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creating} sx={{ bgcolor: accent }}>
              {creating ? <CircularProgress size={20} color="inherit" /> : "Save & Next"}
            </Button>
          </Stack>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleImagesSubmit}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Header image (single)</Typography>
            <label htmlFor="header-image-input">
              <input id="header-image-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleHeaderImageChange} />
              <Button component="span" variant="outlined" startIcon={<AddPhotoIcon />}>Choose header image</Button>
            </label>

            {headerImageFile && (
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <Avatar variant="rounded" src={URL.createObjectURL(headerImageFile)} sx={{ width: 72, height: 72 }} />
                <Box>
                  <Typography variant="body2">{headerImageFile.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{(headerImageFile.size/1024/1024).toFixed(2)} MB</Typography>
                </Box>
              </Stack>
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Extra images (multiple)</Typography>
            <label htmlFor="extra-images-input">
              <input id="extra-images-input" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleExtraImagesChange} />
              <Button component="span" variant="outlined" startIcon={<AddPhotoIcon />}>Add extra images</Button>
            </label>

            <Grid container spacing={1} sx={{ mt: 1 }}>
              {extraImages.map((img, idx) => (
                <Grid item key={idx}>
                  <Box sx={{ position: "relative", width: 96 }}>
                    <Avatar variant="rounded" src={URL.createObjectURL(img)} sx={{ width: 96, height: 72 }} />
                    <IconButton
                      size="small"
                      onClick={() => removeExtraImage(idx)}
                      sx={{ position: "absolute", top: -10, right: -10, bgcolor: "background.paper" }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="caption" display="block" noWrap sx={{ width: 96 }}>{img.name}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <Button variant="text" onClick={() => setStep(1)}>Back</Button>
            <Box>
              <Button variant="outlined" onClick={() => { clearForm(); }}>Reset</Button>
              <Button type="submit" variant="contained" disabled={uploading} sx={{ ml: 1, bgcolor: accent }}>
                {uploading ? <CircularProgress size={18} color="inherit" /> : "Upload & Continue"}
              </Button>
            </Box>
          </Stack>
        </form>
      )}

      {step === 3 && (
        <Box>
          <Alert severity="success">Ad created. Ready to publish.</Alert>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">{adData?.title}</Typography>
            <Typography variant="body2" color="text.secondary">{currency} {adData?.price ?? price}</Typography>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate(-1)}>Back to dashboard</Button>
            <Button variant="contained" sx={{ bgcolor: accent }} onClick={handlePayNow} disabled={!adData || creatingPayment}>
              Pay & Publish
            </Button>
            <Button variant="text" onClick={() => { showToast({ message: "Will publish later", severity: "info" }); navigate("/sellers/dashboard"); }}>
              Publish later
            </Button>
          </Stack>
        </Box>
      )}

      {/* Payment dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
        <DialogTitle>Pay to publish your ad</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Your ad is currently <strong>pending</strong>. Pay the listing fee to activate it.
          </Typography>
          <Typography variant="body2">Ad title: {adData?.title}</Typography>
          <Typography variant="body2">Advertised price: {currency} {adData?.price ?? price}</Typography>
          <Box mt={1}>
            <Typography variant="body2">Listing fee:</Typography>
            {paymentDetails ? (
              <Typography variant="h6">{paymentDetails.currency} {paymentDetails.amount}</Typography>
            ) : (
              <>
                <Typography variant="body2">Loading fee…</Typography>
                <LinearProgress sx={{ mt: 1 }} />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => CloseDialogAndNavigate()}>Pay later</Button>
          <Button variant="contained" onClick={handlePayNow} disabled={creatingPayment || !paymentDetails}>
            {creatingPayment ? <CircularProgress size={18} /> : "Pay now"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment launcher */}
      {paymentDetails && paymentDetails.payment_reference && paymentDetails.public_key && !paymentDialogOpen && !creatingPayment && (
        <PaymentLauncher
          config={{
            reference: paymentDetails.payment_reference,
            email: email,
            amount: paymentDetails.amount_smallest_unit || Math.round(Number(paymentDetails.amount || 0) * 100),
            publicKey: paymentDetails.public_key,
            currency: paymentDetails.currency || "NGN",
          }}
          onSuccess={handlePaySuccess}
          onClose={handlePayClose}
        />
      )}
    </Box>
  );
}