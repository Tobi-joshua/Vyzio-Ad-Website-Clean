# Vyzio.com

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
  - Credit/Debit Cards (Visa, MasterCard, etc.)  
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

## Getting Started

### Prerequisites

- Python 3.10+  
- Node.js & npm  
- SQLite (default DB) or other supported database

### Backend Setup (Django API)

1. Clone the repository

    ```bash
    git clone https://github.com/yourusername/vyzio.git
    cd vyzio
    ```

2. Create and activate a virtual environment

    ```bash
    python -m venv env
    source env/bin/activate  # Linux/macOS
    env\Scripts\activate     # Windows
    ```

3. Install dependencies

    ```bash
    pip install -r requirements.txt
    ```

4. Apply migrations

    ```bash
    python manage.py migrate
    ```

5. Create a superuser

    ```bash
    python manage.py createsuperuser
    ```

6. Run the development server

    ```bash
    python manage.py runserver
    ```

### Frontend Setup (React App)

1. Navigate to the frontend directory

    ```bash
    cd frontend
    ```

2. Install dependencies

    ```bash
    npm install
    ```

3. Start the React development server

    ```bash
    npm start
    ```

React app will be at [http://localhost:3000](http://localhost:3000) and the Django API at [http://localhost:8000/api/](http://localhost:8000/api/).

---

## Notes

- Configure your `.env` or Django settings to match your environment and API URLs.
- For production, build React app with `npm run build` and serve static files properly.
- Set up payment gateways and other external services before going live.

---

## Missing or Planned Features

| Feature                          | Model or Implementation Needed         | Notes                         |
|---------------------------------|---------------------------------------|-------------------------------|
| Categories (organized by type)   | `Category` model                      | Better than plain choices      |
| Payments                        | `Payment` model                       | Link ad + user + amount + status |
| Multiple photos per ad          | `AdImage` model (FK to Ad)            | Support multiple uploads       |
| Filters by location, price     | Query logic + DB indexes              | No new model needed            |
| Contact via WhatsApp/email      | Extra fields or `Contact` model       | Optional                      |
| Crypto, card, mobile payments  | Extra fields in Payment model          | payment method, currency, crypto_address |
| Advertiser Dashboard           | Views + filtering logic                | No new model                  |
| Admin Dashboard               | Aggregate stats from models             | No new model                  |
| Location-based browsing        | Use city or CountryField                | For filtering                 |
| Comments or Contact Messages    | Optional `Message` model               | Enables user-to-user chat     |

---

Feel free to customize or ask if you want me to generate more sections — like **Usage**, **API Documentation**, or **Deployment** instructions!
