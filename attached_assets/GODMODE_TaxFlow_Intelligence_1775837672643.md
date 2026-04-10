# ⚛ ENTANGLEWEALTH — TAXFLOW INTELLIGENCE PLATFORM
## GODMODE REPLIT PROMPT — Paste Entire Document — Zero Shortcuts

---

## MISSION

Build a **professional tax intelligence and planning platform** that reads and interprets the
IRS tax code to surface every legitimate, legal deduction and tax strategy available to
contractors (1099), LLC owners, S-Corp shareholders, and C-Corp operators. The platform
includes a smart travel itinerary builder for business travel deductions, a personal user
profile system with document upload and AI document reading, and a full deduction
maximizer that shows users money they are legally leaving on the table.

This is not tax advice — it is a tax education and organization platform.
All output carries the disclaimer: "Consult a licensed CPA or tax attorney before filing."

---

## TECH STACK

- **Single file**: `taxflow.html` — all HTML, CSS, JS in one file
- **No frameworks**: Vanilla JS only
- **AI Engine**: Claude API (`https://api.anthropic.com/v1/messages`, model: `claude-sonnet-4-20250514`)
  - User enters Anthropic API key in settings — stored in localStorage only
- **Document parsing**: FileReader API (browser-native, reads PDFs as base64, images as base64)
- **Storage**: localStorage for profile, documents metadata, itineraries, receipts
- **PDF reading**: Send document as base64 to Claude API with vision capabilities
- **Charts**: Chart.js from `https://cdn.jsdelivr.net/npm/chart.js`
- **Fonts**: Inter from Google Fonts

---

## VISUAL IDENTITY

```css
:root {
  --bg:        #07080C;
  --bg2:       #0D0F18;
  --bg3:       #12141F;
  --bg4:       #181A28;
  --primary:   #00C8F8;     /* EntangleWealth blue */
  --gold:      #F5C842;     /* Gold accent */
  --green:     #00E676;     /* Savings, deductions found */
  --red:       #FF4757;     /* Missing, warnings */
  --amber:     #FFB800;     /* Caution */
  --purple:    #9C27B0;     /* AI elements */
  --text:      #E2E4F0;
  --muted:     #565A7A;
  --border:    rgba(0,200,248,0.10);
  --border2:   rgba(255,255,255,0.06);
  --font:      'Inter', sans-serif;
  --mono:      'Courier New', monospace;
}
```

**UI Rules:**
- Deduction amounts always in bold green
- Missing/unclaimed items in amber
- Tax owed in red
- AI responses in purple-bordered chat bubbles
- Document cards with dashed upload borders
- Section headers with blue left border accent
- All dollar amounts: monospace, bold

---

## FULL LAYOUT

```
┌──────────────────────────────────────────────────────────────┐
│  NAV: ⚛ TaxFlow    [Profile Avatar]   [Tax Year: 2025 ▼]    │
├────────────────────────────────────────────────────────────── │
│  TABS:                                                        │
│  Dashboard | Strategy | Travel | Documents | TaxGPT | Profile│
└──────────────────────────────────────────────────────────────┘
```

---

## USER PROFILE SYSTEM

### Profile Setup (onboarding flow — shown on first launch):

**Step 1 — Business Type:**
```
What describes you best?
○ Independent Contractor / Freelancer (1099)
○ Single-Member LLC (Schedule C)
○ Multi-Member LLC (Partnership)
○ S-Corporation Shareholder
○ C-Corporation Owner
○ Sole Proprietor
○ Multiple entities (I have more than one)
```

**Step 2 — Business Info:**
- Business name
- Industry / NAICS code (searchable dropdown of 1,000 codes)
- State of formation
- Year business started
- Primary business activity (free text)
- Home state of residence

**Step 3 — Income Profile:**
- Estimated annual gross revenue
- W-2 income (if any — for QBI phase-out calculation)
- Number of employees or contractors you pay
- Do you have a home office? Yes/No + square footage
- Do you use a vehicle for business? Yes/No + % business use

**Step 4 — Goals:**
- Primary goal: Reduce self-employment tax | Reduce income tax | Both
- Do you currently work with a CPA? Yes/No
- When do you typically file? On time | Extension

After setup: profile is saved to localStorage.
Profile can be edited any time from Profile tab.

### Profile Card (shown in Profile tab):
```
┌──────────────────────────────────────────────────────┐
│  ⚛ JOHN SMITH                                        │
│  Quantum Design LLC · Single-Member LLC              │
│  Graphic Design · Formed 2021 · Texas                │
│                                                      │
│  TAX YEAR 2025 SUMMARY                               │
│  Gross Revenue:        $148,000                      │
│  Est. Deductions Found: $47,200                      │
│  Est. Taxable Income:   $100,800                     │
│  Compliance Score:      82 / 100                     │
│                                                      │
│  [Edit Profile]  [Export Summary]  [Share with CPA]  │
└──────────────────────────────────────────────────────┘
```

---

## TAB 1 — DASHBOARD

### Deduction Tracker Overview:
```
TOTAL DEDUCTIONS IDENTIFIED:    $47,200   ████████████████░░
TOTAL DOCUMENTED:               $31,400   ████████████░░░░░░
TOTAL MISSING DOCUMENTATION:    $15,800   ██████░░░░░░░░░░░░
POTENTIAL TAX SAVINGS:          $14,160   (at 30% effective rate)
```

### Deduction Category Bars:
Show a visual breakdown of deductions by category with amount found vs documented:
```
CATEGORY                FOUND        DOCUMENTED    GAP
Home Office             $3,600       $3,600        — ✓
Vehicle & Mileage       $8,400       $4,200        $4,200 ⚠
Business Meals          $2,800       $1,400        $1,400 ⚠
Travel & Lodging        $6,200       $6,200        — ✓
Equipment & Tech        $4,800       $4,800        — ✓
Professional Services   $3,200       $3,200        — ✓
Marketing               $2,400       $2,400        — ✓
Education & Training    $1,800       $1,800        — ✓
Health Insurance        $7,200       $0            $7,200 ✗
Retirement (SEP-IRA)   $29,600      $0            $29,600 ✗ LARGE MISS
Software & Subscriptions $1,200      $1,200        — ✓
Phone & Internet        $1,800       $1,800        — ✓
```

