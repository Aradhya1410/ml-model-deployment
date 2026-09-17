/* =========================================================
   ML Model Deployment & Monitoring Pipeline — Dashboard logic
   Talks to the REAL FastAPI backend. No mocked data.
========================================================= */

const API_BASE_URL = "http://127.0.0.1:8001";

const CONNECTION_ERROR_MESSAGE =
  "Unable to connect to FastAPI backend. Please make sure the backend is running on port 8001.";


/* =========================================================
   Navigation
========================================================= */

const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const target = item.dataset.view;

    navItems.forEach((n) => {
      n.classList.toggle("is-active", n === item);
    });

    views.forEach((v) => {
      v.classList.toggle("is-active", v.id === `view-${target}`);
    });

    if (target === "health") {
      refreshHealth();
    }

    if (target === "metrics") {
      refreshMetrics();
    }

    if (target === "dashboard") {
      refreshDashboard();
    }
  });
});


/* =========================================================
   Helpers
========================================================= */

async function fetchJSON(path, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const started = performance.now();

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const elapsed = Math.round(performance.now() - started);

    let body = null;

    const text = await res.text();

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!res.ok) {
      const detail =
        body &&
          typeof body === "object" &&
          body.detail
          ? JSON.stringify(body.detail)
          : `HTTP ${res.status} ${res.statusText}`;

      throw new ApiError(detail, elapsed);
    }

    return {
      data: body,
      elapsed
    };

  } catch (err) {

    if (err instanceof ApiError) {
      throw err;
    }

    if (err.name === "AbortError") {
      throw new ApiError(
        "Request timed out while contacting the backend.",
        null,
        true
      );
    }

    throw new ApiError(
      CONNECTION_ERROR_MESSAGE,
      null,
      true
    );

  } finally {
    clearTimeout(timer);
  }
}


class ApiError extends Error {

  constructor(
    message,
    elapsed = null,
    isConnectionError = false
  ) {
    super(message);

    this.elapsed = elapsed;
    this.isConnectionError = isConnectionError;
  }
}


/* =========================================================
   Sidebar Backend Status
========================================================= */

function setSidebarStatus(online) {

  const dot = document.getElementById("sidebarStatusDot");
  const text = document.getElementById("sidebarStatusText");

  if (!dot || !text) {
    return;
  }

  dot.className =
    "status-dot " +
    (online
      ? "status-online pulse"
      : "status-offline");

  text.textContent =
    online
      ? "Backend online"
      : "Backend offline";
}


/* =========================================================
   Connection Banner
========================================================= */

function setConnectionBanner(visible, message = CONNECTION_ERROR_MESSAGE) {

  const banner = document.getElementById("dashBanner");

  if (!banner) {
    return;
  }

  if (visible) {

    banner.hidden = false;

    /*
      Explicit display control is used because some CSS
      rules can override the browser's default [hidden]
      behavior.
    */
    banner.style.display = "block";

    banner.textContent = "";

    const title = document.createElement("div");
    title.textContent = "Unable to connect to FastAPI backend.";
    title.style.fontWeight = "700";
    title.style.marginBottom = "4px";

    const description = document.createElement("div");
    description.textContent = message;

    banner.appendChild(title);
    banner.appendChild(description);

  } else {

    banner.hidden = true;

    /*
      Force the error banner to disappear when backend
      connection is successful.
    */
    banner.style.display = "none";
  }
}


/* =========================================================
   Dashboard
========================================================= */

async function refreshDashboard() {

  const modelDot = document.getElementById("dashModelDot");
  const modelValue = document.getElementById("dashModelValue");

  const apiDot = document.getElementById("dashApiDot");
  const apiValue = document.getElementById("dashApiValue");
  const apiFoot = document.getElementById("dashApiFoot");

  try {

    const {
      data,
      elapsed
    } = await fetchJSON("/health");

    const status =
      data && data.status
        ? data.status
        : "ok";


    /* API ONLINE */

    apiDot.className =
      "status-dot status-online pulse";

    apiValue.textContent = "Online";

    apiFoot.textContent =
      `GET /health · ${elapsed}ms`;


    /* MODEL READY */

    modelDot.className =
      "status-dot status-online pulse";

    modelValue.textContent =
      "Ready";


    /* REMOVE ERROR BANNER */

    setConnectionBanner(false);

    /* SIDEBAR ONLINE */

    setSidebarStatus(true);

  } catch (err) {

    /* API OFFLINE */

    apiDot.className =
      "status-dot status-offline";

    apiValue.textContent =
      "Offline";

    apiFoot.textContent =
      "GET /health";


    /* MODEL UNAVAILABLE */

    modelDot.className =
      "status-dot status-offline";

    modelValue.textContent =
      "Unavailable";


    /* SHOW ERROR */

    setConnectionBanner(
      true,
      err.message || CONNECTION_ERROR_MESSAGE
    );


    /* SIDEBAR OFFLINE */

    setSidebarStatus(false);
  }
}


