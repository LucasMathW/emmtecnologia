import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Popover,
  Tabs,
  Tab,
  Grid,
  IconButton,
  Typography,
  CircularProgress,
  makeStyles,
} from "@material-ui/core";
import {
  CloudUpload as CloudUploadIcon,
  DeleteOutline as DeleteIcon,
  Image as ImageIcon,
  AccessTime as AccessTimeIcon,
  Bookmark as BookmarkIcon,
} from "@material-ui/icons";
import { useTheme } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import api from "../../services/api";

const RECENTS_STORAGE_KEY = "emm-sticker-recents-v2";
const MAX_RECENTS = 16;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const useStyles = makeStyles((theme) => ({
  popover: {
    width: 420,
    height: 480,
    borderRadius: 14,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  tabsRoot: {
    minHeight: 52,
    backgroundColor: theme.mode === "light" ? "#f0f2f5" : "#1d282f",
  },
  tab: {
    minHeight: 52,
    minWidth: 0,
    flex: 1,
    padding: "8px 0",
    fontSize: "0.75rem",
    fontWeight: 500,
    "& svg": {
      fontSize: "1.4rem",
    },
  },
  tabIndicator: {
    height: 3,
    borderRadius: 2,
  },
  content: {
    padding: theme.spacing(1.5),
    overflowY: "auto",
    scrollBehavior: "smooth",
    flex: 1,
    "&::-webkit-scrollbar": { width: 6 },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: theme.palette.action.disabled,
      borderRadius: 3,
    },
  },
  uploadDropZone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: `2px dashed ${theme.palette.divider}`,
    borderRadius: 12,
    padding: theme.spacing(4, 2),
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: theme.palette.primary.main,
      backgroundColor: `${theme.palette.primary.main}08`,
    },
  },
  uploadIcon: {
    fontSize: 40,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  uploadText: {
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  uploadHint: {
    marginTop: theme.spacing(0.5),
    fontSize: "0.7rem",
  },
  stickerGridList: {
    overflowY: "visible",
  },
  stickerBtn: {
    width: "100%",
    height: 90,
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.mode === "light" ? "#f0f2f5" : "rgba(255,255,255,0.06)",
    transition: "transform 0.15s, background-color 0.15s",
    "&:hover": {
      transform: "scale(1.08)",
      backgroundColor: theme.mode === "light" ? "#e4e6ea" : "rgba(255,255,255,0.12)",
    },
  },
  imageSticker: {
    width: 90,
    height: 90,
    objectFit: "contain",
  },
  deleteRecentBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    opacity: 0,
    transition: "opacity 0.15s",
    backgroundColor: theme.palette.background.paper,
    "&:hover": {
      backgroundColor: theme.palette.background.paper,
    },
    "& svg": { fontSize: 14 },
  },
  stickerWrapperRelative: {
    position: "relative",
    "&:hover": {
      "& $deleteRecentBtn": { opacity: 1 },
    },
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 0",
  },
}));

// ── LocalStorage helpers (Recentes) ──
const loadRecents = () => {
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const addRecent = (url) => {
  try {
    const recents = loadRecents().filter((item) => item !== url);
    recents.unshift(url);
    const trimmed = recents.slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return loadRecents();
  }
};

const removeRecent = (url) => {
  try {
    const recents = loadRecents().filter((item) => item !== url);
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents));
    return recents;
  } catch {
    return loadRecents();
  }
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Salva uma figurinha recebida na galeria pessoal do usuário (chamado a partir do MessagesList)
export const saveStickerFromMessage = async (mediaUrl) => {
  try {
    await api.post("/user-stickers", { mediaUrl });
    toast.success("Figurinha salva na sua galeria! 🎉");
  } catch {
    toast.error("Erro ao salvar figurinha");
  }
};