### Top 3 Missed Opportunities (alert cards):
```
⚠ LARGE OPPORTUNITY: SEP-IRA Deduction
  You can contribute up to 25% of net self-employment income.
  Estimated contribution room: $29,600
  Estimated tax savings: $8,880
  [Learn More] [Add to Plan]

⚠ OPPORTUNITY: Self-Employed Health Insurance
  100% of premiums deductible above-the-line (Form 1040 Schedule 1)
  Not subject to the 7.5% AGI floor that applies to itemized deductions
  Estimated deduction: $7,200 (based on your profile)
  [Learn More] [Add to Plan]

⚠ GAP: Vehicle Mileage Documentation
  You indicated business vehicle use but only half your estimated
  mileage is documented. IRS requires contemporaneous records.
  Missing mileage value: ~$4,200
  [Open Mileage Log] [Upload Log]
```

---

## TAB 2 — TAX STRATEGY

This is the core IRS tax code knowledge engine. Pre-load all strategies
into a JavaScript data structure. Use Claude API to explain and personalize.

### Entity Structure Strategies:

#### For Contractors / 1099 / Sole Proprietors:
```javascript
const CONTRACTOR_STRATEGIES = [
  {
    id: 'sep_ira',
    title: 'SEP-IRA Contribution',
    code: 'IRC §408(k)',
    category: 'retirement',
    maxBenefit: 'Up to $69,000 (2024) or 25% of net SE income',
    how: 'Contribute to a SEP-IRA before tax deadline (including extensions). Reduces SE income dollar-for-dollar.',
    eligible: 'Any self-employed person with net profit',
    documentation: ['SEP-IRA account statement', 'Contribution confirmation letter'],
    estimator: (netIncome) => Math.min(69000, netIncome * 0.20), // 20% of net (which equals 25% of gross SE)
    irs_pub: 'Publication 560',
    risk: 'low',
  },
  {
    id: 'solo_401k',
    title: 'Solo 401(k) — Employee + Employer Contributions',
    code: 'IRC §401(k)',
    category: 'retirement',
    maxBenefit: 'Up to $69,000 total (2024): $23,000 employee + 25% employer',
    how: 'Must be established by Dec 31. Can contribute more than SEP-IRA if income is under ~$140K because of employee contribution component.',
    eligible: 'Self-employed with no full-time employees (spouse OK)',
    documentation: ['Solo 401k plan documents', 'Contribution records'],
    estimator: (netIncome) => Math.min(69000, 23000 + (netIncome * 0.20)),
    irs_pub: 'Publication 560',
    risk: 'low',
  },
  {
    id: 'home_office',
    title: 'Home Office Deduction',
    code: 'IRC §280A(c)',
    category: 'facilities',
    maxBenefit: 'Simplified: $1,500/yr | Regular: proportional actual expenses',
    how: 'Space must be used regularly and exclusively for business. Simplified = $5/sq ft up to 300 sq ft. Regular method calculates actual home costs proportionally.',
    eligible: 'Must be principal place of business',
    documentation: ['Floor plan showing office area', 'Utility bills', 'Mortgage/rent statements'],
    estimator: (sqft, homeExpenses) => Math.min(1500, sqft * 5),
    irs_pub: 'Publication 587',
    risk: 'medium', // commonly audited
    audit_note: 'Exclusive use test is strictly enforced. Document with photos.',
  },
  {
    id: 'vehicle_actual',
    title: 'Vehicle — Actual Expense Method',
    code: 'IRC §162, Rev. Proc. 2019-46',
    category: 'vehicle',
    maxBenefit: 'All actual vehicle costs × business use %',
    how: 'Track gas, insurance, repairs, depreciation (MACRS or Section 179), registration. Multiply by business use percentage.',
    eligible: 'Any vehicle used for business',
    documentation: ['Mileage log (contemporaneous)', 'Gas receipts', 'Insurance statements', 'Repair receipts'],
    irs_pub: 'Publication 463',
    risk: 'medium',
  },
  {
    id: 'vehicle_mileage',
    title: 'Vehicle — Standard Mileage Rate',
    code: 'IRC §162, Rev. Proc. 2023-34',
    category: 'vehicle',
    maxBenefit: '$0.67 per business mile (2024)',
    how: 'Log every business mile with: date, destination, business purpose, odometer start/end. Much simpler than actual method.',
    eligible: 'Must choose this method in first year of business use',
    documentation: ['Contemporaneous mileage log (date, destination, purpose, miles)'],
    estimator: (miles) => miles * 0.67,
    irs_pub: 'Publication 463',
    risk: 'low',
  },
  {
    id: 'se_health_insurance',
    title: 'Self-Employed Health Insurance Premium Deduction',
    code: 'IRC §162(l)',
    category: 'insurance',
    maxBenefit: '100% of premiums (medical, dental, vision, long-term care)',
    how: 'Above-the-line deduction on Schedule 1. Not subject to 7.5% AGI floor. Cannot exceed net SE income. Cannot use if eligible for employer-sponsored plan.',
    eligible: 'Self-employed with net profit; not eligible for employer plan through spouse',
    documentation: ['Insurance premium statements', 'Payment records'],
    irs_pub: 'Publication 535',
    risk: 'low',
  },
  {
    id: 'section_179',
    title: 'Section 179 — Immediate Equipment Expensing',
    code: 'IRC §179',
    category: 'equipment',
    maxBenefit: 'Up to $1,220,000 (2024) — full expensing in year of purchase',
    how: 'Instead of depreciating equipment over 5-7 years, deduct 100% in year placed in service. Includes computers, software, office furniture, machinery.',
    eligible: 'Must be used > 50% for business',
    documentation: ['Purchase receipts/invoices', 'Proof of business use'],
    irs_pub: 'Publication 946',
    risk: 'low',
  },
  {
    id: 'bonus_depreciation',
    title: 'Bonus Depreciation (100% in year of purchase)',
    code: 'IRC §168(k)',
    category: 'equipment',
    maxBenefit: '60% bonus depreciation (2024), phasing down 20%/yr',
    how: 'Applies to new and used qualified property. Can be used in addition to or instead of Section 179. No income limitation like Section 179.',
    eligible: 'Qualified property placed in service during the year',
    documentation: ['Purchase records', 'Asset log'],
    irs_pub: 'Publication 946',
    risk: 'low',
  },
  {
    id: 'qbi_deduction',
    title: 'Qualified Business Income (QBI) Deduction',
    code: 'IRC §199A',
    category: 'income_reduction',
    maxBenefit: 'Up to 20% of qualified business income',
    how: 'Pass-through businesses (sole prop, LLC, S-Corp, partnerships) can deduct 20% of QBI. Phase-outs begin at $191,950 (single) / $383,900 (MFJ) for 2024. Specified Service Trades phase out completely.',
    eligible: 'Most non-SSTB businesses under income thresholds get full deduction',
    documentation: ['Accurate profit/loss records'],
    irs_pub: 'Publication 535',
    risk: 'low',
    phase_out_note: 'High-earning professionals (doctors, lawyers, consultants) face phase-out',
  },
  {
    id: 'meals_50pct',
    title: 'Business Meals — 50% Deduction',
    code: 'IRC §274(n)',
    category: 'meals',
    maxBenefit: '50% of actual meal costs',
    how: 'Must have a genuine business purpose. Must be not lavish. Document: who, what business was discussed, date, location, amount. Client entertainment (tickets, golf) is NOT deductible since TCJA 2017.',
    eligible: 'Business meals only — not entertainment',
    documentation: ['Receipts with notes on who/what/why'],
    irs_pub: 'Publication 463',
    risk: 'medium',
  },
  {
    id: 'education',
    title: 'Business Education & Professional Development',
    code: 'IRC §162 (Reg. §1.162-5)',
    category: 'education',
    maxBenefit: '100% of qualifying education costs',
    how: 'Education that maintains or improves skills required in current trade/business. Does NOT include education to qualify for a new career. Includes courses, books, subscriptions, conferences.',
    eligible: 'Must be related to current business — not career change',
    documentation: ['Course enrollment records', 'Receipts', 'Certificate/syllabus showing business relevance'],
    irs_pub: 'Publication 970',
    risk: 'low',
  },
  {
    id: 'phone_internet',
    title: 'Business Portion of Phone & Internet',
    code: 'IRC §162',
    category: 'utilities',
    maxBenefit: 'Business-use percentage of monthly bills',
    how: 'If phone/internet is 70% business use, deduct 70% of the bill. Keep a usage log or make a reasonable good-faith estimate.',
    eligible: 'All self-employed individuals',
    documentation: ['Monthly bills', 'Usage log or calculation methodology'],
    risk: 'low',
  },
  {
    id: 'startup_costs',
    title: 'Startup Cost Deduction',
    code: 'IRC §195',
    category: 'startup',
    maxBenefit: 'Up to $5,000 immediate + amortize remaining over 180 months',
    how: 'Costs incurred before business opens (research, legal fees, licenses, initial marketing). $5,000 immediate deduction phases out when total startup costs exceed $50,000.',
    eligible: 'New businesses only — in year of opening',
    documentation: ['Pre-opening expense receipts', 'Legal/formation documents'],
    irs_pub: 'Publication 535',
    risk: 'low',
  },
  {
    id: 'bad_debt',
    title: 'Business Bad Debt Deduction',
    code: 'IRC §166',
    category: 'losses',
    maxBenefit: 'Full amount of uncollectible accounts receivable',
    how: 'Accrual-basis businesses can deduct invoices that become worthless. Must show the debt was genuine, arose from business, and is uncollectible. Cash-basis businesses generally cannot use this.',
    eligible: 'Accrual-basis businesses with uncollectible invoices',
    documentation: ['Original invoice', 'Collection attempts', 'Written-off documentation'],
    irs_pub: 'Publication 535',
    risk: 'low',
  },
  {
    id: 'rent_deduction',
    title: 'Business Rent / Coworking Deduction',
    code: 'IRC §162',
    category: 'facilities',
    maxBenefit: '100% of rent paid for business space',
    how: 'Office rent, coworking memberships, storage units used for business — all 100% deductible. Much cleaner than home office from audit perspective.',
    documentation: ['Lease agreement', 'Rent payment records'],
    risk: 'low',
  },
];
```