/* =========================================================
   Prediction
========================================================= */

const predictForm =
  document.getElementById("predictForm");

const predictBtn =
  document.getElementById("predictBtn");

const predictBtnLabel =
  document.getElementById("predictBtnLabel");

const predictError =
  document.getElementById("predictError");

const resultEmpty =
  document.getElementById("resultEmpty");

const resultContent =
  document.getElementById("resultContent");


if (predictForm) {

  predictForm.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      predictError.hidden = true;
      predictError.style.display = "none";


      const fields = [
        "sepal_length",
        "sepal_width",
        "petal_length",
        "petal_width"
      ];


      const payload = {};


      /* VALIDATE INPUT */

      for (const field of fields) {

        const input =
          document.getElementById(field);

        const value =
          parseFloat(input.value);


        if (
          input.value === "" ||
          Number.isNaN(value)
        ) {

          predictError.hidden = false;
          predictError.style.display = "block";

          predictError.textContent =
            `Please enter a valid number for ${field.replace(
              "_",
              " "
            )}.`;

          return;
        }


        payload[field] = value;
      }


      /* BUTTON LOADING */

      predictBtn.disabled = true;

      predictBtnLabel.textContent =
        "Predicting…";


      try {

        const {
          data,
          elapsed
        } = await fetchJSON(
          "/predict",
          {
            method: "POST",
            body: JSON.stringify(payload)
          }
        );


        /* CHECK RESPONSE */

        if (
          !data ||
          typeof data.predicted_class === "undefined"
        ) {

          throw new ApiError(
            "Backend returned an unexpected response format."
          );
        }


        /* SHOW RESULT */

        resultEmpty.hidden = true;
        resultEmpty.style.display = "none";

        resultContent.hidden = false;
        resultContent.style.display = "";


        document.getElementById(
          "resultSpecies"
        ).textContent =
          data.predicted_class;


        const confidence =
          typeof data.confidence === "number"
            ? data.confidence
            : 0;


        const pct =
          Math.round(confidence * 100);


        document.getElementById(
          "resultConfidenceText"
        ).textContent =
          `${pct}%`;


        document.getElementById(
          "resultConfidenceFill"
        ).style.width =
          `${pct}%`;


        document.getElementById(
          "resultLatency"
        ).textContent =
          `${elapsed}ms`;


        document.getElementById(
          "resultRaw"
        ).textContent =
          JSON.stringify(
            data,
            null,
            2
          );


      } catch (err) {

        predictError.hidden = false;
        predictError.style.display = "block";

        predictError.textContent =
          err.message ||
          CONNECTION_ERROR_MESSAGE;

      } finally {

        predictBtn.disabled = false;

        predictBtnLabel.textContent =
          "Predict Species";
      }
    }
  );
}


/* =========================================================
   System Health
========================================================= */

async function refreshHealth() {

  const dot =
    document.getElementById("healthDot");

  const text =
    document.getElementById("healthText");

  const lastChecked =
    document.getElementById("healthLastChecked");

  const latency =
    document.getElementById("healthLatency");

  const raw =
    document.getElementById("healthRaw");

  const errorBox =
    document.getElementById("healthError");


  dot.className =
    "status-dot status-unknown status-dot-lg";

  text.textContent =
    "Checking…";

  errorBox.hidden = true;
  errorBox.style.display = "none";


  try {

    const {
      data,
      elapsed
    } = await fetchJSON("/health");


    dot.className =
      "status-dot status-online status-dot-lg pulse";

    text.textContent =
      "● API Online";


    lastChecked.textContent =
      new Date().toLocaleTimeString();


    latency.textContent =
      `${elapsed}ms`;


    raw.textContent =
      JSON.stringify(
        data,
        null,
        2
      );


    setSidebarStatus(true);

  } catch (err) {

    dot.className =
      "status-dot status-offline status-dot-lg";

    text.textContent =
      "● API Offline";


    lastChecked.textContent =
      new Date().toLocaleTimeString();


    latency.textContent =
      "—";


    raw.textContent =
      "";


    errorBox.hidden = false;
    errorBox.style.display = "block";


    errorBox.textContent =
      err.message ||
      CONNECTION_ERROR_MESSAGE;


    setSidebarStatus(false);
  }
}


/* =========================================================
   Health Refresh Button
========================================================= */

const healthRefreshBtn =
  document.getElementById(
    "healthRefreshBtn"
  );


if (healthRefreshBtn) {

  healthRefreshBtn.addEventListener(
    "click",
    refreshHealth
  );
}


/* =========================================================
   Prometheus Metrics Parser
========================================================= */

