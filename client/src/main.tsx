import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('Root element "#root" not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
