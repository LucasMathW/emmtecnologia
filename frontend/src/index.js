import React from "react";
import ReactDOM from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import * as serviceworker from "./serviceWorker";

import App from "./App";
window.addEventListener(
  "error",
  (e) => {
    if (
      e.message ===
      "ResizeObserver loop completed with undelivered notifications."
    ) {
      const resizeObserverErrDiv = document.getElementById(
        "webpack-dev-server-client-overlay",
      );
      if (resizeObserverErrDiv) resizeObserverErrDiv.style.display = "none";

      const resizeObserverErrDivBox = document.getElementById(
        "webpack-dev-server-client-overlay-div",
      );
      if (resizeObserverErrDivBox)
        resizeObserverErrDivBox.style.display = "none";

      e.stopImmediatePropagation();
      e.preventDefault();
    }
  },
  true,
);

ReactDOM.render(
  <CssBaseline>
    <App />
  </CssBaseline>,
  document.getElementById("root"),
  () => {
    window.finishProgress();
  },
);

serviceworker.register();
