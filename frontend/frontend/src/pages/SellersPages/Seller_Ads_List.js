import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  Box, Button, Container, Grid, Typography, Card, CardContent,
  CardActions, CardMedia, Avatar, useMediaQuery, useTheme, TextField,
  IconButton, InputAdornment, Toolbar, Chip, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Divider,
  FormControl, InputLabel, Select, MenuItem, LinearProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CategoryIcon from "@mui/icons-material/Category";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useParams, useNavigate } from "react-router-dom";
import DataLoader from "../../components/DataLoader";
import { API_BASE_URL } from "../../constants";
import { SellerDashboardContext } from "./index";
import { useWebToast } from "../../hooks/useWebToast";

// Stripe imports
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const STATUS_COLORS = { draft: "default", pending: "warning", active: "success", paused: "info", sold: "secondary", archived: "default" };
const ALL_STATUSES = ["all", "draft", "pending", "active", "paused", "sold", "archived"];
const currencySymbols = { USD: "$", NGN: "₦", EUR: "€", GBP: "£" };

const PAYMENT_METHODS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'crypto', label: 'Crypto' },
];

export default function SellersAdsList() {
  const { id, name } = useParams();
  const CategoryName = decodeURIComponent(name || "");
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { token: contextToken, email } = useContext(SellerDashboardContext || {});
  const showToast = useWebToast();

  // UI / data state
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [savingMap, setSavingMap] = useState({});

  // payment states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null); // object returned by create-payment
  const [paymentAdId, setPaymentAdId] = useState(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe"); // default method
  const [manualReference, setManualReference] = useState("");

  // verifying & success states
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successIsActive, setSuccessIsActive] = useState(false);

  // redirect confirm states (handle provider redirect back to this page)
  const [redirectConfirming, setRedirectConfirming] = useState(false);
  const [redirectConfirmError, setRedirectConfirmError] = useState(null);

  // --- helpers for headers ---
  function getAuthHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = contextToken || localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }
  function getJsonHeaders() {
    // separate helper since some calls expect JSON content-type
    const headers = { "Content-Type": "application/json" };
    const token = contextToken || localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  // fetch ads
  async function fetchAds() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/seller/ads/list/`, { credentials: "include", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch ads");
      const data = await res.json();
      setAds(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast({ message: "Failed to load ads", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAds(); /*eslint-disable-next-line*/ }, [id]);

  const aggregates = React.useMemo(() => {
    const totalAds = ads.length;
    const byStatus = ads.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
    const totalViews = ads.reduce((s, a) => s + (Number(a.view_count) || 0), 0);
    const totalMessages = ads.reduce((s, a) => s + (Number(a.message_count) || 0), 0);
    return { totalAds, byStatus, totalViews, totalMessages };
  }, [ads]);

  const filteredAds = React.useMemo(() => {
    return ads
      .filter(ad => filterStatus === "all" ? true : (ad.status || "draft") === filterStatus)
      .filter(ad => (ad.title || "").toLowerCase().includes(search.toLowerCase()));
  }, [ads, search, filterStatus]);

  // toggle save
  const toggleSave = async (e, adId) => {
    e.stopPropagation();
    if (savingMap[adId]) return;
    const idx = ads.findIndex(a => a.id === adId);
    if (idx === -1) return;
    const currentlySaved = !!ads[idx].is_saved;
    const method = currentlySaved ? "DELETE" : "POST";
    const url = `${API_BASE_URL}/api/ads/${adId}/save/`;

    setAds(prev => prev.map(a => a.id === adId ? { ...a, is_saved: !currentlySaved } : a));
    setSavingMap(m => ({ ...m, [adId]: true }));

    try {
      const res = await fetch(url, { method, headers: getAuthHeaders(), credentials: "include", body: method === "POST" ? JSON.stringify({}) : undefined });
      if (![200,201,204].includes(res.status)) {
        setAds(prev => prev.map(a => a.id === adId ? { ...a, is_saved: currentlySaved } : a));
        showToast({ message: "Failed to toggle save", severity: "error" });
      }
    } catch (err) {
      setAds(prev => prev.map(a => a.id === adId ? { ...a, is_saved: currentlySaved } : a));
      console.error(err);
      showToast({ message: "Network error toggling save", severity: "error" });
    } finally {
      setSavingMap(m => { const copy = { ...m }; delete copy[adId]; return copy; });
    }
  };

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

        // update the ad inside ads array if returned
        if (resp?.ad) {
          setAds(prev => prev.map(a => a.id === resp.ad.id ? ({ ...a, ...(resp.ad || {}) }) : a));
        } else {
          // fallback: refetch list
          await fetchAds();
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
  }, [redirectConfirming]); // eslint-disable-line

  // New: when user chooses a different payment method inside the modal/selector,
  // create a new server payment instance for that method (so crypto_address / checkout_url appears)
  const handlePaymentMethodChange = async (e) => {
    const newMethod = e.target.value;
    setPaymentMethod(newMethod);

    // clear any manual ref input
    setManualReference("");

    // if there's no ad yet, nothing to create
    const adId = paymentAdId;
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
      if (pd) setPaymentDetails(pd);
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
    const adId = adIdArg || paymentAdId;
    if (!adId) throw new Error("No ad id for payment");
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

      const normalized = {
        ...jsonRaw,
        client_secret_key: jsonRaw.client_secret_key || jsonRaw.client_secret || null,
        publishable_key: jsonRaw.publishable_key || jsonRaw.publishableKey || jsonRaw.publishable || null,
        ad_id: jsonRaw.ad_id || jsonRaw.adId || adId,
        method: method || jsonRaw.method || jsonRaw.payment_method || null,
      };

      setPaymentDetails(normalized);
      setPaymentDialogOpen(true);

      // optimistic: mark pending locally inside ads
      setAds(prev => prev.map(a => a.id === Number(adId) || a.id === adId ? ({ ...a, status: "pending" }) : a));
      return normalized;
    } finally {
      setCreatingPayment(false);
    }
  };

  async function handleManualConfirm(reference, method) {
    const adId = paymentAdId;
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
        // fallback generic confirm endpoint if you have one
        const r = await fetch(`${API_BASE_URL}/api/seller/payments/confirm/`, {
          method: "POST", headers: getJsonHeaders(), credentials: "include",
          body: JSON.stringify({ payment_reference: reference, ad_id: adId })
        });
        if (!r.ok) throw new Error("Failed to confirm payment");
        serverResp = await r.json();
      }

      // update local ad in ads array
      if (serverResp?.ad) {
        setAds(prev => prev.map(a => a.id === serverResp.ad.id ? ({ ...a, ...(serverResp.ad || {}) }) : a));
      } else {
        // fallback: refresh list
        await fetchAds();
      }

      setVerifyingPayment(false);
      setPaymentDialogOpen(false);
      setPaymentDetails(null);
      setPaymentAdId(null);

      const finalStatus = serverResp.status ?? serverResp.ad?.status;
      if (finalStatus === "active") {
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

  // Launch provider (checkout_url)
  const launchProvider = () => {
    if (!paymentDetails) return;
    if (paymentDetails.checkout_url) {
      window.open(paymentDetails.checkout_url, "_blank");
      showToast({ message: "Payment window opened in a new tab", severity: "info" });
      return;
    }
    if (paymentDetails.crypto_address) {
      setPaymentDialogOpen(true);
      return;
    }
    if (paymentDetails.client_secret_key) {
      setPaymentDialogOpen(true);
      return;
    }
    showToast({ message: "No external URL provided — use the manual reference to confirm when done", severity: "info" });
  };

  // helper: whether paymentDetails belongs to this ad
  const isPaymentInitForAd = (adId) => {
    if (!paymentDetails) return false;
    if (paymentAdId && Number(paymentAdId) === Number(adId)) return true;
    if (paymentDetails.ad_id && Number(paymentDetails.ad_id) === Number(adId)) return true;
    return false;
  };

  // Stripe: create stripePromise when publishable key provided
  const stripePromise = useMemo(() => {
    const key = paymentDetails?.publishable_key || paymentDetails?.publishableKey;
    return key ? loadStripe(key) : null;
  }, [paymentDetails?.publishable_key, paymentDetails?.publishableKey]);

  // Inner stripe component
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
        const serverPaymentReference = paymentReference || paymentDetails?.payment_reference || "";
        const serverAdId = adId || paymentAdId || "";
        const returnUrl = `${window.location.origin}${window.location.pathname}?payment_reference=${encodeURIComponent(serverPaymentReference)}&ad_id=${encodeURIComponent(serverAdId)}`;

        const result = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
          redirect: "if_required",
        });

        if (result.error) {
          showToast({ message: result.error.message || "Payment failed", severity: "error" });
          setProcessing(false);
          return;
        }

        const paymentIntent = result.paymentIntent || null;
        if (paymentIntent && paymentIntent.id) {
          const serverReference = serverPaymentReference || paymentIntent.id;
          await handleManualConfirm(serverReference, "stripe");
        } else {
          // redirect flow handled by redirectConfirm effect
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
          Enter your card details below and confirm to complete payment.
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
            sx={{ bgcolor: "#6C5CE7" }}
          >
            {processing ? <CircularProgress size={18} color="inherit" /> : "Confirm payment"}
          </Button>
        </Stack>
      </Box>
    );
  }

  // start payment flow
  async function startPaymentFlow(adId) {
    try {
      setCreatingPayment(true);
      await createPaymentInstance(adId, paymentMethod);
    } catch (err) {
      console.error(err);
      showToast({ message: err.message || "Failed to initialize payment", severity: "error" });
      setPaymentAdId(null);
    } finally {
      setCreatingPayment(false);
    }
  }

  const handleStartPaymentFlow = (e, adId) => { e.stopPropagation(); startPaymentFlow(adId); };
  const handleEdit = (e, adId, catName) => { e.stopPropagation(); navigate(`/sellers/edit/${adId}/${encodeURIComponent(catName)}/ads`); };

  // handle Launch Checkout (open checkout_url or show dialog)
  const handleLaunchCheckout = async () => {
    if (!paymentDetails) return;
    setCreatingPayment(true);
    try {
      if (paymentDetails.checkout_url) {
        window.open(paymentDetails.checkout_url, "_blank");
        return;
      }
      if (paymentMethod === "crypto") {
        setPaymentDialogOpen(true);
        return;
      }
      if (paymentMethod === "stripe" && paymentDetails.client_secret_key) {
        setPaymentDialogOpen(true);
        return;
      }
      showToast({ message: "No checkout available for selected provider", severity: "error" });
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleSuccessClose = (goToDetails = false) => {
    setSuccessModalOpen(false);
    if (goToDetails && successIsActive && paymentAdId) {
      navigate(`/sellers/ads/${paymentAdId}/details`);
    } else {
      fetchAds();
    }
  };

  if (loading) return <DataLoader visible={true} />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <Container maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
        <Toolbar disableGutters sx={{ mb: 1 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Go back" sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700} sx={{ color: "#003366" }}>
            {CategoryName || "My Ads"}
          </Typography>
        </Toolbar>

        {/* TOP SUMMARY */}
        <Box sx={{ mb: 2 }}>
          <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={`Total ads: ${aggregates.totalAds}`} size="small" />
              <Chip label={`Active: ${aggregates.byStatus.active || 0}`} color="success" size="small" />
              <Chip label={`Pending: ${aggregates.byStatus.pending || 0}`} color="warning" size="small" />
              <Chip label={`Draft: ${aggregates.byStatus.draft || 0}`} size="small" />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">Views: {aggregates.totalViews}</Typography>
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Typography variant="caption" color="text.secondary">Messages: {aggregates.totalMessages}</Typography>
            </Stack>
          </Stack>
        </Box>

        {/* FILTER CHIPS */}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          {ALL_STATUSES.map(s => (
            <Chip key={s}
              label={s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              color={s === "all" ? "default" : STATUS_COLORS[s] || "default"}
              variant={filterStatus === s ? "filled" : "outlined"}
              onClick={() => setFilterStatus(s)}
              clickable size="small" />
          ))}
        </Stack>

        {/* SEARCH */}
        <Box sx={{ mb: 2 }}>
          <TextField
            variant="outlined" placeholder="Search ads..." value={search}
            onChange={e => setSearch(e.target.value)} fullWidth size="small"
            InputProps={{
              startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: "#6A1B9A" }} /></InputAdornment>),
              endAdornment: search && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearch("")}><CloseIcon sx={{ fontSize: 18 }} /></IconButton></InputAdornment>),
            }}
          />
        </Box>

        {/* ADS GRID */}
        {filteredAds.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ mt: 6 }}>No ads found.</Typography>
        ) : (
          <Grid container spacing={2} justifyContent="center" alignItems="stretch">
            {filteredAds.map(ad => {
              const { id: adId, title, header_image_url, images, category, city, price, currency, status, view_count, message_count, created_at } = ad;
              const thumb = header_image_url || (images && images[0]?.image_url) || null;

              return (
                <Grid key={adId} item xs={12} sm={12} md={4} sx={{ display: "flex", justifyContent: "center", alignItems: "stretch" }}>
                  <Card variant="outlined" sx={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", height: 320, borderRadius: 2, overflow: "hidden", "&:hover": { boxShadow: 6 }, mx: "auto" }}>
                    {thumb ? (
                      <CardMedia component="img" image={thumb} alt={title} sx={{ height: 120, objectFit: "cover" }} />
                    ) : (
                      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 120, bgcolor: "grey.100" }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}><CategoryIcon /></Avatar>
                      </Box>
                    )}

                    <CardContent sx={{ py: 1.25, px: 2, flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</Typography>

                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{category?.name || "Uncategorized"} • {city || "—"}</Typography>

                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{currencySymbols[currency] || currency} {price}</Typography>
                        <Chip label={status?.charAt(0)?.toUpperCase() + status?.slice(1)} color={STATUS_COLORS[status] || "default"} size="small" />
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box component="span" sx={{ px: 1.5, py: 0.5, borderRadius: '16px', bgcolor: 'primary.light', color: 'primary.contrastText', fontSize: '0.75rem', fontWeight: 500 }}>Views: {view_count ?? 0}</Box>
                        <Box component="span" sx={{ px: 1.5, py: 0.5, borderRadius: '16px', bgcolor: 'secondary.light', color: 'secondary.contrastText', fontSize: '0.75rem', fontWeight: 500 }}>Msgs: {message_count ?? 0}</Box>
                        <Box component="span" sx={{ px: 1.5, py: 0.5, borderRadius: '16px', bgcolor: 'success.light', color: 'success.contrastText', fontSize: '0.75rem', fontWeight: 500 }}>Posted: {new Date(created_at).toLocaleDateString()}</Box>
                      </Stack>
                    </CardContent>

                    <Divider />

                    <CardActions sx={{ px: 1, py: 1, gap: 1, justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); navigate(`/sellers/ads/${adId}/details`); }}>View</Button>
                        <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); handleEdit(e, adId, category?.name); }}>Edit</Button>

                        {status === "draft" && (
                          <Button size="small" color="primary" variant="contained" onClick={(e) => { e.stopPropagation(); handleStartPaymentFlow(e, adId); }}>
                            {creatingPayment && paymentAdId === adId ? <CircularProgress size={16} color="inherit" /> : "Pay"}
                          </Button>
                        )}

                        {status === "pending" && (
                          <Button size="small" variant="outlined" color="warning" disabled>Under review</Button>
                        )}
                      </Box>

                      <Tooltip title={ad.is_saved ? "Unsave" : "Save"}>
                        <span>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleSave(e, adId); }}>
                            {ad.is_saved ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Payment dialog */}
        <Dialog open={paymentDialogOpen} onClose={() => { setPaymentDialogOpen(false); setPaymentDetails(null); setPaymentAdId(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>Pay to publish your ad</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>Pay the listing fee to activate the ad.</Typography>
            <Typography variant="body2">Ad id: {paymentAdId}</Typography>

            <Box mt={1} sx={{ mb: 2 }}>
              <Typography variant="body2">Listing fee:</Typography>
              {paymentDetails ? <Typography variant="h6">{paymentDetails.currency} {paymentDetails.amount}</Typography> :
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><CircularProgress size={18} /><Typography variant="body2">Loading fee…</Typography></Box>}
            </Box>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="payment-method-label">Payment method</InputLabel>
              <Select labelId="payment-method-label" value={paymentMethod} label="Payment method" onChange={handlePaymentMethodChange}>
                {PAYMENT_METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Provider UI */}
            {paymentDetails && (
              <Box>
                {paymentDetails.checkout_url && (
                  <Button sx={{ mt: 2 }} variant="contained" fullWidth onClick={launchProvider}>Open payment provider</Button>
                )}

                {paymentMethod === "stripe" && paymentDetails.client_secret_key && stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret: paymentDetails.client_secret_key }}>
                    <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                      <StripePaymentElement clientSecret={paymentDetails.client_secret_key} paymentReference={paymentDetails.payment_reference} adId={paymentAdId} />
                    </Box>
                  </Elements>
                )}

                {/* Crypto addresses with copy buttons */}
                {paymentDetails.crypto_address ? (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">Send crypto to:</Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ overflowWrap: 'anywhere' }}>{paymentDetails.crypto_address}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => { navigator.clipboard?.writeText(paymentDetails.crypto_address); showToast({ message: 'Copied to clipboard', severity: 'success' }); }} aria-label="Copy address">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : paymentDetails.provider_payload?.addresses ? (
                  Object.entries(paymentDetails.provider_payload.addresses).map(([coin, addr]) => (
                    <Box key={coin} sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ mr: 1, flex: 1 }}>
                        <Typography variant="subtitle2">{coin.toUpperCase()}</Typography>
                        <Typography variant="body2" fontFamily="monospace" sx={{ overflowWrap: 'anywhere' }}>{addr}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => { navigator.clipboard?.writeText(addr); showToast({ message: `${coin.toUpperCase()} address copied`, severity: 'success' }); }} aria-label={`Copy ${coin} address`}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))
                ) : null}

                {/* Manual/crypto verification */}
                {paymentMethod === "crypto" && (
                  <>
                    {paymentDetails.payment_reference ? (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" fontWeight="bold">Reference: {paymentDetails.payment_reference}</Typography>
                        <Button sx={{ mt: 2 }} fullWidth variant="outlined" onClick={() => handleManualConfirm(paymentDetails.payment_reference, paymentMethod)}>I have paid — Verify</Button>
                      </Box>
                    ) : (
                      !paymentDetails.client_secret_key && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="caption" color="text.secondary" display="block">After completing the payment with the provider, paste the returned reference here to verify.</Typography>
                          <TextField placeholder="Enter payment reference" fullWidth size="small" value={manualReference} onChange={(e) => setManualReference(e.target.value)} sx={{ mt: 1 }} />
                          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                            <Button variant="contained" fullWidth onClick={launchProvider}>Open Provider</Button>
                            <Button variant="outlined" fullWidth onClick={() => handleManualConfirm(manualReference, paymentMethod)} disabled={!manualReference}>Verify</Button>
                          </Stack>
                        </Box>
                      )
                    )}
                  </>
                )}
              </Box>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => { setPaymentDialogOpen(false); setPaymentDetails(null); setPaymentAdId(null); }}>Pay later</Button>
            <Button variant="contained" disabled={!paymentDetails || creatingPayment} onClick={handleLaunchCheckout}>
              {creatingPayment ? <CircularProgress size={18} color="inherit" /> : "Launch Checkout"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Verifying dialog */}
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

        {/* Success modal */}
        <Dialog open={successModalOpen} onClose={() => handleSuccessClose(false)}>
          <DialogTitle>{successIsActive ? "Payment received" : "Payment received — awaiting approval"}</DialogTitle>
          <DialogContent>
            <Typography>{successMessage}</Typography>
            {!successIsActive && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Our team will review your ad. You will get an email when it is approved.</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleSuccessClose(false)}>{successIsActive ? "Back to ads" : "OK"}</Button>
            {successIsActive && <Button variant="contained" onClick={() => handleSuccessClose(true)}>View ad</Button>}
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}