#### For LLC Owners (additional strategies):
```javascript
const LLC_STRATEGIES = [
  {
    id: 's_corp_election',
    title: 'S-Corp Election to Reduce Self-Employment Tax',
    code: 'IRC §1362, IRC §1401',
    category: 'entity_structure',
    maxBenefit: 'Save 15.3% SE tax on income above reasonable salary',
    how: `When you make an S-Corp election (Form 2553), you split income into:
    1. Reasonable W-2 salary (subject to payroll taxes)
    2. Owner distributions (NOT subject to 15.3% SE tax)
    
    Example: $150K net income
    - As LLC/Sole Prop: pay SE tax on full $150K = $21,195
    - As S-Corp: $80K salary + $70K distribution
    - SE tax only on $80K salary = $12,240
    - SAVINGS: $8,955 per year
    
    Generally worth it when net profit exceeds $50,000-$60,000`,
    eligible: 'Single or multi-member LLCs with consistent profit > $50K',
    documentation: ['Form 2553', 'Payroll records', 'Reasonable compensation analysis'],
    deadline: 'Must file Form 2553 within 75 days of tax year start, or March 15 for prior year',
    risk: 'low — but must maintain actual payroll',
    costs: 'Payroll processing (~$500-$1,500/yr), additional tax filings',
  },
  {
    id: 'accountable_plan',
    title: 'Accountable Plan for Employee Expense Reimbursements',
    code: 'IRC §62(c), Reg. §1.62-2',
    category: 'reimbursements',
    maxBenefit: 'Reimburse yourself tax-free for business expenses',
    how: `Create a formal "Accountable Plan" document for your entity.
    Reimburse yourself for legitimate business expenses paid personally.
    Reimbursements are:
    - Deductible to the business (reduces business income)
    - NOT taxable income to you personally
    - Not subject to payroll taxes
    
    Requirements: substantiation (receipts), business purpose, return excess`,
    eligible: 'S-Corps and C-Corps primarily. LLCs taxed as partnerships also benefit.',
    documentation: ['Written Accountable Plan document', 'Expense reports with receipts', 'Reimbursement records'],
    irs_pub: 'Publication 15, Reg. §1.62-2',
    risk: 'low when properly documented',
  },
  {
    id: 'augusta_rule',
    title: 'Augusta Rule — Rent Your Home to Your Business',
    code: 'IRC §280A(g)',
    category: 'income_shifting',
    maxBenefit: 'Up to $14,000+ tax-free per year (14 days × fair market rental rate)',
    how: `Rent your personal home to your business for up to 14 days per year.
    - The RENTAL INCOME is TAX-FREE to you personally (IRC §280A(g))
    - The RENTAL EXPENSE IS DEDUCTIBLE to your business
    
    Example: Rent home for 14 meetings @ $1,000/day = $14,000
    - Business deducts $14,000
    - You receive $14,000 TAX FREE personally
    
    Requirements:
    - Must be for genuine business purposes (board meetings, planning sessions, trainings)
    - Rate must be fair market (get a quote from Airbnb/VRBO to document)
    - Must keep records of meetings (agenda, attendees)
    - Business must be a separate entity (S-Corp, C-Corp, or multi-member LLC)`,
    eligible: 'S-Corp and C-Corp owners who hold business meetings at home',
    documentation: ['Meeting agendas and minutes', 'Fair market rental rate documentation (Airbnb comps)', 'Rental agreement between you and your entity'],
    risk: 'medium — must be done correctly with documentation',
    audit_note: 'IRS has accepted this when properly documented. Must be legitimate business use.',
  },
  {
    id: 'family_employment',
    title: 'Hire Your Children (Under 18)',
    code: 'IRC §3121(b)(3), IRC §1(g)',
    category: 'income_shifting',
    maxBenefit: 'Shift income at lower tax rates; children pay 0% up to $14,600 standard deduction',
    how: `For sole proprietors and single-member LLCs (NOT S-Corps or C-Corps):
    Wages paid to your children under 18 are:
    - Exempt from Social Security and Medicare taxes
    - Exempt from FUTA
    - Deductible to your business
    - Taxable to child at their (much lower) rate
    - Child gets $14,600 standard deduction (2024) = zero tax on first $14,600
    
    Work must be real, age-appropriate, and paid at fair market rate.
    Child can then contribute to a Roth IRA up to earned income amount.`,
    eligible: 'Parent-owned sole proprietorships and LLCs; children must do real work',
    documentation: ['Job description', 'Timesheets', 'Pay stubs', 'Bank account in child\'s name'],
    risk: 'medium — IRS scrutinizes family employment; work must be genuine',
  },
  {
    id: 'hsa_contribution',
    title: 'Health Savings Account (HSA) Triple Tax Advantage',
    code: 'IRC §223',
    category: 'health',
    maxBenefit: '$4,150 single / $8,300 family (2024) — triple tax-advantaged',
    how: `Three tax benefits in one:
    1. Contributions are tax-deductible (or pre-tax if through payroll)
    2. Growth is tax-free
    3. Withdrawals for medical expenses are tax-free
    
    Must have a High-Deductible Health Plan (HDHP).
    After age 65, can withdraw for ANY purpose (like a traditional IRA).
    Best "stealth retirement account" available.`,
    eligible: 'Anyone with HDHP coverage',
    documentation: ['HDHP insurance card', 'HSA contribution records'],
    irs_pub: 'Publication 969',
    risk: 'low',
  },
];
```

