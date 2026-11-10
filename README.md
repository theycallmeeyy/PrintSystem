# Print Plus - Print Shop Order Management System

A modern, responsive web application for commercial print shop order processing, customer print document customization, automatic running total calculation in Philippine Peso (₱), real-time status tracking with visual color indicators, and staff price & order management.

---

## Key Features

### 1. Customer Print Customization Panel
Customers can configure their documents before submitting their orders:
- **Paper Sizes:** Standard sizes (A4, Letter, Legal, A5, A3) and customizable dimensions (Width × Height in inches or millimeters).
- **Typography & Font Style:** Font family (`Arial`, `Times New Roman`, `Calibri`, `Roboto`, `Georgia`, `Courier New`), Font sizes (`10pt`, `11pt`, `12pt`, `14pt`, `16pt`), and styles (`regular`, `bold`, `italic`).
- **Margins:** Top, bottom, left, and right margins with instant presets (`Normal 1"`, `Narrow 0.5"`, `Wide 1.5"`).
- **Orientation:** Portrait vs. Landscape with dynamic aspect-ratio simulation.
- **Columns:** 1, 2, or 3 column typographic gutters.
- **Text Alignment & Spacing:** Left, center, right, justified alignment and 1.0x, 1.15x, 1.5x, 2.0x line spacing.

### 2. Design File Upload & Interactive Layout Simulation
- **File Format Support:** PDF, Word documents (`DOCX`, `DOC`), and high-resolution images (`JPG`, `PNG`, `WEBP`, `SVG`).
- **File Metadata:** Displays uploaded filename, file type, and file size.
- **Replace or Remove:** Quick controls to replace or remove uploaded files prior to submission.
- **Visual Simulation Canvas:** Renders a scaled sheet preview showing margins, columns, orientation, and font settings.
- **File Preservation:** Stores and delivers the original customer file untouched.

### 3. Complete Pricing Engine (Philippine Peso ₱)
- **Automatic Running Total:** Instantly recalculates whenever any customization setting is changed.
- **Physical Sheet Formula:**
  $$\text{Physical Sheets} = \lceil\text{Pages per Copy} \div \text{Sides per Sheet}\rceil \times \text{Number of Copies}$$
  - Single-sided: 1 side per sheet.
  - Double-sided: 2 sides per sheet (rounds up odd page counts).
  - Products such as flyers and posters use direct item quantity without treating as multi-page documents.
- **Document Printing rates per page:** A4: ₱7 black & white / ₱12 color; Letter: ₱5 black & white / ₱10 color; Legal: ₱9 black & white / ₱15 color. Selected paper material is charged separately.
- **Itemized Price Breakdown:**
  - Base printing cost
  - Paper and material cost
  - Additional finishing services (Lamination, Binding, Stapling, Cutting, Formatting)
  - Setup fees, rush fees (+25%), and courier delivery fees
  - Promotional discount codes (e.g. `PRINT10`, `WELCOME50`)
  - Tax (VAT %)
  - **Grand Total (₱)**
- **Historical Price Snapshot:** Freezes and locks an order's pricing breakdown at the time of submission so future staff price changes do not alter past orders.
- **Backend Price Validation:** Validates all calculations on the server before accepting orders.

### 4. Real-Time Order Status Indicators (Colored Dots)
- 🔴 **Red Dot – New / Pending:** Order received; awaiting printing.
- 🟡 **Yellow Dot – In Progress:** Currently being processed and printed by staff.
- 🟢 **Green Dot – Finished:** Print job is completed and ready for pickup or delivery.
- **Real-Time Push (WebSockets):** Status transitions update instantly across all open customer tracking and staff management pages without page reloads.

### 5. Staff Management & Price Configuration
- **Private Staff Workspace:** Staff sign in to a protected order queue; customer pages do not expose the queue or customer records.
- **Role-Based Access:** Staff can manage orders and statuses; Admins can also edit prices; the Super Admin can create and disable Staff/Admin accounts.
- **Customer Status Tracking:** Customers can look up an order number and see New, In Progress, or Finished status and the progress history without exposing contact details or uploaded files.
- **Staff Order Queue:** Search and filter orders by customer name, order number, date, and status.
- **Order Inspector:** View customer specifications, download uploaded design files, inspect physical sheets calculation, and update status.
- **Quotation Revision:** Staff can adjust quotations for special jobs; customers can review and approve revised quotes directly.
- **Payment Tracking:** Record payment status (`Unpaid`, `Partial`, `Paid in Full`) and method (`Cash`, `GCash`, `Maya`, `Bank Transfer`).
- **Centralized Price Management:** Easily edit base job rates, paper size surcharges, paper material rates, color surcharges, duplex discount factors, finishing services, and global fees.

### Staff Account Setup
- On a new installation, open **Staff Login** and create the first Super Admin account. This setup is available only until an account exists.
- The Super Admin creates Staff and Admin accounts from **Staff Accounts** in the private workspace. Passwords must be at least 10 characters.
- Production account setup is disabled until `INITIAL_SUPER_ADMIN_EMAIL` and `INITIAL_SUPER_ADMIN_PASSWORD` are configured in the server environment. The server provisions that initial Super Admin on first startup; the one-time setup form is available only outside production.
- Staff sessions expire after 12 hours and are invalidated when the server restarts. Account credentials are stored as salted password hashes in `data/staff-users.json`.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
npm install
```

### Running the Application

1. **Build the Frontend (Production)**:
   ```bash
   npm run build
   ```

2. **Start the Unified Server**:
   ```bash
   npm start
   ```
   Open your browser at **`http://localhost:5000`**.

3. **Development Mode (Vite with hot reload)**:
   ```bash
   npm run dev          # Starts both the API on port 5000 and Vite on port 5173
   ```

On Windows PowerShell, environment-based Super Admin bootstrap can be configured before the first production startup (use a unique password and do not commit it):
```powershell
$env:INITIAL_SUPER_ADMIN_EMAIL = "admin@example.com"
$env:INITIAL_SUPER_ADMIN_PASSWORD = "use-a-long-unique-password"
npm start
```
