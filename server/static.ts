import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";

/**
 * Production static + SPA fallback.
 *
 * Why /sitemap.xml was not real XML (and can look like a 500 in Search Console):
 *   client/public/ currently has only favicon.svg. Vite copies that dir to dist/public.
 *   express.static therefore cannot find /sitemap.xml, /robots.txt, or /og-image.png.
 *   The catch-all then sendFile()s index.html with Content-Type: text/html.
 *   Live check 2026-08-31: GET /sitemap.xml → 200 text/html (the SPA), NOT application/xml.
 *   There is no sitemap route in server/routes.ts. Google/Bing treat an HTML "sitemap"
 *   as a fetch error; some auditors report that as HTTP 500 even though Express returned 200.
 *
 * Fix:
 *   1. Put robots.txt, sitemap.xml, og-image.png in client/public/ so Vite emits them
 *      into dist/public and express.static can serve them with the right MIME type
 *      BEFORE the SPA fallback.
 *   2. Explicit GET handlers below as belt-and-suspenders (correct Content-Type).
 *   3. Do NOT SPA-fallback dotted file paths (.xml/.txt/.png/…). Missing ones should
 *      404, not return HTML. /privacy and /terms have no file extension, so they still
 *      receive index.html and the React (wouter) routes render the pages.
 *
 * Also set vite.config.ts `base: "/"` (not "./"). Relative base breaks JS/CSS on /privacy.
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const sendPublic = (filename: string, contentType: string) => {
    return (_req: Request, res: Response, next: NextFunction) => {
      const filePath = path.resolve(distPath, filename);
      if (!fs.existsSync(filePath)) return next();
      res.setHeader("Content-Type", contentType);
      res.sendFile(filePath);
    };
  };

  // Real files — must be registered before the SPA catch-all.
  app.get("/robots.txt", sendPublic("robots.txt", "text/plain; charset=utf-8"));
  app.get("/sitemap.xml", sendPublic("sitemap.xml", "application/xml; charset=utf-8"));
  app.get("/og-image.png", sendPublic("og-image.png", "image/png"));

  app.use(express.static(distPath, { index: false, fallthrough: true }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    // Never serve the SPA HTML for crawler/static-looking paths.
    if (/\.[a-zA-Z0-9]{2,8}$/.test(req.path) && !req.path.endsWith(".html")) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }

    // /privacy, /terms, /parallel, / → React.
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
