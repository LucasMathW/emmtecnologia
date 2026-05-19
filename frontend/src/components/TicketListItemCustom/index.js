import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import { green, grey } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { List, Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import { v4 as uuidv4 } from "uuid";

import GroupIcon from "@material-ui/icons/Group";
import ContactTag from "../ContactTag";
import ConnectionIcon from "../ConnectionIcon";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import ShowTicketOpen from "../ShowTicketOpenModal";
import FinalizacaoVendaModal from "../FinalizacaoVendaModal";
import { isNil } from "lodash";
import { toast } from "react-toastify";
import {
  Done,
  HighlightOff,
  SwapHoriz,
  Add,
  BorderLeft,
} from "@material-ui/icons";
import VisibilityIcon from "@material-ui/icons/Visibility"; // Ícone de spy
import useCompanySettings from "../../hooks/useSettings/companySettings";
import NewTicketModal from "../NewTicketModal";
import {
  Avatar,
  Badge,
  ListItemAvatar,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  DialogContent,
} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  ticket: {
    position: "relative",
  },

  pendingTicket: {
    cursor: "unset",
  },
  queueTag: {
    background: "#FCFCFC",
    color: "#000",
    marginRight: 1,
    padding: 1,
    fontWeight: "bold",
    borderRadius: 3,
    fontSize: "0.5em",
    whiteSpace: "nowrap",
  },
  noTicketsDiv: {
    display: "flex",
    height: "100px",
    margin: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  newMessagesCount: {
    justifySelf: "flex-end",
    textAlign: "right",
    position: "relative",
    top: 8,
    color: "green",
    fontWeight: "bold",
    marginRight: "-15px",
    borderRadius: 0,
  },
  noTicketsText: {
    textAlign: "center",
    color: "rgb(104, 121, 146)",
    fontSize: "14px",
    lineHeight: "1.4",
  },
  connectionTag: {
    background: "green",
    color: "#FFF",
    marginRight: 1,
    padding: 1,
    fontWeight: "bold",
    borderRadius: 3,
    fontSize: "0.6em",
  },
  noTicketsTitle: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0px",
  },

  contactNameWrapper: {
    display: "flex",
    justifyContent: "space-between",
    marginLeft: "5px",
    fontWeight: "bold",
    color: theme.mode === "light" ? "black" : "white",
  },

  lastMessageTime: {
    justifySelf: "flex-end",
    textAlign: "right",
    position: "relative",
    top: -28,
    marginRight: "1px",
    color: theme.mode === "light" ? "black" : grey[400],
  },

  lastMessageTimeUnread: {
    justifySelf: "flex-end",
    textAlign: "right",
    position: "relative",
    top: -28,
    color: "green",
    fontWeight: "bold",
    marginRight: "1px",
  },

  closedBadge: {
    alignSelf: "center",
    justifySelf: "flex-end",
    marginRight: 32,
    marginLeft: "auto",
  },

  contactLastMessage: {
    paddingRight: "0%",
    marginLeft: "5px",
    color: theme.mode === "light" ? "black" : grey[400],
    marginBottom: 2,
  },

  contactLastMessageUnread: {
    paddingRight: 20,
    fontWeight: "bold",
    color: theme.mode === "light" ? "black" : grey[400],
    // width: "50%",
  },

  badgeStyle: {
    color: "white",
    backgroundColor: green[500],
  },

  acceptButton: {
    position: "absolute",
    right: "1px",
  },

  ticketQueueColor: {
    flex: "none",
    height: "100%",
    position: "absolute",
    top: "0%",
    left: "0%",
  },

  ticketInfo: {
    position: "relative",
    top: -13,
  },
  secondaryContentSecond: {
    display: "flex",
    alignItems: "flex-start",
    flexWrap: "nowrap",
    flexDirection: "row",
    alignContent: "flex-start",
    marginTop: 4,
  },
  ticketInfo1: {
    position: "relative",
    top: 13,
    right: 0,
  },
  Radiusdot: {
    "& .MuiBadge-badge": {
      borderRadius: 2,
      position: "inherit",
      height: 16,
      margin: 2,
      padding: 3,
    },
    "& .MuiBadge-anchorOriginTopRightRectangle": {
      transform: "scale(1) translate(0%, -40%)",
    },
  },
  connectionIcon: {
    marginRight: theme.spacing(1),
  },

  // Estilos para o modal da imagem
  imageModal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalContent: {
    outline: "none",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },
  expandedImage: {
    width: "100%",
    height: "auto",
    maxWidth: "500px",
    borderRadius: theme.spacing(1),
  },
  clickableAvatar: {
    cursor: "pointer",
    "&:hover": {
      opacity: 0.8,
    },
  },
}));