#### For S-Corporation Owners:
```javascript
const SCORP_STRATEGIES = [
  {
    id: 'reasonable_compensation',
    title: 'Reasonable Compensation Analysis',
    code: 'IRC §162(a)(1), Rev. Rul. 74-44',
    category: 'salary_planning',
    maxBenefit: 'Minimize salary = minimize payroll taxes legally',
    how: `The IRS requires S-Corp shareholder-employees to take "reasonable compensation."
    But "reasonable" is NOT your full profit — it is what you would pay a third-party
    employee to do the same work.
    
    Factors the IRS considers:
    - Industry salary surveys (use BLS.gov, Salary.com, Glassdoor)
    - Your training and experience
    - Duties and responsibilities
    - Time devoted to the business
    - What comparable businesses pay
    
    Strategy: Set salary at the LOWEST reasonable level your role justifies.
    Document with a written compensation analysis each year.
    Everything above your salary = distributions (no SE tax).`,
    documentation: ['Written compensation analysis', 'Industry salary data', 'W-2 records', 'IRS Form 941'],
    risk: 'medium — most important S-Corp compliance issue',
  },
  {
    id: 'scorp_accountable_plan',
    title: 'Accountable Plan for Home Office, Vehicle, Phone',
    code: 'IRC §62(c)',
    category: 'reimbursements',
    maxBenefit: 'Convert personal expenses to pre-tax business deductions',
    how: `S-Corp shareholders cannot deduct unreimbursed business expenses on their
    personal return (2% misc deduction eliminated by TCJA 2017).
    
    Solution: Create an Accountable Plan where the S-Corp reimburses you for:
    - Home office (calculated via Form 8829 methodology)
    - Vehicle business use (mileage × $0.67 or actual method)
    - Cell phone business portion
    - Internet business portion
    - Any business expense you paid personally
    
    Reimbursements are deductible to the S-Corp and tax-free to you.`,
    documentation: ['Signed Accountable Plan document', 'Monthly expense reports', 'Supporting receipts'],
    risk: 'low when properly documented',
  },
  {
    id: 'scorp_retirement',
    title: 'S-Corp Owner Retirement Strategy',
    code: 'IRC §401(k), §408(k)',
    category: 'retirement',
    maxBenefit: 'Up to $69,000 (2024) through defined benefit or Solo 401(k)',
    how: `S-Corp owners can contribute to retirement plans based on W-2 salary:
    
    Solo 401(k):
    - Employee: up to $23,000 (+ $7,500 catch-up if 50+)
    - Employer: up to 25% of W-2 salary
    - Total limit: $69,000
    
    SEP-IRA: Up to 25% of W-2 salary only
    
    Defined Benefit Plan: Can shelter $100K+ annually for older owners
    - Actuarial calculation required
    - Best when owner is 50+ with high income
    
    Strategy: Set salary to maximize retirement contributions while
    minimizing overall payroll taxes.`,
    irs_pub: 'Publication 560',
    risk: 'low',
  },
];
```

