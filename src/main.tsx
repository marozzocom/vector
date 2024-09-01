import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./canvas";

const root = document.getElementById("root");

if (!root) {
	throw new Error("No root element");
}

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
