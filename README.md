# Arugamama

> **UAE Renter Cashflow & Move-In Reality Engine**: Audit your Day-1 cash wall before you sign: DEWA slabs, Empower capacity, deposits & brokerage.

---

## 🌴 WELCOME TO ARUGAMAMA

Arugamama is your ambitious 2026 companion for UAE real estate renters. It's a Move-In Reality Engine that helps you understand the true financial impact of your rental decisions before you sign the lease.

---

## ✨ FEATURES

### 💡 **Move-In Reality Engine**
- Calculate Day-1 cash requirements before signing
- Include DEWA/SEWA utility costs, Empower capacity fees, deposits, and brokerage
- Multi-emirate support (Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah)
- Property layout-aware pricing (Studio to 4BR+ Villa)

### 🤖 **AI-Powered Predictions**
- Peak summer utility forecasts
- Winter baseline utility estimates
- Liquidity risk scoring for your property

### 📅 **Rent Schedule Export**
- Generate ICS calendar files for rent payments
- Print-friendly HTML PDF export via n8n webhooks

### 🎨 **Modern UI/UX**
- Clean anime/manga-inspired design aesthetic
- Framer Motion animations
- Responsive Tailwind CSS implementation

---

## 🚀 QUICK START

### Prerequisites
- **Node.js** ≥ 18.x
- **Python** ≥ 3.11 (for API functions)
- **npm** or **yarn**

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yaqoah/arugamama
cd arugamama

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 🏗️ PROJECT STRUCTURE

```
arugamama/
├── api/                    # Python serverless API (Vercel Functions)
│   ├── predict.py          # ONNX inference endpoint for predictions
│   ├── export.py           # ICS/PDF export endpoint
│   └── requirements.txt    # Python dependencies
├── model_artifacts/        # ONNX model and preprocessing files
│   ├── model.onnx          # Trained utility prediction model
│   ├── scaler_params.json  # StandardScaler parameters
│   └── feature_columns.json
├── src/                    # Frontend application (TypeScript/React)
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   ├── utils/              # Helper utilities
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
├── scripts/                # Build/deployment scripts
├── vite.config.ts          # Vite bundler configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

---

## 📟 API ENDPOINTS

### `POST /api/predict`

Returns rental utility and liquidity predictions from the ONNX model.

**Request Body:**
```json
{
  "annual_rent": 120000,
  "cheques": 12,
  "is_furnished": 1,
  "move_in_month": 6,
  "emirate": "Dubai",
  "layout": "2 BR",
  "ac_type": "Central DEWA/SEWA"
}
```

**Response:**
```json
{
  "peak_summer_utility": 1200.50,
  "winter_baseline_utility": 800.25,
  "liquidity_risk_score": 3.5
}
```

### `POST /api/export`

Generates rent payment schedules as ICS or HTML/PDF.

**Request Body:**
```json
{
  "annual_rent": 120000,
  "cheques": 12,
  "lease_start_date": "2025-06-01T00:00:00Z",
  "property_label": "Oceanview Apartment",
  "export_type": "ical"
}
```

---

## 🔧 ENVIRONMENT CONFIGURATION

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Optional: n8n Webhook URL for PDF export via n8n workflow automation
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/pdf-export
```

---

## 🧪 TECHNOLOGIES

### Frontend
| Technology | Version |
|------------|---------|
| React | 18.3.x |
| TypeScript | 5.5.x |
| Vite | 5.4.x |
| Tailwind CSS | 3.4.x |
| Framer Motion | 12.x |
| Recharts | 3.x |
| Lucide React | 0.344.x |

### Backend (Inference)
| Technology | Version |
|------------|---------|
| Python | 3.11 |
| ONNX Runtime | ≥ 1.18 |
| NumPy | 2.2.x |

**ONNX Runtime** powers the ML inference pipeline, serving the trained model that predicts:
- Peak Summer Utility (DEWA/SEWA costs)
- Winter Baseline Utility
- Liquidity Risk Score

### Backend (Export)
- **n8n Webhooks**: Automated PDF generation via n8n workflow automation

### DevOps
- **Vercel** for serverless deployment
- **ESLint** for code quality
- **TypeScript** for type safety
