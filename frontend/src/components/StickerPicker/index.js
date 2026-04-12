import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Popover,
  Tabs,
  Tab,
  Grid,
  IconButton,
  Typography,
  CircularProgress,
  makeStyles,
} from '@material-ui/core';
import {
  CloudUpload as CloudUploadIcon,
  DeleteOutline as DeleteIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  Image as ImageIcon,
  AccessTime as AccessTimeIcon,
} from '@material-ui/icons';
import { useTheme } from '@material-ui/core/styles';

// WhatsApp-style default sticker packs (using emojis rendered as images)
const defaultStickerPacks = [
  {
    name: 'Reações',
    icon: '👋',
    stickers: [
      { id: 'react-1', emoji: '👍', label: 'Like' },
      { id: 'react-2', emoji: '❤️', label: 'Love' },
      { id: 'react-3', emoji: '😂', label: 'Laugh' },
      { id: 'react-4', emoji: '😮', label: 'Wow' },
      { id: 'react-5', emoji: '😢', label: 'Sad' },
      { id: 'react-6', emoji: '🙏', label: 'Thanks' },
      { id: 'react-7', emoji: '🎉', label: 'Celebration' },
      { id: 'react-8', emoji: '🔥', label: 'Fire' },
    ],
  },
  {
    name: 'Expressões',
    icon: '😀',
    stickers: [
      { id: 'expr-1', emoji: '😎', label: 'Cool' },
      { id: 'expr-2', emoji: '🤣', label: 'ROFL' },
      { id: 'expr-3', emoji: '😍', label: 'In Love' },
      { id: 'expr-4', emoji: '🤔', label: 'Thinking' },
      { id: 'expr-5', emoji: '😴', label: 'Sleepy' },
      { id: 'expr-6', emoji: '🤪', label: 'Crazy' },
      { id: 'expr-7', emoji: '😤', label: 'Angry' },
      { id: 'expr-8', emoji: '🥳', label: 'Party' },
    ],
  },
  {
    name: 'Mãos',
    icon: '✌️',
    stickers: [
      { id: 'hands-1', emoji: '👋', label: 'Wave' },
      { id: 'hands-2', emoji: '👏', label: 'Clap' },
      { id: 'hands-3', emoji: '🙌', label: 'Praise' },
      { id: 'hands-4', emoji: '💪', label: 'Strong' },
      { id: 'hands-5', emoji: '✌️', label: 'Peace' },
      { id: 'hands-6', emoji: '🤝', label: 'Handshake' },
      { id: 'hands-7', emoji: '👊', label: 'Fist' },
      { id: 'hands-8', emoji: '🫡', label: 'Respect' },
    ],
  },
  {
    name: 'Objetos',
    icon: '⭐',
    stickers: [
      { id: 'obj-1', emoji: '⭐', label: 'Star' },
      { id: 'obj-2', emoji: '🏆', label: 'Trophy' },
      { id: 'obj-3', emoji: '💎', label: 'Diamond' },
      { id: 'obj-4', emoji: '🚀', label: 'Rocket' },
      { id: 'obj-5', emoji: '💡', label: 'Idea' },
      { id: 'obj-6', emoji: '📌', label: 'Pin' },
      { id: 'obj-7', emoji: '🎯', label: 'Target' },
      { id: 'obj-8', emoji: '💻', label: 'Computer' },
    ],
  },
];

const STORAGE_KEY = 'sticker-recent-images';
const MAX_RECENTS = 24;

