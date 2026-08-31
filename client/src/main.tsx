import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Legacy hash URLs from the old useHashLocation setup (#/parallel) → path URLs.
if (window.location.hash && window.location.hash.startsWith("#/")) {
  const path = window.location.hash.slice(1) || "/";
  window.history.replaceState(null, "", path + window.location.search);
}

createRoot(document.getElementById("root")!).render(<App />);