#### For C-Corporation Owners:
```javascript
const CCORP_STRATEGIES = [
  {
    id: 'flat_tax_rate',
    title: 'C-Corp Flat 21% Tax Rate Arbitrage',
    code: 'IRC §11',
    category: 'entity_structure',
    maxBenefit: 'Retain earnings at 21% vs personal rates up to 37%',
    how: `C-Corps pay a flat 21% corporate tax rate on profits retained in the business.
    
    For high earners (37% bracket), this creates a 16% tax rate arbitrage
    on income retained in the corporation vs passed through to personal return.
    
    Strategy: Pay yourself a reasonable salary, maximize deductible benefits,
    and retain excess profits in the corporation at 21%.
    
    WARNING: "Accumulated Earnings Tax" (20% penalty) applies if earnings
    are accumulated without a legitimate business purpose. Document a
    reinvestment plan.`,
    risk: 'medium — requires planning to avoid double taxation on exit',
  },
  {
    id: 'ccorp_benefits',
    title: 'C-Corp Fringe Benefits — 100% Deductible',
    code: 'IRC §§105, 106, 119, 132',
    category: 'benefits',
    maxBenefit: 'Potentially $20,000+ in tax-free benefits annually',
    benefits_list: [
      'Medical reimbursement plan (HRA) — 100% of medical costs, any plan, no HDHP required',
      'Disability insurance premiums — 100% deductible',
      'Group term life insurance — up to $50,000 coverage, deductible to corp',
      'Educational assistance — up to $5,250/year tax-free to employee',
      'Dependent care FSA — up to $5,000 tax-free',
      'Employer-provided meals on-premises — 100% deductible (for now)',
      'Company car for business + personal use',
      'Cell phone — 100% deductible when provided for business reasons',
    ],
    how: 'C-Corp owners who are employees can receive ALL of these benefits deductibly. S-Corp owners who own >2% cannot exclude most of these benefits from income.',
    risk: 'low — major advantage of C-Corp structure',
  },
  {
    id: 'qsbs_exclusion',
    title: 'QSBS — Qualified Small Business Stock Exclusion',
    code: 'IRC §1202',
    category: 'exit_planning',
    maxBenefit: 'Exclude up to $10 million (or 10× basis) in capital gains TAX FREE',
    how: `If your C-Corp qualifies:
    - Incorporated as a C-Corp
    - Gross assets < $50M at time of investment
    - Active business (not certain service businesses)
    - Stock held for > 5 years
    - Acquired at original issuance
    
    Then when you sell: up to $10 million in gains are COMPLETELY EXCLUDED
    from federal income tax.
    
    This is the most powerful tax incentive in the code for startups.
    Structure matters — must be C-Corp, not LLC or S-Corp.`,
    risk: 'low — if properly structured from formation',
    irs_pub: 'IRC §1202, Publication 550',
  },
  {
    id: 'ccorp_retirement',
    title: 'Defined Benefit Pension Plan',
    code: 'IRC §412, §404',
    category: 'retirement',
    maxBenefit: 'Up to $275,000/year in contributions (2024)',
    how: `Defined Benefit plans allow much larger contributions than 401(k)s,
    especially for older business owners:
    
    Age 45: ~$80,000/year max contribution
    Age 55: ~$160,000/year max contribution
    Age 65: ~$275,000/year max contribution
    
    All contributions are deductible to the corporation.
    Requires actuarial calculation annually.
    Best for: profitable C-Corps with owner age 50+ and few employees.`,
    risk: 'medium — requires ongoing actuarial work; penalties for underfunding',
  },
];
```

### Strategy Browser UI:

Show all strategies in a card grid, filterable by entity type:

```
FILTER: [All] [Contractor] [LLC] [S-Corp] [C-Corp] [Retirement] [Vehicle] [Health]

┌────────────────────────────────────────────┐
│ SEP-IRA Contribution           IRC §408(k) │
│ ★ RETIREMENT                               │
│ Save up to $69,000/year                    │
│ Risk Level: ● LOW                          │
│ Est. Savings: $8,280  (based on profile)   │
│ [Details] [Add to My Plan] [Ask TaxGPT]    │
└────────────────────────────────────────────┘
```

Each strategy card expands to show:
- Full explanation in plain English
- Step-by-step how to implement
- Required documentation list
- IRS Publication reference
- Risk level + audit note
- Estimated savings based on user's profile numbers
- "Ask TaxGPT" button = pre-populates chat with question about this strategy
- "Add to My Plan" = adds to Dashboard tracking

---

## TAB 3 — TRAVEL ITINERARY BUILDER

Build a comprehensive business travel planner that maximizes legitimate IRS deductions.

