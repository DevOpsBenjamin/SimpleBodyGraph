# 📊 SimpleBodyGraph

A premium, mobile-first, offline-first Progressive Web Application (PWA) designed to track personal body metrics (Mass in kg, Body Fat in %) with beautiful interactive charts.

---

## ✨ Features
*   **📱 Mobile-First Design**: Optimized for touch targets with a clean floating action logging layout.
*   **🎨 Premium UI**: Stunning glassmorphism styling powered by **Tailwind CSS v4** with slate-950 base colors, glowing neon gradients, and elegant Outfit typography.
*   **🔌 Offline-First Engine**: All entries are stored locally inside **IndexedDB** instantly. The app works fully offline and will caching assets using a custom Service Worker.
*   **🔄 Supabase Smart Sync**: Listens to network status changes and automatically synchronizes local database additions, updates, and offline deletions to the cloud database when online.
*   **📈 Dynamic Charts**: Customized **Chart.js** line visualizations representing weight and fat progress with smooth animations, custom gradients, and tailored tooltip styles.

---

## 🛠️ Tech Stack
*   **Core**: Vue 3 (Composition API, `<script setup>`)
*   **Build Tool**: Vite 8
*   **Styling**: Tailwind CSS v4 + Glassmorphic filters
*   **Local DB**: HTML5 IndexedDB API
*   **Cloud Sync**: Supabase JS Client
*   **Icons**: Lucide Vue Next
*   **Charts**: Chart.js v4

---

## 🚀 Getting Started

### 1. Installation
Clone the repository, enter the workspace, and install dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-supabase-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
> **Note**: If no credentials are provided, the app will gracefully run in **Offline-Only Mode**, retaining full functionality locally in IndexedDB.

### 3. Run Locally (Development)
```bash
npm run dev
```

### 4. Build for Production
Deploy the statically compiled assets in `dist/` to Cloudflare Pages, Vercel, or Netlify:
```bash
npm run build
```

### 5. Running Tests
* **Unit Tests** (Vitest):
  ```bash
  npm run test:unit
  ```
* **E2E & IndexedDB Tests** (Playwright with automatic pre-build):
  ```bash
  npm run test:e2e
  ```
* **Run All Tests**:
  ```bash
  npm run test:all
  ```

---

## 📊 Supabase Database Schema

Database migrations are managed via the **Supabase CLI** under the [supabase/migrations](file:///Users/devops.benjamin/Work/BodyGraph/SimpleBodyGraph/supabase/migrations) folder.

### Option A: Apply via Supabase CLI (Recommended)
If you have Supabase CLI set up, link your project and push migrations:
```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### Option B: Manual Execution via Supabase SQL Editor
If configuring manually via the Supabase Dashboard, copy and execute the following SQL command to create the `logs` table, enable Row-Level Security (RLS), and configure user isolation policies:

```sql
-- Create logs table with user isolation
CREATE TABLE public.logs (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    mass NUMERIC(5, 2) NOT NULL,
    body_fat NUMERIC(4, 2) NOT NULL,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Users can only read their own logs
CREATE POLICY "Allow users to read their own logs" 
ON public.logs FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Insert Policy: Users can only insert logs under their own user_id
CREATE POLICY "Allow users to insert their own logs" 
ON public.logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Update Policy: Users can only update their own logs
CREATE POLICY "Allow users to update their own logs" 
ON public.logs FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Delete Policy: Users can only delete their own logs
CREATE POLICY "Allow users to delete their own logs" 
ON public.logs FOR DELETE 
USING (auth.uid() = user_id);

-- Grant privileges to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logs TO authenticated;
```

---

## 🔄 Sync & Offline Logic Details

1.  **Saving Entries**: Form submissions are instantly written to the `logs` store in **IndexedDB** with `synced: false`.
2.  **Deleting Entries**: When an entry is deleted, it is removed from the local store, and its ID is logged in a separate `deletions` table inside IndexedDB to synchronize the deletion later.
3.  **Synchronization Flow**:
    *   The sync queue starts automatically on app mount, when the connection status returns to `online`, or via the manual refresh button.
    *   **Phase 1**: Pending deletions in the queue are sent to Supabase and cleared locally on success.
    *   **Phase 2**: Local unsynced entries are sent to Supabase and marked as `synced: true` locally on success.
    *   **Phase 3**: Remote records are pulled from Supabase. The local IndexedDB database is updated, ensuring unsynced records remain intact while deleted/updated remote logs match locally.
