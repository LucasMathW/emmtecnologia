/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
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
import { getEffectiveConstraintOfTypeParameter, NewLineKind } from "typescript";
import EmojiEmotionsOutlinedIcon from "@material-ui/icons/EmojiEmotionsOutlined";
import Box from "@material-ui/core/Box";
import ForwardMessageBar from "../ForwardMessageBar";

const useStyles = makeStyles((theme) => ({
  emojiPickerOverride: {
    "& .emoji-mart": {
      width: "100% !important",
    },
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
    display: "none",
    zIndex: 20,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
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
      theme.palette.mode === "dark"
        ? theme.palette.grey[700]
        : theme.palette.grey[300],
    color: theme.palette.text.primary,
    transition: "background-color 0.15s ease, transform 0.1s ease",
    "&:hover": {
      backgroundColor: theme.palette.action.selected,
      transform: "scale(1.05)",
    },
  },

  reactionButtonRight: {
    display: "none",
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
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
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
    backgroundColor: "#e4e6eb",
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
    paddingBottom: 14,
    marginRight: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: "min(600px, 90vw)",
    height: "auto",
    display: "block",
    position: "relative",
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
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
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
  messageRight: {
    position: "relative",
    paddingBottom: 14,
    marginLeft: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: "min(600px, 90vw)",
    height: "auto",
    display: "block",
    position: "relative",
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
    alignSelf: "flex-end",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 0,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow:
      theme.mode === "light" ? "0 1px 1px #b3b3b3" : "0 1px 1px #000000",
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
    alignSelf: "flex-end",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 0,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
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
    position: "relative",
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
  textContentItem: {
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },
  textContentItemDeleted: {
    fontStyle: "italic",
    color: "rgba(0, 0, 0, 0.36)",
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },
  messageMedia: {
    width: 400,
    height: "auto",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    "&[controls]": {
      objectFit: "contain",
    },
  },
  timestamp: {
    fontSize: 11,
    position: "absolute",
    bottom: 0,
    right: 5,
    color: "#999",
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

// const reducer = (state, action) => {
//   if (action.type === "LOAD_MESSAGES") {
//     const messages = action.payload;
//     const newMessages = [];

//     messages.forEach((message) => {
//       const messageIndex = state.findIndex((m) => m.id === message.id);
//       if (messageIndex !== -1) {
//         state[messageIndex] = message;
//       } else {
//         newMessages.push(message);
//       }
//     });

//     return [...newMessages, ...state];
//   }

//   if (action.type === "ADD_MESSAGE") {
//     const newMessage = action.payload;

//     // 🔥 1. Tentar match pelo tempId que vem no campo _tempId da mensagem real
//     // (quando o backend ecoa de volta, ou via socket)
//     const messageIndex = state.findIndex((m) => m.id === newMessage.id);
//     if (messageIndex !== -1) {
//       // Atualiza existente
//       const updated = [...state];
//       updated[messageIndex] = newMessage;
//       return updated;
//     }

//     // 🔥 2. Match para mensagens de texto: id temp + body igual
//     const tempTextIndex = state.findIndex(
//       (m) =>
//         String(m.id).startsWith("temp-") &&
//         m.fromMe &&
//         !m.mediaUrl &&
//         !m._isMediaOptimistic &&
//         m.body === newMessage.body,
//     );
//     if (tempTextIndex !== -1) {
//       const updated = [...state];
//       updated[tempTextIndex] = newMessage;
//       return updated;
//     }

//     // 🔥 3. Match para mídia: pegar o temp mais antigo do mesmo mediaType
//     //    Isso garante FIFO — se o usuário enviou 2 áudios em sequência,
//     //    o primeiro temp é substituído pelo primeiro real que chegar.
//     if (newMessage.mediaType && newMessage.mediaType !== "text") {
//       const tempMediaIndex = state.findIndex(
//         (m) =>
//           String(m.id).startsWith("temp-") &&
//           m.fromMe &&
//           m._isMediaOptimistic === true &&
//           m.mediaType === newMessage.mediaType,
//       );
//       if (tempMediaIndex !== -1) {
//         const updated = [...state];
//         updated[tempMediaIndex] = newMessage;
//         return updated;
//       }
//     }

//     // 🔥 4. Sem temp encontrado — comportamento normal
//     const messageIndex = state.findIndex((m) => m.id === newMessage.id);
//     if (messageIndex !== -1) {
//       const updated = [...state];
//       updated[messageIndex] = newMessage;
//       return updated;
//     }

//     return [...state, newMessage];
//   }

//   if (action.type === "ADD_OPTIMISTIC_MESSAGE") {
//     return [...state, action.payload];
//   }

//   if (action.type === "UPDATE_MESSAGE") {
//     const messageToUpdate = action.payload;
//     return state.map((m) => {
//       if (m.id !== messageToUpdate.id) return m;
//       return {
//         ...m,
//         ...messageToUpdate,
//         ticket: m.ticket,
//         contact: m.contact,
//       };
//     });
//   }

//   if (action.type === "DELETE_MESSAGE") {
//     const messageId = action.payload;
//     return state.map((m) => {
//       if (m.id !== messageId) return m;
//       return {
//         ...m,
//         isDeleted: true,
//       };
//     });
//   }

//   if (action.type === "REACTION_UPDATE") {
//     console.log();
//     const { messageId, reaction } = action.payload;

//     return state.map((message) => {
//       if (String(message.id) !== String(messageId)) return message;

//       const reactions = Array.isArray(message.reactions)
//         ? message.reactions
//         : [];

//       const filtered = reactions.filter(
//         (r) => String(r.userId) !== String(reaction.userId),
//       );

//       if (!reaction.emoji) {
//         return {
//           ...message,
//           reactions: filtered,
//         };
//       }

//       return {
//         ...message,
//         reactions: [...filtered, reaction],
//       };
//     });
//   }

//   if (action.type === "RESET") {
//     return [];
//   }
// };

const reducer = (state, action) => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload;
    const newMessages = [];

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
  const [reactionPicker, setReactionPicker] = useState(null);
  const [messagesList, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const history = useHistory();
  const lastMessageRef = useRef();
  const messageRef = useRef(null);
  const messageRight = useRef(null);
  const presenceTimeoutRef = useRef(null);
  const ticketNumericIdRef = useRef(null);
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
  // Presença do contato (digitando, gravando, etc.)
  const [contactPresence, setContactPresence] = useState(null);
  const { selectedQueuesMessage } = useContext(QueueSelectedContext);
  const { downloadPdf, extractPdfInfoFromMessage, isPdfUrl } = usePdfViewer();
  const { showSelectMessageCheckbox, setForwardMessageModalOpen } = useContext(
    ForwardMessageContext,
  );
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
    dispatch({ type: "RESET" });
    setPageNumber(1);
    currentTicketId.current = ticketId;
    ticketNumericIdRef.current = null;
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

  useEffect(() => {
    let active = true;

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

        if (data.messages.length > 0) {
          ticketNumericIdRef.current = data.messages[0].ticketId;
        }

        if (!active) return;

        if (currentTicketId.current === ticketId) {
          dispatch({
            type: "LOAD_MESSAGES",
            payload: data.messages,
          });

          setHasMore(data.hasMore);
          setLoading(false);
          setLoadingMore(false);
        }

        if (pageNumber === 1 && data.messages.length > 1) {
          setTimeout(() => {
            if (active) scrollToBottom();
          }, 100);
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
        if (data.ticketId && String(data.ticketId) !== String(ticketId)) return;
        setContactPresence(data.status || null);
        if (data.status) {
          clearTimeout(presenceTimeoutRef.current);
          presenceTimeoutRef.current = setTimeout(
            () => setContactPresence(null),
            10_000,
          );
        } else {
          clearTimeout(presenceTimeoutRef.current);
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

      const msg = data.message;
      if (!msg) return;

      const chatTicketUuid = ticketId;
      const msgTicketUuid = msg.ticket?.uuid || msg.ticketUuid || null;
      const msgTicketId = String(msg.ticketId || msg.ticket?.id || "");
      const numericId = ticketNumericIdRef.current
        ? String(ticketNumericIdRef.current)
        : null;

      const isSameChat =
        String(msgTicketUuid) === String(chatTicketUuid) ||
        msgTicketId === String(chatTicketUuid) ||
        (numericId && msgTicketId === numericId); // ← chave do fix

      if (!isSameChat) return;

      if (data.action === "create") {
        setContactPresence(null);
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

  // Forçar entrada na sala quando o socket já está conectado ao montar
  // useEffect(() => {
  //   if (!ticketId || ticketId === "undefined") return;
  //   if (socket?.connected) {
  //     socket.emit("joinChatBox", `${ticketId}`);
  //   }
  // }, [ticketId]);

  useEffect(() => {
    return () => {
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, [dragTimeout]);

  // useEffect(() => {
  //   if (!ticketId || ticketId === "undefined" || !companyId) return;

  //   const eventAppMessage = `company-${companyId}-appMessage`;

  //   const onPresenceUpdate = (data) => {
  //     if (data.action !== "presence:update") return;
  //     if (!data.contactId) return;

  //     // O ticket precisa ter o contactId — buscamos via lastMessageRef ou via ticketId
  //     // A forma mais simples: comparar com o contact do ticket atual
  //     // O socket emite data.contactId — filtramos pelo ticketId via data.ticketId (se vier)
  //     // Fallback: aceitar qualquer presence enquanto esse chat estiver aberto
  //     if (data.ticketId && String(data.ticketId) !== String(ticketId)) return;

  //     setContactPresence(data.status || null);

  //     // Limpa automaticamente após 10s (segurança caso o "parou" não chegue)
  //     if (data.status) {
  //       clearTimeout(presenceTimeoutRef.current);
  //       presenceTimeoutRef.current = setTimeout(() => {
  //         setContactPresence(null);
  //       }, 10_000);
  //     } else {
  //       clearTimeout(presenceTimeoutRef.current);
  //     }
  //   };

  //   socket.on(eventAppMessage, onPresenceUpdate);

  //   return () => {
  //     socket.off(eventAppMessage, onPresenceUpdate);
  //     clearTimeout(presenceTimeoutRef.current);
  //   };
  // }, [ticketId, companyId]);

  const renderPresenceIndicator = () => {
    if (!contactPresence) return null;

    const isRecording =
      contactPresence === "recording" || contactPresence === "recording_audio";

    const isTyping =
      contactPresence === "composing" || contactPresence === "typing";

    if (!isTyping && !isRecording) return null;

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          marginLeft: 16,
          marginTop: 8,
          marginBottom: 12,
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
              <span className={classes.presenceText}>digitando...</span>
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
              <span className={classes.presenceText}>gravando áudio...</span>
            </>
          )}
        </div>
      </div>
    );
  };

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setPageNumber((prevPageNumber) => prevPageNumber + 1);
  };

  const isAtBottom = () => {
    const el = document.getElementById("messagesList");
    if (!el) return false;

    return el.scrollHeight - el.scrollTop - el.clientHeight < 20;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (lastMessageRef.current) {
        lastMessageRef.current.scrollIntoView({});
      }
    }, 100);
  };

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

    const messageContainer =
      anchorElement.closest?.("[data-message-container]") || anchorElement;

    setReactionBar({
      messageId: message.id,
      messageWid: message.wid,
      anchorEl: messageContainer,
    });
  };

  const handleOpenMessageOptionsMenu = (e, message) => {
    const messageContainer = e.currentTarget.closest(
      "[data-message-container]",
    );
    setAnchorEl(e.currentTarget);
    setSelectedMessage({
      ...message,
      _reactionAnchorEl: messageContainer,
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

  const checkMessageMedia = (message) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "checkMessageMedia:",
        message.id,
        "mediaType:",
        message.mediaType,
      );
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
              width: 150,
              height: 150,
              objectFit: "contain",
              display: "block",
              background: "transparent",
              borderRadius: 8,
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              fontSize: 11,
              color: "#fff",
              backgroundColor: "rgba(0,0,0,0.45)",
              borderRadius: 6,
              padding: "2px 4px",
              display: "flex",
              alignItems: "center",
              gap: 2,
              pointerEvents: "none",
            }}
          >
            {format(parseISO(message.createdAt), "HH:mm")}
            {message.fromMe && (
              <span style={{ display: "flex", alignItems: "center" }}>
                {renderMessageAck(message)}
              </span>
            )}
          </span>
        </div>
      );
    } else if (message.mediaType === "image") {
      if (process.env.NODE_ENV === "development")
        console.log("🖼️ Renderizando como imagem");
      return <ModalImageCors imageUrl={message.mediaUrl} />;
    } else if (message.mediaType === "video") {
      if (process.env.NODE_ENV === "development")
        console.log("🎥 Renderizando como vídeo");
      return (
        <div
          style={{
            maxWidth: "400px",
            width: "100%",
            position: "relative",
          }}
        >
          {videoLoading && !videoError && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CircularProgress size={30} />
              <Typography variant="caption" color="textSecondary">
                Carregando vídeo...
              </Typography>
            </div>
          )}

          <video
            className={classes.messageMedia}
            src={message.mediaUrl}
            controls
            preload="metadata"
            playsInline
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "300px",
              borderRadius: "8px",
              backgroundColor: "#f0f0f0",
              opacity: videoLoading ? 0.3 : 1,
              transition: "opacity 0.3s ease",
            }}
            onLoadStart={() => {
              console.log("⏳ Iniciando carregamento do vídeo");
              setVideoLoading(true);
              setVideoError(false);
            }}
            onLoadedData={() => {
              console.log("✅ Vídeo carregado e pronto");
              setVideoLoading(false);
            }}
            onCanPlay={() => {
              console.log("✅ Vídeo pronto para reprodução");
              setVideoLoading(false);
            }}
            onError={(e) => {
              console.error("❌ Erro ao carregar vídeo:", e);
              console.log("🔗 URL do vídeo:", message.mediaUrl);
              setVideoLoading(false);
              setVideoError(true);
            }}
          >
            <source src={message.mediaUrl} type="video/mp4" />
            <source src={message.mediaUrl} type="video/webm" />
            <source src={message.mediaUrl} type="video/ogg" />
            Seu navegador não suporta reprodução de vídeo.
          </video>

          {videoError && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                color: "#666",
                marginTop: "8px",
              }}
            >
              <Typography variant="body2" style={{ marginBottom: "12px" }}>
                ❌ Erro ao carregar vídeo
              </Typography>
              <Button
                startIcon={<GetApp />}
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = message.mediaUrl;
                  link.download = message.body || "video.mp4";
                  link.click();
                }}
                variant="outlined"
                size="small"
              >
                Baixar Vídeo
              </Button>
            </div>
          )}
        </div>
      );
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
      return (
        <div
          key={`ref-${message.id}`}
          ref={lastMessageRef}
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
    if (!message.reactions || message.reactions.length === 0) {
      return null;
    }

    const myReactions = message.reactions.filter(
      (r) => String(r.userId) === String(user.id),
    );

    const contactReactions = message.reactions.filter(
      (r) => String(r.userId) !== String(user.id),
    );

    const orderedReactions = [...myReactions, ...contactReactions];

    const total = orderedReactions.length;

    return (
      <div
        style={{
          position: "absolute",
          bottom: -21,
          left: message.fromMe ? "auto" : 8,
          right: message.fromMe ? 8 : "auto",

          display: "inline-flex",
          gap: 6,
          background: "#fff",
          borderRadius: 16,
          padding: "2px 6px",
          fontSize: 13,
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      >
        {orderedReactions.map((reaction) => (
          <span key={`${reaction.id}-${reaction.userId}-${reaction.emoji}`}>
            {reaction.emoji}
          </span>
        ))}

        {total > 1 && (
          <span
            style={{
              marginLeft: 4,
              fontSize: 12,
              fontWeight: 600,
              color: "#555",
            }}
          >
            {total}
          </span>
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
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderTicketsSeparator(message, index)}
              {renderMessageDivider(message, index)}
              <div
                data-message-container
                data-message-id={message.id}
                className={clsx(classes.messageLeft, {
                  [classes.messageWithReaction]:
                    message.reactions && message.reactions.length > 0,
                })}
                title={message.queueId && message.queue?.name}
                onDoubleClick={(e) => hanldeReplyMessage(e, message)}
                style={
                  isSticker(message) && !message.quotedMsg
                    ? {
                        backgroundColor: "transparent",
                        boxShadow: "none",
                        padding: 0,
                        minWidth: "unset",
                      }
                    : {}
                }
              >
                {showSelectMessageCheckbox && (
                  <SelectMessageCheckbox message={message} />
                )}
                {/* <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton> */}

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

                <div
                  className={classes.reactionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    openReactionBar(message, e.currentTarget);
                  }}
                >
                  <EmojiEmotionsOutlinedIcon fontSize="small" />
                </div>

                {message.isForwarded && (
                  <div>
                    <span className={classes.forwardMessage}>
                      <Reply
                        style={{ color: "grey", transform: "scaleX(-1)" }}
                      />{" "}
                      Encaminhada
                    </span>
                    <br />
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
                  <div>
                    <span className={classes.deletedMessage}>
                      🚫 Essa mensagem foi apagada pelo contato &nbsp;
                    </span>
                  </div>
                )}

                {(message.mediaUrl ||
                  message._isMediaOptimistic ||
                  message.mediaType === "locationMessage" ||
                  message.mediaType === "contactMessage" ||
                  isSticker(message) ||
                  message.mediaType === "template" ||
                  message.mediaType === "adMetaPreview") &&
                  checkMessageMedia(message)}

                {(!isSticker(message) || message.quotedMsg) && (
                  <div
                    className={clsx(classes.textContentItem, {
                      [classes.textContentItemDeleted]: message.isDeleted,
                    })}
                  >
                    {message.quotedMsg && renderQuotedMessage(message)}

                    {message.mediaType !== "adMetaPreview" &&
                      ((message.mediaUrl !== null &&
                        (message.mediaType === "image" ||
                          message.mediaType === "video") &&
                        getBasename(message.mediaUrl).trim() !==
                          message.body.trim()) ||
                        (message.mediaType !== "audio" &&
                          message.mediaType !== "image" &&
                          message.mediaType !== "video" &&
                          !isSticker(message) &&
                          message.mediaType !== "reactionMessage" &&
                          message.mediaType !== "locationMessage" &&
                          message.mediaType !== "contactMessage" &&
                          message.mediaType !== "template")) && (
                        <>
                          {xmlRegex.test(message.body) && (
                            <span>{message.body}</span>
                          )}
                          {!xmlRegex.test(message.body) && (
                            <MarkdownWrapper>
                              {lgpdDeleteMessage && message.isDeleted
                                ? "🚫 _Mensagem apagada_ "
                                : message.body}
                            </MarkdownWrapper>
                          )}
                        </>
                      )}
                    <span className={classes.timestamp}>
                      {message.isEdited
                        ? "Editada " +
                          format(parseISO(message.createdAt), "HH:mm")
                        : format(parseISO(message.createdAt), "HH:mm")}
                    </span>
                  </div>
                )}
                {renderReactions(message)}
              </div>
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderTicketsSeparator(message, index)}
              {renderMessageDivider(message, index)}
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
                style={
                  isSticker(message) && !message.quotedMsg
                    ? {
                        backgroundColor: "transparent",
                        boxShadow: "none",
                        padding: 0,
                        minWidth: "unset",
                      }
                    : {}
                }
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

                <div
                  className={classes.reactionButtonRight}
                  onClick={(e) => {
                    e.stopPropagation();
                    openReactionBar(message, e.currentTarget);
                  }}
                >
                  <EmojiEmotionsOutlinedIcon fontSize="small" />
                </div>

                {message.isForwarded && (
                  <div>
                    <span className={classes.forwardMessage}>
                      <Reply
                        style={{ color: "grey", transform: "scaleX(-1)" }}
                      />{" "}
                      Encaminhada
                    </span>
                    <br />
                  </div>
                )}

                {isYouTubeLink(message.body) && (
                  <YouTubePreview videoUrl={message.body} />
                )}

                {!lgpdDeleteMessage && message.isDeleted && (
                  <div>
                    <span className={classes.deletedMessage}>
                      🚫 Essa mensagem foi apagada &nbsp;
                    </span>
                  </div>
                )}

                {(message.mediaUrl ||
                  message._isMediaOptimistic ||
                  message.mediaType === "locationMessage" ||
                  isSticker(message) ||
                  message.mediaType === "contactMessage" ||
                  message.mediaType === "template") &&
                  checkMessageMedia(message)}

                {(!isSticker(message) || message.quotedMsg) && (
                  <div
                    className={clsx(classes.textContentItem, {
                      [classes.textContentItemDeleted]: message.isDeleted,
                    })}
                  >
                    {message.quotedMsg && renderQuotedMessage(message)}

                    {!message._isMediaOptimistic && (
                      <>
                        {((message.mediaType === "image" ||
                          message.mediaType === "video") &&
                          getBasename(message.mediaUrl) === message.body) ||
                          (message.mediaType !== "audio" &&
                            !isSticker(message) &&
                            message.mediaType !== "reactionMessage" &&
                            message.mediaType !== "locationMessage" &&
                            message.mediaType !== "contactMessage" &&
                            message.mediaType !== "template" && (
                              <>
                                {xmlRegex.test(message.body) && (
                                  <div>{formatXml(message.body)}</div>
                                )}
                                {!xmlRegex.test(message.body) && (
                                  <MarkdownWrapper>
                                    {message.body}
                                  </MarkdownWrapper>
                                )}
                              </>
                            ))}
                      </>
                    )}

                    <span className={classes.timestamp}>
                      {message.isEdited
                        ? "Editada " +
                          format(parseISO(message.createdAt), "HH:mm")
                        : format(parseISO(message.createdAt), "HH:mm")}
                      {renderMessageAck(message)}
                    </span>
                  </div>
                )}
                {renderReactions(message)}
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
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 28,
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: 1,
            overflow: "hidden",
          },
        }}
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
              <div style={{ width: "100%", height: "100%" }}>
                <Picker
                  perLine={9}
                  emojiSize={22}
                  showSkinTones={true}
                  showPreview={false}
                  title=""
                  emoji=""
                  native
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
        {/* <div ref={lastMessageRef} style={{ float: "left", clear: "both" }} /> */}
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
