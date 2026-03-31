import React from "react";
import ReactDOM from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import * as serviceworker from "./serviceWorker";

import App from "./App";
console.log(`index`);
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
