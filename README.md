# Fragment — Real-Time Web Messenger

A fast, modern web messenger inspired by Discord, built with React 19, Tailwind CSS, WebRTC, and dual-mode real-time sync.

---

## ✨ Features

- **Real Accounts & Authentication**: Secure registration, login, and password hashing with Node's native `scrypt`.
- **Zero Dummy Bots**: Clean, user-driven platform with real accounts and persistent sessions.
- **Dual-Mode Real-Time Sync**:
  - **Vercel Serverless Mode**: High-speed reactive sync (1.5s interval) and REST endpoints (`/api/*`) for turnkey deployment on Vercel with zero server setup!
  - **Local/Dedicated Mode**: Sub-50ms instant WebSocket delivery via `Socket.io`.
- **Rich Chat Experience**:
  - Markdown formatting (`**bold**`, `*italics*`, `~~strike~~`, inline code, quote blocks).
  - Multi-language syntax highlighting code blocks with 1-click copy to clipboard.
  - Spoiler tags (`||hidden spoiler||`) that reveal on click.
  - Image and file attachments with instant preview.
  - Message reactions (👍, ❤️, 😂, 🎉, 🚀, 🔥), inline editing, and deletion.
  - Typing indicators.
- **Voice Channels**:
  - WebRTC voice channels with Voice Activity Detection (VAD).
  - Speaking rings, mute/deafen toggles, and audio visualizers.
- **Synthesized Sound Effects**:
  - High-fidelity UI chimes for messages, voice connect, disconnect, mute, and deafen generated directly in the browser with the Web Audio API (0 audio asset downloads needed).
- **Direct Messaging (DMs) & Friends List**:
  - One-on-one direct message threads.
  - Active presence status indicators (Online, Idle, Do Not Disturb, Invisible).

---

## 🚀 Deploying to Vercel (1-Click)

Fragment is pre-configured to deploy directly to Vercel out of the box:

1. **Push this repository to GitHub**:
   ```bash
   git add .
   git commit -m "Initial Fragment commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin master
   ```

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New" -> "Project"**.
   - Select your GitHub repository.
   - Leave the build settings as default (they are automatically read from `vercel.json`).
   - Click **Deploy**!

3. **Enjoy your live messenger**:
   - Vercel will build the frontend and deploy the serverless APIs in under 60 seconds.
   - Your site will be live at `https://your-project.vercel.app`!

### (Optional) Cloud Persistence with Vercel KV
By default, Fragment works out-of-the-box using serverless storage. For long-term multi-region persistent data:
- In your Vercel Project Dashboard, click **Storage** -> **Create Database** -> **KV**.
- Connect it to your project — Fragment will automatically detect `KV_REST_API_URL` and `KV_REST_API_TOKEN` and persist all users, channels, and messages across instances!

---

## 💻 Local Development

To run Fragment locally with full Socket.io WebSockets:

1. Double-click `start-fragment.bat` (on Windows), or run:
   ```bash
   # Install dependencies
   npm --prefix server install
   npm --prefix client install

   # Start both server and client
   npm run dev
   ```

2. Open your browser at `http://localhost:5173`.
3. Create an account and start chatting!

---

## 🛠️ Architecture

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Canvas Web Audio
- **Serverless Backend (`/api`)**: Vercel Serverless Functions (Node.js native `crypto`, `fs`, `path`)
- **Persistent Server (`/server`)**: Express.js + Socket.io (for local dev or standalone container hosting)
- **Configuration**: Root `vercel.json` with rewrites and build commands
