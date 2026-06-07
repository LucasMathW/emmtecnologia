import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { useParams, useHistory } from "react-router-dom";

import clsx from "clsx";

import { makeStyles, Paper, useMediaQuery } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";

import ContactDrawer from "../ContactDrawer";
import MessageInput from "../MessageInput/";
import TicketHeader from "../TicketHeader";
import TicketInfo from "../TicketInfo";
import TicketActionButtons from "../TicketActionButtonsCustom";
import MessagesList from "../MessagesList";
import api from "../../services/api";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageProvider } from "../../context/ForwarMessage/ForwardMessageContext";

import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TagsContainer } from "../TagsContainer";
import { isNil } from "lodash";
import { EditMessageProvider } from "../../context/EditingMessage/EditingMessageContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

const drawerWidth = 320;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },

  mainWrapper: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeft: "0",
    marginRight: -drawerWidth,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    [theme.breakpoints.down("md")]: {
      marginRight: 0,
    },
  },

  mainWrapperShift: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: 0,
    [theme.breakpoints.down("md")]: {
      marginRight: 0,
    },
  },
}));

const Ticket = () => {
  const { ticketId } = useParams();
  const history = useHistory();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const classes = useStyles();

  const { user, socket } = useContext(AuthContext);
  const { setTabOpen } = useContext(TicketsContext);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState({});
  const [ticket, setTicket] = useState({});
  const [dragDropFiles, setDragDropFiles] = useState([]);
  const latestContactPic = useRef("");
  const { companyId } = user;

  // Restaurar fotos do localStorage
  const getStoredPic = useCallback(() => {
    try {
      const store = JSON.parse(localStorage.getItem("contactPics") || "{}");
      return (
        store[`${companyId}-${ticket.contact?.number}`] ||
        store[`${companyId}-${ticket.contact?.id}`] ||
        ""
      );
    } catch {
      return "";
    }
  }, [companyId, ticket.contact]);

  // Salvar foto no localStorage
  const storeContactPic = useCallback(
    (contactData) => {
      try {
        const number = contactData.number;
        const id = contactData.id;
        const pic = contactData.urlPicture;
        console.log(
          "[STORE CONTACT PIC] number:",
          number,
          "pic:",
          pic?.substring(0, 80),
        );
        if (!pic || !number) return;
        const store = JSON.parse(localStorage.getItem("contactPics") || "{}");
        store[`${companyId}-${number}`] = pic;
        if (id) store[`${companyId}-${id}`] = pic;
        localStorage.setItem("contactPics", JSON.stringify(store));
        latestContactPic.current = pic;
        console.log(
          "[STORE CONTACT PIC] Salvo no localStorage. Keys:",
          Object.keys(store).join(", "),
        );
      } catch (e) {
        console.error("[STORE CONTACT PIC] Erro:", e);
      }
    },
    [companyId],
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTicket = async () => {
        try {
          if (!isNil(ticketId) && ticketId !== "undefined") {
            const { data } = await api.get("/tickets/u/" + ticketId);

            if (!isMounted) return;

            // Se temos foto mais recente na ref ou localStorage, usar ao invés da API
            let contactData = data.contact;
            const storedPic = latestContactPic.current;
            const lsKey = `${companyId}-${data.contact?.number}`;
            const lsKey2 = `${companyId}-${data.contact?.id}`;
            const storedLs =
              JSON.parse(localStorage.getItem("contactPics") || "{}")[lsKey] ||
              JSON.parse(localStorage.getItem("contactPics") || "{}")[lsKey2] ||
              "";
            const finalPic = storedPic || storedLs;
            if (process.env.NODE_ENV === "development")
              console.log(
                "[FETCH TICKET] storedPic:",
                storedPic?.substring(0, 60),
                "storedLs:",
                storedLs?.substring(0, 60),
                "finalPic:",
                finalPic?.substring(0, 60),
              );
            if (finalPic) {
              const separator = finalPic.includes("?")
                ? ""
                : `?t=${Date.now()}`;
              contactData = {
                ...data.contact,
                urlPicture: `${finalPic}${separator}`,
              };
            }

            setContact(contactData);
            // setWhatsapp(data.whatsapp);
            // setQueueId(data.queueId);
            setTicket(data);
            if (["pending", "open", "group"].includes(data.status)) {
              setTabOpen(data.status);
            }
            setLoading(false);
          }
        } catch (err) {
          if (!isMounted) return;

          history.push("/tickets"); // correção para evitar tela branca uuid não encontrado Feito por Altemir 16/08/2023
          setLoading(false);
          toastError(err);
        }
      };
      fetchTicket();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [ticketId]);

  // [ticketId, user, history];

  useEffect(() => {
    if (
      // !ticket &&
      // !ticket.id &&
      // ticket.uuid !== ticketId &&
      // ticketId === "undefined"
      !ticket?.id ||
      ticketId === "undefined"
    ) {
      return;
    }

    const onConnectTicket = () => {
      socket.emit("joinChatBox", `${ticket.id}`);
    };

    const onCompanyTicket = (data) => {
      if (data.action === "update" && data.ticket.id === ticket?.id) {
        setTicket(data.ticket);

        // ✅ Preservar a foto mais recente ao atualizar o ticket
        const freshPic = latestContactPic.current;

        setTicket((prev) => {
          const updated = data.ticket;
          if (freshPic && updated.contact) {
            updated.contact.urlPicture = freshPic;
          }
          return updated;
        });

        // Sincronizar contact preservando a foto mais recente
        setContact((prevContact) => {
          const incomingContact = data.ticket?.contact;
          if (!incomingContact) return prevContact;

          // Foto mais recente: ref > state atual > incoming
          const bestPic =
            latestContactPic.current ||
            prevContact?.urlPicture ||
            incomingContact?.urlPicture;

          return {
            ...prevContact,
            ...incomingContact,
            urlPicture: bestPic
              ? `${bestPic.split("?")[0]}?t=${Date.now()}`
              : incomingContact?.urlPicture,
          };
        });
      }

      if (data.action === "delete" && data.ticketId === ticket?.id) {
        history.push("/tickets");
      }
    };

    const onCompanyContactTicket = (data) => {
      if (data.action === "update") {
        console.log(
          "[CONTACT UPDATE] Dados recebidos:",
          data.contact?.urlPicture,
        );

        setContact((prevState) => {
          const matchById = prevState.id === data.contact?.id;
          const normalizeNumber = (n) => n?.replace(/\D/g, "");
          const cleanPrev = normalizeNumber(prevState.number);
          const cleanNew = normalizeNumber(data.contact?.number);
          const matchByNumber = cleanPrev && cleanNew && cleanPrev === cleanNew;

          if (matchById || matchByNumber) {
            const updatedContact = { ...prevState, ...data.contact };

            if (updatedContact.urlPicture) {
              updatedContact.urlPicture = `${updatedContact.urlPicture.split("?")[0]}?t=${Date.now()}`;
              storeContactPic(updatedContact);
              latestContactPic.current = updatedContact.urlPicture;
            } else {
              updatedContact.urlPicture = null;
              latestContactPic.current = null; // limpa a ref

              try {
                const store = JSON.parse(
                  localStorage.getItem("contactPics") || "{}",
                );
                delete store[`${companyId}-${updatedContact.number}`];
                delete store[`${companyId}-${updatedContact.id}`];
                localStorage.setItem("contactPics", JSON.stringify(store));
                console.log(
                  "[CONTACT UPDATE] ✅ Cache limpo para contato sem foto",
                );
              } catch (e) {
                console.error(
                  "[CONTACT UPDATE] Erro ao limpar localStorage:",
                  e,
                );
              }

              // Forçar atualização do ticket.contact também
              setTicket((prev) => ({
                ...prev,
                contact: {
                  ...prev.contact,
                  urlPicture: updatedContact.urlPicture,
                },
              }));
            }

            return updatedContact;
          }
          return prevState;
        });
      }
    };

    socket.on("connect", onConnectTicket);
    socket.on(`company-${companyId}-ticket`, onCompanyTicket);
    socket.on(`company-${companyId}-contact`, onCompanyContactTicket);

    return () => {
      socket.emit("joinChatBoxLeave", `${ticket.id}`);
      socket.off("connect", onConnectTicket);
      socket.off(`company-${companyId}-ticket`, onCompanyTicket);
      socket.off(`company-${companyId}-contact`, onCompanyContactTicket);
    };
    // }
  }, [ticketId, ticket, history]);

  const handleDrawerOpen = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleQuickMessageSelect = (quickMessage) => {
    try {
      if (quickMessage.message) {
        // Disparar evento que o MessageInput vai escutar
        const event = new CustomEvent("insertQuickMessage", {
          detail: { message: quickMessage.message },
        });
        window.dispatchEvent(event);
      }

      if (quickMessage.mediaPath) {
        // Tratar mídia se necessário
      }
    } catch (error) {
      console.error("Erro ao inserir resposta rápida:", error);
      toastError("Erro ao inserir resposta rápida");
    }
  };

  const renderMessagesList = () => {
    return (
      <>
        <MessagesList
          isGroup={ticket.isGroup}
          onDrop={setDragDropFiles}
          whatsappId={ticket.whatsappId}
          queueId={ticket.queueId}
          channel={ticket.channel}
          ticketStatus={ticket.status}
        ></MessagesList>
        <MessageInput
          ticketId={ticket.id}
          ticketStatus={ticket.status}
          ticketChannel={ticket.channel}
          droppedFiles={dragDropFiles}
          contactId={contact.id}
          whatsappId={ticket.whatsappId}
        />
      </>
    );
  };

  return (
    <div className={classes.root} id="drawer-container">
      <Paper
        variant="outlined"
        elevation={0}
        className={clsx(classes.mainWrapper, {
          [classes.mainWrapperShift]: drawerOpen && !isMobile,
        })}
      >
        {/* <div id="TicketHeader"> */}
        <TicketHeader loading={loading}>
          {ticket.contact !== undefined && (
            <div id="TicketHeader">
              <TicketInfo
                contact={contact}
                ticket={ticket}
                onClick={handleDrawerOpen}
              />
            </div>
          )}
          <TicketActionButtons
            ticket={ticket}
            contact={contact}
            onQuickMessageSelect={handleQuickMessageSelect}
          />
        </TicketHeader>
        {/* </div> */}
        <Paper>
          <TagsContainer contact={contact} />
        </Paper>
        <ReplyMessageProvider>
          <ForwardMessageProvider>
            <EditMessageProvider>{renderMessagesList()}</EditMessageProvider>
          </ForwardMessageProvider>
        </ReplyMessageProvider>
      </Paper>

      <ContactDrawer
        open={drawerOpen}
        handleDrawerClose={handleDrawerClose}
        contact={contact}
        loading={loading}
        ticket={ticket}
      />
    </div>
  );
};

export default Ticket;