const StickerPicker = ({ anchorEl, open, onClose, onSend }) => {
  const classes = useStyles();
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [sending, setSending] = useState(false);
  const [recents, setRecents] = useState(loadRecents());
  const [savedStickers, setSavedStickers] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const fileInputRef = useRef(null);

  const loadSavedStickers = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const { data } = await api.get("/user-stickers");
      setSavedStickers(Array.isArray(data) ? data : []);
    } catch {
      setSavedStickers([]);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      setTab(0);
      loadSavedStickers();
    }
  }, [open, loadSavedStickers]);

  const handleTabChange = (_, newVal) => {
    setTab(newVal);
  };

  const registerRecent = useCallback((url) => {
    setRecents(addRecent(url));
  }, []);

  const sendFile = useCallback(
    async (file, recentUrl) => {
      setSending(true);
      try {
        const url = recentUrl || (await fileToDataUrl(file));
        registerRecent(url);
        await onSend({ type: "sticker", file });
      } catch {
        toast.error("Erro ao enviar figurinha");
      } finally {
        setSending(false);
        onClose();
      }
    },
    [onSend, onClose, registerRecent]
  );

  const sendFromUrl = useCallback(
    async (url) => {
      setSending(true);
      try {
        const response = await fetch(url, { credentials: "include" });
        const blob = await response.blob();
        const file = new File([blob], "sticker.webp", { type: "image/webp" });
        registerRecent(url);
        await onSend({ type: "sticker", file });
      } catch (err) {
        toast.error("Erro ao enviar figurinha");
      } finally {
        setSending(false);
        onClose();
      }
    },
    [onSend, onClose, registerRecent]
  );

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !ALLOWED_TYPES.includes(file.type)) return;
    sendFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !ALLOWED_TYPES.includes(file.type)) return;
    sendFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteRecent = (e, url) => {
    e.stopPropagation();
    setRecents(removeRecent(url));
  };

  const handleDeleteSaved = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/user-stickers/${id}`);
      setSavedStickers((prev) => prev.filter((sticker) => sticker.id !== id));
    } catch {
      toast.error("Erro ao remover figurinha");
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      classes={{ paper: classes.popover }}
    >
      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="fullWidth"
        indicatorColor="primary"
        classes={{
          root: classes.tabsRoot,
          indicator: classes.tabIndicator,
        }}
      >
        <Tab
          classes={{ root: classes.tab }}
          icon={<AccessTimeIcon />}
          label="Recentes"
        />
        <Tab
          classes={{ root: classes.tab }}
          icon={<BookmarkIcon />}
          label="Salvas"
        />
        <Tab
          classes={{ root: classes.tab }}
          icon={<CloudUploadIcon />}
          label="Upload"
        />
      </Tabs>

      <div className={classes.content}>
        {sending ? (
          <div className={classes.emptyState}>
            <CircularProgress size={28} />
            <Typography
              variant="caption"
              style={{ display: "block", marginTop: 8 }}
            >
              Enviando figurinha...
            </Typography>
          </div>
        ) : (
          <>
            {/* TAB — Recentes */}
            {tab === 0 && (
              <>
                {recents.length === 0 ? (
                  <div className={classes.emptyState}>
                    <AccessTimeIcon
                      style={{ fontSize: 48, color: theme.palette.text.disabled }}
                    />
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      style={{ marginTop: 8 }}
                    >
                      Nenhuma figurinha recente
                    </Typography>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      style={{ display: "block", marginTop: 4 }}
                    >
                      Envie uma figurinha na aba "Upload" para vê-la aqui
                    </Typography>
                  </div>
                ) : (
                  <Grid container spacing={0.5} className={classes.stickerGridList}>
                    {recents.map((url, i) => (
                      <Grid item key={`${url}-${i}`} xs={3}>
                        <div className={classes.stickerWrapperRelative}>
                          <IconButton
                            className={classes.stickerBtn}
                            onClick={() => sendFromUrl(url)}
                          >
                            <img
                              src={url}
                              alt="Recent sticker"
                              className={classes.imageSticker}
                            />
                          </IconButton>
                          <IconButton
                            className={classes.deleteRecentBtn}
                            size="small"
                            onClick={(e) => handleDeleteRecent(e, url)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </div>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            )}

            {/* TAB — Salvas */}
            {tab === 1 && (
              <>
                {loadingSaved ? (
                  <div className={classes.emptyState}>
                    <CircularProgress size={24} />
                  </div>
                ) : savedStickers.length === 0 ? (
                  <div className={classes.emptyState}>
                    <BookmarkIcon
                      style={{ fontSize: 48, color: theme.palette.text.disabled }}
                    />
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      style={{ marginTop: 8 }}
                    >
                      Nenhuma figurinha salva
                    </Typography>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      style={{ display: "block", marginTop: 4 }}
                    >
                      Salve figurinhas recebidas para vê-las aqui
                    </Typography>
                  </div>
                ) : (
                  <Grid container spacing={0.5} className={classes.stickerGridList}>
                    {savedStickers.map((sticker) => (
                      <Grid item key={sticker.id} xs={3}>
                        <div className={classes.stickerWrapperRelative}>
                          <IconButton
                            className={classes.stickerBtn}
                            onClick={() => sendFromUrl(sticker.mediaUrl)}
                          >
                            <img
                              src={sticker.mediaUrl}
                              alt={sticker.name || "Saved sticker"}
                              className={classes.imageSticker}
                            />
                          </IconButton>
                          <IconButton
                            className={classes.deleteRecentBtn}
                            size="small"
                            onClick={(e) => handleDeleteSaved(e, sticker.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </div>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            )}

            {/* TAB — Upload */}
            {tab === 2 && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileSelect}
                />

                <div
                  className={classes.uploadDropZone}
                  onClick={triggerFileInput}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <CloudUploadIcon className={classes.uploadIcon} />
                  <Typography variant="body2" className={classes.uploadText}>
                    Clique ou arraste uma imagem aqui
                  </Typography>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    className={classes.uploadHint}
                  >
                    PNG, JPG ou WebP
                  </Typography>
                </div>

                {recents.length > 0 && (
                  <>
                    <Typography
                      variant="subtitle2"
                      style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}
                    >
                      Recentes
                    </Typography>
                    <Grid container spacing={0.5} className={classes.stickerGridList}>
                      {recents.slice(0, 8).map((url, i) => (
                        <Grid item key={`${url}-${i}`} xs={3}>
                          <IconButton
                            className={classes.stickerBtn}
                            onClick={() => sendFromUrl(url)}
                          >
                            <img
                              src={url}
                              alt="Recent sticker"
                              className={classes.imageSticker}
                            />
                          </IconButton>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Popover>
  );
};

export default StickerPicker;