### IRS Business Travel Rules (pre-loaded knowledge):
```javascript
const TRAVEL_RULES = {
  primary_purpose: {
    rule: 'Travel must be primarily for business. If more than 50% of days are business days, transportation is 100% deductible.',
    domestic: 'For US travel: transportation is 100% deductible if trip is primarily business, regardless of personal days. Lodging: deduct only business days. Meals: 50% of business days.',
    international: 'For foreign travel: if trip is > 7 days and personal days < 25% of total, transportation is 100% deductible. Otherwise, must allocate.',
    irs_pub: 'Publication 463',
  },
  business_day_definition: {
    rule: 'A day counts as a business day if: (1) you spend the majority of working hours on business, OR (2) travel days getting to/from the business location.',
    standby_day: 'A day you must be available for business even if no meetings scheduled counts as business day.',
    weekend_between: 'If you have business Mon and Thu, Tue/Wed can be treated as business days (sandwiched).',
  },
  meals: {
    rate: '50% of actual meal costs, OR standard federal per diem rates',
    per_diem: 'Use IRS per diem rates from GSA.gov — no receipts needed if using per diem',
    high_low: 'High-low method: $318/day high-cost cities, $225/day others (2024)',
  },
  conventions: {
    domestic: 'Domestic convention expenses generally deductible if attendance benefits business',
    foreign: 'Foreign conventions require showing convention in foreign location is as reasonable as domestic',
    cruise: 'Cruise conventions: very limited deduction ($2,000/day max, US-flagged ship, US ports only)',
  },
};
```

### Trip Builder Interface:

**Step 1 — Trip Setup:**
```
Trip Name: ___________________________
Destination City: ____________________
Departure Date: [calendar]
Return Date: [calendar]
Primary Business Purpose: [dropdown]
  • Client Meeting
  • Conference / Trade Show
  • Training / Education
  • Site Inspection / Due Diligence
  • Vendor Meeting
  • Speaking Engagement
  • Board Meeting
  • Business Development
```

**Step 2 — Day-by-Day Planner:**

Interactive calendar grid for the trip duration:
Each day has a dropdown: `Business Day | Personal Day | Travel Day | Mixed`

```
TRIP: Chicago Client Conference — Apr 14-19, 2025

DAY         DATE        TYPE           ACTIVITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mon Apr 14  Travel Day  ● Business     Flight CHR → ORD, arrive, check-in
Tue Apr 15  Full Day    ● Business     Acme Corp meetings — all day
Wed Apr 16  Full Day    ● Business     Conference Day 1 — sessions 8am-6pm
Thu Apr 17  Full Day    ● Business     Conference Day 2 — sessions 8am-5pm
Fri Apr 18  Mixed Day   ◑ Mixed        Morning: final meeting · Afternoon: personal tourism
Sat Apr 19  Travel Day  ● Business     Flight ORD → CHR

BUSINESS DAYS: 5/6 = 83.3% business   ✓ PRIMARILY BUSINESS
```

**Step 3 — Expense Tracker per Trip:**

For each trip, log:
```
EXPENSE CATEGORY           AMOUNT      DEDUCTIBLE %    DEDUCTIBLE AMT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Flights (round trip)        $487          100%           $487.00
Hotel (5 nights × $189)     $945           83%           $784.35  (5/6 days)
Conference Registration    $1,200          100%          $1,200.00
Meals (5 days)              $380           50%           $190.00
Ground Transportation       $145          100%           $145.00
Baggage Fees                $70           100%           $70.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL SPENT                $3,227         —             $2,876.35
TOTAL DEDUCTIBLE           $2,876.35      89.1%
```

**Step 4 — Documentation Checklist:**
Auto-generated for the trip:
```
REQUIRED DOCUMENTATION FOR THIS TRIP:
✗ Flight itinerary/receipt
✗ Hotel folio (final bill)
✗ Conference registration confirmation
✗ Business agenda / meeting notes
✗ Client names and business purpose notes
✗ Meal receipts (who attended, business discussed)
✗ Ground transportation receipts

[Upload Documents] — each item becomes a checkbox when document uploaded
```

**Step 5 — IRS Audit-Proof Summary:**
After logging all info, generate a formatted travel memo:
```
BUSINESS TRAVEL DOCUMENTATION MEMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Taxpayer: John Smith / Quantum Design LLC
Trip dates: April 14-19, 2025 (6 days)
Destination: Chicago, IL
Primary business purpose: Annual Design Conference + Client Meetings

BUSINESS JUSTIFICATION:
Attended the national Design Industry Conference (April 15-17) as a
continuing education and client development activity directly related
to my graphic design business. Met with Acme Corp (client) on April 15
to review ongoing logo redesign project worth $12,000.

DEDUCTIBILITY ANALYSIS (per Publication 463):
Business days: 5 out of 6 total days (83.3%)
Trip qualifies as primarily business — transportation 100% deductible
Lodging deductible for business days only (5 of 6 = 83.3%)
Meals deductible at 50% for business days

TOTAL CLAIMED DEDUCTION: $2,876.35

[Download as PDF]  [Email to CPA]  [Save to Profile]
```

### Trip History:
All trips stored in localStorage.
Dashboard shows year-to-date travel deduction total.
Chart: monthly travel expense breakdown.

### Per Diem Calculator:
- Enter city + date range
- Tool shows IRS standard per diem rate for that location
- Calculates total per diem for trip (no receipts needed)
- Shows comparison: actual receipts vs per diem (choose whichever is larger)

---

## TAB 4 — DOCUMENT VAULT

### Document Upload System:

```
┌─────────────────────────────────────────────────────────┐
│  📁 DOCUMENT VAULT                                      │
│                                                         │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │   DROP FILES HERE or CLICK TO UPLOAD              │  │
│  │   PDF, JPG, PNG, HEIC — Max 10MB per file         │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                                         │
│  FILTER: [All] [Receipts] [Mileage] [Contracts]         │
│  [Bank Statements] [Tax Forms] [Invoices] [Travel]      │
└─────────────────────────────────────────────────────────┘
```

### Document Card (after upload):
```
┌──────────────────────────────────────────────────────┐
│  📄 receipt-home-depot-03-15-2025.jpg                │
│  Category: [Office Supplies ▼]                       │
│  Amount: $____________   Date: ____________          │
│  Business Purpose: ___________________________       │
│                                                      │
│  AI ANALYSIS: ████████████████ Processing...        │
│  ─────────────────────────────────────────────────  │
│  "Receipt from Home Depot dated March 15, 2025      │
│  for $127.43. Items include filing cabinet ($89),   │
│  printer paper ($24), and pens ($14). These appear  │
│  to be office supplies deductible at 100% under     │
│  IRC §162. Categorized as: Office Supplies.         │
│  Recommended IRS category: Business Expense."       │
│                                                      │
│  [Confirm & Log]  [Edit]  [Delete]                  │
└──────────────────────────────────────────────────────┘
```

