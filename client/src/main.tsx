import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { SolanaProvider } from "./context/SolanaContext";

createRoot(document.getElementById("root")!).render(
  <SolanaProvider>
    <App />
  </SolanaProvider>
);
