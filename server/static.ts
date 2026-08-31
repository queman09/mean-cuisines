import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";

/**
 * Production static + SPA fallback.
 *
 * Real files (robots, sitemap, og-image, llms.txt, markdown, openapi) live in
 * client/public and are copied to dist/public by Vite. Explicit GET handlers set
 * the right Content-Type. Dotted paths that are missing 404 as text/plain instead
 * of returning the SPA HTML.
 *
 * /privacy and /terms have no file extension, so they still receive index.html
 * and the React (wouter) routes render the pages.
 *
 * vite.config.ts must keep `base: "/"` (not "."). Relative base breaks JS/CSS on /privacy.
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
  app.get("/llms.txt", sendPublic("llms.txt", "text/markdown; charset=utf-8"));
  app.get("/llms-full.txt", sendPublic("llms-full.txt", "text/markdown; charset=utf-8"));
  app.get("/openapi.json", sendPublic("openapi.json", "application/json; charset=utf-8"));
  app.get("/index.md", sendPublic("index.md", "text/markdown; charset=utf-8"));
  app.get("/privacy.md", sendPublic("privacy.md", "text/markdown; charset=utf-8"));
  app.get("/terms.md", sendPublic("terms.md", "text/markdown; charset=utf-8"));

  app.use(express.static(distPath, { index: false, fallthrough: true }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    // Never serve the SPA HTML for crawler/static-looking paths.
    if (/\.[a-zA-Z0-9]{2,8}$/.test(req.path) && !req.path.endsWith(".html")) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }

    const p = req.path.replace(/\/$/, "") || "/";
    const links = ['</llms.txt>; rel="describedby"'];
    if (p === "/privacy") {
      links.push('</privacy.md>; rel="alternate"; type="text/markdown"');
    } else if (p === "/terms") {
      links.push('</terms.md>; rel="alternate"; type="text/markdown"');
    } else {
      links.push('</index.md>; rel="alternate"; type="text/markdown"');
    }
    res.setHeader("Link", links.join(", "));
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
