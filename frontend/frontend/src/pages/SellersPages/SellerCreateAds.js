import React, { useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Typography, TextField, Button, CircularProgress,
  Stack, Alert, InputAdornment, Avatar, IconButton, Grid
} from "@mui/material";
import AddPhotoIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import { API_BASE_URL } from "../../constants";
import { SellerDashboardContext } from "./index";
import { useWebToast } from '../../hooks/useWebToast';

// ---- file helpers (from your snippet) ----
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50MB

const isAllowedSize = (file) => {
  const { name, size } = file;
  if (!size) return false;
  const extension = name.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
    return size <= MAX_IMAGE_SIZE;
  }
  if (["pdf", "docx", "txt", "tex", "xlsx", "pptx", "doc"].includes(extension)) {
    return size <= MAX_DOCUMENT_SIZE;
  }
  if (["zip", "rar"].includes(extension)) {
    return size <= MAX_ZIP_SIZE;
  }
  return false;
};

const getFileExtension = (fileName = "") => {
  const clean = fileName.split(/[?#]/)[0];
  const idx = clean.lastIndexOf(".");
  if (idx === -1) return "";
  return clean.slice(idx + 1).toLowerCase();
};

const getFilePlaceholder = (fileName) => {
  const ext = getFileExtension(fileName);
  const placeholderMap = {
    pdf: "https://cdn-icons-png.flaticon.com/512/337/337946.png",
    doc: "https://ik.imagekit.io/experthivetutors/doc_1_nnaqpo_vTEWC6nBN.png?updatedAt=1744019966381",
    docx: "https://cdn-icons-png.flaticon.com/512/337/337932.png",
    xls: "https://ik.imagekit.io/experthivetutors/xls-file_eu86rj_WEePKLdQX.png?updatedAt=1744019967951",
    xlsx: "https://cdn-icons-png.flaticon.com/512/337/337957.png",
    csv: "https://ik.imagekit.io/experthivetutors/csv_dcesje_bgDjyIvyYn.png?updatedAt=1744019966046",
    zip: "https://ik.imagekit.io/experthivetutors/zip-folder_wxyv1y_fuOQeW2ra.png?updatedAt=1744019965847",
    ppt: "https://ik.imagekit.io/experthivetutors/ppt_ctrt5p_vr8DdLdLo.png?updatedAt=1744019965373",
    pptx: "https://ik.imagekit.io/experthivetutors/pptx_ig7g2x_eCHIvrB-0.png?updatedAt=1744019967583",
    html: "https://ik.imagekit.io/experthivetutors/html_vvy3tg_lfWn_Fhsf.png?updatedAt=1744019965598",
    mp3: "https://ik.imagekit.io/experthivetutors/video_1_zn3iye_bvK4-rUmj.png?updatedAt=1744019966857",
    mkv: "https://ik.imagekit.io/experthivetutors/video_1_zn3iye_bvK4-rUmj.png?updatedAt=1744019966857",
    webm: "https://ik.imagekit.io/experthivetutors/video_1_zn3iye_bvK4-rUmj.png?updatedAt=1744019966857",
    txt: "https://ik.imagekit.io/experthivetutors/txt-file_w71gek_3dtUXTXzI.png?updatedAt=1744019968275",
  };
  return placeholderMap[ext] || "https://cdn-icons-png.flaticon.com/512/1828/1828884.png";
};
// ---- end helpers ----

export default function SellerCreateAdForm() {
  const { id: categoryId, name: catName } = useParams();
  const navigate = useNavigate();
  const showToast = useWebToast();
  const { userId, token, firstName, email } = useContext(SellerDashboardContext);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [headerImageFile, setHeaderImageFile] = useState(null);
  const [extraImages, setExtraImages] = useState([]);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [adId, setAdId] = useState(null);

  // handle single header image
  const handleHeaderImageChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!isAllowedSize(f)) {
      showToast({ message: "Header image too large or not supported (max 10MB)", severity: "error" });
      return;
    }
    setHeaderImageFile(f);
  };

  // handle multiple extra images (append)
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

  const removeExtraImage = (index) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== index));
  };

  // create ad on backend, including multiple images
  const createAd = async () => {
    setError("");
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("category", categoryId);
      fd.append("title", title);
      fd.append("description", description);
      fd.append("city", city);
      fd.append("price", price || "0");
      fd.append("currency", currency);
      if (headerImageFile) fd.append("header_image", headerImageFile);

      // append multiple images under the same key 'images'
      extraImages.forEach((img) => fd.append("images", img));

      const res = await fetch(`${API_BASE_URL}/api/seller/ads/`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: fd,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed creating ad");
      }

      const data = await res.json();
      setAdId(data.id);
      return data;
    } catch (err) {
      setError(err.message || "Unknown error creating ad");
      throw err;
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    try {
      const ad = await createAd();
      setSuccessMsg("Ad created successfully!");
      showToast({ message: "Ad created successfully", severity: "success" });
      setAdId(ad.id);
      navigate(`/sellers/ads/${ad.id}/details`);
    } catch (err) {
    }
  };

  return (
    <Box maxWidth={900} mx="auto" my={4} p={3} sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: 2 }}>
      <Typography variant="h5" mb={2}>Create ad {catName ? `in ${decodeURIComponent(catName)}` : ""}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2 }} required />
        <TextField label="Description" multiline rows={6} fullWidth value={description} onChange={(e) => setDescription(e.target.value)} sx={{ mb: 2 }} required />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} fullWidth />
          <TextField
            label="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            InputProps={{ startAdornment: <InputAdornment position="start">{currency}</InputAdornment> }}
          />
        </Stack>

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
                    sx={{ position: "absolute", top: -10, right: -10, bgcolor: "background.paper" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="caption" display="block" noWrap sx={{ width: 96 }}>{img.name}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
          <Button variant="outlined" onClick={() => navigate(-1)} disabled={sending}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={sending}>
            {sending ? <CircularProgress size={20} /> : "Create Ad"}
          </Button>
        </Stack>
      </form>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="subtitle2">Payment methods & note</Typography>
        <Typography variant="body2">
          For now the app creates ads without real payment processing. When you're ready to accept payments we will integrate providers such as Paystack, Stripe, or Coinbase Commerce. You can create the merchant accounts and provide keys (recommended) — I’ll integrate them in test mode first.
        </Typography>
      </Alert>
    </Box>
  );
}