function parsePrometheusText(text) {

  const lines =
    text.split("\n");

  const metrics = [];


  for (const line of lines) {

    if (
      !line ||
      line.startsWith("#")
    ) {
      continue;
    }


    const match =
      line.match(
        /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([^\s]+)\s*$/
      );


    if (!match) {
      continue;
    }


    const [
      ,
      name,
      labels,
      value
    ] = match;


    metrics.push({
      name,
      labels: labels || "",
      value
    });
  }


  return metrics;
}


/* =========================================================
   Metrics Summary
========================================================= */

function pickSummary(metrics) {

  const wanted = [

    {
      key: "http_requests_total",
      label: "Total HTTP Requests"
    },

    {
      key: "http_request_duration_seconds_count",
      label: "Request Duration Samples"
    },

    {
      key: "process_start_time_seconds",
      label: "Process Start Time"
    }

  ];


  const cards = [];


  for (const w of wanted) {

    const matches =
      metrics.filter(
        (m) => m.name === w.key
      );


    if (matches.length === 0) {
      continue;
    }


    let display;


    if (matches.length === 1) {

      display =
        matches[0].value;

    } else {

      const sum =
        matches.reduce(
          (acc, m) =>
            acc +
            (parseFloat(m.value) || 0),
          0
        );


      display =
        sum.toString();
    }


    cards.push({
      label: w.label,
      value: display
    });
  }


  return cards;
}


/* =========================================================
   API Metrics
========================================================= */

async function refreshMetrics() {

  const summaryEl =
    document.getElementById(
      "metricsSummary"
    );

  const tableBody =
    document.getElementById(
      "metricsTableBody"
    );

  const rawEl =
    document.getElementById(
      "metricsRaw"
    );

  const errorBox =
    document.getElementById(
      "metricsError"
    );


  errorBox.hidden = true;
  errorBox.style.display = "none";


  summaryEl.innerHTML =
    `<div class="metric-mini">
      <span class="stat-label">Loading…</span>
    </div>`;


  tableBody.innerHTML = "";

  rawEl.textContent = "";


  try {

    const {
      data
    } = await fetchJSON(
      "/metrics"
    );


    const text =
      typeof data === "string"
        ? data
        : JSON.stringify(data);


    const metrics =
      parsePrometheusText(text);


    rawEl.textContent =
      text;


    const summaryCards =
      pickSummary(metrics);


    summaryEl.innerHTML =
      summaryCards.length

        ? summaryCards
          .map(
            (c) => `
                <div class="metric-mini">
                  <span class="stat-label">
                    ${escapeHtml(c.label)}
                  </span>

                  <span class="stat-value">
                    ${escapeHtml(c.value)}
                  </span>
                </div>
              `
          )
          .join("")

        : `
          <div class="metric-mini">
            <span class="stat-label">
              No summary metrics found
            </span>

            <span class="stat-value">
              —
            </span>
          </div>
        `;


    /* NO METRICS */

    if (metrics.length === 0) {

      tableBody.innerHTML =
        `<tr>
          <td colspan="3">
            No parsable metrics found.
            See raw output below.
          </td>
        </tr>`;

    } else {

      /* SHOW MAX 60 ROWS */

      const rows =
        metrics.slice(0, 60);


      tableBody.innerHTML =
        rows
          .map(
            (m) => `
              <tr>
                <td>
                  ${escapeHtml(m.name)}
                </td>

                <td>
                  ${escapeHtml(
              m.labels || "—"
            )}
                </td>

                <td>
                  ${escapeHtml(m.value)}
                </td>
              </tr>
            `
          )
          .join("");
    }


    setSidebarStatus(true);

  } catch (err) {

    summaryEl.innerHTML = "";

    tableBody.innerHTML = "";


    errorBox.hidden = false;
    errorBox.style.display = "block";


    errorBox.textContent =
      err.message ||
      CONNECTION_ERROR_MESSAGE;


    setSidebarStatus(false);
  }
}


/* =========================================================
   Metrics Refresh Button
========================================================= */

const metricsRefreshBtn =
  document.getElementById(
    "metricsRefreshBtn"
  );


if (metricsRefreshBtn) {

  metricsRefreshBtn.addEventListener(
    "click",
    refreshMetrics
  );
}


/* =========================================================
   HTML Escape
========================================================= */

function escapeHtml(str) {

  return String(str)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    );
}


/* =========================================================
   Global Refresh
========================================================= */

const globalRefreshBtn =
  document.getElementById(
    "globalRefreshBtn"
  );


if (globalRefreshBtn) {

  globalRefreshBtn.addEventListener(
    "click",
    () => {

      refreshDashboard();


      const activeView =
        document.querySelector(
          ".view.is-active"
        );


      if (!activeView) {
        return;
      }


      if (
        activeView.id ===
        "view-health"
      ) {
        refreshHealth();
      }


      if (
        activeView.id ===
        "view-metrics"
      ) {
        refreshMetrics();
      }
    }
  );
}


/* =========================================================
   Initial Dashboard Load
========================================================= */

refreshDashboard();