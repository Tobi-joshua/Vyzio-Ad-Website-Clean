import React, { useState, useContext, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Typography, TextField, Button, CircularProgress,
  Stack, Alert, InputAdornment, Avatar, IconButton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, FormControl, InputLabel, Select, LinearProgress, Divider
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

  // redirect-confirm handling
  const [redirectConfirming, setRedirectConfirming] = useState(false);
  const [redirectConfirmError, setRedirectConfirmError] = useState(null);

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
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    fd.append("city", city);
    fd.append("price", price || "0");
    fd.append("currency", currency);
    fd.append("category_name", catName);

    const res = await fetch(`${API_BASE_URL}/api/seller/ads/${id}/`, {
      method: "PATCH",
      headers: getAuthHeaders(), 
      body: fd,
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || "Failed updating ad metadata");
    }
    const data = await res.json();
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
  // normalize returned fields so frontend can rely on client_secret_key & publishable_key fields.
  const createPaymentInstance = async (adIdArg, methodArg) => {
    const adId = adIdArg || adData?.id || id;
    const method = methodArg || paymentMethod || 'stripe';
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
      const jsonRaw = await res.json();

      const normalized = {
        ...jsonRaw,
        client_secret_key: jsonRaw.client_secret_key || jsonRaw.client_secret || null,
        publishable_key: jsonRaw.publishable_key || jsonRaw.publishableKey || jsonRaw.publishable || null,
        ad_id: jsonRaw.ad_id || jsonRaw.adId || adId,
        method: method || jsonRaw.method || jsonRaw.payment_method || null,
      };

      setPaymentDetails(normalized);
      setPaymentDialogOpen(true);
      // optimistic: mark pending locally on adData
      setAdData(prev => prev ? { ...prev, status: "pending" } : prev);
      return normalized;
    } finally {
      setCreatingPayment(false);
    }
  };

  // -------- confirm payment on server (generic) --------
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

  // specialized helpers if backend exposes separate endpoints (optional)
  const confirmStripePaymentOnServer = async ({ payment_reference, ad_id }) => {
    // fall back to generic confirmPaymentOnServer
    try {
      const r = await fetch(`${API_BASE_URL}/api/seller/payments/confirm/stripe/`, {
        method: "POST",
        headers: getJsonHeaders(),
        credentials: "include",
        body: JSON.stringify({ payment_reference, ad_id }),
      });
      if (!r.ok) throw new Error("stripe confirm failed");
      return r.json();
    } catch (e) {
      return confirmPaymentOnServer({ payment_reference, ad_id });
    }
  };

  const confirmCryptoPaymentOnServer = async ({ payment_reference, ad_id }) => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/seller/payments/confirm/crypto/`, {
        method: "POST",
        headers: getJsonHeaders(),
        credentials: "include",
        body: JSON.stringify({ payment_reference, ad_id }),
      });
      if (!r.ok) throw new Error("crypto confirm failed");
      return r.json();
    } catch (e) {
      return confirmPaymentOnServer({ payment_reference, ad_id });
    }
  };

  // auto-handle redirect returns from Stripe (when provider redirects back to this page)
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
        setVerifyingPayment(true);
        const resp = await confirmStripePaymentOnServer({ payment_reference, ad_id });

        if (resp?.ad) setAdData(prev => ({ ...(prev || {}), ...(resp.ad || {}) }));

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
        setVerifyingPayment(false);
        setRedirectConfirming(false);
        // cleanup local payment UI state
        setPaymentDialogOpen(false);
        setPaymentDetails(null);
        setPaymentAdId(null);
      }
    })();
  }, [redirectConfirming]); // eslint-disable-line

  async function handleManualConfirm(reference, method) {
    const adId = paymentAdId || adData?.id || id;
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
        serverResp = await confirmPaymentOnServer({ payment_reference: reference, ad_id: adId });
      }

      if (serverResp?.ad) setAdData(prev => ({ ...(prev || {}), ...(serverResp.ad || {}) }));

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
    // server may provide a checkout_url for Stripe/other
    if (paymentDetails.checkout_url) {
      window.open(paymentDetails.checkout_url, '_blank');
      showToast({ message: 'Payment provider opened in a new tab', severity: 'info' });
      return;
    }

    // crypto flow: server may return crypto_address and amount
    if (paymentDetails.crypto_address) {
      setPaymentDialogOpen(true);
      showToast({ message: 'Follow the displayed crypto instructions to complete payment', severity: 'info' });
      return;
    }

    // if only client_secret exists, we want the dialog open so stripe element is visible
    if (paymentDetails.client_secret_key) {
      setPaymentDialogOpen(true);
      return;
    }

    showToast({ message: 'No external URL provided — complete payment with your provider and paste the reference to verify', severity: 'info' });
  };

  // helper: check whether current paymentDetails is already for this ad
  const isPaymentInitForAd = (adId) => {
    if (!paymentDetails) return false;
    if (paymentAdId && Number(paymentAdId) === Number(adId)) return true;
    if (paymentDetails.ad_id && Number(paymentDetails.ad_id) === Number(adId)) return true;
    return false;
  };

  // handler for payment method changes (inside modal)
  const handlePaymentMethodChange = async (e) => {
    const newMethod = e.target.value;
    setPaymentMethod(newMethod);
    setManualReference("");

    const adId = paymentAdId || adData?.id || id;
    if (!adId) return;

    if (paymentDetails && paymentDetails.method === newMethod && isPaymentInitForAd(adId)) {
      return;
    }

    setPaymentDetails(null);

    try {
      setCreatingPayment(true);
      const pd = await createPaymentInstance(adId, newMethod);
      if (pd) setPaymentDetails(pd);
      setPaymentDialogOpen(true);
    } catch (err) {
      console.error("Failed creating payment for method change:", err);
      showToast({ message: err.message || "Failed to initialize payment for selected method", severity: "error" });
    } finally {
      setCreatingPayment(false);
    }
  };

  // handle Pay Now from step 3
  const handlePayNow = async () => {
    const adId = adData?.id || id;
    if (!adId) { showToast({ message: "No ad to pay for", severity: "error" }); return; }

    // re-use init'd payment details if for this ad
    if (isPaymentInitForAd(adId) && paymentDetails) {
      if (paymentDetails.checkout_url) { launchProvider(); return; }
      if (paymentDetails.client_secret_key) { setPaymentDialogOpen(true); return; }
      if (paymentDetails.crypto_address) { setPaymentDialogOpen(true); return; }
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

  // -------- STRIPE INTEGRATION --------
  const stripePromise = useMemo(() => {
    const key = paymentDetails?.publishable_key || paymentDetails?.publishableKey;
    return key ? loadStripe(key) : null;
  }, [paymentDetails?.publishable_key, paymentDetails?.publishableKey]);

  function StripePaymentElement({ paymentReference, adId }) {
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

        const paymentIntent = result.paymentIntent || null;
        if (paymentIntent && paymentIntent.id) {
          const serverReference = serverPaymentReference || paymentIntent.id;
          await handleManualConfirm(serverReference, "stripe");
        } else {
          // redirect flow — handled by useEffect on return
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
        <form onSubmit={(e) => { e.preventDefault(); saveMetadata(); }}>
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
        <form onSubmit={(e) => { e.preventDefault(); uploadImagesToAd(adData?.id || id); }}>
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
      <Dialog open={paymentDialogOpen} onClose={() => { setPaymentDialogOpen(false); setPaymentDetails(null); setPaymentAdId(null); }} maxWidth="sm" fullWidth>
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
              onChange={handlePaymentMethodChange}
            >
              {PAYMENT_METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>

          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">Ad title: {adData?.title}</Typography>
            <Typography variant="body2">Advertised price: {currency} {adData?.price ?? price}</Typography>
          </Box>

          <Box
            mt={2}
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "grey.50",
            }}
          >
            <Typography variant="body2">Listing fee:</Typography>

            {paymentDetails ? (
              <Box>
                <Typography variant="h6">
                  {paymentDetails.currency} {paymentDetails.amount}
                </Typography>

                {/* External checkout */}
                {paymentDetails.checkout_url && (
                  <Button sx={{ mt: 1 }} variant="contained" fullWidth onClick={launchProvider}>
                    Open payment provider
                  </Button>
                )}

                {/* Stripe inline element */}
                {paymentMethod === "stripe" && paymentDetails.client_secret_key && stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret: paymentDetails.client_secret_key }}>
                    <Box sx={{ mt: 2, p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
                      <StripePaymentElement
                        paymentReference={paymentDetails.payment_reference}
                        adId={adData?.id}
                      />
                    </Box>
                  </Elements>
                )}

                {/* Crypto address or provider addresses */}
                {paymentDetails.crypto_address ? (
                  <Box sx={{ mt: 1, display: "flex", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">Send crypto to:</Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ overflowWrap: "anywhere" }}>
                        {paymentDetails.crypto_address}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(paymentDetails.crypto_address)}
                      aria-label="Copy crypto address"
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : paymentDetails.provider_payload?.addresses ? (
                  // provider_payload.addresses is expected to be an object like { btc: "addr", eth: "addr" }
                  Object.entries(paymentDetails.provider_payload.addresses).map(([coin, addr]) => (
                    <Box
                      key={coin}
                      sx={{ mt: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Box sx={{ pr: 1 }}>
                        <Typography variant="subtitle2">{coin.toUpperCase()}</Typography>
                        <Typography variant="body2" fontFamily="monospace" sx={{ overflowWrap: "anywhere" }}>
                          {addr}
                        </Typography>
                      </Box>

                      <IconButton size="small" onClick={() => copyToClipboard(addr)} aria-label={`Copy ${coin} address`}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))
                ) : null}

                {/* Manual reference / verify for non-Stripe providers */}
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
                      // If there's no server-side reference and no Stripe client secret, allow manual paste
                      !paymentDetails.client_secret_key && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            If your provider returns a reference after payment, paste it here to verify.
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
                              Open provider
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