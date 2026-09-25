# FixFlow

> **Turn a bug report into a structured, validated fix plan — in your browser, no backend required.**

FixFlow is a static developer-productivity tool that walks you through a four-stage workflow (Reproduce → Diagnose → Fix Plan → Validate) and generates a PR-ready summary with root cause analysis, suggested file changes, acceptance criteria, and a test command.

---

## ✨ Features

| | |
|---|---|
| 📝 **Bug-report form** | Title, severity, description, environment |
| 🔍 **Instant analysis** | Keyword-driven template engine with realistic results |
| 🔄 **4-stage workflow** | Reproduce · Diagnose · Fix Plan · Validate Tests |
| 📋 **PR-ready summary** | Root cause, changed files, acceptance criteria, test command |
| 📌 **Copy to clipboard** | One-click copy of the full PR description |
| ⚡ **3 example presets** | Auth bug · Performance regression · UI glitch |
| 📱 **Responsive** | Works on desktop, tablet, and mobile |
| 🌙 **Dark theme** | Developer-dashboard aesthetic out of the box |

---

## 🚀 Run Locally

FixFlow is a **pure static site** — no build step, no dependencies, no Node.js required.

### Option 1 — Open directly in a browser

```bash
# Clone the repository
git clone https://github.com/<your-username>/fixflow.git
cd fixflow

# macOS / Linux
open index.html

# Windows (PowerShell)
Start-Process index.html
```

> **Note:** Clipboard copy (`navigator.clipboard`) requires either `localhost` or HTTPS.  
> If copy doesn't work when opening as a `file://` URL, use Option 2 below.

---

### Option 2 — Serve with a local HTTP server (recommended)

**Using Python (built-in):**

```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

Then visit <http://localhost:8080>.

---

**Using Node.js (`npx`):**

```bash
npx serve .
# or
npx http-server . -p 8080
```

---

**Using VS Code Live Server:**

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
2. Right-click `index.html` → **Open with Live Server**.

---

## 🌐 Deploy to GitHub Pages

1. **Push your code** to a GitHub repository.

2. Go to **Settings → Pages** in your repository.

3. Under *Build and deployment*, set:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` (or `master`) · **Folder:** `/ (root)`

4. Click **Save**. After ~60 seconds your site will be live at:

   ```
   https://<your-username>.github.io/<repo-name>/
   ```

> No `gh-pages` branch or GitHub Actions workflow needed — GitHub Pages serves static HTML/CSS/JS directly from the root.

---

## 📁 File Structure

```
fixflow/
├── index.html    # App shell, form, and workflow markup
├── styles.css    # Dark-theme developer-dashboard styles
├── app.js        # Workflow logic, template engine, DOM wiring
└── README.md     # This file
```

---

## 🧪 Demo Walkthrough (< 2 minutes)

1. Open the app.
2. Click one of the **example buttons** (e.g. "Auth bug") to pre-fill the form.
3. Click **Analyze Issue** — watch the 1.4 s simulated analysis.
4. Step through the four workflow stages using **Next →** or the stage tabs.
5. Click **View PR Summary ✓** on the final stage.
6. Click **Copy Summary** to grab the full PR description.

---

## 🛠 Customisation

All analysis templates live in `app.js` as plain functions (e.g. `authPlan`, `perfPlan`, `uiPlan`). To add a new template:

1. Add a detection condition in `generateStages()`.
2. Create a function returning `{ stages: [...], pr: {...} }` following the existing pattern.
3. No build step required — just save and refresh.

---

## 📄 License

MIT — free to use, modify, and distribute.
