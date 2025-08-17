// SellerCreateAdFormTwoStep.jsx
import React, { useState, useContext, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Typography, TextField, Button, CircularProgress,
  Stack, Alert, InputAdornment, Avatar, IconButton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, FormControl, InputLabel, Select, LinearProgress, Divider,
} from "@mui/material";
import AddPhotoIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

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

export default function SellerCreateAdFormTwoStep() {
  const { name: catName } = useParams();
  const navigate = useNavigate();
  const showToast = useWebToast();
  const { token } = useContext(SellerDashboardContext || {});

  // ===== header helpers =====
  const getAuthHeaders = () => {
    const h = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };
  const getJsonHeaders = () => {
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  // metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NGN");

  // images (new files)
  const [headerImageFile, setHeaderImageFile] = useState(null);
  const [headerPreview, setHeaderPreview] = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [extraPreviews, setExtraPreviews] = useState([]);

  const [step, setStep] = useState(1); // 1 metadata, 2 images, 3 publish

  // network / state flags
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [adData, setAdData] = useState(null);

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

  // redirect-confirm handling
  const [redirectConfirming, setRedirectConfirming] = useState(false);
  const [redirectConfirmError, setRedirectConfirmError] = useState(null);

  // -------- confirm payment on server (Stripe) --------
  const confirmStripePaymentOnServer = async ({ payment_reference, ad_id }) => {
    const res = await fetch(`${API_BASE_URL}/api/seller/payments/confirm/stripe/`, {
      method: "POST",
      headers: getJsonHeaders(),
      credentials: "include",
      body: JSON.stringify({ payment_reference, ad_id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to confirm Stripe payment");
    }
    return res.json();
  };

  // -------- confirm payment on server (Crypto) --------
  const confirmCryptoPaymentOnServer = async ({ payment_reference, ad_id }) => {
    const res = await fetch(`${API_BASE_URL}/api/seller/payments/confirm/crypto/`, {
      method: "POST",
      headers: getJsonHeaders(),
      credentials: "include",
      body: JSON.stringify({ payment_reference, ad_id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to confirm Crypto payment");
    }
    return res.json();
  };

  // automatically handle Stripe redirect returns on the same page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    const payment_reference = qp.get("payment_reference");
    const ad_id = qp.get("ad_id");
    // only proceed if both present
    if (!payment_reference || !ad_id) return;

    if (redirectConfirming) return;

    (async () => {
      try {
        setRedirectConfirming(true);
        setRedirectConfirmError(null);
        const resp = await confirmStripePaymentOnServer({ payment_reference, ad_id });
        if (resp?.ad) {
          setAdData(prev => ({ ...(prev || {}), ...(resp.ad || {}) }));
        }
        if ((resp.status ?? resp.ad?.status) === "active") {
          setSuccessIsActive(true);
          setSuccessMessage(resp.detail || "Payment confirmed — your ad is active.");
        } else {
          setSuccessIsActive(false);
          setSuccessMessage(resp.detail || "Payment received — awaiting approval.");
        }
        setSuccessModalOpen(true);
      } catch (err) {
        console.error("Redirect confirm error:", err);
        setRedirectConfirmError(err.message || "Payment confirmation failed on return.");
        showToast({ message: err.message || "Failed to confirm payment after redirect", severity: "error" });
      } finally {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("payment_reference");
          url.searchParams.delete("ad_id");
          window.history.replaceState({}, document.title, url.pathname + url.search);
        } catch (e) {
          // ignore
        }
        setRedirectConfirming(false);
      }
    })();
  }, [redirectConfirming]);

  // file handlers
  const handleHeaderImageChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!isAllowedSize(f)) {
      showToast({ message: "Header image too large or not supported (max 10MB)", severity: "error" });
      return;
    }
    if (headerPreview) URL.revokeObjectURL(headerPreview);
    const url = URL.createObjectURL(f);
    setHeaderImageFile(f);
    setHeaderPreview(url);
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
    setExtraImages(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    setExtraPreviews(prev => {
      const copy = [...prev];
      const u = copy.splice(index, 1);
      if (u && u[0]) URL.revokeObjectURL(u[0]);
      return copy;
    });
  };

  const clearForm = () => {
    setTitle(""); setDescription(""); setCity(""); setPrice(""); setCurrency("NGN");
    if (headerPreview) { URL.revokeObjectURL(headerPreview); setHeaderPreview(null); }
    extraPreviews.forEach(u => URL.revokeObjectURL(u));
    setHeaderImageFile(null); setExtraImages([]); setExtraPreviews([]); setAdData(null); setStep(1);
  };

  // -------- metadata creation --------
  const createAdMetadata = async () => {
    setError(""); setCreating(true);
    try {
      const payload = { title, description, city, price: price || "0", currency };
      const res = await fetch(`${API_BASE_URL}/api/seller/ads/create-metadata/`, {
        method: "POST",
        headers: getJsonHeaders(),
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
    const adId = adIdArg || adData?.id;
    if (!adId) throw new Error("No ad ID for image upload");
    setUploading(true);
    try {
      const fd = new FormData();
      if (headerImageFile) fd.append("header_image", headerImageFile);
      extraImages.forEach((img) => fd.append("images", img));

      const res = await fetch(`${API_BASE_URL}/api/seller/ads/${adId}/upload-images/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: fd,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed uploading images");
      }
      const json = await res.json();
      showToast({ message: "Images uploaded", severity: "success" });

      // refresh ad data from server (to get header/image urls)
      const r2 = await fetch(`${API_BASE_URL}/api/seller/ads/${adId}/`, {
        headers: getJsonHeaders(),
        credentials: "include",
      });
      if (r2.ok) {
        const fresh = await r2.json();
        setAdData(fresh);
      }

      // cleanup local previews
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


  // New: when user chooses a different payment method inside the modal/selector,
// create a new server payment instance for that method (so crypto_address / checkout_url appears)
const handlePaymentMethodChange = async (e) => {
  const newMethod = e.target.value;
  setPaymentMethod(newMethod);

  // if there's no ad yet, nothing to create
  const adId = paymentAdId || adData?.id;
  if (!adId) return;

  // if current paymentDetails already matches the chosen method and is for this ad, keep it
  if (paymentDetails && paymentDetails.method === newMethod && isPaymentInitForAd(adId)) {
    return;
  }

  // clear previous details to avoid showing stale info
  setPaymentDetails(null);

  try {
    setCreatingPayment(true);
    // create a new payment instance for the selected method
    const pd = await createPaymentInstance(adId, newMethod);
    // createPaymentInstance normalizes and sets paymentDetails already, but
    // if it doesn't, do it here:
    if (pd) setPaymentDetails(pd);
    // keep the dialog open so user immediately sees crypto address / checkout
    setPaymentDialogOpen(true);
  } catch (err) {
    console.error("Failed creating payment for method change:", err);
    showToast({ message: err.message || "Failed to initialize payment for selected method", severity: "error" });
  } finally {
    setCreatingPayment(false);
  }
};


  // -------- create payment instance (server) --------
  // Note: we normalize returned fields so frontend can rely on client_secret_key & publishable_key fields.
  const createPaymentInstance = async (adIdArg, method) => {
    const adId = adIdArg || adData?.id;
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
        throw new Error(err.detail || err.error || "Failed to create payment instance");
      }
      const jsonRaw = await res.json();

      // normalize server keys (support both client_secret and client_secret_key)
      const normalized = {
        ...jsonRaw,
        client_secret_key: jsonRaw.client_secret_key || jsonRaw.client_secret || null,
        publishable_key: jsonRaw.publishable_key || jsonRaw.publishableKey || jsonRaw.publishable || null,
        ad_id: jsonRaw.ad_id || jsonRaw.adId || adId,
      };

      setPaymentDetails(normalized);
      // open dialog so user can complete payment if provider requires inline interaction
      setPaymentDialogOpen(true);
      // optimistic: mark pending locally
      setAdData(prev => prev ? { ...prev, status: "pending" } : prev);
      return normalized;
    } finally {
      setCreatingPayment(false);
    }
  };

  async function handleManualConfirm(reference, method) {
    const adId = paymentAdId || adData?.id;
    if (!adId) {
      showToast({ message: "Missing ad id for verification", severity: "error" });
      return;
    }

    setVerifyingPayment(true);

    try {
      let serverResp;
      if (method === "stripe") {
        serverResp = await confirmStripePaymentOnServer({ payment_reference: reference, ad_id: adId });
      } else if (method === "crypto") {
        serverResp = await confirmCryptoPaymentOnServer({ payment_reference: reference, ad_id: adId });
      } else {
        throw new Error("Unsupported payment method");
      }

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
        setSuccessMessage(serverResp.detail || "Payment received. Your ad is awaiting admin approval.");
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

  // Launch provider (checkout_url or just show message for crypto)
  const launchProvider = () => {
    if (!paymentDetails) return;
    if (paymentDetails.checkout_url) {
      window.open(paymentDetails.checkout_url, '_blank');
      showToast({ message: 'Payment window opened in a new tab', severity: 'info' });
      return;
    }
    if (paymentDetails.crypto_address) {
      setPaymentDialogOpen(true);
      return;
    }
    // if only client_secret exists, we want the dialog open so stripe element is visible
    if (paymentDetails.client_secret_key) {
      setPaymentDialogOpen(true);
      return;
    }

    showToast({ message: 'No external URL provided — use the manual reference to confirm when done', severity: 'info' });
  };

  // helper: check whether current paymentDetails is already for this ad
  const isPaymentInitForAd = (adId) => {
    if (!paymentDetails) return false;
    if (paymentAdId && Number(paymentAdId) === Number(adId)) return true;
    if (paymentDetails.ad_id && Number(paymentDetails.ad_id) === Number(adId)) return true;
    return false;
  };

  // UI handlers
  const handleMetadataSubmit = async (e) => {
    e?.preventDefault?.();
    try { await createAdMetadata(); } catch {};
  };

  const handleImagesSubmit = async (e) => {
    e?.preventDefault?.();
    try { await uploadImagesToAd(adData?.id); } catch {};
  };

  // handlePayNow reuses existing paymentDetails if available, otherwise creates a payment instance
  const handlePayNow = async () => {
    const adId = adData?.id;
    if (!adId) { showToast({ message: "No ad to pay for", severity: "error" }); return; }

    // If payment details already initialized for this ad, reuse them
    if (isPaymentInitForAd(adId) && paymentDetails) {
      // If provider gives checkout_url -> open it
      if (paymentDetails.checkout_url) {
        launchProvider();
        return;
      }
      // If Stripe client secret available -> open dialog to show PaymentElement
      if (paymentDetails.client_secret_key) {
        setPaymentDialogOpen(true);
        return;
      }
      // If crypto address -> open dialog to show address
      if (paymentDetails.crypto_address) {
        setPaymentDialogOpen(true);
        return;
      }
    }

    // No existing payment: create one and let createPaymentInstance open the dialog
    try {
      setCreatingPayment(true);
      const pd = await createPaymentInstance(adId, paymentMethod);
      if (pd) {
        if (pd.checkout_url) {
          window.open(pd.checkout_url, '_blank');
        } else if (pd.client_secret_key) {
          setPaymentDialogOpen(true);
        } else if (pd.crypto_address) {
          setPaymentDialogOpen(true);
        }
      }
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

  // -------- STRIPE INTEGRATION --------
  // stripePromise uses server-supplied publishable_key if present
  const stripePromise = useMemo(() => {
    const key = paymentDetails?.publishable_key || paymentDetails?.publishableKey;
    return key ? loadStripe(key) : null;
  }, [paymentDetails?.publishable_key, paymentDetails?.publishableKey]);

  // Inner component to render Stripe Payment Element and confirm inline
  function StripePaymentElement({ clientSecret, paymentReference, adId }) {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);

    const handleConfirmInDialog = async () => {
      if (!stripe || !elements) {
        showToast({ message: "Stripe has not loaded yet, try again in a moment", severity: "error" });
        return;
      }
      setProcessing(true);
      try {
        // build return url that points back to the current page with server payment_reference & ad id
        const serverPaymentReference = paymentReference || paymentDetails?.payment_reference || "";
        const serverAdId = adId || adData?.id || "";
        const returnUrl = `${window.location.origin}${window.location.pathname}?payment_reference=${encodeURIComponent(serverPaymentReference)}&ad_id=${encodeURIComponent(serverAdId)}`;

        const result = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
          redirect: "if_required",
        });

        if (result.error) {
          console.error("Stripe confirmPayment error:", result.error);
          showToast({ message: result.error.message || "Payment failed", severity: "error" });
          setProcessing(false);
          return;
        }

        // If we get a paymentIntent back (no redirect needed), confirm on server immediately
        const paymentIntent = result.paymentIntent || null;
        if (paymentIntent && paymentIntent.id) {
          const serverReference = serverPaymentReference || paymentIntent.id;
          await handleManualConfirm(serverReference, "stripe");
        } else {
          // if redirect happened, the useEffect will handle server confirm after redirect
        }
      } catch (err) {
        console.error("Stripe confirm error:", err);
        showToast({ message: err.message || "Error confirming payment", severity: "error" });
      } finally {
        setProcessing(false);
      }
    };

    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" display="block" sx={{ mb: 1 }}>
          Enter your payment details below and confirm to complete payment.
        </Typography>
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
          <PaymentElement />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
          <Button variant="text" onClick={() => { setPaymentDialogOpen(false); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmInDialog}
            disabled={!stripe || !elements || processing}
            sx={{ bgcolor: accent }}
          >
            {processing ? <CircularProgress size={18} color="inherit" /> : "Confirm payment"}
          </Button>
        </Stack>
      </Box>
    );
  }

  // ------------------- UI -------------------
  const payButtonLabel = (adData?.id && isPaymentInitForAd(adData.id)) ? "Continue payment" : "Pay & Publish";

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
        <form onSubmit={handleImagesSubmit}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Header image (single)</Typography>
            <label htmlFor="header-image-input">
              <input id="header-image-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleHeaderImageChange} />
              <Button component="span" variant="outlined" startIcon={<AddPhotoIcon />}>Choose header image</Button>
            </label>

            {headerPreview && (
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <Avatar variant="rounded" src={headerPreview} sx={{ width: 72, height: 72 }} />
                <Box>
                  <Typography variant="body2">New header</Typography>
                  <Typography variant="caption" color="text.secondary">{headerImageFile?.name}</Typography>
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
                onClick={async () => { try { await uploadImagesToAd(adData?.id); } catch {} }}
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
            <Typography variant="subtitle1" fontWeight="bold">{adData?.title}</Typography>
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
              {creatingPayment ? <CircularProgress size={18} color="inherit" /> : payButtonLabel}
            </Button>
            <Button variant="outlined" onClick={() => { showToast({ message: "Will publish later", severity: "info" }); navigate("/sellers/dashboard"); }}>
              Publish later
            </Button>
          </Stack>
        </Box>
      )}

      {/* Payment dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">Complete Your Payment</Typography>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Your ad is currently <strong>pending</strong>. Please pay the listing fee to activate it.
          </Typography>

          {/* Order summary */}
          <Box sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" color="text.secondary">Ad Title</Typography>
            <Typography variant="body1" fontWeight="medium" gutterBottom>{adData?.title}</Typography>

            <Typography variant="subtitle2" color="text.secondary">Advertised Price</Typography>
            <Typography variant="body1" gutterBottom>{currency} {adData?.price ?? price}</Typography>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" color="text.secondary">Listing Fee</Typography>
            {paymentDetails ? (
              <Typography variant="h6" fontWeight="bold" color="primary">
                {paymentDetails.currency} {paymentDetails.amount}
              </Typography>
            ) : (
              <LinearProgress sx={{ mt: 1 }} />
            )}
          </Box>

          {/* Payment method */}
        <FormControl fullWidth sx={{ mb: 2 }}>
  <InputLabel id="payment-method-label">Select payment method</InputLabel>
  <Select
    labelId="payment-method-label"
    value={paymentMethod}
    label="Payment method"
    onChange={handlePaymentMethodChange}  
  >
    {PAYMENT_METHODS.map(m => (
      <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
    ))}
  </Select>
</FormControl>


          {/* Provider or Stripe UI */}
          {paymentDetails && (
            <Box>
              {paymentDetails.checkout_url && (
                <Button sx={{ mt: 2 }} variant="contained" fullWidth onClick={launchProvider}>
                  Open payment provider
                </Button>
              )}

              {paymentMethod === "stripe" && paymentDetails.client_secret_key && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret: paymentDetails.client_secret_key }}>
                  <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    <StripePaymentElement
                      clientSecret={paymentDetails.client_secret_key}
                      paymentReference={paymentDetails.payment_reference}
                      adId={adData?.id}
                    />
                  </Box>
                </Elements>
              )}

{paymentDetails.crypto_address ? (
  <Box>
    <Typography variant="subtitle2">Send crypto to:</Typography>
    <Typography variant="body2" fontFamily="monospace">{paymentDetails.crypto_address}</Typography>
  </Box>
) : paymentDetails.provider_payload?.addresses ? (
  Object.entries(paymentDetails.provider_payload.addresses).map(([coin, addr]) => (
    <Box key={coin} sx={{ mt: 1 }}>
      <Typography variant="subtitle2">{coin.toUpperCase()}</Typography>
      <Typography variant="body2" fontFamily="monospace">{addr}</Typography>
    </Box>
  ))
) : null}


              {/* Manual reference / verify — shown only for non-Stripe providers (crypto) */}
              {paymentMethod !== "stripe" && (
                <>
                  {paymentDetails.payment_reference ? (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="body2" fontWeight="bold">
                        Reference: {paymentDetails.payment_reference}
                      </Typography>

                      <Button
                        sx={{ mt: 2 }}
                        fullWidth
                        variant="outlined"
                        onClick={() => handleManualConfirm(paymentDetails.payment_reference, paymentMethod)}
                      >
                        I have paid — Verify
                      </Button>
                    </Box>
                  ) : (
                    !paymentDetails.client_secret_key && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          After completing the payment with the provider, paste the returned reference here to verify.
                        </Typography>

                        <TextField
                          placeholder="Enter payment reference"
                          fullWidth
                          size="small"
                          value={manualReference}
                          onChange={(e) => setManualReference(e.target.value)}
                          sx={{ mt: 1 }}
                        />

                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          <Button variant="contained" fullWidth onClick={launchProvider}>
                            Open Provider
                          </Button>
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => handleManualConfirm(manualReference, paymentMethod)}
                            disabled={!manualReference}
                          >
                            Verify
                          </Button>
                        </Stack>
                      </Box>
                    )
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={CloseDialogAndNavigate}>Pay later</Button>
        </DialogActions>
      </Dialog>

      {/* Verifying dialog */}
      <Dialog open={verifyingPayment} onClose={() => { }} PaperProps={{ sx: { p: 2, width: 380 } }}>
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
    <Button
      onClick={() => {
        setSuccessModalOpen(false);
        navigate("/sellers/ads/list");
      }}
    >
      {successIsActive ? "Back to dashboard" : "OK"}
    </Button>

    {successIsActive && (
      <Button variant="contained" onClick={() => handleSuccessClose(true)}>
        View ad
      </Button>
    )}
  </DialogActions>
</Dialog>
    </Box>
  );
}
