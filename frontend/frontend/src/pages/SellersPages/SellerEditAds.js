import React, { useState, useContext, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Typography, TextField, Button, CircularProgress,
  Stack, Alert, InputAdornment, Avatar, IconButton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, FormControl, InputLabel, Select, LinearProgress
} from "@mui/material";
import AddPhotoIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { API_BASE_URL } from "../../constants";
import { SellerDashboardContext } from "./index";
import { useWebToast } from '../../hooks/useWebToast';

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
const PAYMENT_METHODS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'crypto', label: 'Crypto' },
];

export default function SellerEditAdFormTwoStep() {
  const { id, name: catName } = useParams();
  const navigate = useNavigate();
  const showToast = useWebToast();
  const { userId, token, firstName, email } = useContext(SellerDashboardContext || {});

  // header helpers
  const getAuthHeaders = useCallback(() => {
    const h = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const getJsonHeaders = useCallback(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  // metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NGN");

  // images: newly selected files
  const [headerImageFile, setHeaderImageFile] = useState(null);
  const [headerPreview, setHeaderPreview] = useState(null); // object url for local preview
  const [extraImages, setExtraImages] = useState([]); // File[] for newly added extras
  const [extraPreviews, setExtraPreviews] = useState([]); // object urls

  // existing images from backend
  const [existingHeader, setExistingHeader] = useState(null); // { url }
  const [existingImages, setExistingImages] = useState([]); // [{ id, url, filename }]

  const [step, setStep] = useState(1); // 1 metadata, 2 images, 3 publish

  // network / state flags
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [adData, setAdData] = useState(null);
  const [loading, setLoading] = useState(true);

  // payment
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentAdId, setPaymentAdId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [manualReference, setManualReference] = useState('');

  // verifying & success UI
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successIsActive, setSuccessIsActive] = useState(false);

  // fetch ad and populate form
  useEffect(() => {
    let mounted = true;
    const fetchAd = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/seller/ads/${id}/`, {
          headers: getJsonHeaders(),
          credentials: "include",
        });
        if (!r.ok) throw new Error("Failed to fetch ad");
        const data = await r.json();
        if (!mounted) return;
        setAdData(data);

        // populate form
        setTitle(data.title || "");
        setDescription(data.description || "");
        setCity(data.city || "");
        setPrice(data.price ?? "");
        setCurrency(data.currency || "NGN");

        // existing header
        if (data.header_image) setExistingHeader({ url: data.header_image });
        else setExistingHeader(null);

        // existing extras (assumes serializer returns images array with { id, image, filename }
        const existing = (data.images || []).map(img => ({ id: img.id, url: img.image, filename: img.filename || img.image }));
        setExistingImages(existing);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load ad");
        setLoading(false);
      }
    };
    fetchAd();
    return () => { mounted = false; };
  }, [id, getJsonHeaders]);

  // cleanup object URLs when headerFile or extraImages change
  useEffect(() => {
    return () => {
      if (headerPreview) URL.revokeObjectURL(headerPreview);
      extraPreviews.forEach(u => URL.revokeObjectURL(u));
    };
  }, [headerPreview, extraPreviews]);

  // file handlers
  const handleHeaderImageChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!isAllowedSize(f)) {
      showToast({ message: "Header image too large or not supported (max 10MB)", severity: "error" });
      return;
    }
    // revoke previous preview
    if (headerPreview) URL.revokeObjectURL(headerPreview);
    const url = URL.createObjectURL(f);
    setHeaderImageFile(f);
    setHeaderPreview(url);
    // clear existing header since user intends to replace it
    setExistingHeader(null);
  };

  const handleExtraImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    const allowed = [];
    const newPreviews = [];
    for (const f of files) {
      if (!isAllowedSize(f)) {
        showToast({ message: `${f.name} is too large or not supported`, severity: "error" });
        continue;
      }
      allowed.push(f);
      newPreviews.push(URL.createObjectURL(f));
    }
    if (allowed.length) {
      setExtraImages((prev) => [...prev, ...allowed]);
      setExtraPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeExtraImage = (index) => {
    // if index refers to newly added file
    setExtraImages(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    // remove preview accordingly
    setExtraPreviews(prev => {
      const copy = [...prev];
      const u = copy.splice(index, 1);
      if (u && u[0]) URL.revokeObjectURL(u[0]);
      return copy;
    });
  };

  const clearForm = () => {
    setTitle(""); setDescription(""); setCity(""); setPrice("");
    if (headerPreview) { URL.revokeObjectURL(headerPreview); setHeaderPreview(null); }
    extraPreviews.forEach(u => URL.revokeObjectURL(u));
    setHeaderImageFile(null); setExtraImages([]); setExtraPreviews([]);
    setAdData(null); setStep(1);
  };

  // -------- metadata update (PATCH) --------
  const saveMetadata = async () => {
    setError(""); setSaving(true);
    try {
      const payload = { title, description, city, price: price || "0", currency };
      const res = await fetch(`${API_BASE_URL}/api/seller/ads/${id}/`, {
        method: "PATCH",
        headers: getJsonHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed updating ad metadata");
      }
      const data = await res.json();
      // our views return { ad: ... } or plain ad — handle both
      const ad = data.ad || data;
      setAdData(ad);
      showToast({ message: "Ad updated — proceed to images", severity: "success" });
      setStep(2);
      return ad;
    } catch (err) {
      setError(err.message || "Unknown error updating ad");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // -------- upload images (existing separate endpoint) --------
  const uploadImagesToAd = async (adIdArg) => {
    const adId = adIdArg || adData?.id || id;
    if (!adId) throw new Error("No ad ID for image upload");
    setUploading(true);
    try {
      const fd = new FormData();
      if (headerImageFile) fd.append("header_image", headerImageFile);
      extraImages.forEach((img) => fd.append("images", img));

      const res = await fetch(`${API_BASE_URL}/api/seller/ads/${adId}/upload-images/`, {
        method: "POST",
        headers: getAuthHeaders(), // IMPORTANT: do NOT set Content-Type here
        body: fd,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed uploading images");
      }
      const json = await res.json();
      showToast({ message: "Images uploaded", severity: "success" });

      // refresh ad detail so existingImages/header reflect new uploads
      const r2 = await fetch(`${API_BASE_URL}/api/seller/ads/${adId}/`, {
        headers: getJsonHeaders(),
        credentials: "include",
      });
      if (r2.ok) {
        const fresh = await r2.json();
        setAdData(fresh);
        setExistingHeader(fresh.header_image ? { url: fresh.header_image } : null);
        const existing = (fresh.images || []).map(img => ({ id: img.id, url: img.image, filename: img.filename || img.image }));
        setExistingImages(existing);
      }

      // cleanup newly uploaded local files + previews
      if (headerPreview) { URL.revokeObjectURL(headerPreview); setHeaderPreview(null); }
      extraPreviews.forEach(u => URL.revokeObjectURL(u));
      setHeaderImageFile(null); setExtraImages([]); setExtraPreviews([]);

      setStep(3);
      return json;
    } catch (err) {
      setError(err.message || "Image upload failed");
      throw err;
    } finally {
      setUploading(false);
    }
  };

  // -------- delete existing extra image --------
  const deleteExistingImage = async (imgId) => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/seller/ads/images/${imgId}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to delete image");
      setExistingImages(prev => prev.filter(x => x.id !== imgId));
      showToast({ message: "Image deleted", severity: "success" });
    } catch (err) {
      console.error(err);
      showToast({ message: err.message || "Failed to delete image", severity: "error" });
    }
  };

  // -------- delete existing header --------
  const deleteExistingHeader = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/seller/ads/${id}/header/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to delete header");
      setExistingHeader(null);
      showToast({ message: "Header removed", severity: "success" });
    } catch (err) {
      console.error(err);
      showToast({ message: err.message || "Failed to remove header", severity: "error" });
    }
  };

  // -------- create payment instance (server) --------
  const createPaymentInstance = async (adIdArg, methodArg) => {
    const adId = adIdArg || adData?.id || id;
    const method = methodArg || 'stripe';
    if (!adId) throw new Error("No ad ID for payment");
    setCreatingPayment(true);
    setPaymentAdId(adId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/seller/ads/${adId}/create-payment/`, {
        method: "POST",
        headers: getJsonHeaders(),
        credentials: "include",
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create payment instance");
      }
      const json = await res.json();
      setPaymentDetails(json);
      setPaymentDialogOpen(true);
      // optimistic: mark pending locally
      setAdData(prev => prev ? { ...prev, status: "pending" } : prev);
      return json;
    } finally {
      setCreatingPayment(false);
    }
  };

  // -------- confirm payment on server --------
  const confirmPaymentOnServer = async ({ payment_reference, ad_id }) => {
    const res = await fetch(`${API_BASE_URL}/api/seller/payments/confirm/`, {
      method: "POST",
      headers: getJsonHeaders(),
      credentials: "include",
      body: JSON.stringify({ payment_reference, ad_id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to confirm payment on server");
    }
    return res.json();
  };

  async function handleManualConfirm(reference) {
    const adId = paymentAdId || adData?.id || id;
    if (!adId) {
      showToast({ message: "Missing ad id for verification", severity: "error" });
      return;
    }
    setVerifyingPayment(true);
    try {
      const serverResp = await confirmPaymentOnServer({ payment_reference: reference, ad_id: adId });
      if (serverResp?.ad) {
        setAdData(prev => ({ ...(prev || {}), ...(serverResp.ad || {}) }));
      }
      setVerifyingPayment(false);
      setPaymentDialogOpen(false);
      setPaymentDetails(null);
      setPaymentAdId(null);

      if ((serverResp.status ?? serverResp.ad?.status) === "active") {
        setSuccessIsActive(true);
        setSuccessMessage(serverResp.detail || "Payment confirmed — your ad is active.");
      } else {
        setSuccessIsActive(false);
        setSuccessMessage(serverResp.detail || "Payment received. Your ad is awaiting admin approval. You will be notified by email when approved.");
      }
      setSuccessModalOpen(true);
    } catch (err) {
      console.error("Payment confirmation error:", err);
      setVerifyingPayment(false);
      setPaymentDetails(null);
      setPaymentAdId(null);
      showToast({ message: err.message || "Failed to confirm payment", severity: "error" });
    }
  }

  // Launch provider (open checkout URL if provided)
  const launchProvider = () => {
    if (!paymentDetails) return;
    // server may provide a checkout_url for Stripe/Orange
    if (paymentDetails.checkout_url) {
      window.open(paymentDetails.checkout_url, '_blank');
      showToast({ message: 'Payment provider opened in a new tab', severity: 'info' });
      return;
    }

    // crypto flow: server may return crypto_address and amount
    if (paymentDetails.crypto_address) {
      showToast({ message: 'Follow the displayed crypto instructions to complete payment', severity: 'info' });
      return;
    }

    showToast({ message: 'No external URL provided — complete payment with your provider and paste the reference to verify', severity: 'info' });
  };

  // UI handlers
  const handleMetadataSubmit = async (e) => {
    e?.preventDefault?.();
    try { await saveMetadata(); } catch {};
  };

  const handleImagesSubmit = async (e) => {
    e?.preventDefault?.();
    try { await uploadImagesToAd(adData?.id || id); } catch {};
  };

  const handlePayNow = async () => {
    const adId = adData?.id || id;
    if (!adId) { showToast({ message: "No ad to pay for", severity: "error" }); return; }

    // If payment already created and has a payment_reference, just re-open the dialog
    if (paymentDetails && paymentDetails.payment_reference) {
      setPaymentDialogOpen(true);
      return;
    }

    try {
      setCreatingPayment(true);
      await createPaymentInstance(adId, paymentMethod);
    } catch (err) {
      showToast({ message: err.message || "Payment initialization failed", severity: "error" });
    } finally {
      setCreatingPayment(false);
    }
  };

  const CloseDialogAndNavigate = () => {
    setPaymentDialogOpen(false);
    setPaymentDetails(null);
    setPaymentAdId(null);
    navigate("/sellers/dashboard");
  };

  const handleSuccessClose = (viewAd = false) => {
    setSuccessModalOpen(false);
    if (viewAd && adData?.id) navigate(`/sellers/ads/${adData.id}/details`);
    else navigate("/sellers/dashboard");
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ message: 'Copied to clipboard', severity: 'success' });
    } catch (err) {
      showToast({ message: 'Could not copy', severity: 'error' });
    }
  };

  const accent = "#6C5CE7";

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box maxWidth={980} mx="auto" my={4} p={3}
      sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: 2, borderLeft: `6px solid ${accent}` }}>
      <Typography variant="h5" mb={2} color="text.primary">Edit ad {catName ? `in ${decodeURIComponent(catName)}` : ""}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
            <Button variant="outlined" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
            <Button
              variant="contained"
              disabled={saving}
              sx={{ bgcolor: accent }}
              onClick={async (e) => { e.preventDefault(); try { await saveMetadata(); } catch {} }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : "Save & Next"}
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

            {/* existing header */}
            {existingHeader ? (
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <Avatar variant="rounded" src={existingHeader.url} sx={{ width: 72, height: 72 }} />
                <Box>
                  <Typography variant="body2">Current header</Typography>
                  <Button size="small" onClick={deleteExistingHeader}>Remove</Button>
                </Box>
              </Stack>
            ) : headerPreview ? (
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <Avatar variant="rounded" src={headerPreview} sx={{ width: 72, height: 72 }} />
                <Box>
                  <Typography variant="body2">New header</Typography>
                  <Typography variant="caption" color="text.secondary">{headerImageFile?.name}</Typography>
                </Box>
              </Stack>
            ) : null}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Extra images (multiple)</Typography>
            <label htmlFor="extra-images-input">
              <input id="extra-images-input" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleExtraImagesChange} />
              <Button component="span" variant="outlined" startIcon={<AddPhotoIcon />}>Add extra images</Button>
            </label>

            <Grid container spacing={1} sx={{ mt: 1 }}>
              {/* existing images from backend */}
              {existingImages.map((img) => (
                <Grid item key={img.id}>
                  <Box sx={{ position: "relative", width: 96 }}>
                    <Avatar variant="rounded" src={img.url} sx={{ width: 96, height: 72 }} />
                    <IconButton
                      size="small"
                      onClick={() => deleteExistingImage(img.id)}
                      sx={{ position: "absolute", top: -10, right: -10, bgcolor: "background.paper" }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="caption" display="block" noWrap sx={{ width: 96 }}>{img.filename}</Typography>
                  </Box>
                </Grid>
              ))}

              {/* newly selected files */}
              {extraPreviews.map((u, idx) => (
                <Grid item key={`new-${idx}`}>
                  <Box sx={{ position: "relative", width: 96 }}>
                    <Avatar variant="rounded" src={u} sx={{ width: 96, height: 72 }} />
                    <IconButton
                      size="small"
                      onClick={() => removeExtraImage(idx)}
                      sx={{ position: "absolute", top: -10, right: -10, bgcolor: "background.paper" }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="caption" display="block" noWrap sx={{ width: 96 }}>{extraImages[idx]?.name}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <Button variant="text" onClick={() => setStep(1)}>Back</Button>
            <Box>
              <Button variant="outlined" onClick={() => { clearForm(); }}>Reset</Button>
              <Button
                type="button"
                variant="contained"
                disabled={uploading}
                sx={{ ml: 1, bgcolor: accent }}
                onClick={async () => { try { await uploadImagesToAd(adData?.id || id); } catch {} }}
              >
                {uploading ? <CircularProgress size={18} color="inherit" /> : "Upload & Continue"}
              </Button>
            </Box>
          </Stack>
        </form>
      )}

      {step === 3 && (
        <Box>
          <Alert severity="success">Ad ready to publish.</Alert>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">{adData?.title}</Typography>
            <Typography variant="body2" color="text.secondary">{currency} {adData?.price ?? price}</Typography>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate(-1)}>Back to dashboard</Button>
            <Button
              variant="contained"
              sx={{ bgcolor: accent }}
              onClick={handlePayNow}
              disabled={!adData || creatingPayment}
            >
              {creatingPayment ? <CircularProgress size={18} color="inherit" /> : "Pay & Publish"}
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

          <FormControl fullWidth sx={{ my: 1 }}>
            <InputLabel id="payment-method-label">Payment method</InputLabel>
            <Select
              labelId="payment-method-label"
              value={paymentMethod}
              label="Payment method"
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>

          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">Ad title: {adData?.title}</Typography>
            <Typography variant="body2">Advertised price: {currency} {adData?.price ?? price}</Typography>
          </Box>

          <Box mt={2}>
            <Typography variant="body2">Listing fee:</Typography>
            {paymentDetails ? (
              <Box>
                <Typography variant="h6">{paymentDetails.currency} {paymentDetails.amount}</Typography>

                {/* If server gave a checkout URL (Stripe/Orange), show launch button */}
                {paymentDetails.checkout_url && (
                  <Button sx={{ mt: 1 }} variant="contained" onClick={launchProvider}>Open payment provider</Button>
                )}

                {/* If crypto info provided show address and copy button */}
                {paymentDetails.crypto_address && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="body2">Address: {paymentDetails.crypto_address}</Typography>
                    <IconButton size="small" onClick={() => copyToClipboard(paymentDetails.crypto_address)}><ContentCopyIcon fontSize="small" /></IconButton>
                  </Box>
                )}

                {/* If server returned a payment reference, show it and allow manual confirmation */}
                {paymentDetails.payment_reference ? (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">Reference: {paymentDetails.payment_reference}</Typography>
                    <Button sx={{ mt: 1 }} variant="outlined" onClick={() => handleManualConfirm(paymentDetails.payment_reference)}>I have paid — Verify</Button>
                  </Box>
                ) : (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">If your provider returns a reference after payment, paste it here to verify.</Typography>
                    <TextField
                      placeholder="Enter payment reference"
                      fullWidth
                      value={manualReference}
                      onChange={(e) => setManualReference(e.target.value)}
                      sx={{ mt: 1 }}
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button variant="contained" onClick={() => launchProvider()}>Open provider</Button>
                      <Button variant="outlined" onClick={() => handleManualConfirm(manualReference)} disabled={!manualReference}>Verify</Button>
                    </Stack>
                  </Box>
                )}
              </Box>
            ) : (
              <>
                <Typography variant="body2">Loading fee…</Typography>
                <LinearProgress sx={{ mt: 1 }} />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={CloseDialogAndNavigate}>Pay later</Button>
          <Button
            variant="contained"
            onClick={() => { setCreatingPayment(true); createPaymentInstance(paymentAdId || adData?.id || id, paymentMethod).finally(() => setCreatingPayment(false)); }}
            disabled={creatingPayment}
          >
            {creatingPayment ? <CircularProgress size={18} color="inherit" /> : "Init payment"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verifying dialog */}
      <Dialog open={verifyingPayment} onClose={() => {}} PaperProps={{ sx: { p: 2, width: 380 } }}>
        <DialogTitle>Verifying payment</DialogTitle>
        <DialogContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
          <CircularProgress />
          <Box>
            <Typography>We received payment from the provider and are verifying it with the server. This may take a few seconds.</Typography>
            <Typography variant="caption" color="text.secondary">Do not close this window.</Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Success modal */}
      <Dialog open={successModalOpen} onClose={() => handleSuccessClose(false)}>
        <DialogTitle>{successIsActive ? "Payment received" : "Payment received — awaiting approval"}</DialogTitle>
        <DialogContent>
          <Typography>{successMessage}</Typography>
          {!successIsActive && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Our team will review your ad. You will get an email when it is approved.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleSuccessClose(false)}>{successIsActive ? "Back to dashboard" : "OK"}</Button>
          {successIsActive && <Button variant="contained" onClick={() => handleSuccessClose(true)}>View ad</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
}