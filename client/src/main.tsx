import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
