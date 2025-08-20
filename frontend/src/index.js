import React from "react";
import { createRoot } from "react-dom/client"; // Import createRoot
import App from "./App";
import "./index.css";

// Create a root and render the app
const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);