const TicketListItemCustom = ({ setTabOpen, ticket }) => {
  const classes = useStyles();
  const theme = useTheme();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [
    acceptTicketWithouSelectQueueOpen,
    setAcceptTicketWithouSelectQueueOpen,
  ] = useState(false);
  const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);

  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");

  // Estados para o modal de finalização de venda
  const [openFinalizacaoVenda, setOpenFinalizacaoVenda] = useState(false);
  const [finalizacaoTipo, setFinalizacaoTipo] = useState(null);
  const [ticketDataToFinalize, setTicketDataToFinalize] = useState(null);
  const [showFinalizacaoOptions, setShowFinalizacaoOptions] = useState(false);

  const [imageModalOpen, setImageModalOpen] = useState(false); // Estado para o modal da imagem
  const [presence, setPresence] = useState(null);

  const { ticketId } = useParams();
  const isMounted = useRef(true);
  const { setCurrentTicket } = useContext(TicketsContext);
  const { user } = useContext(AuthContext);

  const { get: getSetting } = useCompanySettings();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Função para abrir modal da imagem
  const handleImageClick = (e) => {
    e.stopPropagation(); // Prevenir que o clique no avatar selecione o ticket
    if (ticket?.contact?.urlPicture) {
      setImageModalOpen(true);
    }
  };

  // Função para fechar modal da imagem
  const handleImageModalClose = () => {
    setImageModalOpen(false);
  };

  const handleOpenAcceptTicketWithouSelectQueue = useCallback(() => {
    setAcceptTicketWithouSelectQueueOpen(true);
  }, []);

  const handleCloseTicket = async (id) => {
    // Verificar se a finalização com valor de venda está ativa
    if (
      user.finalizacaoComValorVendaAtiva === true ||
      user.finalizacaoComValorVendaAtiva === "true"
    ) {
      // Se estiver ativa, abrir o modal de finalização de venda
      setFinalizacaoTipo("comDespedida");
      setOpenFinalizacaoVenda(true);
      handleSelectTicket(ticket);
      history.push(`/tickets/${ticket.uuid}`);
    } else {
      // Comportamento original
      const setting = await getSetting({
        column: "requiredTag",
      });

      if (setting.requiredTag === "enabled") {
        //verificar se tem uma tag
        try {
          const contactTags = await api.get(
            `/contactTags/${ticket.contact.id}`,
          );
          if (!contactTags.data.tags) {
            toast.warning(i18n.t("messagesList.header.buttons.requiredTag"));
          } else {
            await api.put(`/tickets/${id}`, {
              status: "closed",
              userId: user?.id || null,
            });

            if (isMounted.current) {
              setLoading(false);
            }

            history.push(`/tickets/`);
          }
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      } else {
        setLoading(true);
        try {
          await api.put(`/tickets/${id}`, {
            status: "closed",
            userId: user?.id || null,
          });
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
        if (isMounted.current) {
          setLoading(false);
        }

        history.push(`/tickets/`);
      }
    }
  };

  const handleCloseIgnoreTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "closed",
        userId: user?.id || null,
        sendFarewellMessage: false,
        amountUsedBotQueues: 0,
      });
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }

    history.push(`/tickets/`);
  };

  const truncate = (str, len) => {
    if (!isNil(str)) {
      if (str.length > len) {
        return str.substring(0, len) + "...";
      }
      return str;
    }
  };

  const handleCloseTransferTicketModal = useCallback(() => {
    if (isMounted.current) {
      setTransferTicketModalOpen(false);
    }
  }, []);

  const handleOpenTransferModal = () => {
    setLoading(true);
    setTransferTicketModalOpen(true);
    if (isMounted.current) {
      setLoading(false);
    }
    handleSelectTicket(ticket);
    history.push(`/tickets/${ticket.uuid}`);
  };

  const handleOpenNewTicketModal = () => {
    setNewTicketModalOpen(true);
  };

  const handleCloseNewTicketModal = (newTicket) => {
    setNewTicketModalOpen(false);
    if (newTicket) {
      // Se um novo ticket foi criado, redirecionar para ele
      handleSelectTicket(newTicket);
      history.push(`/tickets/${newTicket.uuid}`);
    }
  };

  const handleAcepptTicket = async (id) => {
    setLoading(true);
    try {
      const otherTicket = await api.put(`/tickets/${id}`, {
        status:
          ticket.isGroup && ticket.channel === "whatsapp" ? "group" : "open",
        userId: user?.id,
      });

      if (otherTicket.data.id !== ticket.id) {
        if (otherTicket.data.userId !== user?.id) {
          setOpenAlert(true);
          setUserTicketOpen(otherTicket.data.user.name);
          setQueueTicketOpen(otherTicket.data.queue.name);
        } else {
          setLoading(false);
          setTabOpen(ticket.isGroup ? "group" : "open");
          handleSelectTicket(otherTicket.data);
          history.push(`/tickets/${otherTicket.uuid}`);
        }
      } else {
        let setting;

        try {
          setting = await getSetting({
            column: "sendGreetingAccepted",
          });
        } catch (err) {
          toastError(err);
        }

        if (
          setting.sendGreetingAccepted === "enabled" &&
          (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")
        ) {
          handleSendMessage(ticket.id);
        }
        if (isMounted.current) {
          setLoading(false);
        }

        setTabOpen(ticket.isGroup ? "group" : "open");
        handleSelectTicket(ticket);
        history.push(`/tickets/${ticket.uuid}`);
      }
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  const handleSendMessage = async (id) => {
    let setting;

    try {
      setting = await getSetting({
        column: "greetingAcceptedMessage",
      });
    } catch (err) {
      toastError(err);
    }
    if (!setting.greetingAcceptedMessage) {
      toast.warning(
        i18n.t("messagesList.header.buttons.greetingAcceptedMessage"),
      );
      return;
    }
    const msg = `${setting.greetingAcceptedMessage}`;
    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: `${msg.trim()}`,
    };
    try {
      await api.post(`/messages/${id}`, message);
    } catch (err) {
      toastError(err);
    }
  };

  const handleCloseAlert = useCallback(() => {
    setOpenAlert(false);
    setLoading(false);
  }, []);

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
  };

  const handleUpdateTicketStatusWithData = async (
    ticketData,
    sendFarewellMessage,
    finalizacaoMessage,
  ) => {
    try {
      await api.put(`/tickets/${ticket.id}`, {
        ...ticketData,
        sendFarewellMessage,
        finalizacaoMessage,
      });
      toast.success("Ticket finalizado com sucesso!");
      history.push(`/tickets/`);
    } catch (err) {
      toastError(err);
    }
  };

  // Função para espionar ticket chatbot
  const handleSpyTicket = () => {
    handleSelectTicket(ticket);
    history.push(`/tickets/${ticket.uuid}`);
  };

  // Lógica de permissão para mensagens pending - MOVIDA PARA DEPOIS DE TODAS AS FUNÇÕES
  const shouldBlurMessages =
    ticket.status === "pending" &&
    user?.allowSeeMessagesInPendingTickets === "disabled";

  // Função para renderizar a mensagem com base na permissão - MOVIDA PARA DEPOIS DE TODAS AS FUNÇÕES
  const renderLastMessage = () => {
    console.log(
      "ticket.mediaType:",
      ticket.mediaType,
      "lastMessage:",
      ticket.lastMessage,
    );

    if (ticket.presence === "typing") {
      return (
        <Typography style={{ color: "green", fontSize: 16 }}>
          {ticket.isGroup && ticket.presenceMemberName
            ? `${ticket.presenceMemberName} está digitando...`
            : "digitando..."}
        </Typography>
      );
    }

    if (ticket.presence === "recording") {
      return (
        <Typography style={{ color: "green", fontSize: 16 }}>
          {ticket.isGroup && ticket.presenceMemberName
            ? `${ticket.presenceMemberName} está gravando áudio...`
            : "gravando áudio..."}
        </Typography>
      );
    }

    if (ticket.reactionPreview) {
      const { emoji, messagePreview, reactionUserId } = ticket.reactionPreview;
      console.log("reactionPreview messagePreview:", messagePreview);
      const isFromMe = reactionUserId === user?.id;

      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
      ];

      const audioExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm"];
      const videoExtensions = [".mp4", ".mov", ".avi", ".mkv"];

      const isImagePreview = imageExtensions.some((ext) =>
        messagePreview?.toLowerCase().endsWith(ext),
      );

      const isAudioPreview =
        audioExtensions.some((ext) =>
          messagePreview?.toLowerCase().endsWith(ext),
        ) || ["ptt", "audio", "áudio"].includes(messagePreview?.toLowerCase());

      const isVideoPreview =
        videoExtensions.some((ext) =>
          messagePreview?.toLowerCase().endsWith(ext),
        ) || ["video", "vídeo"].includes(messagePreview?.toLowerCase());

      const StickerIcon = () => (
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          fill="currentColor"
          style={{ verticalAlign: "middle", marginRight: 4 }}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 22C13.8087 21.9781 15.5379 21.2537 16.8221 19.9799L19.8489 16.9776C21.2256 15.612 22 13.7532 22 11.8141V9.27273C22 5.25611 18.7439 2 14.7273 2H9.27273C5.25611 2 2 5.25611 2 9.27273V14.7273C2 18.7439 5.25611 22 9.27273 22H12ZM9.27273 4H14.7273C17.5736 4 19.8932 6.25535 19.9964 9.07648H19.9889V11.1248C19.9889 11.6259 19.5817 12.0315 19.0806 12.0296L16.8216 12.0208C14.1479 12.0105 11.979 14.1827 11.9935 16.8564L12.0058 19.1204C12.0081 19.5417 11.722 19.8971 11.3331 20H9.27273C6.36068 20 4 17.6393 4 14.7273V9.27273C4 6.36068 6.36068 4 9.27273 4ZM13.9744 19.5537C13.9959 19.4089 14.0066 19.2605 14.0057 19.1095L13.9935 16.8455C13.985 15.2837 15.252 14.0147 16.8138 14.0208L19.0729 14.0295C19.2275 14.0301 19.3793 14.0187 19.5274 13.996C19.2653 14.5726 18.8989 15.1029 18.4405 15.5576L15.4136 18.5599C14.9926 18.9776 14.5044 19.3124 13.9744 19.5537Z"
          />
        </svg>
      );

      const ImageIcon = () => (
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          fill="currentColor"
          style={{ verticalAlign: "middle", marginRight: 4 }}
        >
          <path d="M5 21C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H19C19.55 3 20.0208 3.19583 20.4125 3.5875C20.8042 3.97917 21 4.45 21 5V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H5ZM5 19H19V5H5V19ZM7 17H17C17.2 17 17.35 16.9083 17.45 16.725C17.55 16.5417 17.5333 16.3667 17.4 16.2L14.65 12.525C14.55 12.3917 14.4167 12.325 14.25 12.325C14.0833 12.325 13.95 12.3917 13.85 12.525L11.25 16L9.4 13.525C9.3 13.3917 9.16667 13.325 9 13.325C8.83333 13.325 8.7 13.3917 8.6 13.525L6.6 16.2C6.46667 16.3667 6.45 16.5417 6.55 16.725C6.65 16.9083 6.8 17 7 17Z" />
        </svg>
      );

      const AudioIcon = () => (
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          fill="currentColor"
          style={{ verticalAlign: "middle", marginRight: 4 }}
        >
          <path d="M5 21c-.55 0-1.02-.2-1.41-.59-.4-.39-.59-.86-.59-1.41v-7c0-1.25.24-2.42.71-3.51A9.15 9.15 0 0 1 8.5 3.7 8.7 8.7 0 0 1 12 3a8.7 8.7 0 0 1 3.51.71A9.15 9.15 0 0 1 20.3 8.5 8.7 8.7 0 0 1 21 12v7c0 .55-.2 1.02-.59 1.41-.39.4-.86.59-1.41.59h-2c-.55 0-1.02-.2-1.41-.59-.4-.39-.59-.86-.59-1.41v-4c0-.55.2-1.02.59-1.41.39-.4.86-.59 1.41-.59h2v-1c0-1.95-.68-3.6-2.04-4.96A6.75 6.75 0 0 0 12 5c-1.95 0-3.6.68-4.96 2.04A6.75 6.75 0 0 0 5 12v1h2c.55 0 1.02.2 1.41.59.4.39.59.86.59 1.41v4c0 .55-.2 1.02-.59 1.41-.39.4-.86.59-1.41.59H5Zm0-2h2v-4H5v4Zm12 0h2v-4h-2v4Z" />
        </svg>
      );

      const VideoIcon = () => (
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          fill="currentColor"
          style={{ verticalAlign: "middle", marginRight: 4 }}
        >
          <path d="M4 20C3.45 20 2.97917 19.8042 2.5875 19.4125C2.19583 19.0208 2 18.55 2 18V6C2 5.45 2.19583 4.97917 2.5875 4.5875C2.97917 4.19583 3.45 4 4 4H16C16.55 4 17.0208 4.19583 17.4125 4.5875C17.8042 4.97917 18 5.45 18 6V10.5L21.15 7.35C21.3167 7.18333 21.5 7.14167 21.7 7.225C21.9 7.30833 22 7.46667 22 7.7V16.3C22 16.5333 21.9 16.6917 21.7 16.775C21.5 16.8583 21.3167 16.8167 21.15 16.65L18 13.5V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H4ZM4 18H16V6H4V18Z" />
        </svg>
      );

      const friendlyPreview = isImagePreview ? (
        <>
          <ImageIcon />
          {i18n.t("mainDrawer.appBar.message.image")}
        </>
      ) : isAudioPreview ? (
        <>
          <AudioIcon />
          {i18n.t("mainDrawer.appBar.message.audio")}
        </>
      ) : isVideoPreview ? (
        <>
          <VideoIcon />
          {i18n.t("mainDrawer.appBar.message.video")}
        </>
      ) : messagePreview === "sticker" ? (
        <>
          <StickerIcon />
          {i18n.t("mainDrawer.appBar.message.sticker")}
        </>
      ) : (
        <>"{truncate(messagePreview, 20)}"</>
      );

      const actionText = isFromMe ? "Você reagiu com" : "Reagiu com";
      // const previewText = truncate(`a: ${friendlyPreview}`, 30);

      return (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 14 }}>{actionText}</span>
          <span
            style={{
              fontSize: 16,
              lineHeight: 1,
              fontFamily: '"Noto Color Emoji", "Apple Color Emoji", sans-serif',
            }}
          >
            {emoji}
          </span>
          <span style={{ fontSize: 14 }}>
            {"a: "}
            {friendlyPreview}
          </span>
        </span>
      );
    }
    if (shouldBlurMessages) {
      return (
        <MarkdownWrapper>
          {i18n.t("tickets.messageHidden") || "Mensagem oculta"}
        </MarkdownWrapper>
      );
    }

    // Se não tiver presence, renderiza mensagem normal
    if (!ticket.lastMessage) {
      return <br />;
    }

    if (ticket.lastMessage.includes("data:image/png;base64")) {
      return <MarkdownWrapper>Localização</MarkdownWrapper>;
    }

    if (ticket.lastMessage.includes("BEGIN:VCARD")) {
      return <MarkdownWrapper>Contato</MarkdownWrapper>;
    }

    if (ticket.lastMessage === "sticker" || ticket.mediaType === "sticker") {
      return (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="currentColor"
            style={{ flexShrink: 0, opacity: 0.7 }}
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 22C13.8087 21.9781 15.5379 21.2537 16.8221 19.9799L19.8489 16.9776C21.2256 15.612 22 13.7532 22 11.8141V9.27273C22 5.25611 18.7439 2 14.7273 2H9.27273C5.25611 2 2 5.25611 2 9.27273V14.7273C2 18.7439 5.25611 22 9.27273 22H12ZM9.27273 4H14.7273C17.5736 4 19.8932 6.25535 19.9964 9.07648H19.9889V11.1248C19.9889 11.6259 19.5817 12.0315 19.0806 12.0296L16.8216 12.0208C14.1479 12.0105 11.979 14.1827 11.9935 16.8564L12.0058 19.1204C12.0081 19.5417 11.722 19.8971 11.3331 20H9.27273C6.36068 20 4 17.6393 4 14.7273V9.27273C4 6.36068 6.36068 4 9.27273 4ZM13.9744 19.5537C13.9959 19.4089 14.0066 19.2605 14.0057 19.1095L13.9935 16.8455C13.985 15.2837 15.252 14.0147 16.8138 14.0208L19.0729 14.0295C19.2275 14.0301 19.3793 14.0187 19.5274 13.996C19.2653 14.5726 18.8989 15.1029 18.4405 15.5576L15.4136 18.5599C14.9926 18.9776 14.5044 19.3124 13.9744 19.5537Z"
            />
          </svg>
          <span>{i18n.t("mainDrawer.appBar.message.sticker")}</span>
        </span>
      );
    }

    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];

    const isImageMessage =
      ticket.mediaType === "image" ||
      imageExtensions.some((ext) =>
        ticket.lastMessage?.toLowerCase().endsWith(ext),
      );

    if (isImageMessage) {
      const isFilename = imageExtensions.some((ext) =>
        ticket.lastMessage?.toLowerCase().endsWith(ext),
      );

      return (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="currentColor"
            style={{ flexShrink: 0, opacity: 0.7 }}
          >
            <path d="M5 21C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H19C19.55 3 20.0208 3.19583 20.4125 3.5875C20.8042 3.97917 21 4.45 21 5V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H5ZM5 19H19V5H5V19ZM7 17H17C17.2 17 17.35 16.9083 17.45 16.725C17.55 16.5417 17.5333 16.3667 17.4 16.2L14.65 12.525C14.55 12.3917 14.4167 12.325 14.25 12.325C14.0833 12.325 13.95 12.3917 13.85 12.525L11.25 16L9.4 13.525C9.3 13.3917 9.16667 13.325 9 13.325C8.83333 13.325 8.7 13.3917 8.6 13.525L6.6 16.2C6.46667 16.3667 6.45 16.5417 6.55 16.725C6.65 16.9083 6.8 17 7 17Z" />
          </svg>
          <span>
            {!isFilename && ticket.lastMessage
              ? truncate(ticket.lastMessage, 30)
              : i18n.t("mainDrawer.appBar.message.image")}
          </span>
        </span>
      );
    }

    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

    const isVideoMessage =
      ticket.mediaType === "video" ||
      videoExtensions.some((ext) =>
        ticket.lastMessage?.toLowerCase().endsWith(ext),
      );

    if (isVideoMessage) {
      return (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="currentColor"
            style={{ flexShrink: 0, opacity: 0.7 }}
          >
            <path d="M4 20C3.45 20 2.97917 19.8042 2.5875 19.4125C2.19583 19.0208 2 18.55 2 18V6C2 5.45 2.19583 4.97917 2.5875 4.5875C2.97917 4.19583 3.45 4 4 4H16C16.55 4 17.0208 4.19583 17.4125 4.5875C17.8042 4.97917 18 5.45 18 6V10.5L21.15 7.35C21.3167 7.18333 21.5 7.14167 21.7 7.225C21.9 7.30833 22 7.46667 22 7.7V16.3C22 16.5333 21.9 16.6917 21.7 16.775C21.5 16.8583 21.3167 16.8167 21.15 16.65L18 13.5V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H4ZM4 18H16V6H4V18Z" />
          </svg>
          <span>{i18n.t("mainDrawer.appBar.message.video")}</span>
        </span>
      );
    }

    const audioExtensionsList = [
      ".mp3",
      ".wav",
      ".ogg",
      ".m4a",
      ".aac",
      ".webm",
    ];

    const isAudioMessage =
      ticket.mediaType === "audio" ||
      ticket.mediaType === "ptt" ||
      ticket.lastMessage === "audio" ||
      ticket.lastMessage === "Áudio" ||
      ticket.lastMessage === "ptt" ||
      audioExtensionsList.some((ext) =>
        ticket.lastMessage?.toLowerCase().endsWith(ext),
      );

    if (isAudioMessage) {
      return (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="currentColor"
            style={{ flexShrink: 0, opacity: 0.7 }}
          >
            <path d="M5 21c-.55 0-1.02-.2-1.41-.59-.4-.39-.59-.86-.59-1.41v-7c0-1.25.24-2.42.71-3.51A9.15 9.15 0 0 1 8.5 3.7 8.7 8.7 0 0 1 12 3a8.7 8.7 0 0 1 3.51.71A9.15 9.15 0 0 1 20.3 8.5 8.7 8.7 0 0 1 21 12v7c0 .55-.2 1.02-.59 1.41-.39.4-.86.59-1.41.59h-2c-.55 0-1.02-.2-1.41-.59-.4-.39-.59-.86-.59-1.41v-4c0-.55.2-1.02.59-1.41.39-.4.86-.59 1.41-.59h2v-1c0-1.95-.68-3.6-2.04-4.96A6.75 6.75 0 0 0 12 5c-1.95 0-3.6.68-4.96 2.04A6.75 6.75 0 0 0 5 12v1h2c.55 0 1.02.2 1.41.59.4.39.59.86.59 1.41v4c0 .55-.2 1.02-.59 1.41-.39.4-.86.59-1.41.59H5Zm0-2h2v-4H5v4Zm12 0h2v-4h-2v4Z" />
          </svg>
          <span>{i18n.t("mainDrawer.appBar.message.audio")}</span>
        </span>
      );
    }

    return (
      <MarkdownWrapper>{truncate(ticket.lastMessage, 40)}</MarkdownWrapper>
    );
  };

  return (
    <React.Fragment key={ticket.id}>
      {openAlert && (
        <ShowTicketOpen
          isOpen={openAlert}
          handleClose={handleCloseAlert}
          user={userTicketOpen}
          queue={queueTicketOpen}
        />
      )}
      {acceptTicketWithouSelectQueueOpen && (
        <AcceptTicketWithouSelectQueue
          modalOpen={acceptTicketWithouSelectQueueOpen}
          onClose={(e) => setAcceptTicketWithouSelectQueueOpen(false)}
          ticketId={ticket.id}
          ticket={ticket}
        />
      )}
      {transferTicketModalOpen && (
        <TransferTicketModalCustom
          modalOpen={transferTicketModalOpen}
          onClose={handleCloseTransferTicketModal}
          ticketid={ticket.id}
          ticket={ticket}
        />
      )}
      {newTicketModalOpen && (
        <NewTicketModal
          modalOpen={newTicketModalOpen}
          onClose={handleCloseNewTicketModal}
          initialContact={ticket.contact}
        />
      )}
      <ListItem
        button
        dense
        onClick={(e) => {
          console.log("e", e);
          const isCheckboxClicked =
            (e.target.tagName.toLowerCase() === "input" &&
              e.target.type === "checkbox") ||
            (e.target.tagName.toLowerCase() === "svg" &&
              e.target.type === undefined) ||
            (e.target.tagName.toLowerCase() === "path" &&
              e.target.type === undefined);

          if (isCheckboxClicked) return;

          handleSelectTicket(ticket);
        }}
        selected={ticketId && ticketId === ticket.uuid}
        className={clsx(classes.ticket, {
          [classes.pendingTicket]: ticket.status === "pending",
        })}
      >
        <ListItemAvatar style={{ marginLeft: "-15px" }}>
          <Avatar
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
            }}
            src={
              ticket?.contact?.urlPicture
                ? `${ticket.contact.urlPicture}?t=${ticket.contact._picCachedBust || Date.now()}`
                : ""
            }
            className={classes.clickableAvatar}
            onClick={handleImageClick}
          />
        </ListItemAvatar>
        <ListItemText
          disableTypography
          primary={
            <span className={classes.contactNameWrapper}>
              <Typography noWrap component="span" variant="body2">
                {ticket.isGroup && ticket.channel === "whatsapp" && (
                  <GroupIcon
                    fontSize="small"
                    style={{
                      color: grey[700],
                      marginBottom: "-1px",
                      marginLeft: "5px",
                    }}
                  />
                )}{" "}
                &nbsp;
                {ticket.channel && (
                  <ConnectionIcon
                    width="20"
                    height="20"
                    className={classes.connectionIcon}
                    connectionType={ticket.channel}
                  />
                )}{" "}
                &nbsp;
                {truncate(ticket.contact?.name, 60)}
              </Typography>
            </span>
          }
          secondary={
            <span className={classes.contactNameWrapper}>
              <Typography
                className={
                  Number(ticket.unreadMessages) > 0
                    ? classes.contactLastMessageUnread
                    : classes.contactLastMessage
                }
                noWrap
                component="span"
                variant="body2"
              >
                {renderLastMessage()}
                <span className={classes.secondaryContentSecond}>
                  {ticket?.whatsapp ? (
                    <Badge
                      className={classes.connectionTag}
                      style={{
                        backgroundColor:
                          ticket.channel === "whatsapp"
                            ? ticket.whatsapp?.color || "#25D366"
                            : ticket.channel === "facebook"
                              ? "#4267B2"
                              : "#E1306C",
                      }}
                    >
                      {ticket.whatsapp?.name.toUpperCase()}
                    </Badge>
                  ) : (
                    <br></br>
                  )}
                  {
                    <Badge
                      style={{
                        backgroundColor: ticket.queue?.color || "#7c7c7c",
                      }}
                      className={classes.connectionTag}
                    >
                      {ticket.queueId
                        ? ticket.queue?.name.toUpperCase()
                        : ticket.status === "lgpd"
                          ? "LGPD"
                          : `${i18n.t("momentsUser.noqueue")}`}
                    </Badge>
                  }
                  {ticket?.user && (
                    <Badge
                      style={{ backgroundColor: "#000000" }}
                      className={classes.connectionTag}
                    >
                      {ticket.user?.name.toUpperCase()}
                    </Badge>
                  )}
                </span>
                <span className={classes.secondaryContentSecond}>
                  {ticket?.contact?.tags?.map((tag) => {
                    return (
                      <ContactTag
                        tag={tag}
                        key={`ticket-contact-tag-${ticket.id}-${tag.id}`}
                      />
                    );
                  })}
                </span>
                <span className={classes.secondaryContentSecond}>
                  {ticket.tags?.map((tag) => {
                    return (
                      <ContactTag
                        tag={tag}
                        key={`ticket-contact-tag-${ticket.id}-${tag.id}`}
                      />
                    );
                  })}
                </span>
              </Typography>

              <Badge
                className={classes.newMessagesCount}
                badgeContent={shouldBlurMessages ? "?" : ticket.unreadMessages}
                classes={{
                  badge: classes.badgeStyle,
                }}
              />
            </span>
          }
        />
        <ListItemSecondaryAction>
          {ticket.lastMessage && (
            <>
              <Typography
                className={
                  Number(ticket.unreadMessages) > 0
                    ? classes.lastMessageTimeUnread
                    : classes.lastMessageTime
                }
                component="span"
                variant="body2"
              >
                {isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
                  <>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
                ) : (
                  <>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
                )}
              </Typography>

              <br />
            </>
          )}
        </ListItemSecondaryAction>
        <ListItemSecondaryAction>
          {/* Para tickets com status chatbot, mostrar apenas o ícone de spy */}
          {ticket.status === "chatbot" && (
            <span className={classes.secondaryContentSecond}>
              <ButtonWithSpinner
                style={{
                  backgroundColor: "transparent",
                  boxShadow: "none",
                  border: "none",
                  color: theme.mode === "light" ? "blue" : "#FFF",
                  padding: "0px",
                  borderRadius: "50%",
                  right: "1px",
                  fontSize: "0.6rem",
                  bottom: "-30px",
                  minWidth: "2em",
                  width: "auto",
                }}
                variant="contained"
                className={classes.acceptButton}
                size="small"
                loading={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpyTicket();
                }}
              >
                <Tooltip title="Espiar conversa do chatbot">
                  <VisibilityIcon />
                </Tooltip>
              </ButtonWithSpinner>
            </span>
          )}

          {/* Para todos os outros status, manter os botões originais */}
          {ticket.status !== "chatbot" && (
            <>
              <span className={classes.secondaryContentSecond}>
                {ticket.status === "pending" &&
                  (ticket.queueId === null || ticket.queueId === undefined) && (
                    <ButtonWithSpinner
                      style={{
                        backgroundColor: "transparent",
                        boxShadow: "none",
                        border: "none",
                        color: theme.mode === "light" ? "green" : "#FFF",
                        padding: "0px",
                        borderRadius: "50%",
                        right: "51px",
                        fontSize: "0.6rem",
                        bottom: "-30px",
                        minWidth: "2em",
                        width: "auto",
                      }}
                      variant="contained"
                      className={classes.acceptButton}
                      size="small"
                      loading={loading}
                      onClick={(e) => handleOpenAcceptTicketWithouSelectQueue()}
                    >
                      <Tooltip
                        title={`${i18n.t("ticketsList.buttons.accept")}`}
                      >
                        <Done />
                      </Tooltip>
                    </ButtonWithSpinner>
                  )}
              </span>
              <span className={classes.secondaryContentSecond}>
                {ticket.status === "pending" && ticket.queueId !== null && (
                  <ButtonWithSpinner
                    style={{
                      backgroundColor: "transparent",
                      boxShadow: "none",
                      border: "none",
                      color: theme.mode === "light" ? "green" : "#FFF",
                      padding: "0px",
                      borderRadius: "50%",
                      right: "51px",
                      fontSize: "0.6rem",
                      bottom: "-30px",
                      minWidth: "2em",
                      width: "auto",
                    }}
                    variant="contained"
                    className={classes.acceptButton}
                    size="small"
                    loading={loading}
                    onClick={(e) => handleAcepptTicket(ticket.id)}
                  >
                    <Tooltip title={`${i18n.t("ticketsList.buttons.accept")}`}>
                      <Done />
                    </Tooltip>
                  </ButtonWithSpinner>
                )}
              </span>
              <span className={classes.secondaryContentSecond1}>
                {(ticket.status === "pending" ||
                  ticket.status === "open" ||
                  ticket.status === "group") && (
                  <ButtonWithSpinner
                    style={{
                      backgroundColor: "transparent",
                      boxShadow: "none",
                      border: "none",
                      color: theme.mode === "light" ? "purple" : "#FFF",
                      padding: "0px",
                      borderRadius: "50%",
                      right: "26px",
                      position: "absolute",
                      fontSize: "0.6rem",
                      bottom: "-30px",
                      minWidth: "2em",
                      width: "auto",
                    }}
                    variant="contained"
                    className={classes.acceptButton}
                    size="small"
                    loading={loading}
                    onClick={handleOpenTransferModal}
                  >
                    <Tooltip
                      title={`${i18n.t("ticketsList.buttons.transfer")}`}
                    >
                      <SwapHoriz />
                    </Tooltip>
                  </ButtonWithSpinner>
                )}
              </span>
              <span className={classes.secondaryContentSecond}>
                {(ticket.status === "open" || ticket.status === "group") && (
                  <ButtonWithSpinner
                    style={{
                      backgroundColor: "transparent",
                      boxShadow: "none",
                      border: "none",
                      color: theme.mode === "light" ? "red" : "#FFF",
                      padding: "0px",
                      bottom: "0px",
                      borderRadius: "50%",
                      right: "1px",
                      fontSize: "0.6rem",
                      bottom: "-30px",
                      minWidth: "2em",
                      width: "auto",
                    }}
                    variant="contained"
                    className={classes.acceptButton}
                    size="small"
                    loading={loading}
                    onClick={(e) => handleCloseTicket(ticket.id)}
                  >
                    <Tooltip title={`${i18n.t("ticketsList.buttons.closed")}`}>
                      <HighlightOff />
                    </Tooltip>
                  </ButtonWithSpinner>
                )}
              </span>
              <span className={classes.secondaryContentSecond}>
                {(ticket.status === "pending" || ticket.status === "lgpd") &&
                  (user.userClosePendingTicket === "enabled" ||
                    user.profile === "admin") && (
                    <ButtonWithSpinner
                      style={{
                        backgroundColor: "transparent",
                        boxShadow: "none",
                        border: "none",
                        color: theme.mode === "light" ? "red" : "#FFF",
                        padding: "0px",
                        bottom: "0px",
                        borderRadius: "50%",
                        right: "1px",
                        fontSize: "0.6rem",
                        bottom: "-30px",
                        minWidth: "2em",
                        width: "auto",
                      }}
                      variant="contained"
                      className={classes.acceptButton}
                      size="small"
                      loading={loading}
                      onClick={(e) => handleCloseIgnoreTicket(ticket.id)}
                    >
                      <Tooltip
                        title={`${i18n.t("ticketsList.buttons.ignore")}`}
                      >
                        <HighlightOff />
                      </Tooltip>
                    </ButtonWithSpinner>
                  )}
              </span>
              <span className={classes.secondaryContentSecond}>
                {ticket.status === "closed" && (
                  <ButtonWithSpinner
                    style={{
                      backgroundColor: "transparent",
                      boxShadow: "none",
                      border: "none",
                      color: theme.mode === "light" ? "green" : "#FFF",
                      padding: "0px",
                      bottom: "0px",
                      borderRadius: "50%",
                      right: "1px",
                      fontSize: "0.6rem",
                      bottom: "-30px",
                      minWidth: "2em",
                      width: "auto",
                    }}
                    variant="contained"
                    className={classes.acceptButton}
                    size="small"
                    loading={loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNewTicketModal();
                    }}
                  >
                    <Tooltip title="Criar Novo Ticket">
                      <Add />
                    </Tooltip>
                  </ButtonWithSpinner>
                )}
              </span>
            </>
          )}
        </ListItemSecondaryAction>
      </ListItem>

      {/* Modal de Finalização de Venda */}
      {openFinalizacaoVenda && (
        <FinalizacaoVendaModal
          open={openFinalizacaoVenda}
          onClose={() => setOpenFinalizacaoVenda(false)}
          ticket={ticket}
          onFinalizar={(ticketData) => {
            setOpenFinalizacaoVenda(false);
            setTicketDataToFinalize(ticketData);
            setShowFinalizacaoOptions(true);
          }}
        />
      )}

      {/* Modal de Opções de Finalização */}
      {showFinalizacaoOptions && (
        <Dialog
          open={showFinalizacaoOptions}
          onClose={() => setShowFinalizacaoOptions(false)}
          aria-labelledby="finalizacao-options-title"
        >
          <DialogTitle id="finalizacao-options-title">
            Como deseja finalizar?
          </DialogTitle>
          <DialogActions>
            <Button
              onClick={async () => {
                setShowFinalizacaoOptions(false);
                await handleUpdateTicketStatusWithData(
                  ticketDataToFinalize,
                  false,
                  null,
                );
              }}
              style={{ background: theme.palette.primary.main, color: "white" }}
            >
              {i18n.t("messagesList.header.dialogRatingWithoutFarewellMsg")}
            </Button>
            <Button
              onClick={async () => {
                setShowFinalizacaoOptions(false);
                await handleUpdateTicketStatusWithData(
                  ticketDataToFinalize,
                  true,
                  null,
                );
              }}
              style={{ background: theme.palette.primary.main, color: "white" }}
            >
              {i18n.t("messagesList.header.dialogRatingCancel")}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Modal da Imagem */}
      <Dialog
        open={imageModalOpen}
        onClose={handleImageModalClose}
        className={classes.imageModal}
        maxWidth="md"
        fullWidth
      >
        <DialogContent className={classes.imageModalContent}>
          <img
            src={ticket?.contact?.urlPicture}
            alt={ticket?.contact?.name || "Foto do contato"}
            className={classes.expandedImage}
          />
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default TicketListItemCustom;