### AI Document Reader:

When a document is uploaded, send to Claude API as base64 image/PDF:

```javascript
async function analyzeDocument(fileData, fileType, userProfile) {
  const prompt = `You are a CPA assistant helping analyze a business document for tax purposes.

Business Context:
- Entity type: ${userProfile.entityType}
- Industry: ${userProfile.industry}
- Tax year: ${userProfile.taxYear}

Please analyze the attached document and provide:
1. Document type (receipt, invoice, bank statement, contract, etc.)
2. Key information extracted (vendor, date, amount, items purchased)
3. IRS deduction category that best fits (cite the IRC section)
4. Deductibility percentage (100%, 50%, or partial with explanation)
5. Documentation quality assessment (is this sufficient for IRS audit?)
6. Any red flags or missing information
7. Suggested business purpose language for the expense log

Respond in JSON format only:
{
  "doc_type": "...",
  "vendor": "...",
  "date": "...",
  "amount": 0.00,
  "items": ["..."],
  "irs_category": "...",
  "irc_section": "...",
  "deductible_pct": 100,
  "deductible_amount": 0.00,
  "audit_ready": true/false,
  "audit_issues": ["..."],
  "suggested_purpose": "...",
  "notes": "..."
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: fileType,
              data: fileData,
            }
          },
          { type: 'text', text: prompt }
        ]
      }]
    })
  });

  const data = await response.json();
  return JSON.parse(data.content[0].text);
}
```

### Document Categories:
```
RECEIPTS
  • Office supplies
  • Meals (50%)
  • Travel
  • Vehicle/gas
  • Equipment
  • Software/subscriptions
  • Marketing
  • Professional development

TAX FORMS
  • 1099-NEC received
  • 1099-K received
  • W-2 (if also employed)
  • 1098 (mortgage interest)
  • Charitable receipts

BUSINESS DOCS
  • Invoices sent
  • Contracts
  • Client agreements
  • Lease agreements
  • Insurance policies
  • Business formation docs

FINANCIAL
  • Bank statements
  • Credit card statements
  • Mileage logs
  • Profit/loss statements
  • Prior year tax returns
