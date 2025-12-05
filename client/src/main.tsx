import { createRoot } from "react-dom/client";
import App from "./App";
import "./fonts.css";
import "./index.css";
import { initWebVitals, measurePageLoad } from "./lib/analytics";

initWebVitals();
measurePageLoad();

createRoot(document.getElementById("root")!).render(<App />);
