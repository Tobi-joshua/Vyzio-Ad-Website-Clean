import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  Box, Button, Container, Grid, Typography, Card, CardContent,
  CardActions, CardMedia, Avatar, useMediaQuery, useTheme, TextField,
  IconButton, InputAdornment, Toolbar, Chip, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Divider
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CategoryIcon from "@mui/icons-material/Category";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { useParams, useNavigate } from "react-router-dom";
import { usePaystackPayment } from "react-paystack";
import DataLoader from "../../components/DataLoader";
import { API_BASE_URL } from "../../constants";
import { SellerDashboardContext } from "./index";
import { useWebToast } from "../../hooks/useWebToast";

// small constants
const STATUS_COLORS = { draft: "default", pending: "warning", active: "success", paused: "info", sold: "secondary", archived: "default" };
const ALL_STATUSES = ["all", "draft", "pending", "active", "paused", "sold", "archived"];
const currencySymbols = { USD: "$", NGN: "₦", EUR: "€", GBP: "£" };

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

  // verifying & success states
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // helper headers
  function getAuthHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = contextToken || localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  // --- Data fetching (small clear function) ---
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

  useEffect(() => {
    fetchAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // aggregates for top bar
  const aggregates = useMemo(() => {
    const totalAds = ads.length;
    const byStatus = ads.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
    const totalViews = ads.reduce((s, a) => s + (Number(a.view_count) || 0), 0);
    const totalMessages = ads.reduce((s, a) => s + (Number(a.message_count) || 0), 0);
    return { totalAds, byStatus, totalViews, totalMessages };
  }, [ads]);

  // filtered list
  const filteredAds = useMemo(() => {
    return ads
      .filter(ad => filterStatus === "all" ? true : (ad.status || "draft") === filterStatus)
      .filter(ad => (ad.title || "").toLowerCase().includes(search.toLowerCase()));
  }, [ads, search, filterStatus]);

  // --- Save toggle (kept lean) ---
  const toggleSave = async (e, adId) => {
    e.stopPropagation();
    if (savingMap[adId]) return;
    const idx = ads.findIndex(a => a.id === adId);
    if (idx === -1) return;
    const currentlySaved = !!ads[idx].is_saved;
    const method = currentlySaved ? "DELETE" : "POST";
    const url = `${API_BASE_URL}/api/ads/${adId}/save/`;

    // optimistic UI
    setAds(prev => prev.map(a => a.id === adId ? { ...a, is_saved: !currentlySaved } : a));
    setSavingMap(m => ({ ...m, [adId]: true }));

    try {
      const res = await fetch(url, { method, headers: getAuthHeaders(), credentials: "include", body: method === "POST" ? JSON.stringify({}) : undefined });
      if (![200,201,204].includes(res.status)) {
        // revert
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

  // --- Payment: create payment instance (server sets ad pending or similar) ---
  async function createPaymentInstance(adId) {
    if (!adId) throw new Error("No ad id");
    setCreatingPayment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/seller/ads/${adId}/create-payment/`, {
        method: "POST", headers: getAuthHeaders(), credentials: "include", body: JSON.stringify({})
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create payment instance");
      }
      const json = await res.json();
      setPaymentDetails(json);
      setPaymentAdId(adId);
      setPaymentDialogOpen(true);
      // optimistic status change so UI shows pending/pay option
      setAds(prev => prev.map(a => a.id === adId ? { ...a, status: "pending" } : a));
      return json;
    } finally {
      setCreatingPayment(false);
    }
  }

  // --- Payment: confirm on server ---
  async function confirmPaymentOnServer({ payment_reference, ad_id }) {
    const res = await fetch(`${API_BASE_URL}/api/seller/payments/confirm/`, {
      method: "POST", headers: getAuthHeaders(), credentials: "include", body: JSON.stringify({ payment_reference, ad_id })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to confirm payment on server");
    }
    return res.json();
  }

  // confirm + update local state after paystack success (async)
  async function confirmPaymentAndUpdate(response, adId) {
    if (!adId) {
      showToast({ message: "Missing ad id for verification", severity: "error" });
      setVerifyingPayment(false);
      return;
    }

    setVerifyingPayment(true);
    try {
      const payload = { payment_reference: response.reference, ad_id: adId };
      const serverResp = await confirmPaymentOnServer(payload);

      // update local ad state from server
      setAds(prev => prev.map(a => a.id === adId ? {
        ...a,
        status: serverResp.status ?? serverResp.ad?.status ?? a.status,
        is_active: !!(serverResp.is_active ?? serverResp.ad?.is_active),
        header_image_url: serverResp.ad?.header_image_url ?? a.header_image_url,
        images: serverResp.ad?.images ?? a.images,
        ...(serverResp.ad ?? {})
      } : a));

      // done verifying
      setVerifyingPayment(false);
      setPaymentDialogOpen(false);
      setPaymentDetails(null);
      setPaymentAdId(null);

      // show success modal with message according to server's status
      if ((serverResp.status ?? serverResp.ad?.status) === "active") {
        setSuccessMessage(serverResp.detail || "Payment confirmed — your ad is active.");
      } else {
        setSuccessMessage(serverResp.detail || "Payment received. Your ad is awaiting admin approval. You will be notified by email.");
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

  // --- Paystack config and launch ---
  const paystackConfig = paymentDetails ? {
    publicKey: paymentDetails.public_key || process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || "",
    email: email || localStorage.getItem("email") || "",
    amount: Math.round((Number(paymentDetails.amount || 0) * 100) || 0),
    currency: paymentDetails.currency || "NGN",
    reference: paymentDetails.payment_reference,
  } : {};

  const initializePayment = usePaystackPayment(paystackConfig);

const onPaystackSuccess = (response) => {
  setVerifyingPayment(true);
  fetch(`${API_BASE_URL}/api/seller/payments/confirm/`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({
      payment_reference: response.reference,
      ad_id: paymentAdId
    })
  })
    .then(res => res.json())
    .then(data => {
      setVerifyingPayment(false);
      if (data.status === "active") {
        showToast({ message: "Payment confirmed — your ad is active.", severity: "success" });
      } else {
        showToast({ message: data.detail, severity: "info" });
      }
      fetchAds(); 
    })
    .catch(() => {
      setVerifyingPayment(false);
      showToast({ message: "Error confirming payment", severity: "error" });
    });
};


  const onPaystackClose = () => {
    showToast({ message: "Payment window closed — you can complete payment later.", severity: "info" });
    setPaymentDialogOpen(false);
    setPaymentDetails(null);
    setPaymentAdId(null);
  };

  // small helper to start the flow (create payment then open dialog)
  async function startPaymentFlow(adId) {
    try {
      await createPaymentInstance(adId);
    } catch (err) {
      console.error(err);
      showToast({ message: err.message || "Failed to initialize payment", severity: "error" });
    }
  }

  // UI handlers
  const handleStartPaymentFlow = (e, adId) => { e.stopPropagation(); startPaymentFlow(adId); };
  const handlePublishFromDraft = (e, adId) => { e.stopPropagation(); startPaymentFlow(adId); };
  const handleEdit = (e, adId) => { e.stopPropagation(); navigate(`/sellers/ads/${adId}/edit`); };

  // close success modal and navigate to details
  const handleSuccessClose = (goToDetails = true) => {
    setSuccessModalOpen(false);
    if (goToDetails && paymentAdId) {
      navigate(`/sellers/ads/${paymentAdId}/details`);
    } else {
      // reload list to show updated statuses
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
          <Grid container spacing={2}>
            {filteredAds.map(ad => {
              const { id: adId, title, header_image_url, images, category, city, price, currency, status, view_count, message_count, created_at } = ad;
              const thumb = header_image_url || (images && images[0]?.image_url) || null;
              return (
                <Grid key={adId} item xs={12} sm={6} md={4}>
                  <Card variant="outlined" sx={{ display: "flex", flexDirection: "column", height: 320, borderRadius: 2, overflow: "hidden", "&:hover": { boxShadow: 6 } }}>
                    {thumb ? <CardMedia component="img" image={thumb} alt={title} sx={{ height: 120, objectFit: "cover" }} />
                      : (<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 120, bgcolor: "grey.100" }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}><CategoryIcon /></Avatar>
                        </Box>)}

                    <CardContent sx={{ py: 1.25, px: 2, flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}
                        sx={{ mb: 0.5, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {title}
                      </Typography>

                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{category?.name || "Uncategorized"} • {city || "—"}</Typography>

                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{currencySymbols[currency] || currency} {price}</Typography>
                        <Chip label={status?.charAt(0)?.toUpperCase() + status?.slice(1)} color={STATUS_COLORS[status] || "default"} size="small" />
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">Views: {view_count ?? 0}</Typography>
                        <Typography variant="caption" color="text.secondary">Msgs: {message_count ?? 0}</Typography>
                        <Typography variant="caption" color="text.secondary">Posted: {new Date(created_at).toLocaleDateString()}</Typography>
                      </Stack>
                    </CardContent>

                    <Divider />

                    <CardActions sx={{ px: 1, py: 1, gap: 1, justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); navigate(`/sellers/ads/${adId}/details`); }}>View</Button>
                        <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); handleEdit(e, adId); }}>Edit</Button>

                        {status === "draft" && (
                          <Button size="small" color="primary" variant="contained" onClick={(e) => handlePublishFromDraft(e, adId)}>
                            {creatingPayment && paymentAdId === adId ? <CircularProgress size={16} color="inherit" /> : "Publish"}
                          </Button>
                        )}

                        {status === "pending" && (
                          <Button size="small" color="warning" variant="contained" onClick={(e) => handleStartPaymentFlow(e, adId)}>Pay</Button>
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

        {/* Payment dialog (launches Paystack) */}
        <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
          <DialogTitle>Pay to publish your ad</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>Pay the listing fee to activate the ad.</Typography>
            <Typography variant="body2">Ad id: {paymentAdId}</Typography>
            <Box mt={1}>
              <Typography variant="body2">Listing fee:</Typography>
              {paymentDetails ? <Typography variant="h6">{paymentDetails.currency} {paymentDetails.amount}</Typography> :
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><CircularProgress size={18} /><Typography variant="body2">Loading fee…</Typography></Box>}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setPaymentDialogOpen(false); setPaymentDetails(null); setPaymentAdId(null); }}>Pay later</Button>
            <Button
              variant="contained"
              disabled={!paymentDetails || creatingPayment}
              onClick={() => {
                try {
                  initializePayment({onPaystackSuccess, onPaystackClose});
                } catch (err) {
                  console.error("Could not initialize paystack:", err);
                  showToast({ message: "Could not initialize payment, try again later", severity: "error" });
                }
              }}
            >
              {creatingPayment ? <CircularProgress size={18} /> : "Launch Checkout"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Verifying dialog: non-dismissible while server verifies payment */}
        <Dialog
          open={verifyingPayment}
          onClose={() => {}} // prevent closing while verifying
          PaperProps={{ sx: { p: 2, width: 380 } }}
        >
          <DialogTitle>Verifying payment</DialogTitle>
          <DialogContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
            <CircularProgress />
            <Box>
              <Typography>We received payment from the gateway and are verifying it with the server. This may take a few seconds.</Typography>
              <Typography variant="caption" color="text.secondary">Do not close this window.</Typography>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Success modal shown after server confirms (or pending admin review) */}
        <Dialog open={successModalOpen} onClose={() => handleSuccessClose(false)}>
          <DialogTitle>Payment received</DialogTitle>
          <DialogContent>
            <Typography>{successMessage}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { handleSuccessClose(false); }}>Back to ads</Button>
            <Button variant="contained" onClick={() => { handleSuccessClose(true); }}>View ad</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
