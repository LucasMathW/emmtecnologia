import React, {
  useContext,
  useState,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { isSameDay, parseISO, format } from "date-fns";
import clsx from "clsx";
import { isNil, toPairs } from "lodash";
import { blue, green } from "@material-ui/core/colors";
import {
  Button,
  Divider,
  Typography,
  IconButton,
  makeStyles,
  useTheme,
  ClickAwayListener,
} from "@material-ui/core";
import Popover from "@mui/material/Popover";
import { Picker } from "emoji-mart";
import {
  AccessTime,
  Done,
  DoneAll,
  ExpandMore,
  GetApp,
  Facebook,
  Instagram,
  Reply,
  WhatsApp,
} from "@material-ui/icons";
import LockIcon from "@material-ui/icons/Lock";
import ModalVideoCors from "../ModalVideoCors";
import MarkdownWrapper from "../MarkdownWrapper";
import VcardPreview from "../VcardPreview";
import LocationPreview from "../LocationPreview";
import ModalImageCors from "../ModalImageCors";
import MessageOptionsMenu from "../MessageOptionsMenu";
import whatsBackground from "../../assets/wa-background.png";
import whatsBackgroundDark from "../../assets/wa-background-dark.png";
import YouTubePreview from "../ModalYoutubeCors";
import PdfPreview from "../PdfPreview";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";
import AdMetaPreview from "../AdMetaPreview";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import SelectMessageCheckbox from "./SelectMessageCheckbox";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { AuthContext } from "../../context/Auth/AuthContext";
import { QueueSelectedContext } from "../../context/QueuesSelected/QueuesSelectedContext";
import AudioModal from "../AudioModal";
import { CircularProgress } from "@material-ui/core";
import { useParams, useHistory } from "react-router-dom";
import { downloadResource } from "../../utils";
import Template from "./templates";
import { usePdfViewer } from "../../hooks/usePdfViewer";
// import { getEffectiveConstraintOfTypeParameter, NewLineKind } from "typescript";
import EmojiEmotionsOutlinedIcon from "@material-ui/icons/EmojiEmotionsOutlined";
import Box from "@material-ui/core/Box";
import ForwardMessageBar from "../ForwardMessageBar";

const useStyles = makeStyles((theme) => ({
  emojiPickerFullOverride: {
    "& .emoji-mart": {
      width: "100% !important",
      backgroundColor: `${theme.palette.background.paper} !important`,
      borderColor: `${theme.mode === "dark" ? "#444" : "#d9d9d9"} !important`,
      color: `${theme.palette.text.primary} !important`,
    },
    "& .emoji-mart-bar": {
      borderColor: `${theme.mode === "dark" ? "#444" : "#d9d9d9"} !important`,
      backgroundColor: `${theme.palette.background.paper} !important`,
    },
    "& .emoji-mart-search input": {
      backgroundColor: `${theme.mode === "dark" ? "#2d3b43" : "#f2f2f2"} !important`,
      color: `${theme.palette.text.primary} !important`,
      borderColor: `${theme.mode === "dark" ? "#444" : "#d9d9d9"} !important`,
    },
    "& .emoji-mart-category-label span": {
      backgroundColor: `${theme.palette.background.paper} !important`,
      color: `${theme.mode === "dark" ? "#aaa" : "#888"} !important`,
    },
  },

  emojiPickerOverride: {
    "& .emoji-mart": {
      width: "100% !important",
    },
  },

  // Adicione esta classe
  messageWithMedia: {
    paddingTop: 0, // Remove padding superior quando tem imagem
    marginTop: 0, // Remove margem superior
    display: "inline-block",
  },

  textContentItem: {
    overflowWrap: "break-word",
    wordBreak: "break-word",
    padding: "3px 6px 4px 6px",
    display: "block",
    position: "relative",
    boxSizing: "border-box",
  },
  textContentItemAfterMedia: {
    overflowWrap: "break-word",
    wordBreak: "break-word",
    padding: "4px 6px 4px 6px",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    display: "block",
    position: "relative",
    minWidth: 0,
  },

  timestamp: {
    fontSize: 12,
    position: "absolute", // Mude para absolute
    bottom: 2,
    right: 6,
    color: "#999",
    display: "flex",
    alignItems: "center",
    gap: 2,
    whiteSpace: "nowrap",
  },

  textContentItemImage: {
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
    "&.messageLeft &, &.messageRight &": {
      // Remove padding extra apenas para timestamps de imagem
    },
  },

  textContentItemNoPadding: {
    overflowWrap: "break-word",
    padding: "3px 80px 2px 6px", // reduz padding bottom para não empurrar timestamp
  },

  presenceIndicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 14px",
    backgroundColor: theme.mode === "light" ? "#ffffff" : "#1f2c33",
    borderRadius: 20,
    boxShadow:
      theme.mode === "light"
        ? "0 4px 12px rgba(0,0,0,0.15)"
        : "0 4px 12px rgba(0,0,0,0.5)",
    width: "fit-content",
  },
  presenceText: {
    fontSize: 15,
    color: "#128C7E",
    fontStyle: "italic",
  },
  "@keyframes presenceBounce": {
    "0%, 80%, 100%": { transform: "translateY(0)", opacity: 0.4 },
    "40%": { transform: "translateY(-4px)", opacity: 1 },
  },
  "@keyframes presenceWave": {
    "0%, 100%": { transform: "scaleY(0.4)" },
    "50%": { transform: "scaleY(1)" },
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: "#128C7E",
    display: "inline-block",
    animation: "$presenceBounce 1.2s infinite ease-in-out",
  },
  dot1: { animationDelay: "0s" },
  dot2: { animationDelay: "0.2s" },
  dot3: { animationDelay: "0.4s" },
  audioBar: {
    width: 3,
    backgroundColor: "#128C7E",
    borderRadius: 2,
    animation: "$presenceWave 0.8s infinite ease-in-out",
  },
  audioBar1: { height: 6, animationDelay: "0s" },
  audioBar2: { height: 12, animationDelay: "0.1s" },
  audioBar3: { height: 8, animationDelay: "0.2s" },
  audioBar4: { height: 14, animationDelay: "0.3s" },
  audioBar5: { height: 6, animationDelay: "0.4s" },

  reactionButton: {
    position: "absolute",
    top: "50%",
    right: -32,
    transform: "translateY(-50%)",
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
    borderRadius: "50%",
    padding: 4,
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    cursor: "pointer",
    display: "none", // ← controlado pelo hover do messageBalloonWrapper
    zIndex: 20,
    "&:hover": { backgroundColor: theme.palette.action.hover },
  },

  reactionButtonRight: {
    display: "none", // ← controlado pelo hover do messageBalloonWrapper
    position: "absolute",
    top: "50%",
    left: -32,
    transform: "translateY(-50%)",
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
    borderRadius: "50%",
    padding: 4,
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    cursor: "pointer",
    fontSize: 16,
    zIndex: 20,
    "&:hover": { backgroundColor: theme.palette.action.hover },
  },

  reactionAddButton: {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 500,
    lineHeight: "1",
    padding: 0,
    boxSizing: "border-box",
    backgroundColor:
      theme.mode === "dark" ? theme.palette.grey[700] : theme.palette.grey[300],
    color: theme.palette.text.primary,
    transition: "background-color 0.15s ease, transform 0.1s ease",
    "&:hover": {
      backgroundColor: theme.palette.action.selected,
      transform: "scale(1.05)",
    },
  },

  reactionPopover: {
    borderRadius: 28,
    padding: "6px 8px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[4],
    overflow: "hidden",
  },

  reactionEmoji: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 20,
    transition: "background-color 0.15s ease, transform 0.12s ease",
    "&:hover": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? "rgba(255,255,255,0.14)"
          : "rgba(0,0,0,0.08)",
      transform: "scale(1.2)",
    },
  },

  reactionEmojiActive: {
    backgroundColor:
      theme.mode === "dark" ? "rgba(255,255,255,0.2)" : "#e4e6eb",
    transform: "scale(1.15)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
  },

  messageWithReaction: {
    marginBottom: 21,
  },

  messagesListWrapper: {
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    width: "100%",
    minWidth: 300,
    minHeight: 200,
  },

  currentTick: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "95%",
    backgroundColor: theme.palette.primary.main,
    margin: "10px",
    borderRadius: "10px",
    boxShadow: "1px 5px 10px #b3b3b3",
  },

  currentTicktText: {
    color: theme.palette.primary,
    fontWeight: "bold",
    padding: 8,
    alignSelf: "center",
    marginLeft: "0px",
  },

  messageBalloonWrapper: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    "&:hover $forwardImageButton": { opacity: 1 }, // já funciona
    "&:hover $forwardImageButtonLeft": { opacity: 1 }, // já funciona
    "&:hover $reactionButton": { display: "flex" }, // ← fix reação left
    "&:hover $reactionButtonRight": { display: "flex" }, // ← fix reação right
  },

  messageWrapper: {
    display: "flex",
    position: "relative",
    overflow: "visible",
    // hover nos botões de ação via CSS puro
    "&:hover $reactionActionBtn": { opacity: 1 },
  },

  reactionActionBtn: {
    opacity: 0,
    transition: "opacity 0.15s ease",
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.palette.background.paper,
    borderRadius: "50%",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    cursor: "pointer",
    flexShrink: 0,
    "&:hover": {
      opacity: "1 !important",
      backgroundColor: theme.palette.action.hover,
    },
  },

  messagesList: {
    backgroundImage:
      theme.mode === "light"
        ? `url(${whatsBackground})`
        : `url(${whatsBackgroundDark})`,
    backgroundColor: theme.mode === "light" ? "transparent" : "#0b0b0d",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    padding: "20px 20px 30px 20px",
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },

  dragElement: {
    background: "rgba(255, 255, 255, 0.8)",
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 999999,
    textAlign: "center",
    fontSize: "3em",
    border: "5px dashed #333",
    color: "#333",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  circleLoading: {
    color: blue[500],
    position: "absolute",
    opacity: "70%",
    top: 0,
    left: "50%",
    marginTop: 12,
  },

  messageLeft: {
    position: "relative",
    marginRight: 20,
    marginTop: 2,
    overflow: "visible",
    width: "auto",
    maxWidth: "65%",
    minWidth: 100,
    display: "inline-block",

    "& img": {
      maxWidth: "100%", // ← Imagem respeita o balão
      height: "auto",
    },

    "&::before": {
      content: '""',
      position: "absolute",
      top: -8,
      bottom: -8,
      left: -20,
      right: -20,
    },
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },
    "&:hover $reactionButton": {
      display: "flex",
    },
    whiteSpace: "pre-wrap",
    backgroundColor: theme.mode === "light" ? "#ffffff" : "#202c33",
    color: theme.mode === "light" ? "#303030" : "#ffffff",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 7.8,
    borderBottomLeftRadius: 7.8,
    borderBottomRightRadius: 7.8,
    // ✅ Padding interno ajustado: o timestamp usa float, então não precisa de paddingRight extra aqui
    paddingLeft: 2,
    paddingRight: 2,
    paddingTop: 2,
    paddingBottom: 0,
    // ✅ boxSizing: border-box ESSENCIAL para padding contar na largura total
    boxSizing: "border-box",
    boxShadow:
      theme.mode === "light" ? "0 1px 1px #b3b3b3" : "0 1px 1px #000000",
  },

  messageRight: {
    position: "relative",
    marginLeft: 20,
    marginTop: 2,
    overflow: "visible",
    width: "auto",
    maxWidth: "65%",
    minWidth: 100,
    display: "inline-block",

    "& img": {
      maxWidth: "100%", // ← Imagem respeita o balão
      height: "auto",
    },

    "&::before": {
      content: '""',
      position: "absolute",
      top: -8,
      bottom: -8,
      left: -20,
      right: -20,
    },
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },
    "&:hover $reactionButtonRight": {
      display: "flex",
    },
    whiteSpace: "pre-wrap",
    backgroundColor: theme.mode === "light" ? "#dcf8c6" : "#005c4b",
    color: theme.mode === "light" ? "#303030" : "#ffffff",
    borderTopLeftRadius: 7.5,
    borderTopRightRadius: 7.5,
    borderBottomLeftRadius: 7.5,
    borderBottomRightRadius: 7.5,
    paddingLeft: 2,
    paddingRight: 2,
    paddingTop: 2,
    paddingBottom: 0,
    // ✅ boxSizing: border-box ESSENCIAL
    boxSizing: "border-box",
    boxShadow:
      theme.mode === "light" ? "0 1px 1px #b3b3b3" : "0 1px 1px #000000",
  },

  quotedContainerLeft: {
    margin: "-3px -80px 6px -6px",
    overflow: "hidden",
    backgroundColor: theme.mode === "light" ? "#f0f0f0" : "#1d282f",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsg: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },

  quotedSideColorLeft: {
    flex: "none",
    width: "4px",
    backgroundColor: "#388aff",
  },

  messageRightPrivate: {
    marginLeft: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    "&:hover $reactionButtonRight": {
      display: "flex",
    },

    whiteSpace: "pre-wrap",
    backgroundColor: "#F0E68C",
    color: "#303030",
    // alignSelf: "flex-end",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 0,
    paddingLeft: 2,
    paddingRight: 2,
    paddingTop: 2,
    paddingBottom: 0,
    boxShadow:
      theme.mode === "light" ? "0 1px 1px #b3b3b3" : "0 1px 1px #000000",
  },

  quotedContainerRight: {
    margin: "-3px -80px 6px -6px",
    overflowY: "hidden",
    backgroundColor: theme.mode === "light" ? "#cfe9ba" : "#025144",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsgRight: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    whiteSpace: "pre-wrap",
  },

  quotedSideColorRight: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },

  messageActionsButton: {
    display: "none",
    position: "absolute",
    color: "#999",
    zIndex: 1,
    backgroundColor: "inherit",
    opacity: "90%",
    "&:hover, &.Mui-focusVisible": {
      backgroundColor: "inherit",
    },
  },

  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },

  textContentItemDeleted: {
    fontStyle: "italic",
    color: "rgba(0, 0, 0, 0.36)",
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  messageMedia: {
    width: "auto", // ← largura natural da imagem
    height: "auto",
    maxWidth: 320, // ← Reduzido de 330 para 260
    maxHeight: 400, // ← Reduzido de 330 para 260
    objectFit: "contain",
    display: "block",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    "&[controls]": {
      objectFit: "contain",
    },
  },

  // timestamp: {
  //   fontSize: 11,
  //   bottom: 0,
  //   right: 5,
  //   color: "#999",
  // },
  // Adicione após a classe "timestamp" existente:
  timestampMedia: {
    fontSize: 12,
    position: "absolute",
    bottom: 6,
    right: 6,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 6,
    padding: "2px 6px",
    display: "flex",
    alignItems: "center",
    gap: 4,
    pointerEvents: "none",
    zIndex: 10,
    backdropFilter: "blur(2px)",
  },

  forwardMessage: {
    fontSize: 12,
    fontStyle: "italic",
    position: "absolute",
    top: 0,
    left: 5,
    color: "#999",
    display: "flex",
    alignItems: "center",
    padding: "4px 6px 0px 6px",
  },

  forwardImageButton: {
    opacity: 1, // ← era 0, agora fixo
    // transition: removida — não precisa mais
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    right: -40,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 20,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
    borderRadius: "50%",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    "&:hover": { backgroundColor: theme.palette.action.hover },
  },

  forwardImageButtonLeft: {
    opacity: 1, // ← era 0, agora fixo
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: -40,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 20,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
    borderRadius: "50%",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    "&:hover": { backgroundColor: theme.palette.action.hover },
  },

  dailyTimestamp: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "110px",
    backgroundColor: "#e1f3fb",
    margin: "10px",
    borderRadius: "10px",
    boxShadow: "0 1px 1px #b3b3b3",
  },
  dailyTimestampText: {
    color: "#808888",
    padding: 8,
    alignSelf: "center",
    marginLeft: "0px",
  },
  ackIcons: {
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },
  deletedIcon: {
    fontSize: 18,
    verticalAlign: "middle",
    marginRight: 4,
  },
  ackDoneAllIcon: {
    color: blue[500],
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },
  ackPlayedIcon: {
    color: green[500],
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },
  downloadMedia: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "inherit",
    padding: 10,
    color: theme.mode === "light" ? theme.palette.light : theme.palette.dark,
  },
  messageCenter: {
    marginTop: 5,
    alignItems: "center",
    verticalAlign: "center",
    alignContent: "center",
    backgroundColor: "#E1F5FEEB",
    fontSize: "12px",
    minWidth: 100,
    maxWidth: 270,
    color: "#272727",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: "0 1px 1px #b3b3b3",
  },
  deletedMessage: {
    color: "#f55d65",
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload;
    const newMessages = [];

    console.log("📦 [LOAD_MESSAGES]", {
      incoming: messages.length,
      currentState: state.length,
      firstMsg: messages[0]?.id,
      lastMsg: messages[messages.length - 1]?.id,
      firstCreatedAt: messages[0]?.createdAt,
      lastCreatedAt: messages[messages.length - 1]?.createdAt,
    });

    messages.forEach((message) => {
      const messageIndex = state.findIndex((m) => m.id === message.id);
      if (messageIndex !== -1) {
        state[messageIndex] = message;
      } else {
        newMessages.push(message);
      }
    });

    return [...newMessages, ...state];
  }

  if (action.type === "ADD_MESSAGE") {
    const newMessage = action.payload;

    // 🔥 1. Match pelo tempId explícito (_tempId vindo do backend)
    if (newMessage._tempId) {
      const tempByIdIndex = state.findIndex((m) => m.id === newMessage._tempId);
      if (tempByIdIndex !== -1) {
        const updated = [...state];
        updated[tempByIdIndex] = newMessage;
        return updated;
      }
    }

    // 🔥 2. Evitar duplicata: se a mensagem já existe pelo id real, atualiza
    const existingIndex = state.findIndex((m) => m.id === newMessage.id);
    if (existingIndex !== -1) {
      const updated = [...state];
      updated[existingIndex] = newMessage;
      return updated;
    }

    // 🔥 3. Match para mensagens de texto otimistas (temp- + body igual)
    const tempTextIndex = state.findIndex(
      (m) =>
        String(m.id).startsWith("temp-") &&
        m.fromMe &&
        !m.mediaUrl &&
        !m._isMediaOptimistic &&
        m.body === newMessage.body,
    );
    if (tempTextIndex !== -1) {
      const updated = [...state];
      updated[tempTextIndex] = newMessage;
      return updated;
    }

    // 🔥 4. Match para mídia otimista: FIFO pelo mediaType
    if (newMessage.mediaType && newMessage.mediaType !== "text") {
      const tempMediaIndex = state.findIndex(
        (m) =>
          String(m.id).startsWith("temp-") &&
          m.fromMe &&
          m._isMediaOptimistic === true &&
          m.mediaType === newMessage.mediaType,
      );
      if (tempMediaIndex !== -1) {
        const updated = [...state];
        updated[tempMediaIndex] = newMessage;
        return updated;
      }
    }

    // 🔥 5. Mensagem nova sem nenhum temp correspondente — adiciona ao final
    return [...state, newMessage];
  }

  if (action.type === "ADD_OPTIMISTIC_MESSAGE") {
    return [...state, action.payload];
  }

  if (action.type === "UPDATE_MESSAGE") {
    const messageToUpdate = action.payload;
    return state.map((m) => {
      if (m.id !== messageToUpdate.id) return m;
      return {
        ...m,
        ...messageToUpdate,
        ticket: m.ticket,
        contact: m.contact,
      };
    });
  }

  if (action.type === "DELETE_MESSAGE") {
    const messageId = action.payload;
    return state.map((m) => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        isDeleted: true,
      };
    });
  }

  if (action.type === "REACTION_UPDATE") {
    const { messageId, reaction } = action.payload;

    return state.map((message) => {
      if (String(message.id) !== String(messageId)) return message;

      const reactions = Array.isArray(message.reactions)
        ? message.reactions
        : [];

      const filtered = reactions.filter(
        (r) => String(r.userId) !== String(reaction.userId),
      );

      if (!reaction.emoji) {
        return { ...message, reactions: filtered };
      }

      return { ...message, reactions: [...filtered, reaction] };
    });
  }

  if (action.type === "RESET") {
    console.log("🔴 [RESET] state tinha:", state.length, "mensagens");
    return [];
  }
};

