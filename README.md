# AutoInsight - An AI Powered Visualization System

**AutoInsight** is an AI-powered data visualization and analytics platform that transforms raw datasets into interactive dashboards and automatically generates actionable insights.

---

## Overview

AutoInsight allows users to upload datasets, analyze them using AI-driven logic, visualize patterns through dynamic charts, and generate reports and forecasts — all in a single platform.

It is designed to simplify data analysis for faster decision-making without requiring deep technical expertise.

---

## Features

- **Authentication System**
  - Secure sign up, login, logout
  - Password reset functionality
  - Session management using Supabase

- **Dataset Upload & Processing**
  - Supports CSV, Excel (`.xlsx`, `.xls`), and JSON files
  - Client-side parsing and validation
  - Dataset storage using Supabase

- **AI-Based Insight Generation**
  - Automatic detection of trends and patterns
  - AI-generated insights from uploaded datasets
  - Smart chart recommendations

- **Interactive Visualizations**
  - Dynamic dashboards
  - Multiple chart types using Recharts
  - Clean and responsive UI

- **Data Cleaning Tools**
  - Handle missing values
  - Remove duplicates
  - Rename or delete columns

- **Prediction Module**
  - Time-series forecasting
  - Comparison of actual vs predicted data
  - Adjustable prediction parameters

- **Reports Generation**
  - AI-enhanced reports
  - Export as PDF or Markdown

- **Templates**
  - Pre-built datasets for quick analysis
  - Domain-specific templates (sales, finance, student data, etc.)

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts
- Framer Motion

### Backend & Services
- Supabase (Auth, Database, Storage)
- Supabase Edge Functions (AI processing)

### Utilities
- XLSX (file parsing)
- jsPDF (PDF export)
- html2canvas (UI export)

---

## Project Structure

```bash
src/
├── components/        # UI components
├── pages/             # Application pages
├── hooks/             # Custom hooks
├── contexts/          # Auth & theme context
├── integrations/      # Supabase setup
├── lib/               # Utility functions
└── main.tsx           # Entry point
```

## Main Modules
1. Authentication

Handles user registration, login, logout, password reset, and session management using Supabase.

2. Upload Pipeline

Users can upload CSV, Excel, or JSON files. Files are validated, parsed on the client side, uploaded to Supabase Storage, and then registered in the database.

3. AI Analysis

After upload, the app invokes backend edge functions to analyze the dataset and generate:
insights
chart suggestions
explanations

4. Dashboard

Displays:
total datasets
project count
visualization count
recent activity
dataset distribution by file type

5. Data Manager

Provides dataset operations such as:
cleaning null values
filling missing values
removing duplicates
renaming columns
deleting columns
restoring old versions

6. Visualizations and Insights

Shows AI-generated visualizations and insight summaries for uploaded datasets.

7. Predictions

Runs backend forecasting for time-series datasets by identifying:

at least one date column
at least one numeric column

8. Reports

Generates AI-enhanced reports that can be downloaded as:

PDF
Markdown

### How It Works
1. User signs in
2. User uploads a dataset
3. The file is parsed and validated
4. The dataset is uploaded to Supabase Storage
5. Metadata is saved in the database
6. AI analysis is triggered through Supabase Edge Functions
7. Insights and suggested visualizations are saved
8. User explores dashboards, predictions, reports, and cleaned data
   
### Installation
1. Clone the repository
git clone <your-repo-url>
cd insight-navigator-main

2. Install dependencies
npm install

3. Add environment variables
Create a .env file in the root directory and add:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id

4. Start the development server
npm run dev
5. Build for production
npm run build

### Available Scripts
npm run dev         # Start development server
npm run build       # Create production build
npm run preview     # Preview production build
npm run lint        # Run ESLint
npm run test        # Run tests
npm run test:watch  # Run tests in watch mode

### Supported File Formats
CSV
Excel (.xlsx, .xls)
JSON
AI Capabilities

### The platform uses backend AI/serverless functions for:
- dataset analysis
- insight generation
- chart recommendations
- report generation
- forecasting

Note: The actual model logic for these AI features is handled through Supabase Edge Functions such as analyze-data, generate-report, and predict. Those backend function implementations are not fully included in this frontend repository.
