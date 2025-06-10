import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./example";

import { setupMsw } from "./msw";
import { Theme } from "./theme";

import "@fontsource/inter/index.css";

const container = document.createElement("div");
container.setAttribute("class", "my-app");
document.body.appendChild(container);

async function init() {
  await setupMsw();
  createRoot(container).render(
    <StrictMode>
      <Theme>
        <App />
      </Theme>
    </StrictMode>,
  );
}

init();
