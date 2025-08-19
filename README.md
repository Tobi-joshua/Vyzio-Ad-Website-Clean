# Vyzio.com

![Vyzio.com Demo](demo/site.png)

## Objective of the Project

The main objective of the Vyzio.com project is to build a modern, intuitive, and accessible web platform that allows users to post and browse ads related to:

- Services (e.g., plumbing, hairdressing, transportation)
- Products (buying and selling items)
- Job offers (posting or seeking jobs)
- Business or training opportunities

### Key Goals

- **Help Users Gain Visibility**  
  Freelancers, small vendors, and job seekers can promote themselves or their services.

- **Free Browsing for Visitors**  
  Anyone can browse ads without creating an account.

- **Ad Posting for Registered Advertisers**  
  Only registered users can post ads. They must pay a small fee to publish.

- **Simplified Ad Workflow**  
  Ad posting is broken down into steps:  
  1. Choose category  
  2. Fill out ad details  
  3. Upload images  
  4. Add contact info  
  5. Make payment  
  6. Publish

- **Secure On-Site Payments**  
  Support for:  
  - Stripe (Cards: Visa, MasterCard, etc.)  
  - Mobile Money (Orange, Moov, Mobicash)  
  - Crypto (BTC, ETH, USDT)

- **Responsive, Modern UX**  
  Works smoothly on desktop, tablet, and mobile.

- **Admin Control Panel**  
  For full management of:  
  - Ads  
  - Users  
  - Payments  
  - Platform statistics

### Summary

To create a self-sustaining ad platform where visitors browse freely, and advertisers pay to gain exposure — all while maintaining security, simplicity, and responsiveness.

---

## Features

| Feature                          | Model or Implementation Needed         | Notes                         |
|---------------------------------|---------------------------------------|-------------------------------|
| Categories (organized by type)   | `Category` model                      | Better than plain choices      |
| Payments                        | `Payment` model                       | Link ad + user + amount + status |
| Multiple photos per ad          | `AdImage` model (FK to Ad)            | Support multiple uploads       |
| Filters by location, price      | Query logic + DB indexes              | No new model needed            |
| Contact via WhatsApp/email      | Extra fields or `Contact` model       | Optional                      |
| Crypto, card, mobile payments   | Extra fields in Payment model         | payment method, currency, crypto_address |
| Advertiser Dashboard            | Views + filtering logic               | No new model                  |
| Admin Dashboard                 | Aggregate stats from models           | No new model                  |
| Location-based browsing         | Use city or CountryField              | For filtering                  |
| Comments or Contact Messages    | Optional `Message` model              | Enables user-to-user chat      |

---

## Data Models Explanation

- **Users**  
  Registered users (buyers, sellers, and admins). Handles authentication and roles.

- **Ads**  
  Main entity for listings. Contains title, description, price, category, status (`draft`, `pending`, `published`, `expired`).

- **Ad Images**  
  Linked to ads. Allows multiple images per ad.

- **Applications**  
  Used when applying to job ads. Links job seeker to a job listing.

- **Buyer Notifications**  
  Notify buyers of order updates, messages, or status changes.

- **Seller Notifications**  
  Notify sellers of new orders, payments, or admin review results.

- **Categories**  
  Structured classification of ads (e.g., Cars, Real Estate, Jobs).

- **Chats / Messages**  
  User-to-user conversations. Messages belong to a chat thread.

- **Listing Prices**  
  Define the fees sellers must pay before their ads can be published.

- **Orders**  
  Records a buyer’s purchase request or a service booking.

- **Payments**  
  Stores payment transactions (amount, method, currency, status). Linked to user and ad.

- **Saved Ads**  
  Ads that buyers save as favorites for later viewing.

- **View History**  
  Tracks which ads a user has viewed (for recommendations/analytics).

---

## Ad Posting & Review Workflow

1. **Draft Mode**  
   - When a seller creates an ad but has **not paid**, the ad remains in `draft` status.  

2. **Pending Review**  
   - Once the seller pays the **listing fee**, the ad moves to `pending review`.  
   - Admin must **approve** the content before publishing.  

3. **Published**  
   - After admin approval, the ad goes live and is visible to all visitors.  

---

## Email Notification Logic (Admin Alerts)

- When a seller **pays and submits** an ad → the ad goes into **Pending Review**.  
- The system will **send an email notification** to the **Admin**.  

### Email Content Example
Subject: New Ad Pending Review
Body: A new ad "Toyota Corolla 2018" was submitted by Seller John Doe.
Review here: https://yourdomain.com/admin/review/12345


---

## Email Setup (What the Client Must Provide)

To enable email notifications, the client must register with an **email service provider** (e.g., Gmail SMTP, SendGrid, Amazon SES, Mailgun, Zoho Mail, Outlook).

The client must send us:

- **SMTP Host** (e.g., smtp.gmail.com)  
- **SMTP Port** (e.g., 587)  
- **Admin Email Address / Username**  
- **Password / API Key** (secure key for sending mails)  
- **From Email Address** (e.g., no-reply@vyzio.com)

⚠️ Without these credentials, the platform **cannot send emails**.

---