const MessagesList = ({
  isGroup,
  onDrop,
  whatsappId,
  queueId,
  channel,
  ticketStatus,
}) => {
  const classes = useStyles();
  const [reactionBar, setReactionBar] = useState(null);
  // const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({});
  const [reactionPicker, setReactionPicker] = useState(null);
  const [messagesList, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const history = useHistory();
  const lastMessageRef = useRef();
  const pageNumberRef = useRef(1);
  // const reactionAnchorRef = useRef(null);
  const messageRef = useRef(null);
  const messageRight = useRef(null);
  const presenceTimeoutRef = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState({});
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);
  const { ticketId } = useParams();
  const currentTicketId = useRef(ticketId);
  const { getAll } = useCompanySettings();
  const [dragActive, setDragActive] = useState(false);
  const [dragTimeout, setDragTimeout] = useState(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [lgpdDeleteMessage, setLGPDDeleteMessage] = useState(false);

  const theme = useTheme();

  const [contactPresence, setContactPresence] = useState({
    status: null,
    memberName: null,
  });

  const { selectedQueuesMessage } = useContext(QueueSelectedContext);
  const { downloadPdf, extractPdfInfoFromMessage, isPdfUrl } = usePdfViewer();
  const {
    showSelectMessageCheckbox,
    setForwardMessageModalOpen,
    setSelectedMessages,
  } = useContext(ForwardMessageContext);
  const { user, socket } = useContext(AuthContext);
  const companyId = user.companyId;
  const lastReadRef = useRef(null);
  const [isTabActive, setIsTabActive] = useState(
    document.visibilityState === "visible",
  );

  const isSticker = (msg) =>
    msg.mediaType === "sticker" ||
    (msg.body === "sticker" && msg.mediaUrl?.endsWith(".webp"));

  const QUICK_REACTIONS = ["😂", "❤️", "😮", "😢", "🙏", "👍"];

  const canSendReaction = () => {
    return ticketStatus === "open" || ticketStatus === "group";
  };

  const tryMarkAsRead = () => {
    if (!ticketId) return;
    if (document.visibilityState !== "visible") return;
    if (!document.hasFocus()) return;
    if (!isAtBottom()) return;

    api.post(`/tickets/${ticketId}/read`).catch(() => {});
  };

  useEffect(() => {
    const handleOptimisticMessage = (event) => {
      dispatch({
        type: "ADD_OPTIMISTIC_MESSAGE",
        payload: event.detail,
      });

      scrollToBottom();
    };

    window.addEventListener("optimistic-message", handleOptimisticMessage);

    return () => {
      window.removeEventListener("optimistic-message", handleOptimisticMessage);
    };
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      tryMarkAsRead();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [ticketId]);

  useEffect(() => {
    async function fetchData() {
      const settings = await getAll(companyId);

      let settinglgpdDeleteMessage;
      let settingEnableLGPD;

      for (const [key, value] of Object.entries(settings)) {
        if (key === "lgpdDeleteMessage") settinglgpdDeleteMessage = value;
        if (key === "enableLGPD") settingEnableLGPD = value;
      }

      if (
        settingEnableLGPD === "enabled" &&
        settinglgpdDeleteMessage === "enabled"
      ) {
        setLGPDDeleteMessage(true);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    console.log("🔄 [RESET EFFECT] ticketId mudou para:", ticketId);
    pageNumberRef.current = 1; // síncrono, imediato
    setPageNumber(1); // para forçar re-render
    dispatch({ type: "RESET" });
    currentTicketId.current = ticketId;
  }, [ticketId, selectedQueuesMessage]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const loadingTicketRef = useRef(null);

  useEffect(() => {
    console.log("🔄 [RESET EFFECT] ticketId mudou para:", ticketId);
    dispatch({ type: "RESET" });
    setPageNumber(1);
    setHasMore(false);
    currentTicketId.current = ticketId;
    loadingTicketRef.current = ticketId; // marca qual ticket deve carregar
  }, [ticketId, selectedQueuesMessage]);

  useEffect(() => {
    let active = true;

    // 🔥 GUARDA: só executa se este ticketId ainda é o que deve ser carregado
    if (loadingTicketRef.current !== ticketId) {
      console.warn(
        "⚠️ [LOAD BLOQUEADO] ticketId stale:",
        ticketId,
        "esperado:",
        loadingTicketRef.current,
      );
      return;
    }

    // 🔥 GUARDA: pageNumber deve ser coerente com o ticket atual
    // Se o ticketId mudou recentemente, só aceita pageNumber === 1
    if (ticketId !== currentTicketId.current) {
      console.warn("⚠️ [LOAD BLOQUEADO] currentTicketId não bate");
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      if (ticketId === "undefined") {
        history.push("/tickets");
        return;
      }
      if (isNil(ticketId)) return;

      try {
        if (active) setLoading(true);

        const { data } = await api.get("/messages/" + ticketId, {
          params: {
            pageNumber,
            selectedQueues: JSON.stringify(selectedQueuesMessage),
          },
        });

        if (!active) return;

        // 🔥 GUARDA PÓS-FETCH: ticket pode ter mudado durante o await
        if (loadingTicketRef.current !== ticketId) {
          console.warn(
            "⚠️ [LOAD DESCARTADO pós-fetch] ticket mudou durante request",
          );
          return;
        }

        console.log(
          "✅ [LOAD OK] pageNumber:",
          pageNumber,
          "msgs recebidas:",
          data.messages.length,
          {
            hasMore: data.hasMore,
            firstMsg: data.messages[0]?.createdAt,
            lastMsg: data.messages[data.messages.length - 1]?.createdAt,
          },
        );

        dispatch({ type: "LOAD_MESSAGES", payload: data.messages });
        setHasMore(data.hasMore);
        setLoading(false);
        setLoadingMore(false);

        if (pageNumber === 1 && data.messages.length > 1) {
          scrollToBottom();
        }
      } catch (err) {
        if (!active) return;
        setLoading(false);
        setLoadingMore(false);
        toastError(err);
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [pageNumber, ticketId, selectedQueuesMessage]);

  useEffect(() => {
    if (ticketId === "undefined") return;

    const companyId = user.companyId;
    const eventAppMessage = `company-${companyId}-appMessage`;

    const connectEventMessagesList = () => {
      socket.emit("joinChatBox", `${ticketId}`);
    };

    const onAppMessageMessagesList = (data) => {
      // Presença — tratado aqui também, sem segundo listener
      if (data.action === "presence:update") {
        if (!data.ticket || data.ticket.uuid !== ticketId) return;

        setContactPresence({
          status: data.status || null,
          memberName: data.ticket?.memberName || null,
        });

        if (data.status) {
          clearTimeout(presenceTimeoutRef.current);
          presenceTimeoutRef.current = setTimeout(
            () => setContactPresence({ status: null, memberName: null }),
            10_000,
          );
          scrollToBottom();
        } else {
          clearTimeout(presenceTimeoutRef.current);
          setContactPresence({ status: null, memberName: null });
        }
        return;
      }

      if (data.action === "reaction:update") {
        dispatch({
          type: "REACTION_UPDATE",
          payload: { messageId: data.messageId, reaction: data.reaction },
        });
        return;
      }

      // const msg = data.message;
      // if (!msg) return;

      // const chatTicketUuid = ticketId;
      // const msgTicketUuid = msg.ticket?.uuid || msg.ticketUuid || null;
      // const msgTicketId = String(msg.ticketId || msg.ticket?.id || "");
      // const numericId = ticketNumericIdRef.current
      //   ? String(ticketNumericIdRef.current)
      //   : null;

      // const isSameChat =
      //   String(msgTicketUuid) === String(chatTicketUuid) ||
      //   msgTicketId === String(chatTicketUuid) ||
      //   (numericId && msgTicketId === numericId); // ← chave do fix

      // if (!isSameChat) return;

      const msg = data.message;
      if (!msg) return;

      const msgTicketUuid = msg.ticket?.uuid || msg.ticketUuid || null;

      if (msgTicketUuid && msgTicketUuid !== ticketId) return;

      if (data.action === "create") {
        setContactPresence({ status: null, memberName: null });
        clearTimeout(presenceTimeoutRef.current);
        dispatch({ type: "ADD_MESSAGE", payload: msg });
        scrollToBottom();
        setTimeout(() => tryMarkAsRead(), 150);
      }

      if (data.action === "update") {
        dispatch({ type: "UPDATE_MESSAGE", payload: msg });
      }

      if (data.action === "tombstone") {
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: { ...msg, isDeleted: true },
        });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_MESSAGE", payload: msg.id });
      }
    };

    socket.on("connect", connectEventMessagesList);
    socket.on(eventAppMessage, onAppMessageMessagesList);

    console.log("teste");

    if (socket.connected) {
      connectEventMessagesList();
    }

    return () => {
      socket.emit("joinChatBoxLeave", `${ticketId}`);
      socket.off("connect", connectEventMessagesList);
      socket.off(eventAppMessage, onAppMessageMessagesList);
      clearTimeout(presenceTimeoutRef.current);
    };
  }, [ticketId, user.companyId]); // ← remover o segundo useEffect de presença

  useEffect(() => {
    loadingTicketRef;
    return () => {
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, [dragTimeout]);

  const renderPresenceIndicator = () => {
    if (!contactPresence?.status) return null;

    const isRecording = contactPresence.status === "recording";
    const isTyping = contactPresence.status === "typing";

    if (!isTyping && !isRecording) return null;

    const displayName = contactPresence.memberName
      ? `${contactPresence.memberName} `
      : "";

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          marginLeft: 16,
          marginTop: 8,
          marginBottom: 1,
        }}
      >
        <div className={classes.presenceIndicator}>
          {isTyping ? (
            <>
              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                <span className={`${classes.dot} ${classes.dot1}`} />
                <span className={`${classes.dot} ${classes.dot2}`} />
                <span className={`${classes.dot} ${classes.dot3}`} />
              </div>
              <span className={classes.presenceText}>
                {displayName && `${displayName}está digitando...`}
                {!displayName && "digitando..."}
              </span>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  alignItems: "flex-end",
                  height: 16,
                }}
              >
                <span className={`${classes.audioBar} ${classes.audioBar1}`} />
                <span className={`${classes.audioBar} ${classes.audioBar2}`} />
                <span className={`${classes.audioBar} ${classes.audioBar3}`} />
                <span className={`${classes.audioBar} ${classes.audioBar4}`} />
                <span className={`${classes.audioBar} ${classes.audioBar5}`} />
              </div>
              <span className={classes.presenceText}>
                {displayName && `${displayName}está gravando áudio...`}
                {!displayName && "gravando áudio..."}
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  const loadMore = () => {
    if (loadingMore) return;
    // 🔥 Só permite loadMore se o ticket atual é o mesmo que está carregado
    if (currentTicketId.current !== ticketId) return;
    setLoadingMore(true);
    setPageNumber((prevPageNumber) => prevPageNumber + 1);
  };
  console.log("teste");

  const isAtBottom = () => {
    const el = document.getElementById("messagesList");
    if (!el) return false;

    return el.scrollHeight - el.scrollTop - el.clientHeight < 20;
  };

  const scrollToBottom = () => {
    console.log(
      "⬇️ [scrollToBottom] chamado, lastMessageRef existe?",
      !!lastMessageRef.current,
    );
    setTimeout(() => {
      if (lastMessageRef.current) {
        console.log("⬇️ [scrollToBottom] executando scrollIntoView");
        lastMessageRef.current.scrollIntoView({});
      }
    }, 100);
  };

  // console.log("teste");

  const handleScroll = (e) => {
    if (!hasMore) return;
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0) {
      document.getElementById("messagesList").scrollTop = 1;
    }
    if (loading) {
      return;
    }
    if (scrollTop < 50) {
      loadMore();
    }
    if (isAtBottom()) {
      tryMarkAsRead();
    }
  };

  const openReactionBar = (message, anchorElement) => {
    if (!canSendReaction()) {
      toastError("Aceite o ticket para enviar reações.");
      return;
    }

    if (!anchorElement) return;

    // Busca o balão pelo data-message-id como âncora estável
    const balloonEl = document.querySelector(
      `[data-message-id="${message.id}"]`,
    );

    setReactionBar({
      messageId: message.id,
      messageWid: message.wid,
      anchorEl: balloonEl || anchorElement,
    });
  };

  const handleOpenMessageOptionsMenu = (e, message) => {
    // Busca o balão como âncora estável, igual ao reactionBar
    const balloonEl = document.querySelector(
      `[data-message-id="${message.id}"]`,
    );

    setAnchorEl(balloonEl || e.currentTarget);
    setSelectedMessage({
      ...message,
      _reactionAnchorEl: balloonEl || e.currentTarget,
    });
  };

  const handleSendReaction = async (message, clickedEmoji) => {
    try {
      if (!canSendReaction()) {
        toastError("Aceite o ticket para enviar reações.");
        return;
      }
      console.log(`clickeEmoji:${clickedEmoji}`);

      const myReaction = Array.isArray(message?.reactions)
        ? message.reactions.find(
            (r) => r.userId === user.id || r.user?.id === user.id,
          )
        : null;

      const isRemoving = myReaction?.emoji === clickedEmoji;

      const emojiToSend = isRemoving ? "" : clickedEmoji;

      await api.post(`/messages/${message.wid}/reaction`, {
        emoji: emojiToSend,
      });
    } catch (err) {
      toastError(err);
    }
  };

  const handleCloseMessageOptionsMenu = (e) => {
    setAnchorEl(null);
    const btn = document.querySelector("#messageActionsButton");
    if (btn) btn.style.display = "";
  };

  const hanldeReplyMessage = (e, message) => {
    setAnchorEl(null);
    setReplyingMessage(message);
  };

  const getBasename = (filepath) => {
    if (!filepath) return "";
    const cleanPath = filepath.split("?")[0].split("#")[0];
    const segments = cleanPath.split("/");
    return segments[segments.length - 1];
  };

  const isAudioType = (message) => {
    if (message.mediaType === "audio" || message.mediaType === "ptt")
      return true;
    if (message.mediaUrl) {
      const audioExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm"];
      return audioExtensions.some((ext) =>
        message.mediaUrl.toLowerCase().includes(ext),
      );
    }
    return false;
  };

  const checkMessageMedia = (message) => {
    if (process.env.NODE_ENV === "development") {
      // console.log(
      //   "checkMessageMedia:",
      //   message.id,
      //   "mediaType:",
      //   message.mediaType,
      // );
    }
    // 🔥 Mensagem otimista de mídia: exibe placeholder animado enquanto aguarda
    if (message._isMediaOptimistic) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            opacity: 0.7,
          }}
        >
          <CircularProgress size={16} style={{ color: "#aaa" }} />
          <span style={{ fontSize: 13, color: "#aaa" }}>Enviando...</span>
        </div>
      );
    }

    const isAudioMessage = (message) => {
      if (message.mediaType === "audio") {
        console.log(
          "🎵 Detectado como áudio pelo mediaType:",
          message.mediaType,
        );
        return true;
      }
      if (message.mediaUrl) {
        const audioExtensions = [
          ".mp3",
          ".wav",
          ".ogg",
          ".m4a",
          ".aac",
          ".webm",
        ];
        const url = message.mediaUrl.toLowerCase();
        const hasAudioExtension = audioExtensions.some((ext) =>
          url.includes(ext),
        );
        if (hasAudioExtension) {
          console.log("🎵 Detectado como áudio pela URL:", url);
          return true;
        }
      }
      if (message.body && typeof message.body === "string") {
        const body = message.body.toLowerCase();
        const isAudioBody =
          body.includes("áudio gravado") ||
          body.includes("audio_") ||
          body.includes("🎵") ||
          body.includes("arquivo de áudio") ||
          body.includes("mensagem de voz");
        if (isAudioBody) {
          console.log("🎵 Detectado como áudio pelo body:", body);
          return true;
        }
      }
      return false;
    };

    if (message.mediaType === "template") {
      return <Template message={message} />;
    } else if (
      message.mediaType === "locationMessage" &&
      message.body.split("|").length >= 2
    ) {
      let locationParts = message.body.split("|");
      let imageLocation = locationParts[0];
      let linkLocation = locationParts[1];
      let descriptionLocation =
        locationParts.length > 2 ? locationParts[2] : null;
      return (
        <LocationPreview
          image={imageLocation}
          link={linkLocation}
          description={descriptionLocation}
        />
      );
    } else if (message.mediaType === "contactMessage") {
      let array = message.body.split("\n");
      let obj = [];
      let contact = "";
      for (let index = 0; index < array.length; index++) {
        const v = array[index];
        let values = v.split(":");
        for (let ind = 0; ind < values.length; ind++) {
          if (values[ind].indexOf("+") !== -1) {
            obj.push({ number: values[ind] });
          }
          if (values[ind].indexOf("FN") !== -1) {
            contact = values[ind + 1];
          }
        }
      }
      return (
        <VcardPreview
          contact={contact}
          numbers={obj[0]?.number}
          queueId={message?.ticket?.queueId}
          whatsappId={message?.ticket?.whatsappId}
          channel={channel}
        />
      );
    } else if (message.mediaType === "adMetaPreview") {
      console.log("Entrou no MetaPreview");
      let [image, sourceUrl, title, body, messageUser] =
        message.body.split("|");
      if (!messageUser || messageUser.trim() === "") {
        messageUser =
          "Olá! Tenho interesse e queria mais informações, por favor.";
      }
      return (
        <AdMetaPreview
          image={image}
          sourceUrl={sourceUrl}
          title={title}
          body={body}
          messageUser={messageUser}
        />
      );
    } else if (isPdfUrl(message.mediaUrl, message.body, message.mediaType)) {
      console.log("📄 Renderizando como documento/PDF:", message.id);
      const pdfInfo = extractPdfInfoFromMessage(message);
      return (
        <PdfPreview
          url={pdfInfo.url}
          filename={pdfInfo.filename}
          size={pdfInfo.size}
          mediaType={pdfInfo.mediaType}
          onDownload={(url, name) => {
            console.log("📥 Download PDF solicitado:", { url, name });
            downloadPdf(url, name);
          }}
        />
      );
    } else if (isAudioMessage(message)) {
      console.log("🎵 Renderizando como áudio:", message.id);
      return (
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            padding: "8px",
            backgroundColor: "transparent",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <AudioModal url={message.mediaUrl} message={message} />
        </div>
      );
    } else if (
      message.mediaType === "sticker" ||
      (message.body === "sticker" && message.mediaUrl?.endsWith(".webp"))
    ) {
      return (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={message.mediaUrl}
            alt="sticker"
            style={{
              width: 190,
              height: 190,
              objectFit: "contain",
              display: "block",
              background: "transparent",
              borderRadius: 8,
            }}
          />
        </div>
      );
    } else if (message.mediaType === "image") {
      if (process.env.NODE_ENV === "development")
        console.log("🖼️ Renderizando como imagem");
      // Verifica se tem legenda
      const hasCaption =
        message.body &&
        message.body.trim() !== "" &&
        message.body !== getBasename(message.mediaUrl);

      const imgWidth = imageDimensions[message.id];
      // Se tiver dimensões e for landscape (mais largo que alto), usa maxWidth maior
      const isLandscape =
        imgWidth && imageDimensions[`${message.id}_ratio`] < 1;

      return (
        <ModalImageCors
          imageUrl={message.mediaUrl}
          onDimensions={(w, ratio) =>
            setImageDimensions((prev) => ({
              ...prev,
              [message.id]: w,
              [`${message.id}_ratio`]: ratio, // ← salva o ratio também
            }))
          }
          style={{
            borderBottomLeftRadius: hasCaption ? "0px" : "8px",
            borderBottomRightRadius: hasCaption ? "0px" : "8px",
          }}
        />
      );
    } else if (message.mediaType === "video") {
      if (process.env.NODE_ENV === "development")
        console.log("🎥 Renderizando como vídeo");
      return <ModalVideoCors videoUrl={message.mediaUrl} message={message} />;
    } else if (message.mediaUrl) {
      console.log("📎 Renderizando como download genérico");
      return (
        <>
          <div className={classes.downloadMedia}>
            <Button
              startIcon={<GetApp />}
              variant="outlined"
              onClick={() =>
                downloadPdf(message.mediaUrl, message.body || "arquivo")
              }
            >
              Download
            </Button>
          </div>
          <Divider />
        </>
      );
    }
    return null;
  };

  const renderMessageAck = (message) => {
    if (message.ack === 0) {
      return <AccessTime fontSize="small" className={classes.ackIcons} />;
    } else if (message.ack === 1) {
      return <Done fontSize="small" className={classes.ackIcons} />;
    } else if (message.ack === 2 || message.ack === 3) {
      return <DoneAll fontSize="small" className={classes.ackIcons} />;
    } else if (message.ack === 4) {
      return (
        <DoneAll
          fontSize="small"
          className={
            message.mediaType === "audio"
              ? classes.ackPlayedIcon
              : classes.ackDoneAllIcon
          }
        />
      );
    } else if (message.ack === 5) {
      return <DoneAll fontSize="small" className={classes.ackDoneAllIcon} />;
    }
  };

  const renderDailyTimestamps = (message, index) => {
    const today = format(new Date(), "dd/MM/yyyy");

    if (index === 0) {
      return (
        <span
          className={classes.dailyTimestamp}
          key={`timestamp-${message.id}`}
        >
          <div className={classes.dailyTimestampText}>
            {today ===
            format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")
              ? "HOJE"
              : format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
          </div>
        </span>
      );
    } else if (index < messagesList.length - 1) {
      let messageDay = parseISO(messagesList[index].createdAt);
      let previousMessageDay = parseISO(messagesList[index - 1].createdAt);
      if (!isSameDay(messageDay, previousMessageDay)) {
        return (
          <span
            className={classes.dailyTimestamp}
            key={`timestamp-${message.id}`}
          >
            <div className={classes.dailyTimestampText}>
              {today ===
              format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")
                ? "HOJE"
                : format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
            </div>
          </span>
        );
      }
    } else if (index === messagesList.length - 1) {
      console.log(
        "📌 [lastMessageRef] atribuído à msg index:",
        index,
        "id:",
        message.id,
        "createdAt:",
        message.createdAt,
        "total msgs:",
        messagesList.length,
      );

      return (
        <div
          key={`ref-${message.id}`}
          // ref={lastMessageRef}
          style={{ float: "left", clear: "both" }}
        />
      );
    }
  };

  const renderTicketsSeparator = (message, index) => {
    let lastTicket = messagesList[index - 1]?.ticketId;
    let currentTicket = message.ticketId;

    if (lastTicket !== currentTicket && lastTicket !== undefined) {
      if (message?.ticket?.queue) {
        return (
          <span
            className={classes.currentTick}
            key={`timestamp-${message.id}a`}
          >
            <div
              className={classes.currentTicktText}
              style={{
                backgroundColor: message?.ticket?.queue?.color || "grey",
              }}
            >
              #{i18n.t("ticketsList.called")} {message?.ticketId} -{" "}
              {message?.ticket?.queue?.name}
            </div>
          </span>
        );
      } else {
        return (
          <span
            className={classes.currentTick}
            key={`timestamp-${message.id}b`}
          >
            <div
              className={classes.currentTicktText}
              style={{ backgroundColor: "grey" }}
            >
              #{i18n.t("ticketsList.called")} {message.ticketId} -{" "}
              {i18n.t("ticketsList.noQueue")}
            </div>
          </span>
        );
      }
    }
  };

  const renderMessageDivider = (message, index) => {
    if (index < messagesList.length && index > 0) {
      let messageUser = messagesList[index].fromMe;
      let previousMessageUser = messagesList[index - 1].fromMe;
      if (messageUser !== previousMessageUser) {
        return (
          <span style={{ marginTop: 16 }} key={`divider-${message.id}`}></span>
        );
      }
    }
  };

  const renderQuotedMessage = (message) => {
    return (
      <div
        className={clsx(classes.quotedContainerLeft, {
          [classes.quotedContainerRight]: message.fromMe,
        })}
      >
        <span
          className={clsx(classes.quotedSideColorLeft, {
            [classes.quotedSideColorRight]: message.quotedMsg?.fromMe,
          })}
        ></span>
        <div className={classes.quotedMsg}>
          {!message.quotedMsg?.fromMe && (
            <span className={classes.messageContactName}>
              {message.quotedMsg?.contact?.name}
            </span>
          )}
          {message.quotedMsg.mediaType === "audio" && (
            <div className={classes.downloadMedia}>
              <AudioModal url={message.quotedMsg.mediaUrl} />
            </div>
          )}
          {message.quotedMsg.mediaType === "video" && (
            <div style={{ maxWidth: "300px", width: "100%" }}>
              <video
                className={classes.messageMedia}
                src={message.quotedMsg.mediaUrl}
                controls
                preload="metadata"
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "200px",
                  borderRadius: "6px",
                  backgroundColor: "#f0f0f0",
                }}
                onError={(e) => {
                  console.error("❌ Erro ao carregar vídeo citado:", e);
                }}
              >
                <source src={message.quotedMsg.mediaUrl} type="video/mp4" />
                <source src={message.quotedMsg.mediaUrl} type="video/webm" />
                <source src={message.quotedMsg.mediaUrl} type="video/ogg" />
                <div
                  style={{
                    padding: "10px",
                    textAlign: "center",
                    fontSize: "12px",
                    color: "#999",
                  }}
                >
                  ❌ Erro ao carregar vídeo
                </div>
              </video>
            </div>
          )}
          {message.quotedMsg.mediaType === "contactMessage" && "Contato"}
          {message.quotedMsg.mediaType === "application" && (
            <div className={classes.downloadMedia}>
              <Button
                startIcon={<GetApp />}
                variant="outlined"
                target="_blank"
                href={message.quotedMsg.mediaUrl}
              >
                Download
              </Button>
            </div>
          )}
          {(message.quotedMsg.mediaType === "image" && (
            <ModalImageCors imageUrl={message.quotedMsg.mediaUrl} />
          )) ||
            message.quotedMsg?.body}
          {!message.quotedMsg.mediaType === "image" && message.quotedMsg?.body}
        </div>
      </div>
    );
  };

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      const hasFiles =
        event.dataTransfer &&
        event.dataTransfer.types &&
        (event.dataTransfer.types.includes("Files") ||
          event.dataTransfer.types.includes("application/x-moz-file"));

      if (hasFiles) {
        if (dragTimeout) {
          clearTimeout(dragTimeout);
        }
        const timeout = setTimeout(() => {
          if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
            setDragActive(true);
          }
        }, 100);
        setDragTimeout(timeout);
      }
    } else if (event.type === "dragleave") {
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        setDragTimeout(null);
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false);
      }
    }
  };

  const isYouTubeLink = (url) => {
    const youtubeRegex =
      /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    setDragActive(false);

    if (
      event.dataTransfer.files &&
      event.dataTransfer.files.length > 0 &&
      event.dataTransfer.files[0] instanceof File
    ) {
      if (onDrop) {
        onDrop(event.dataTransfer.files);
      }
    }
  };

  const xmlRegex = /<([^>]+)>/g;
  const boldRegex = /\*(.*?)\*/g;

  const formatXml = (xmlString) => {
    if (boldRegex.test(xmlString)) {
      xmlString = xmlString.replace(boldRegex, "**$1**");
    }
    return xmlString;
  };

  const renderReactions = (message) => {
    if (!message.reactions || message.reactions.length === 0) return null;

    const myReactions = message.reactions.filter(
      (r) => String(r.userId) === String(user.id),
    );
    const contactReactions = message.reactions.filter(
      (r) => String(r.userId) !== String(user.id),
    );
    const orderedReactions = [...myReactions, ...contactReactions];
    const total = orderedReactions.length;

    // ✅ SEM position absolute aqui — o pai controla o posicionamento
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderRadius: 16,
          padding: "2px 6px",
          fontSize: 13,
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          cursor: "pointer",
        }}
      >
        {orderedReactions.map((reaction) => (
          <span key={`${reaction.id}-${reaction.userId}-${reaction.emoji}`}>
            {reaction.emoji}
          </span>
        ))}
        {total > 1 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            {total}
          </span>
        )}
      </div>
    );
  };

  // // ─── helper fora do renderMessages ───────────────────────────────────────────
  // const getTimestampSpacerWidth = (message) => {
  //   // "HH:mm" ≈ 34px + gaps
  //   let w = 38;
  //   if (message.fromMe) w += 20; // ack icon
  //   if (message.isEdited) w += 46; // "Editada "
  //   return w;
  // };

  const renderTextBlock = (message, isAfterMedia = false) => {
    const isImageOrVideo =
      message.mediaType === "image" || message.mediaType === "video";
    const hasCaption =
      message.body &&
      message.body.trim() !== "" &&
      message.body !== getBasename(message.mediaUrl);

    if (isImageOrVideo && !hasCaption) return null;
    if (isAudioType(message) && !message.quotedMsg) return null;

    const skipTextTypes = [
      "audio",
      "reactionMessage",
      "locationMessage",
      "contactMessage",
      "template",
    ];
    const hasTextContent =
      !skipTextTypes.includes(message.mediaType) &&
      !isSticker(message) &&
      !(isImageOrVideo && getBasename(message.mediaUrl) === message.body);

    if (!hasTextContent) return null;

    return (
      <div
        style={{
          position: "relative",
          padding: "6px 7px 4px 9px",
          boxSizing: "border-box",
          width: "100%",
          minWidth: 0,
          lineHeight: "normal",
          overflow: "hidden",
        }}
      >
        {message.quotedMsg && renderQuotedMessage(message)}

        {!message._isMediaOptimistic && hasTextContent && (
          <>
            {/* Texto com paddingRight para NÃO chegar no timestamp */}
            <div
              style={{
                fontSize: "14px",
                lineHeight: "19px",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
                unicodeBidi: "isolate",
                display: "block",
                // ✅ ESSENCIAL: Reserva espaço para o timestamp
                paddingRight: message.fromMe
                  ? message.isEdited
                    ? "105px"
                    : "62px" // Right: mais espaço
                  : message.isEdited
                    ? "80px"
                    : "40px",
              }}
            >
              {xmlRegex.test(message.body) ? (
                <span>{formatXml(message.body)}</span>
              ) : (
                <MarkdownWrapper>{message.body}</MarkdownWrapper>
              )}
            </div>

            {/* Timestamp com FLOAT RIGHT */}
            <div
              style={{
                float: "right",
                marginTop: "-12px", // ← Ajuste fino: sobe mais
                marginBottom: "0px",
                marginLeft: message.isEdited ? "-15px" : "-5px",
                marginRight: "-5px",
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 12,
                lineHeight: "15px",
                color: message.fromMe ? "rgba(0,0,0,0.6)" : "#999",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 10,
                position: "relative",
                // border: "1px solid #ff0000",
              }}
            >
              {message.isEdited && (
                <span style={{ fontSize: 13, opacity: 0.8 }}>Editada</span>
              )}
              <span>{format(parseISO(message.createdAt), "HH:mm")}</span>
              {message.fromMe && renderMessageAck(message)}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMessages = () => {
    if (messagesList.length > 0) {
      const viewMessagesList = messagesList.map((message, index) => {
        if (message.mediaType === "call_log") {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderTicketsSeparator(message, index)}
              {renderMessageDivider(message, index)}
              <div className={classes.messageCenter}>
                <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton>
                {isGroup && (
                  <span className={classes.messageContactName}>
                    {message.contact?.name}
                  </span>
                )}
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 17"
                    width="20"
                    height="17"
                  >
                    <path
                      fill="#df3333"
                      d="M18.2 12.1c-1.5-1.8-5-2.7-8.2-2.7s-6.7 1-8.2 2.7c-.7.8-.3 2.3.2 2.8.2.2.3.3.5.3 1.4 0 3.6-.7 3.6-.7.5-.2.8-.5.8-1v-1.3c.7-1.2 5.4-1.2 6.4-.1l.1.1v1.3c0 .2.1.4.2.6.1.2.3.3.5.4 0 0 2.2.7 3.6.7.2 0 1.4-2 .5-3.1zM5.4 3.2l4.7 4.6 5.8-5.7-.9-.8L10.1 6 6.4 2.3h2.5V1H4.1v4.8h1.3V3.2z"
                    ></path>
                  </svg>{" "}
                  <span>
                    {i18n.t("ticketsList.missedCall")}{" "}
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        }

        if (!message.fromMe) {
          const isImageOrVideo =
            message.mediaType === "image" || message.mediaType === "video";
          const hasCaption =
            message.body &&
            message.body.trim() !== "" &&
            message.body !== getBasename(message.mediaUrl);
          const isAfterMedia = isImageOrVideo && hasCaption;
          const isImageNoCaption = isImageOrVideo && !hasCaption;
          const isStickerOnly = isSticker(message) && !message.quotedMsg;

          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderTicketsSeparator(message, index)}
              {renderMessageDivider(message, index)}

              <div
                className={classes.messageWrapper}
                style={{ justifyContent: "flex-start" }}
              >
                {/* ── BALÃO ── */}
                <div
                  data-message-container
                  data-message-id={message.id}
                  className={clsx(classes.messageLeft, {
                    [classes.messageWithReaction]:
                      message.reactions && message.reactions.length > 0,
                  })}
                  title={message.queueId && message.queue?.name}
                  onDoubleClick={(e) => hanldeReplyMessage(e, message)}
                  style={{
                    minWidth:
                      message.body?.length <= 3
                        ? "40px"
                        : message.body?.length <= 10
                          ? "60px"
                          : "100px",
                    ...(isStickerOnly
                      ? {
                          backgroundColor: "transparent",
                          boxShadow: "none",
                          padding: 0,
                          minWidth: "unset",
                          display: "inline-block",
                        }
                      : {}),
                    ...(isImageOrVideo && imageDimensions[message.id]
                      ? { maxWidth: imageDimensions[message.id] + 10 }
                      : {}),
                  }}
                >
                  {showSelectMessageCheckbox && (
                    <SelectMessageCheckbox message={message} />
                  )}

                  <IconButton
                    variant="contained"
                    size="small"
                    id="messageActionsButton"
                    disabled={message.isDeleted}
                    className={classes.messageActionsButton}
                    onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                  >
                    <ExpandMore />
                  </IconButton>

                  {message.isForwarded && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px 2px 8px",
                        fontSize: 12,
                        fontStyle: "italic",
                        color: "#999",
                      }}
                    >
                      <Reply
                        style={{
                          fontSize: 14,
                          color: "grey",
                          transform: "scaleX(-1)",
                        }}
                      />
                      Encaminhada
                    </div>
                  )}

                  {isGroup && (
                    <span className={classes.messageContactName}>
                      {message.contact?.name}
                    </span>
                  )}

                  {isYouTubeLink(message.body) && (
                    <YouTubePreview videoUrl={message.body} />
                  )}

                  {!lgpdDeleteMessage && message.isDeleted && (
                    <span className={classes.deletedMessage}>
                      🚫 Essa mensagem foi apagada pelo contato &nbsp;
                    </span>
                  )}

                  {(message.mediaUrl ||
                    message._isMediaOptimistic ||
                    message.mediaType === "locationMessage" ||
                    message.mediaType === "contactMessage" ||
                    isSticker(message) ||
                    message.mediaType === "template" ||
                    message.mediaType === "adMetaPreview") && (
                    <div
                      style={{
                        marginBottom: 0,
                        paddingBottom: 0,
                        display: isAudioType(message) ? "normal" : "block", // ← era "grid"
                        lineHeight:
                          isAudioType(message) || isImageOrVideo ? "normal" : 0,
                        fontSize:
                          isAudioType(message) || isImageOrVideo
                            ? "inherit"
                            : 0,
                        boxSizing: "border-box",
                        position: "relative",
                        overflow: "hidden",
                        borderBottomLeftRadius: isAfterMedia ? "0px" : "8px",
                        borderBottomRightRadius: isAfterMedia ? "0px" : "8px",
                      }}
                    >
                      {checkMessageMedia(message)}
                      {isImageNoCaption && (
                        <span
                          className={classes.timestampMedia}
                          style={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            zIndex: 10,
                          }}
                        >
                          {message.isEdited && (
                            <span style={{ fontSize: 10 }}>Editada</span>
                          )}
                          {format(parseISO(message.createdAt), "HH:mm")}
                          {/* {renderMessageAck(message)} */}
                        </span>
                      )}
                    </div>
                  )}

                  {!isStickerOnly && renderTextBlock(message, isAfterMedia)}

                  {isStickerOnly && (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 2,
                          paddingRight: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#999",
                            backgroundColor: "rgba(255,255,255,0.85)",
                            borderRadius: 8,
                            padding: "2px 6px",
                            boxShadow: "0 1px 1px rgba(0,0,0,0.12)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {format(parseISO(message.createdAt), "HH:mm")}
                        </span>
                      </div>
                      {message.reactions && message.reactions.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: -3,
                            paddingRight: 4,
                          }}
                        >
                          {renderReactions(message)}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* ── fim balão ── */}

                {/* Área de ações — irmã do balão, à direita */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                    alignSelf: "center", // ← alinha na base do balão
                    marginLeft: -14,
                    marginBottom: -2,
                    paddingBottom: message.reactions?.length > 0 ? 20 : 0,
                    zIndex: 30,
                    position: "relative",
                  }}
                >
                  {/* Botão encaminhar — só imagem/vídeo */}
                  {isImageOrVideo && !isStickerOnly && (
                    <div
                      className={classes.reactionActionBtn}
                      style={{ opacity: 1 }} // ← força sempre visível
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMessages([message]);
                        setForwardMessageModalOpen(true);
                      }}
                    >
                      <Reply
                        style={{
                          fontSize: 16,
                          transform: "scaleX(-1)",
                          color: "#555",
                        }}
                      />
                    </div>
                  )}

                  {/* Botão reação */}
                  <div
                    className={classes.reactionActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      openReactionBar(
                        message,
                        document.querySelector(
                          `[data-message-id="${message.id}"]`,
                        ),
                      );
                    }}
                  >
                    <EmojiEmotionsOutlinedIcon
                      fontSize="small"
                      style={{ color: "#555" }}
                    />
                  </div>
                </div>

                {/* ── REAÇÕES — abaixo do balão ── */}
                {!isStickerOnly &&
                  message.reactions &&
                  message.reactions.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 4,
                        left: 8,
                        zIndex: 10,
                      }}
                    >
                      {renderReactions(message)}
                    </div>
                  )}
              </div>
            </React.Fragment>
          );
        } else {
          const isImageOrVideo =
            message.mediaType === "image" || message.mediaType === "video";
          const hasCaption =
            message.body &&
            message.body.trim() !== "" &&
            message.body !== getBasename(message.mediaUrl);
          const isAfterMedia = isImageOrVideo && hasCaption;
          const isImageNoCaption = isImageOrVideo && !hasCaption;
          const isStickerOnly = isSticker(message) && !message.quotedMsg;

          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderTicketsSeparator(message, index)}
              {renderMessageDivider(message, index)}

              <div
                className={classes.messageWrapper}
                style={{ justifyContent: "flex-end" }}
              >
                {/* Área de ações — irmã do balão, à esquerda */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                    alignSelf: "center", // ← alinha na base do balão
                    marginRight: -14,
                    marginBottom: -2,
                    paddingBottom: message.reactions?.length > 0 ? 20 : 0,
                    zIndex: 30,
                    position: "relative",
                  }}
                >
                  {/* Botão reação */}
                  <div
                    className={classes.reactionActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      openReactionBar(
                        message,
                        document.querySelector(
                          `[data-message-id="${message.id}"]`,
                        ),
                      );
                    }}
                  >
                    <EmojiEmotionsOutlinedIcon
                      fontSize="small"
                      style={{ color: "#555" }}
                    />
                  </div>
                  {/* Botão encaminhar — só imagem/vídeo */}
                  {isImageOrVideo && !isStickerOnly && (
                    <div
                      className={classes.reactionActionBtn}
                      style={{ opacity: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMessages([message]);
                        setForwardMessageModalOpen(true);
                      }}
                    >
                      <Reply
                        style={{
                          fontSize: 16,
                          transform: "scaleX(-1)",
                          color: "#555",
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* ── BALÃO ── */}
                <div
                  data-message-container
                  data-message-id={message.id}
                  className={clsx(
                    message.isPrivate
                      ? classes.messageRightPrivate
                      : classes.messageRight,
                    {
                      [classes.messageWithReaction]:
                        message.reactions && message.reactions.length > 0,
                    },
                  )}
                  title={message.queueId && message.queue?.name}
                  onDoubleClick={(e) => hanldeReplyMessage(e, message)}
                  style={{
                    ...(isStickerOnly
                      ? {
                          backgroundColor: "transparent",
                          boxShadow: "none",
                          padding: 0,
                          minWidth: "unset",
                          display: "inline-block",
                        }
                      : {}),
                    ...(isImageOrVideo && imageDimensions[message.id]
                      ? { maxWidth: imageDimensions[message.id] + 10 }
                      : {}),
                  }}
                >
                  {showSelectMessageCheckbox && (
                    <SelectMessageCheckbox message={message} />
                  )}

                  <IconButton
                    variant="contained"
                    size="small"
                    id="messageActionsButton"
                    disabled={message.isDeleted}
                    className={classes.messageActionsButton}
                    onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                  >
                    <ExpandMore />
                  </IconButton>

                  {message.isForwarded && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px 2px 8px",
                        fontSize: 12,
                        fontStyle: "italic",
                        color: "#999",
                      }}
                    >
                      <Reply
                        style={{
                          fontSize: 14,
                          color: "grey",
                          transform: "scaleX(-1)",
                        }}
                      />
                      Encaminhada
                    </div>
                  )}
                  {isYouTubeLink(message.body) && (
                    <YouTubePreview videoUrl={message.body} />
                  )}

                  {!lgpdDeleteMessage && message.isDeleted && (
                    <span className={classes.deletedMessage}>
                      🚫 Essa mensagem foi apagada &nbsp;
                    </span>
                  )}

                  {(message.mediaUrl ||
                    message._isMediaOptimistic ||
                    message.mediaType === "locationMessage" ||
                    isSticker(message) ||
                    message.mediaType === "contactMessage" ||
                    message.mediaType === "template") && (
                    <div
                      style={{
                        marginBottom: 0,
                        paddingBottom: 0,
                        display: isAudioType(message) ? "block" : "block", // ← era "flex"
                        lineHeight:
                          isAudioType(message) || isImageOrVideo ? "normal" : 0,
                        fontSize:
                          isAudioType(message) || isImageOrVideo
                            ? "inherit"
                            : 0,
                        boxSizing: "border-box",
                        position: "relative",
                        overflow: "hidden",
                        borderBottomLeftRadius: isAfterMedia ? "0px" : "8px",
                        borderBottomRightRadius: isAfterMedia ? "0px" : "8px",
                      }}
                    >
                      {checkMessageMedia(message)}
                      {isImageNoCaption && (
                        <span
                          className={classes.timestampMedia}
                          style={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            zIndex: 10,
                          }}
                        >
                          {message.isEdited && (
                            <span style={{ fontSize: 10 }}>Editada</span>
                          )}
                          {format(parseISO(message.createdAt), "HH:mm")}
                          {renderMessageAck(message)}
                        </span>
                      )}
                    </div>
                  )}

                  {!isStickerOnly && renderTextBlock(message, isAfterMedia)}

                  {isStickerOnly && (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 2,
                          paddingRight: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#999",
                            backgroundColor: "rgba(220,248,198,0.9)",
                            borderRadius: 8,
                            padding: "2px 6px",
                            boxShadow: "0 1px 1px rgba(0,0,0,0.12)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {format(parseISO(message.createdAt), "HH:mm")}
                          <span
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {renderMessageAck(message)}
                          </span>
                        </span>
                      </div>
                      {message.reactions && message.reactions.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: 4,
                            paddingRight: 4,
                          }}
                        >
                          {renderReactions(message)}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* ── fim balão ── */}

                {/* ── REAÇÕES — abaixo do balão ── */}
                {!isStickerOnly &&
                  message.reactions &&
                  message.reactions.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 4,
                        right: 8,
                        zIndex: 10,
                      }}
                    >
                      {renderReactions(message)}
                    </div>
                  )}
              </div>
            </React.Fragment>
          );
        }
      });
      return viewMessagesList;
    } else {
      return <div>Diga olá para seu novo contato!</div>;
    }
  };

  const shouldBlurMessages =
    ticketStatus === "pending" &&
    user.allowSeeMessagesInPendingTickets === "disabled";

  return (
    <div className={classes.messagesListWrapper} onDragEnter={handleDrag}>
      {dragActive && (
        <div
          className={classes.dragElement}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          Solte o arquivo aqui
        </div>
      )}

      <MessageOptionsMenu
        message={selectedMessage}
        anchorEl={anchorEl}
        menuOpen={messageOptionsMenuOpen}
        handleClose={handleCloseMessageOptionsMenu}
        isGroup={isGroup}
        whatsappId={whatsappId}
        queueId={queueId}
        onReact={openReactionBar}
      />

      <Popover
        open={Boolean(reactionBar)}
        anchorEl={reactionBar?.anchorEl}
        onClose={() => setReactionBar(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        sx={(muiTheme) => ({
          "& .MuiPaper-root": {
            borderRadius: "28px",
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: 1,
            overflow: "hidden",
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[4],
          },
        })}
      >
        {(() => {
          const reactionMessage = Array.isArray(messagesList)
            ? messagesList.find((m) => m.id === reactionBar?.messageId)
            : null;

          const myReaction =
            reactionMessage?.reactions?.find(
              (r) => r.userId === user.id || r.user?.id === user.id,
            ) || null;

          const myEmoji = myReaction?.emoji || null;

          const messageForReaction = reactionMessage
            ? {
                ...reactionMessage,
                wid: reactionBar?.messageWid,
              }
            : null;

          return (
            <>
              {QUICK_REACTIONS.map((emoji) => {
                const isActive = myEmoji === emoji;

                return (
                  <span
                    key={emoji}
                    className={`${classes.reactionEmoji} ${isActive ? classes.reactionEmojiActive : ""}`}
                    onClick={() => {
                      handleSendReaction(messageForReaction, emoji);
                      setReactionBar(null);
                    }}
                  >
                    {emoji}
                  </span>
                );
              })}
              <span
                className={classes.reactionAddButton}
                onClick={() => {
                  if (!reactionBar) return;

                  const reactionMessage = messagesList.find(
                    (m) => m.id === reactionBar.messageId,
                  );

                  setReactionPicker({
                    messageId: reactionBar.messageId,
                    messageWid: reactionBar.messageWid,
                    anchorEl: reactionBar.anchorEl,
                    fromMe: reactionMessage?.fromMe,
                  });

                  setReactionBar(null);
                }}
              >
                +
              </span>
            </>
          );
        })()}
      </Popover>

      <Popover
        open={Boolean(reactionPicker)}
        anchorEl={reactionPicker?.anchorEl}
        onClose={() => setReactionPicker(null)}
        marginThreshold={0}
        anchorOrigin={{
          vertical: "top",
          horizontal: reactionPicker?.fromMe ? "right" : "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: reactionPicker?.fromMe ? "right" : "left",
        }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              height: 420,
              borderRadius: 3,
              overflow: "hidden",
            },
          },
        }}
      >
        {(() => {
          const reactionMessage = Array.isArray(messagesList)
            ? messagesList.find((m) => m.id === reactionPicker?.messageId)
            : null;

          const messageForReaction = reactionMessage
            ? {
                ...reactionMessage,
                wid: reactionPicker?.messageWid,
              }
            : null;

          return (
            <ClickAwayListener onClickAway={() => setReactionPicker(null)}>
              <div
                className={classes.emojiPickerFullOverride}
                style={{ width: "100%", height: "100%" }}
              >
                <Picker
                  perLine={9}
                  emojiSize={22}
                  showSkinTones={true}
                  showPreview={false}
                  title=""
                  emoji=""
                  native
                  theme="light"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  onSelect={(emojiData) => {
                    handleSendReaction(messageForReaction, emojiData.native);
                    setReactionPicker(null);
                  }}
                />
              </div>
            </ClickAwayListener>
          );
        })()}
      </Popover>

      <div
        id="messagesList"
        className={classes.messagesList}
        onScroll={handleScroll}
        style={{
          filter: shouldBlurMessages ? "blur(4px)" : "none",
          pointerEvents: shouldBlurMessages ? "none" : "auto",
        }}
      >
        {messagesList.length > 0 ? renderMessages() : []}
        {/* Indicador de presença — digitando / gravando */}
        {renderPresenceIndicator()}

        {/* ancora de scroll */}
        <div ref={lastMessageRef} style={{ float: "left", clear: "both" }} />
      </div>

      {channel !== "whatsapp" && channel !== undefined && (
        <div
          style={{
            width: "100%",
            display: "flex",
            padding: "10px",
            alignItems: "center",
            backgroundColor: "#E1F3FB",
          }}
        >
          {channel === "facebook" ? (
            <Facebook />
          ) : channel === "instagram" ? (
            <Instagram />
          ) : (
            <WhatsApp />
          )}
          <span>
            Você tem 24h para responder após receber uma mensagem, de acordo com
            as políticas da Meta.
          </span>
        </div>
      )}

      {loading && (
        <div>
          <CircularProgress className={classes.circleLoading} />
        </div>
      )}
      <ForwardMessageBar onForward={() => setForwardMessageModalOpen(true)} />
    </div>
  );
};

export default MessagesList;
