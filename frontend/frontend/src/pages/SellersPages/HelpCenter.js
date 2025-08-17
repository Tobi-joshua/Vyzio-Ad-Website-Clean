import React from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
  Paper,
  Divider
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function HelpCenter() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Page Title */}
      <Typography variant="h3" gutterBottom fontWeight="bold">
        Help Center – Vyzio.com
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome to the Vyzio Help Center! Here you’ll find guides, FAQs, and
        detailed information about how to use our platform effectively — whether
        you’re posting your first ad or exploring opportunities.
      </Typography>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          About Vyzio.com
        </Typography>
        <Typography variant="body1" paragraph>
          Vyzio.com is a modern and intuitive platform that enables users to post
          ads for services, products, jobs, and business opportunities. Visitors
          browse for free, while advertisers pay a small fee to publish ads.
        </Typography>
      </Paper>

      {/* Accordions for Sections */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">1. General Objective</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1">
            Vyzio.com helps users:
          </Typography>
          <ul>
            <li>Promote services (crafts, hairdressing, plumbing, etc.)</li>
            <li>Sell products</li>
            <li>Post and browse job offers</li>
            <li>Share business or training opportunities</li>
          </ul>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">2. Target Audience</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1">
            The platform caters to:
          </Typography>
          <ul>
            <li>Freelancers</li>
            <li>Small businesses & retailers</li>
            <li>Young entrepreneurs</li>
            <li>Job seekers</li>
            <li>Anyone seeking visibility</li>
          </ul>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">3. Operating Mode</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1">
            Vyzio.com offers an intuitive experience:
          </Typography>
          <ul>
            <li>First login: guided tour for new users</li>
            <li>Visitors browse freely without creating an account</li>
            <li>Advertisers register and pay to post ads</li>
            <li>Simple ad posting: category → details → photos → contact → payment → publish</li>
          </ul>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">4. Website Structure</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ul>
            <li>Home: Quick access to main features</li>
            <li>Categories: Organized by theme (services, jobs, real estate, etc.)</li>
            <li>Visitor Page: Advanced ad browsing filters</li>
            <li>Advertiser Page: Dashboard for ad management</li>
            <li>Ad Page: Photos, details, direct contact</li>
            <li>Admin Area: Ads, users, payments, statistics</li>
          </ul>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">5. Secure Integrated Payments</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1">
            Vyzio.com supports:
          </Typography>
          <ul>
            <li>Bank Cards: Visa, MasterCard, American Express</li>
            <li>Mobile Money: Orange Money, Moov Money, Mobicash</li>
            <li>Cryptocurrency: Bitcoin, Ethereum, USDT</li>
          </ul>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Features: On-site payments, responsive design, secure crypto storage, automatic currency conversion.
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">6. Key Features</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ul>
            <li>Advanced search filters (location, price, categories)</li>
            <li>Detailed ad pages with direct contact</li>
            <li>Initial onboarding guide</li>
            <li>Fully responsive design</li>
          </ul>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 4 }} />
    </Container>
  );
}