```

### Document Ledger (full list view):
```
DATE        VENDOR              CATEGORY         AMOUNT    DEDUCTIBLE    AI CONFIDENCE
────────────────────────────────────────────────────────────────────────────────────────
04/10/2025  Starbucks           Meals (50%)      $14.20    $7.10         ★★★★★ 98%
04/09/2025  Amazon              Office Supplies   $89.47   $89.47        ★★★★☆ 91%
04/08/2025  Shell               Vehicle/Gas       $67.30   $47.11 (70%)  ★★★★☆ 88%
04/07/2025  Zoom Pro            Software         $15.99    $15.99        ★★★★★ 99%
────────────────────────────────────────────────────────────────────────────────────────
TOTAL                                            $186.96   $159.67
```

### Mileage Log Module:
```
DATE        START LOCATION    END LOCATION      MILES    PURPOSE              DEDUCTIBLE
03/10/2025  Home Office       Client - Dallas   47       Client presentation   $31.49
03/12/2025  Home Office       Office Depot      8        Buy printer toner     $5.36
03/15/2025  Home Office       Airport           24       Business trip         $16.08
────────────────────────────────────────────────────────────────────────────────────────
YTD MILES: 847    YTD DEDUCTION: $567.49 (@ $0.67/mi)
```

[+ Add Trip] button — or import from Google Maps (paste URL)
[Export Mileage Log] — generates IRS-compliant CSV

---

## TAB 5 — TAXGPT CHAT

Full AI chat interface powered by Claude:

### System prompt for TaxGPT:
```javascript
const TAXGPT_SYSTEM = `You are TaxGPT, an expert tax assistant for EntangleWealth.

You have deep knowledge of:
- IRS tax code (IRC) and all publications
- Business deductions for contractors, LLCs, S-Corps, and C-Corps
- Self-employment tax strategies
- Retirement plan strategies (SEP-IRA, Solo 401k, Defined Benefit)
- Business travel deduction rules (Publication 463)
- Home office deduction rules (Publication 587)
- Vehicle deduction rules (Publication 463)
- Qualified Business Income deduction (§199A)
- Entity structure optimization
- Audit risk assessment
- Tax planning strategies

User's profile: ${JSON.stringify(userProfile)}
Tax year: ${taxYear}

Rules:
1. Always cite the specific IRC section or IRS Publication
2. Give concrete, actionable answers — not vague general advice
3. Always include the disclaimer: "This is educational information, not tax advice. Consult a licensed CPA for your specific situation."
4. When you don't know something specific, say so and suggest they consult a CPA
5. Never recommend anything illegal or fraudulent
6. Focus on legal, IRS-compliant strategies only
7. When discussing strategies, explain both the benefit AND the requirements/risks`;
```

### Chat UI:
- Full conversation history stored per session
- "Clear conversation" button
- Quick-question chips based on user profile:
  ```
  💡 QUICK QUESTIONS (based on your profile):
  [How much can I put in my SEP-IRA?]
  [Should I elect S-Corp status?]
  [Can I deduct my home office?]
  [What's the Augusta Rule?]
  [Am I maximizing retirement contributions?]
  ```
- Document reference: user can say "analyze my document [filename]" and TaxGPT reviews it
- Strategy reference: "Tell me more about [strategy name]" pulls from STRATEGIES database

### Conversation history saved to localStorage per user profile.

---

## USER PROFILE — ADVANCED FEATURES

### Multi-Entity Support:
Users can create multiple profiles (e.g., "My LLC" + "My S-Corp" + "My C-Corp").
Each entity has its own:
- Strategy recommendations
- Document vault
- Travel log
- Deduction tracker

### Tax Year Selector:
- Switch between 2024, 2025, 2026
- Each year has correct IRS limits and rates pre-loaded
- Rate tables:
  ```javascript
  const TAX_RATES = {
    2025: {
      se_tax_rate: 0.1530,
      se_deductible_pct: 0.50,
      standard_deduction_single: 15000,
      standard_deduction_mfj: 30000,
      brackets_single: [
        { rate: 0.10, up_to: 11925  },
        { rate: 0.12, up_to: 48475  },
        { rate: 0.22, up_to: 103350 },
        { rate: 0.24, up_to: 197300 },
        { rate: 0.32, up_to: 250525 },
        { rate: 0.35, up_to: 626350 },
        { rate: 0.37, up_to: Infinity },
      ],
      sep_ira_max: 70000,
      solo_401k_employee_max: 23500,
      mileage_rate: 0.70, // 2025 IRS rate
      hsa_single: 4300,
      hsa_family: 8550,
      qbi_phaseout_single: 197300,
      qbi_phaseout_mfj: 394600,
    }
  };
  ```

### Tax Estimator:
Interactive tool — enter gross income, the tool calculates:
- Self-employment tax
- Estimated federal income tax
- QBI deduction impact
- Retirement contribution impact
- Net take-home after all optimized deductions

Shows side-by-side: "No planning" vs "With TaxFlow strategies"

```
                          NO PLANNING    WITH STRATEGIES    SAVINGS
Gross Revenue              $150,000        $150,000
S-Corp Salary              —               $75,000
SE Tax                     $21,195         $10,598           $10,597
Retirement Deduction        $0             $29,600           $7,104
Home Office Deduction       $0              $3,600           $864
Vehicle Deduction           $0              $8,400           $2,016
Health Insurance Ded.       $0              $7,200           $1,728
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TAXABLE INCOME            $150,000        $101,200
FEDERAL INCOME TAX          $27,000         $16,264          $10,736
SE TAX                      $21,195         $10,598          $10,597
TOTAL TAX BURDEN            $48,195         $26,862
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL SAVINGS WITH TAXFLOW:  $21,333/year  ★★★★★
```

### Export Suite:
- **CPA Report**: Full formatted PDF of all deductions, documents, and strategies for CPA review
- **Deduction Summary CSV**: All logged expenses with categories
- **Travel Log PDF**: All trips with IRS-compliant documentation
- **Mileage Log CSV**: IRS-compliant mileage log
- **Document Index**: List of all uploaded documents with categories

---

## DISCLAIMERS (Required — Show Prominently)

```
⚖️ IMPORTANT LEGAL NOTICE

TaxFlow is an educational and organizational tool. The tax strategies,
deduction information, and IRS code references presented in this
application are for informational and educational purposes only.

This is NOT tax advice. This is NOT legal advice.
The information provided does not constitute tax preparation
services and does not create a tax advisor relationship.

Tax laws are complex and change frequently. The strategies
described may not be appropriate for your specific situation.
Always consult a licensed Certified Public Accountant (CPA),
Enrolled Agent (EA), or tax attorney before implementing
any tax strategy or filing your return.

All IRS code references are based on current public law.
EntangleWealth is not responsible for tax outcomes resulting
from strategies described in this application.
```

Show this: (1) on first launch, (2) at bottom of Strategy tab, (3) in every TaxGPT response.

---

## BUILD ORDER

1. CSS design system + layout skeleton
2. Onboarding profile flow (entity selection → business info → goals)
3. Profile storage in localStorage + multi-entity support
4. Dashboard tab — deduction tracker with progress bars
5. Document upload system — FileReader API integration
6. Claude API document analyzer — base64 image/PDF reading
7. Document ledger with edit/confirm flow
8. Mileage log module
9. Strategy tab — all strategy cards with filter system
10. Strategy detail expand/collapse with documentation lists
11. Estimated savings calculator per strategy
12. Travel itinerary builder — trip setup flow
13. Day-by-day planner with business/personal day toggle
14. Trip expense tracker with auto-deductibility calculator
15. IRS audit-proof travel memo generator
16. Per diem calculator with GSA rates
17. TaxGPT chat with full system prompt and profile context
18. Quick-question chips based on profile
19. Tax year selector with correct rate tables
20. Tax savings estimator (no planning vs optimized)
21. Export suite (CPA report, CSV, travel log)
22. Multi-entity profile management
23. Mobile responsive pass
24. Disclaimer placement everywhere required
25. Full QA using contractor + LLC + S-Corp test profiles

---

## FINAL CHECKLIST — DO NOT SHIP UNTIL ALL ✓

Profile:
- [ ] All 4 entity types have correct strategies loaded
- [ ] Profile saves and loads from localStorage
- [ ] Multi-entity switching works

Strategies:
- [ ] All strategies display with IRC citations
- [ ] Filter by entity type works
- [ ] Estimated savings calculate from profile data
- [ ] "Add to Plan" updates Dashboard

Documents:
- [ ] File upload accepts PDF, JPG, PNG
- [ ] Claude API reads document and returns JSON analysis
- [ ] Category auto-populated from AI response
- [ ] Deductible amount calculated correctly
- [ ] Mileage log calculates at correct IRS rate

Travel:
- [ ] Trip builder calculates business day percentage correctly
- [ ] International vs domestic rules applied correctly
- [ ] Expense tracker calculates deductible amount per category
- [ ] Documentation checklist generates for each trip
- [ ] IRS travel memo exports

TaxGPT:
- [ ] System prompt includes user profile context
- [ ] Responses cite IRC sections
- [ ] Disclaimer appears in every response
- [ ] Chat history saves to localStorage

Tax Estimator:
- [ ] SE tax calculates correctly
- [ ] QBI deduction applies where eligible
- [ ] Retirement contribution reduces taxable income correctly
- [ ] Side-by-side comparison shows accurate savings

General:
- [ ] Disclaimer visible in all required locations
- [ ] All dollar amounts formatted consistently
- [ ] Mobile view works at 375px
- [ ] No console errors

Output the complete `taxflow.html` file. Every feature must be present and functional.
