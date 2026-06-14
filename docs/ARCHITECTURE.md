# SimpleBodyGraph Architecture & Database Flow Guide

This document explains the technical architecture, tech stack, and offline-first database sync flows in SimpleBodyGraph. Refer to this when editing database logic or synchronization processes.

## 1. Technology Stack

* **Frontend Framework:** Vue 3 (Composition API, `<script setup>`)
* **State Management:** Pinia (modular store in `src/stores/bodyGraph.js`)
* **Styling:** TailwindCSS v4
* **Charting:** Chart.js (with canvas gradients and custom plugins)
* **Local Database:** IndexedDB (via native wrappers in `src/db.js`)
* **Cloud Database & Auth:** Supabase (Remote backup and Auth, configured in `src/supabase.js`)

---

## 2. Offline-First Database Structure

The application prioritizes local IndexedDB storage, enabling full usability without internet connectivity.

### Local IndexedDB (`SimpleBodyGraphDB` - Version 2)
Located in `src/db.js`, the local database uses two object stores:
1. **`logs` (Active Logs Store):**
   * **KeyPath:** `id` (UUID)
   * **Indexes:**
     * `user_id` (used to isolate guest logs from authenticated user logs)
     * `date` (used to query and sort logs descending)
     * `synced` (boolean index to retrieve offline modifications)
   * **Attributes:** `id`, `date`, `mass` (numeric), `body_fat` (numeric), `is_sick` (boolean), `synced` (boolean), `user_id` (string).
2. **`deletions` (Offline Deletion Queue):**
   * **KeyPath:** `id` (log ID)
   * **Attributes:** `id` (log ID to delete remotely), `user_id`.

### Remote Cloud Database (Supabase)
Located on Supabase as the `public.logs` table.
* **Columns:** `id` (UUID, primary key), `date` (DATE), `mass` (NUMERIC), `body_fat` (NUMERIC), `is_sick` (BOOLEAN), `user_id` (UUID), `created_at` (TIMESTAMPTZ).
* **Row Level Security (RLS):** Enabled on `public.logs` so users can only read, write, and delete their own rows using `auth.uid() = user_id`.

---

## 3. Synchronization Mechanism (`src/db.js` -> `syncLogs`)

Synchronization occurs in the background when the app detects an active network connection and the user is authenticated. 

```
[ IndexedDB ]                                         [ Supabase ]
      |                                                     |
      |-- 1. Read pending deletions ---------------------->| (Delete remote rows)
      |-- 2. Clear local deletions queue                    |
      |                                                     |
      |-- 3. Read unsynced logs (synced: false) ----------->| (Upsert remote rows)
      |-- 4. Mark local logs as synced: true                |
      |                                                     |
      |<-- 5. Fetch all remote rows ------------------------| (Pull down remote state)
      |-- 6. Write remote rows to logs store                |
      |-- 7. Remove local logs missing from remote          |
```

### Steps inside `syncLogs(userId)`:
1. **Push Deletions:** Queries `deletions` store. If deleted logs exist, deletes those IDs from Supabase in a single query. Once successful, clears those entries from the local `deletions` queue.
2. **Push Local Updates:** Queries all local logs with `synced === false`. Maps them to the Supabase schema and performs an `.upsert()` call. Once successful, updates local logs to `synced: true`.
3. **Pull Remote State:** Fetches the entire list of remote logs for the authenticated `userId`. 
   * Local logs are compared with remote logs. Remote records are written/overwritten to local IndexedDB (unless they are currently in the local unsynced list to avoid overwriting newer local edits).
   * Synced local logs that are missing from the remote payload (indicating they were deleted on another client) are deleted from the local IndexedDB.

---

## 4. Initialization & State Management

When the application mounts (`src/App.vue`), it calls `store.initAuth()` inside `src/stores/bodyGraph.js`:

1. **Loads target goals** (`targetMass` and `targetFat`) from `localStorage` (guest mode) or Supabase user metadata (authenticated mode).
2. **Checks current auth session** and sets up the Supabase auth listener.
3. **Loads local logs** from IndexedDB.
4. **Triggers background synchronization** if online and authenticated.
5. **Registers online/offline listeners** on the window to call `store.setOnlineStatus(status)`, executing sync automatically once internet recovers.
