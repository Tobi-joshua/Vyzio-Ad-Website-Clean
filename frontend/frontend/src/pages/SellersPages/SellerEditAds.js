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

export default function SellerCreateAdFormTwoStep() {
  const { id: categoryId, name: catName } = useParams();
  const navigate = useNavigate();
  const showToast = useWebToast();
  const { userId, token, firstName, email } = useContext(SellerDashboardContext || {});

  // metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NGN");

  // images
  const [headerImageFile, setHeaderImageFile] = useState(null);
  const [extraImages, setExtraImages] = useState([]);

  const [step, setStep] = useState(1); // 1 metadata, 2 images, 3 publish

  // network / state flags
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [adData, setAdData] = useState(null);

  // payment
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false); // spinner for Pay & Publish / Launch Checkout
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentAdId, setPaymentAdId] = useState(null);

  // verifying & success UI
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  
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

  // -------- metadata creation --------
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

  // -------- upload images --------
  const uploadImagesToAd = async (adIdArg) => {
    if (!adIdArg && !adData?.id) throw new Error("No ad ID for image upload");
    setUploading(true);
    try {
      const fd = new FormData();
      if (headerImageFile) fd.append("header_image", headerImageFile);
      extraImages.forEach((img) => fd.append("images", img));

      const res = await fetch(`${API_BASE_URL}/api/seller/ads/${adIdArg || adData.id}/upload-images/`, {
        method: "POST",
        headers: { ...getAuthHeaders() }, // don't set Content-Type (browser will set multipart boundary)
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

  // -------- create payment instance (server) --------
  const createPaymentInstance = async (adIdArg) => {
    const adId = adIdArg || adData?.id;
    if (!adId) throw new Error("No ad ID for payment");
    setCreatingPayment(true);
    setPaymentAdId(adId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/seller/ads/${adId}/create-payment/`, {
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
      // optimistic: ad pending so user can click Pay immediately
      setAdData(prev => prev ? { ...prev, status: "pending" } : prev);
      return json;
    } finally {
      // keep creatingPayment true briefly so UI shows spinner; caller will clear it when launching checkout
      // but reset it here only if an error occurred (we can't detect easily), so ensure callers set it appropriately
      setCreatingPayment(false);
    }
  };

  // -------- confirm payment on server --------
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

  // -------- verify after Paystack success (async) --------
  async function confirmPaymentAndRedirect(response, adId) {
    if (!adId) {
      showToast({ message: "Missing ad id for verification", severity: "error" });
      setVerifyingPayment(false);
      setCreatingPayment(false);
      return;
    }

    setVerifyingPayment(true);
    try {
      const payload = { payment_reference: response.reference, ad_id: adId };
      const serverResp = await confirmPaymentOnServer(payload);

      // if server returns updated ad object / status, update local adData
      if (serverResp?.ad) {
        setAdData(prev => ({ ...(prev || {}), ...(serverResp.ad || {}) }));
      }

      setVerifyingPayment(false);
      setCreatingPayment(false);
      setPaymentDialogOpen(false);
      setPaymentDetails(null);
      setPaymentAdId(null);

      // show appropriate success message
      if ((serverResp.status ?? serverResp.ad?.status) === "active") {
        setSuccessMessage(serverResp.detail || "Payment confirmed — your ad is active.");
      } else {
        setSuccessMessage(serverResp.detail || "Payment received. Your ad is awaiting admin approval. You will be notified by email when approved.");
      }
      setSuccessModalOpen(true);
    } catch (err) {
      console.error("Payment confirmation error:", err);
      setVerifyingPayment(false);
      setCreatingPayment(false);
      setPaymentDetails(null);
      setPaymentAdId(null);
      showToast({ message: err.message || "Failed to confirm payment", severity: "error" });
    }
  }

  // Paystack config (use hook with latest paymentDetails)
  const paystackConfig = paymentDetails ? {
    publicKey: paymentDetails.public_key || process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || "",
    email: email || localStorage.getItem("email") || "",
    amount: paymentDetails.amount_smallest_unit || Math.round((Number(paymentDetails.amount || 0) * 100) || 0),
    currency: paymentDetails.currency || "NGN",
    reference: paymentDetails.payment_reference,
  } : {};

  const initializePayment = usePaystackPayment(paystackConfig);

  // synchronous callbacks for Paystack (must NOT be async)
  const onPaystackSuccess = (response) => {
    // keep this function synchronous:
    // - show verifying UI
    setPaymentDialogOpen(false);
    setPaymentDetails(null);
    setVerifyingPayment(true);
    // call async confirmation (do not await here)
    confirmPaymentAndRedirect(response, paymentAdId || adData?.id);
  };

  const onPaystackClose = () => {
    // synchronous cleanup
    setCreatingPayment(false);
    setPaymentDialogOpen(false);
    setPaymentDetails(null);
    setPaymentAdId(null);
    showToast({ message: "Payment window closed — you can complete payment later.", severity: "info" });
  };

  // UI handlers
  const handleMetadataSubmit = async (e) => {
    e?.preventDefault?.();
    try {
      await createAdMetadata();
    } catch (err) {
      // error already handled in createAdMetadata
    }
  };

  const handleImagesSubmit = async (e) => {
    e?.preventDefault?.();
    try {
      await uploadImagesToAd();
    } catch (err) {
      // handled in uploadImagesToAd
    }
  };

  // when user clicks "Pay & Publish" in step 3
  const handlePayNow = async () => {
    if (!adData?.id) {
      showToast({ message: "No ad to pay for", severity: "error" });
      return;
    }
    // if we already have paymentDetails, skip create step and open checkout
    if (paymentDetails && paymentDetails.payment_reference) {
      // directly launch checkout
      launchCheckout();
      return;
    }

    // create payment instance then wait for paymentDetails and open dialog
    try {
      setCreatingPayment(true); // spinner on Pay button
      await createPaymentInstance(adData.id);
      // leave creatingPayment true until user clicks Launch Checkout (we want visual cue)
      // Note: createPaymentInstance sets paymentDialogOpen(true), showing fee & Launch button.
    } catch (err) {
      showToast({ message: err.message || "Payment initialization failed", severity: "error" });
      setCreatingPayment(false);
    }
  };

  // Launch Checkout from dialog
  const launchCheckout = () => {
    if (!paymentDetails) return;
    setCreatingPayment(true);
    try {
      // initializePayment expects callbacks as positional args
       initializePayment({onSuccess:onPaystackSuccess, onClose:onPaystackClose});
      // initialization opens paystack; we keep creatingPayment until either onPaystackSuccess/Close runs
    } catch (err) {
      console.error("Could not initialize paystack:", err);
      setCreatingPayment(false);
      showToast({ message: "Could not initialize payment, try again later", severity: "error" });
    }
  };

  const CloseDialogAndNavigate = () => {
    setPaymentDialogOpen(false);
    setPaymentDetails(null);
    setPaymentAdId(null);
    navigate("/sellers/dashboard");
  };

  // success modal close
  const handleSuccessClose = (viewAd = false) => {
    setSuccessModalOpen(false);
    if (viewAd && adData?.id) {
      navigate(`/sellers/ads/${adData.id}/details`);
    } else {
      // refresh / redirect to dashboard
      navigate("/sellers/dashboard");
    }
  };

  // ---------- Render ----------
  const accent = "#6C5CE7";

  return (
    <Box maxWidth={980} mx="auto" my={4} p={3}
      sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: 2, borderLeft: `6px solid ${accent}` }}>
      <Typography variant="h5" mb={2} color="text.primary">Create ad {catName ? `in ${decodeURIComponent(catName)}` : ""}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ px: 2, py: 0.5, bgcolor: step >= 1 ? accent : "grey.200", color: "white", borderRadius: 1 }}>1. Metadata</Box>
        <Box sx={{ px: 2, py: 0.5, bgcolor: step >= 2 ? accent : "grey.200", color: step >= 2 ? "white" : "text.secondary", borderRadius: 1 }}>2. Images</Box>
        <Box sx={{ px: 2, py: 0.5, bgcolor: step >= 3 ? accent : "grey.200", color: step >= 3 ? "white" : "text.secondary", borderRadius: 1 }}>3. Publish</Box>
      </Stack>

      {step === 1 && (
        <form onSubmit={async (e) => { e.preventDefault(); try { await createAdMetadata(); } catch {} }}>
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
            <Button
              variant="contained"
              disabled={creating}
              sx={{ bgcolor: accent }}
              onClick={async (e) => { e.preventDefault(); try { await createAdMetadata(); } catch {} }}
            >
              {creating ? <CircularProgress size={20} color="inherit" /> : "Save & Next"}
            </Button>
          </Stack>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={async (e) => { e.preventDefault(); try { await uploadImagesToAd(); } catch {} }}>
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
              <Button
                type="button"
                variant="contained"
                disabled={uploading}
                sx={{ ml: 1, bgcolor: accent }}
                onClick={async () => { try { await uploadImagesToAd(); } catch {} }}
              >
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
          <Button onClick={CloseDialogAndNavigate}>Pay later</Button>
          <Button
            variant="contained"
            onClick={launchCheckout}
            disabled={!paymentDetails || creatingPayment}
          >
            {creatingPayment ? <CircularProgress size={18} color="inherit" /> : "Launch Checkout"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verifying dialog: shown after Paystack success until server confirms */}
      <Dialog open={verifyingPayment} onClose={() => {}} PaperProps={{ sx: { p: 2, width: 380 } }}>
        <DialogTitle>Verifying payment</DialogTitle>
        <DialogContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
          <CircularProgress />
          <Box>
            <Typography>We received payment from the gateway and are verifying it with the server. This may take a few seconds.</Typography>
            <Typography variant="caption" color="text.secondary">Do not close this window.</Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Success modal shown after server confirms (active or awaiting admin) */}
      <Dialog open={successModalOpen} onClose={() => handleSuccessClose(false)}>
        <DialogTitle>Payment received</DialogTitle>
        <DialogContent>
          <Typography>{successMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleSuccessClose(false)}>Back to dashboard</Button>
          <Button variant="contained" onClick={() => handleSuccessClose(true)}>View ad</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}