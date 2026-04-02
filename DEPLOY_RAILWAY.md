# Mean Cuisines — Deploy to Railway

This gets your site off Replit and onto Railway where you pay ~$5/month instead.

---

## 1. Push code to GitHub

```bash
# From the mean-cuisines/ folder
git init
git add .
git commit -m "initial commit"
```

Then create a new repo at https://github.com/new (name it `mean-cuisines`)
and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/mean-cuisines.git
git push -u origin main
```

---

## 2. Create a Railway project

1. Go to https://railway.app and sign up (free)
2. Click **New Project → Deploy from GitHub repo**
3. Select your `mean-cuisines` repo
4. Railway auto-detects Node.js — click **Deploy**

---

## 3. Set environment variables in Railway

In your project dashboard → **Variables**, add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |

Railway auto-injects `PORT` but set it explicitly to match the app.

---

## 4. Set the start command

In Railway → **Settings → Deploy → Start Command**:

```
node dist/index.cjs
```

And set the **Build Command**:

```
npm install && npm run build
```

---

## 5. Connect your domain (meancuisines.com)

1. In Railway → **Settings → Networking → Custom Domain**
2. Enter `meancuisines.com` and `www.meancuisines.com`
3. Railway gives you a CNAME value — add it to your DNS:

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | `your-app.railway.app` |
| CNAME | `@` (or A record) | per Railway instructions |

DNS changes take 10–30 min to propagate.

---

## 6. Turn on AdSense

Once the site is live on `meancuisines.com`:

1. Apply at https://adsense.google.com
2. After approval, get your **publisher ID** (looks like `ca-pub-1234567890123456`)
3. In `client/index.html`, uncomment the AdSense script and replace `ca-pub-XXXXXXXXXXXXXXXX`
4. In `client/src/pages/HomePage.tsx`, uncomment the `<ins>` blocks in each `AdSlot` component
5. Rebuild and push — Railway auto-deploys

---

## 7. Set your Amazon affiliate tag

1. Sign up at https://affiliate-program.amazon.com
2. Get your **tracking ID** (e.g. `yourname-20`)
3. In `client/src/pages/HomePage.tsx`, update line:
   ```ts
   const AMAZON_AFFILIATE_TAG = "meancuisines-20";
   ```
   Replace `meancuisines-20` with your actual tag
4. Rebuild and push

---

## Monthly costs after switching

| Service | Before (Replit) | After (Railway) |
|---|---|---|
| Hosting | ~$25/mo | ~$5/mo |
| Domain | same | same |
| Database | included | included (SQLite on Railway) |

**Savings: ~$20/month**

---

## Revenue potential

- **AdSense**: $1–5 RPM (per 1,000 views) — 10k monthly visitors = $10–50/mo to start
- **Amazon Affiliates**: 1–4% commission — one $50 grocery order = $0.50–$2 per referral
- Both grow with traffic. Focus on SEO and getting indexed first.
