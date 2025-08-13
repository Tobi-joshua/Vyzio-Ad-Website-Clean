import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { Box, Toolbar } from "@mui/material";

// Pages
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import AdsCategories from "./pages/Ads_Categories";
import AdsByCategory from "./pages/Ads_By_Categories";
import Ads_Details from "./pages/Ads_Details";
import NotFoundPage from "./NotFound";

// Buyer Pages wrapper and nested pages
import BuyersPagesWrapper from "./pages/BuyersPages/index"; 
import BuyerDashboard from "./pages/BuyersPages/BuyerDashboard";
import BuyerAdsCategories from "./pages/BuyersPages/Buyer_Ads_Categories";
import BuyerMessages from "./pages/BuyersPages/BuyerMessages";
import BuyerOrders from "./pages/BuyersPages/BuyersOrders";
import BuyerNotifications from "./pages/BuyersPages/BuyersNotifications";
import BuyersAdsByCategory from "./pages/BuyersPages/Buyers_Ads_By_Categories";
import Buyers_Ads_Details from './pages/BuyersPages/Buyer_Ads_Details';
import BuyerJobApplicationForm from './pages/BuyersPages/Buyer_Ads_Applications';
import BuyerApplicationsList from './pages/BuyersPages/BuyersApplicationsList';
import BuyerSavedAdsList from './pages/BuyersPages/BuyerSavedAds';
import BuyerViewHistoryList from './pages/BuyersPages/BuyerViewHistoryList';
import HelpCenter from './pages/BuyersPages/HelpCenter';
import BuyerAccountSettings from './pages/BuyersPages/Buyers_Account_Settings';


// Seller Pages wrapper and nested pages
import SellersPagesWrapper from "./pages/SellersPages/index";
import SellerDashboard from './pages/SellersPages/SellerDashboard';
import SellerAdsCategories from './pages/SellersPages/Seller_Ads_Categories';
import SellerCreateAdForm from './pages/SellersPages/SellerCreateAds';
import SellerAdsDetails from './pages/SellersPages/Seller_Ads_Details';




// Components
import Footer from "./components/Footer";

function App() {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <BrowserRouter>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            background: `linear-gradient(to bottom, #f0f0f0, #ffffff)`,
            overflowX: "hidden",
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64, md: 64 } }} />

          <Routes>
            <Route path="/" element={<Homepage />} />

            {/* Buyer routes wrapped inside context/layout wrapper */}
            <Route path="/buyers" element={<BuyersPagesWrapper />}>
              <Route path="dashboard" element={<BuyerDashboard />} />
              <Route path="categories" element={<BuyerAdsCategories />} />
              <Route path="messages-list" element={<BuyerMessages/>} />
              <Route path="orders" element={<BuyerOrders />} />
              <Route path="notifications-list" element={<BuyerNotifications />} />
              <Route path="categories/:id/:name/ads" element={<BuyersAdsByCategory />} />
              <Route path="ads/:id/details" element={<Buyers_Ads_Details />} />
              <Route path="jobs/:id/apply" element={<BuyerJobApplicationForm />} />
              <Route path="training/:id/apply" element={<BuyerJobApplicationForm />} />
              <Route path="apply/:id" element={<BuyerJobApplicationForm />} />
              <Route path='my-applications' element={<BuyerApplicationsList/>} />
              <Route path='my-saved-ads' element={<BuyerSavedAdsList/>} />
              <Route path='view-history' element={<BuyerViewHistoryList/>} />
              <Route path='help-center' element={<HelpCenter/>} />
              <Route path='account-settings' element={<BuyerAccountSettings/>} />
            </Route>



          {/* Buyer routes wrapped inside context/layout wrapper */}
            <Route path="/sellers" element={<SellersPagesWrapper/>}>
              <Route path="dashboard" element={<SellerDashboard/>} />
              <Route path="categories" element={<SellerAdsCategories />} />
              <Route path="create/:id/:name/ads" element={<SellerCreateAdForm/>} />
              <Route path="ads/:id/details" element={<SellerAdsDetails/>} />

            </Route>


            {/* Other routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/categories" element={<AdsCategories />} />
            <Route path="/categories/:id/:name/ads" element={<AdsByCategory />} />
            <Route path="/ads/:id/details" element={<Ads_Details />} />

            {/* Fallback route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>

        <Footer />
      </BrowserRouter>

      {/* Global Toaster */}
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
