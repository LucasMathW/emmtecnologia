import React, { useState, useEffect, useMemo } from "react";
import api, { openApi } from "./services/api";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "react-query";
import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { useMediaQuery } from "@material-ui/core";
import ColorModeContext from "./layout/themeContext";
import { ActiveMenuProvider } from "./context/ActiveMenuContext";
import Favicon from "react-favicon";
import { getBackendUrl } from "./config";
import Routes from "./routes";
import defaultLogoLight from "./assets/logo.png";
import defaultLogoDark from "./assets/logo-black.png";
import defaultLogoFavicon from "./assets/favicon.ico";
import useSettings from "./hooks/useSettings";
import "./styles/animations.css";

const queryClient = new QueryClient();

const App = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const preferredTheme = window.localStorage.getItem("preferredTheme");

  const resolveCompanyId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCompanyId = urlParams.get("companyId");

    if (urlCompanyId) {
      return parseInt(urlCompanyId, 10);
    }

    const storedCompanyId = localStorage.getItem("companyId");
    if (storedCompanyId) {
      return parseInt(storedCompanyId, 10);
    }

    return null;
  };

  const sanitizeColor = (value, fallback = "#065183") => {
    const cleaned = String(value ?? fallback)
      .trim()
      .replace(/[`"' ]/g, "");

    const validHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(
      cleaned,
    );

    return validHex ? cleaned : fallback;
  };

  const readCachedSetting = (key, fallback = "") => {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return raw;
    }
  };

  const currentCompanyId = resolveCompanyId();

  const appNameLocalStorage = readCachedSetting(
    `setting_${currentCompanyId || "global"}_appName`,
    "",
  );

  const [mode, setMode] = useState(
    preferredTheme ? preferredTheme : prefersDarkMode ? "dark" : "light",
  );

  const [primaryColorLight, setPrimaryColorLight] = useState("#065183");
  const [primaryColorDark, setPrimaryColorDark] = useState("#065183");
  const [appLogoLight, setAppLogoLight] = useState(defaultLogoLight);
  const [appLogoDark, setAppLogoDark] = useState(defaultLogoDark);
  const [appLogoFavicon, setAppLogoFavicon] = useState(defaultLogoFavicon);
  const [appName, setAppName] = useState("");

  const { getPublicSetting } = useSettings();

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          window.localStorage.setItem("preferredTheme", newMode);
          return newMode;
        });
      },
      setPrimaryColorLight,
      setPrimaryColorDark,
      setAppLogoLight,
      setAppLogoDark,
      setAppLogoFavicon,
      setAppName,
      appLogoLight,
      appLogoDark,
      appLogoFavicon,
      appName,
      mode,
    }),
    [appLogoLight, appLogoDark, appLogoFavicon, appName, mode],
  );

  const theme = useMemo(
    () =>
      createTheme({
        scrollbarStyles: {
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
            backgroundColor:
              mode === "light" ? primaryColorLight : primaryColorDark,
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: mode === "light" ? "#f5f5f5" : "#2a2a2a",
            borderRadius: "4px",
          },
        },
        scrollbarStylesSoft: {
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: mode === "light" ? "#E0E0E0" : "#404040",
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: mode === "light" ? "#BDBDBD" : "#505050",
            },
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
        },
        palette: {
          type: mode,
          primary: {
            main: mode === "light" ? primaryColorLight : primaryColorDark,
            light:
              mode === "light"
                ? `${primaryColorLight}80`
                : `${primaryColorDark}80`,
            dark:
              mode === "light"
                ? `${primaryColorLight}CC`
                : `${primaryColorDark}CC`,
            contrastText: "#ffffff",
          },
          textPrimary: mode === "light" ? primaryColorLight : primaryColorDark,
          borderPrimary:
            mode === "light" ? primaryColorLight : primaryColorDark,
          dark: {
            main: mode === "light" ? "#333333" : "#F3F3F3",
          },
          light: {
            main: mode === "light" ? "#F3F3F3" : "#333333",
          },
          fontColor: mode === "light" ? primaryColorLight : primaryColorDark,
          tabHeaderBackground: mode === "light" ? "#EEE" : "#666",
          optionsBackground: mode === "light" ? "#fafafa" : "#333",
          fancyBackground: mode === "light" ? "#fafafa" : "#333",
          total: mode === "light" ? "#fff" : "#222",
          messageIcons: mode === "light" ? "grey" : "#F3F3F3",
          inputBackground: mode === "light" ? "#FFFFFF" : "#333",
          barraSuperior: mode === "light" ? primaryColorLight : "#666",
        },
        typography: {
          fontFamily: [
            "Inter",
            "Roboto",
            "-apple-system",
            "BlinkMacSystemFont",
            '"Segoe UI"',
            '"Helvetica Neue"',
            "Arial",
            "sans-serif",
          ].join(","),
          h1: {
            fontWeight: 700,
            letterSpacing: "-0.025em",
          },
          h2: {
            fontWeight: 700,
            letterSpacing: "-0.025em",
          },
          h3: {
            fontWeight: 600,
            letterSpacing: "-0.025em",
          },
          h4: {
            fontWeight: 600,
            letterSpacing: "-0.025em",
          },
          h5: {
            fontWeight: 600,
            letterSpacing: "-0.025em",
          },
          h6: {
            fontWeight: 600,
            letterSpacing: "-0.025em",
          },
          button: {
            fontWeight: 600,
            textTransform: "none",
            letterSpacing: "0.025em",
          },
        },
        shape: {
          borderRadius: 8,
        },
        overrides: {
          MuiButton: {
            root: {
              borderRadius: 8,
              textTransform: "none",
              fontWeight: 600,
              letterSpacing: "0.025em",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
            },
            contained: {
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              "&:hover": {
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
              },
            },
          },
          MuiContainer: {
            root: {
              paddingLeft: "0 !important",
              paddingRight: "0 !important",
              maxWidth: "none !important",
              width: "100% !important",
            },
            maxWidthLg: {
              maxWidth: "none !important",
            },
            maxWidthMd: {
              maxWidth: "none !important",
            },
            maxWidthSm: {
              maxWidth: "none !important",
            },
            maxWidthXl: {
              maxWidth: "none !important",
            },
            maxWidthXs: {
              maxWidth: "none !important",
            },
          },
          MuiPaper: {
            root: {
              backgroundImage: "none",
              marginLeft: 0,
              marginRight: 0,
              width: "100%",
            },
            rounded: {
              borderRadius: 12,
            },
            elevation1: {
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            },
            elevation2: {
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            },
            elevation3: {
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            },
          },
          MuiMenu: {
            paper: {
              width: "auto !important",
              maxWidth: "300px !important",
              minWidth: "180px !important",
            },
          },
          MuiPopover: {
            paper: {
              width: "auto !important",
              maxWidth: "300px !important",
              minWidth: "auto !important",
            },
          },
          MuiTextField: {
            root: {
              "& .MuiOutlinedInput-root": {
                borderRadius: 8,
                transition: "all 0.3s ease",
                "&:hover": {
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: mode === "light" ? "#ccc" : "#555",
                  },
                },
                "&.Mui-focused": {
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      mode === "light" ? primaryColorLight : primaryColorDark,
                    borderWidth: 2,
                  },
                },
              },
            },
          },
          MuiTab: {
            root: {
              textTransform: "none",
              fontWeight: 600,
              letterSpacing: "0.025em",
              borderRadius: "8px 8px 0 0",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor:
                  mode === "light"
                    ? `${primaryColorLight}08`
                    : `${primaryColorDark}08`,
              },
              "&.Mui-selected": {
                color: mode === "light" ? primaryColorLight : primaryColorDark,
              },
            },
          },
          MuiDrawer: {
            paper: {
              border: "none",
            },
          },
          MuiAppBar: {
            root: {
              boxShadow: "none",
            },
          },
        },
        mode,
        appLogoLight,
        appLogoDark,
        appLogoFavicon,
        appName,
        calculatedLogoDark: () => {
          if (
            appLogoDark === defaultLogoDark &&
            appLogoLight !== defaultLogoLight
          ) {
            return appLogoLight;
          }
          return appLogoDark;
        },
        calculatedLogoLight: () => {
          if (
            appLogoDark !== defaultLogoDark &&
            appLogoLight === defaultLogoLight
          ) {
            return appLogoDark;
          }
          return appLogoLight;
        },
      }),
    [
      appLogoLight,
      appLogoDark,
      appLogoFavicon,
      appName,
      mode,
      primaryColorDark,
      primaryColorLight,
    ],
  );

  useEffect(() => {
    window.localStorage.setItem("preferredTheme", mode);
  }, [mode]);

  useEffect(() => {
    const init = async () => {
      let companyId = null;

      if (process.env.REACT_APP_ENV === "production") {
        console.log(`cai aqui`);
        // Em produção: tenta cache, senão pergunta ao backend pelo domínio
        const cached = localStorage.getItem("companyId");
        if (cached) {
          companyId = parseInt(cached, 10);
        } else {
          try {
            const { data } = await openApi.get("/resolve-company");
            companyId = data.companyId;
            localStorage.setItem("companyId", String(companyId));
          } catch (e) {
            console.error("Não foi possível resolver empresa pelo domínio", e);
          }
        }
      } else {
        // Em dev: pega da URL ou localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const urlCompanyId = urlParams.get("companyId");
        if (urlCompanyId) {
          companyId = parseInt(urlCompanyId, 10);
          localStorage.setItem("companyId", String(companyId));
        } else {
          const stored = localStorage.getItem("companyId");
          if (stored) companyId = parseInt(stored, 10);
        }
      }

      if (!companyId) return;

      // Busca todas as settings com o companyId já resolvido
      getPublicSetting("primaryColorLight", companyId)
        .then((color) => setPrimaryColorLight(sanitizeColor(color, "#25142D")))
        .catch(() => setPrimaryColorLight("#25142D"));

      getPublicSetting("primaryColorDark", companyId)
        .then((color) => setPrimaryColorDark(sanitizeColor(color, "#25142D")))
        .catch(() => setPrimaryColorDark("#25142D"));

      getPublicSetting("appLogoLight", companyId)
        .then((file) =>
          setAppLogoLight(
            file ? getBackendUrl() + "/public/" + file : defaultLogoLight,
          ),
        )
        .catch(() => {});

      getPublicSetting("appLogoDark", companyId)
        .then((file) =>
          setAppLogoDark(
            file ? getBackendUrl() + "/public/" + file : defaultLogoDark,
          ),
        )
        .catch(() => {});

      getPublicSetting("appLogoFavicon", companyId)
        .then((file) =>
          setAppLogoFavicon(
            file ? getBackendUrl() + "/public/" + file : defaultLogoFavicon,
          ),
        )
        .catch(() => {});

      getPublicSetting("appName", companyId)
        .then((name) => setAppName(name || "AtendeChat"))
        .catch(() => setAppName("AtendeChat"));
    };

    init();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--primaryColor",
      mode === "light" ? primaryColorLight : primaryColorDark,
    );
  }, [primaryColorLight, primaryColorDark, mode]);

  useEffect(() => {
    async function fetchVersionData() {
      try {
        const response = await api.get("/version");
        const { data } = response;
        window.localStorage.setItem("frontendVersion", data.version);
      } catch (error) {
        console.log("Error fetching data", error);
      }
    }
    fetchVersionData();
  }, []);

  return (
    <>
      <Favicon url={appLogoFavicon ? appLogoFavicon : defaultLogoFavicon} />
      <ColorModeContext.Provider value={{ colorMode }}>
        <ThemeProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <ActiveMenuProvider>
              <Routes />
            </ActiveMenuProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </>
  );
};

export default App;
