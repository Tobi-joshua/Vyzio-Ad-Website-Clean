import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  CircularProgress,
  Stack,
  Alert,
  Link,
} from "@mui/material";
import { API_BASE_URL } from "../../constants";
import { BuyerDashboardContext } from "./index";
import { useWebToast } from '../../hooks/useWebToast'; 

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

export default function BuyerJobApplicationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useWebToast();
  const { userId, token } = useContext(BuyerDashboardContext);

  const [ad, setAd] = useState(null);
  const [loadingAd, setLoadingAd] = useState(true);

  // Form state
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availableStartDate, setAvailableStartDate] = useState("");
  const [isWillingToRelocate, setIsWillingToRelocate] = useState(false);
  const [notes, setNotes] = useState("");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch Ad details
  useEffect(() => {
    let mounted = true;
    setLoadingAd(true);

    fetch(`${API_BASE_URL}/api/ads/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch ad details");
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setAd(data);
        setLoadingAd(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError("Failed to load ad details.");
        setLoadingAd(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  // Handle file select with validation
  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isAllowedSize(file)) {
      alert(`File ${file.name} is too large or not supported.`);
      e.target.value = null;
      return;
    }
    setResumeFile(file);
  };




  // Submit handler
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!userId) {
    setError("You must be logged in to apply.");
    return;
  }

  setError("");
  setSending(true);

  try {
    const formData = new FormData();
    formData.append("ad", id);
    formData.append("applicant", userId);
    formData.append("cover_letter", coverLetter);
    if (resumeFile) formData.append("resume", resumeFile);
    formData.append("phone_number", phoneNumber);
    formData.append("portfolio_url", portfolioUrl);
    formData.append("linkedin_url", linkedinUrl);
    if (expectedSalary) formData.append("expected_salary", expectedSalary);
    if (availableStartDate) formData.append("available_start_date", availableStartDate);
    formData.append("is_willing_to_relocate", isWillingToRelocate);
    formData.append("notes", notes);

    const res = await fetch(`${API_BASE_URL}/api/applications/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to submit application");
    }
    showToast({
      message:'Application submitted successfully!',
      severity: 'success',
      duration: 6000,
    });
    navigate('/buyers/categories');
    setCoverLetter("");
    setResumeFile(null);
    setPhoneNumber("");
    setPortfolioUrl("");
    setLinkedinUrl("");
    setExpectedSalary("");
    setAvailableStartDate("");
    setIsWillingToRelocate(false);
    setNotes("");
  } catch (err) {
    setError(err.message || "Unknown error");
  } finally {
    setSending(false);
  }
};

  if (loadingAd) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!ad) {
    return (
      <Typography color="error" align="center" mt={6}>
        Failed to load ad details.
      </Typography>
    );
  }

  return (
    <Box maxWidth={600} mx="auto" my={4} p={3} sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: 2 }}>
      <Typography variant="h5" mb={2}>
        Apply for: {ad.title}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <TextField
          label="Cover Letter"
          multiline
          rows={5}
          fullWidth
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Upload Resume (PDF, DOC, DOCX, max 20MB)
          </Typography>
          <Button variant="outlined" component="label" disabled={sending}>
            Choose File
            <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleResumeChange} />
          </Button>
          {resumeFile && (
            <Box mt={1} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <img
                src={getFilePlaceholder(resumeFile.name)}
                alt="file icon"
                width={32}
                height={32}
                style={{ objectFit: "contain" }}
              />
              <Typography variant="body2">{resumeFile.name}</Typography>
            </Box>
          )}
        </Box>

        <TextField
          label="Phone Number"
          fullWidth
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          sx={{ mb: 2 }}
          type="tel"
        />
        <TextField
          label="Portfolio URL"
          fullWidth
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
          sx={{ mb: 2 }}
          type="url"
        />
        <TextField
          label="LinkedIn URL"
          fullWidth
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          sx={{ mb: 2 }}
          type="url"
        />
        <TextField
          label="Expected Salary"
          fullWidth
          value={expectedSalary}
          onChange={(e) => setExpectedSalary(e.target.value)}
          sx={{ mb: 2 }}
          type="number"
          inputProps={{ min: 0, step: "any" }}
        />
        <TextField
          label="Available Start Date"
          fullWidth
          value={availableStartDate}
          onChange={(e) => setAvailableStartDate(e.target.value)}
          sx={{ mb: 2 }}
          type="date"
          InputLabelProps={{ shrink: true }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={isWillingToRelocate}
              onChange={(e) => setIsWillingToRelocate(e.target.checked)}
              disabled={sending}
            />
          }
          label="Willing to relocate"
          sx={{ mb: 2 }}
        />
        <TextField
          label="Additional Notes"
          multiline
          rows={3}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => navigate(-1)} disabled={sending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={sending}>
            {sending ? "Submitting..." : "Submit Application"}
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