const useStyles = makeStyles((theme) => ({
  popover: {
    width: 380,
    maxHeight: 500,
    borderRadius: 14,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  tabsRoot: {
    minHeight: 44,
    backgroundColor: theme.mode === 'light' ? '#f0f2f5' : '#1d282f',
  },
  tab: {
    minHeight: 44,
    minWidth: 0,
    flex: 1,
    padding: '8px 0',
    fontSize: '0.7rem',
    fontWeight: 500,
    '& svg': {
      fontSize: '1.1rem',
      marginRight: 4,
    },
  },
  tabIndicator: {
    height: 3,
    borderRadius: 2,
  },
  content: {
    padding: theme.spacing(1.5),
    overflowY: 'auto',
    maxHeight: 430,
    '&::-webkit-scrollbar': { width: 6 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.action.disabled,
      borderRadius: 3,
    },
  },
  // Upload tab
  uploadDropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px dashed ${theme.palette.divider}`,
    borderRadius: 12,
    padding: theme.spacing(4, 2),
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
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
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  uploadHint: {
    marginTop: theme.spacing(0.5),
    fontSize: '0.7rem',
  },
  // Recentes / grid
  stickerGridList: {
    maxHeight: 360,
    overflowY: 'auto',
  },
  stickerBtn: {
    width: '100%',
    padding: 0,
    borderRadius: 8,
    transition: 'transform 0.15s',
    '&:hover': {
      transform: 'scale(1.1)',
    },
  },
  stickerCircle: {
    width: 60,
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiSticker: {
    fontSize: '2.4rem',
    lineHeight: 1,
    userSelect: 'none',
  },
  imageSticker: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
    '& h6': {
      fontSize: '0.85rem',
      fontWeight: 600,
    },
  },
  packSection: {
    marginBottom: theme.spacing(2),
  },
  packHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  packEmoji: {
    fontSize: '1.2rem',
  },
  packName: {
    fontSize: '0.82rem',
    fontWeight: 500,
  },
  deleteRecentBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    opacity: 0,
    transition: 'opacity 0.15s',
    '& svg': { fontSize: 14 },
  },
  stickerWrapperRelative: {
    position: 'relative',
    '&:hover': {
      '& $deleteRecentBtn': { opacity: 1 },
    },
  },
}));

// Helper: convert emoji sticker to canvas-based image blob for sending as sticker image
const emojiStickerToBlob = (emoji) => {
  // Return a small data-URI canvas with the emoji centered as a PNG
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.font = '340px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 256, 280);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
};

// LocalStorage helpers
const loadRecents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveRecent = (dataUrl) => {
  try {
    const recents = loadRecents();
    // avoid duplicate
    const filtered = recents.filter((img) => img !== dataUrl);
    filtered.unshift(dataUrl);
    const trimmed = filtered.slice(0, MAX_RECENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // quota exceeded — clear oldest
    try {
      const recents = loadRecents().slice(0, MAX_RECENTS - 1);
      recents.unshift(dataUrl);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
    } catch {}
  }
};

const removeRecent = (dataUrl) => {
  try {
    const recents = loadRecents().filter((img) => img !== dataUrl);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
  } catch {}
};

const StickerPicker = ({ anchorEl, open, onClose, onSend }) => {
  const classes = useStyles();
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState(loadRecents());
  const fileInputRef = useRef(null);

  // Reload recents from storage on open
  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      setTab(0);
    }
  }, [open]);

  const handleTabChange = (_, newVal) => {
    setTab(newVal);
  };

  const sendEmojiAsSticker = useCallback(async (emoji) => {
    setLoading(true);
    try {
      const blob = await emojiStickerToBlob(emoji);
      const file = new File([blob], `${emoji}.png`, { type: 'image/png' });
      await onSend({ type: 'sticker', file });
    } finally {
      setLoading(false);
      onClose();
    }
  }, [onSend, onClose]);

  const sendImageFile = useCallback(async (file) => {
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      return;
    }

    setLoading(true);

    // Read as dataURL for recent preview
    const reader = new FileReader();
    reader.onload = () => saveRecent(reader.result);
    reader.readAsDataURL(file);

    try {
      await onSend({ type: 'sticker', file });
    } finally {
      setLoading(false);
      setRecents(loadRecents());
      onClose();
    }
  }, [onSend, onClose]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sendImageFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    sendImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteRecent = (e, dataUrl) => {
    e.stopPropagation();
    removeRecent(dataUrl);
    setRecents(loadRecents());
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
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
          icon={<EmojiEmotionsIcon />}
          label="Packs"
        />
        <Tab
          classes={{ root: classes.tab }}
          icon={<ImageIcon />}
          label="Upload"
        />
      </Tabs>

      <div className={classes.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CircularProgress size={28} />
            <Typography
              variant="caption"
              style={{ display: 'block', marginTop: 8 }}
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
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <ImageIcon style={{ fontSize: 48, color: theme.palette.text.disabled }} />
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
                      style={{ display: 'block', marginTop: 4 }}
                    >
                      Envie uma imagem na aba "Upload" para vê-la aqui
                    </Typography>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileSelect}
                    />
                    <IconButton
                      color="primary"
                      size="large"
                      onClick={triggerFileInput}
                      style={{ marginTop: 12 }}
                    >
                      <CloudUploadIcon />
                    </IconButton>
                  </div>
                ) : (
                  <Grid container spacing={0.5} className={classes.stickerGridList}>
                    {recents.map((url, i) => (
                      <Grid item key={i} xs={3}>
                        <div className={classes.stickerWrapperRelative}>
                          <IconButton
                            className={classes.stickerBtn}
                            onClick={() => {
                              const fileUrl = url;
                              fetch(fileUrl)
                                .then((res) => res.blob())
                                .then((blob) => {
                                  const file = new File([blob], `recent-${i}.png`, {
                                    type: blob.type || 'image/png',
                                  });
                                  sendImageFile(file);
                                });
                            }}
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

            {/* TAB — Packs (emojis renderizados como stickers) */}
            {tab === 1 && (
              <>
                {defaultStickerPacks.map((pack) => (
                  <div key={pack.name} className={classes.packSection}>
                    <div className={classes.packHeader}>
                      <span className={classes.packEmoji}>{pack.icon}</span>
                      <span className={classes.packName}>{pack.name}</span>
                    </div>
                    <Grid container spacing={0.5}>
                      {pack.stickers.map((sticker) => (
                        <Grid item key={sticker.id} xs={3}>
                          <IconButton
                            className={classes.stickerBtn}
                            title={sticker.label}
                            onClick={() => sendEmojiAsSticker(sticker.emoji)}
                          >
                            <div className={classes.stickerCircle}>
                              <span className={classes.emojiSticker}>
                                {sticker.emoji}
                              </span>
                            </div>
                          </IconButton>
                        </Grid>
                      ))}
                    </Grid>
                  </div>
                ))}
              </>
            )}

            {/* TAB — Upload */}
            {tab === 2 && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
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
                    PNG, JPG ou WebP — será convertida para 512×512
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
                        <Grid item key={i} xs={3}>
                          <IconButton
                            className={classes.stickerBtn}
                            onClick={() => {
                              fetch(url)
                                .then((res) => res.blob())
                                .then((blob) => {
                                  const file = new File([blob], `recent-${i}.png`, {
                                    type: blob.type || 'image/png',
                                  });
                                  sendImageFile(file);
                                });
                            }}
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
