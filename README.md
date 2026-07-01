# Hirely - The CRM Built for Recruiters

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open http://localhost:3000

## Deploy to Vercel

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial Hirely app"
git remote add origin https://github.com/YOUR_USERNAME/hirely.git
git push -u origin main
```

2. Go to vercel.com
3. Import your GitHub repo
4. Click Deploy - done in 60 seconds

## Project Structure

```
hirely/
├── app/
│   ├── globals.css      # Global styles + Tailwind
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main dashboard page
├── components/
│   ├── Sidebar.tsx      # Navigation sidebar
│   ├── ContactCard.tsx  # Pipeline contact cards
│   ├── ContactPanel.tsx # Right panel with AI drafts
│   ├── AddContactModal.tsx  # Add contact form
│   ├── ImportModal.tsx  # Import options
│   └── Toast.tsx        # Notifications
├── lib/
│   └── data.ts          # Mock data + AI draft generator
└── types/
    └── index.ts         # TypeScript types
```

## What to add next

- [ ] Supabase database (replace mock data)
- [ ] NextAuth authentication (login/signup)
- [ ] Claude API integration (real AI drafts)
- [ ] Hunter.io API (email enrichment)
- [ ] Apollo API (LinkedIn enrichment)
- [ ] Stripe payments
- [ ] Chrome extension (LinkedIn button)
- [ ] Outlook add-in
