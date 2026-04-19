import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from "react";

import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Paper from "@material-ui/core/Paper";
// import TicketListItem from "../TicketListItemCustom"
import TicketsListSkeleton from "../TicketsListSkeleton";

import useTickets from "../../hooks/useTickets";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import TicketListItemCustom from "../TicketListItemCustom";

const useStyles = makeStyles((theme) => ({
  ticketsListWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  ticketsList: {
    flex: 1,
    maxHeight: "100%",
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    borderTop: "2px solid rgba(0, 0, 0, 0.12)",
  },

  ticketsListHeader: {
    color: "rgb(67, 83, 105)",
    zIndex: 2,
    backgroundColor: "white",
    borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ticketsCount: {
    fontWeight: "normal",
    color: "rgb(104, 121, 146)",
    marginLeft: "8px",
    fontSize: "14px",
  },

  noTicketsText: {
    textAlign: "center",
    color: "rgb(104, 121, 146)",
    fontSize: "14px",
    lineHeight: "1.4",
  },

  noTicketsTitle: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0px",
  },

  noTicketsDiv: {
    display: "flex",
    // height: "190px",
    margin: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
}));

const ticketSortAsc = (a, b) => {
  if (a.updatedAt < b.updatedAt) {
    return -1;
  }
  if (a.updatedAt > b.updatedAt) {
    return 1;
  }
  return 0;
};

const ticketSortDesc = (a, b) => {
  if (a.updatedAt > b.updatedAt) {
    return -1;
  }
  if (a.updatedAt < b.updatedAt) {
    return 1;
  }
  return 0;
};

const reducer = (state, action) => {
  // console.log("TYPE:", action.type);
  const sortDir = action.sortDir;

  if (action.type === "UPDATE_TICKET_REACTION_PREVIEW") {
    const { contactId, emoji, messagePreview, reactionUserId, skipSidebar } =
      action.payload;

    const fromMe = action.payload.fromMe ?? false;

    if (skipSidebar) {
      return state;
    }

    console.log(`fromME:${fromMe}`);

    if (!fromMe) return state;

    return state.map((t) => {
      if (t.contactId !== contactId) return t;

      return {
        ...t,
        reactionPreview: emoji
          ? { emoji, messagePreview, reactionUserId }
          : null,
      };
    });
  }

  if (action.type === "UPDATE_TICKET_PRESENCE") {
    const { ticketId, contactId, status } = action.payload;

    return state.map((t) => {
      // Filtra pelo ticketId exato — mesmo ticket, mesma fila, mesmo chip
      if (t.id === ticketId) {
        return { ...t, presence: status };
      }
      return t;
    });
  }

  if (action.type === "LOAD_TICKETS") {
    const newTickets = action.payload;
    const presenceCache = action.presenceCache || {};
    const recentTickets = action.recentTickets || {};

    // 🎯 LOG ESTRATÉGICO #2 - LOAD_TICKETS ANTES
    console.log("🟡 [REDUCER] LOAD_TICKETS - ANTES:", {
      incomingTicketsCount: newTickets.length,
      incomingTicketIds: newTickets.map((t) => t.id),
      currentStateLength: state.length,
      currentStateIds: state.map((t) => t.id),
      recentTicketsIds: Object.keys(recentTickets),
      timestamp: new Date().toISOString(),
    });

    // Tickets que vieram via socket mas ainda não estão na resposta do backend
    const recentIds = Object.keys(recentTickets).map(Number);
    const backendIds = newTickets.map((t) => t.id);
    const missingFromBackend = recentIds.filter(
      (id) => !backendIds.includes(id),
    );

    if (missingFromBackend.length > 0) {
      console.log(
        "[REDUCER][LOAD_TICKETS] ♻️ reinserindo tickets recentes não confirmados pelo backend:",
        missingFromBackend,
      );
    }

    // Começa com os tickets recentes que o backend ainda não retornou
    const ticketsToKeep = missingFromBackend.map((id) => recentTickets[id]);

    const result = newTickets.reduce(
      (nextState, ticket) => {
        // Busca cache por contactId
        const cachedPresence =
          presenceCache[`contact-${ticket.contactId}`] ?? null;

        if (cachedPresence) {
          console.log("[REDUCER][LOAD_TICKETS] ♻️ reaplicando presence:", {
            ticketId: ticket.id,
            contactId: ticket.contactId,
            presence: cachedPresence,
          });
        }

        const ticketWithPresence = {
          ...ticket,
          presence: cachedPresence || ticket.presence || null,
        };

        const ticketIndex = nextState.findIndex((t) => t.id === ticket.id);
        if (ticketIndex !== -1) {
          nextState[ticketIndex] = {
            ...nextState[ticketIndex],
            ...ticketWithPresence,
          };
          if (ticket.unreadMessages > 0) {
            const moved = nextState.splice(ticketIndex, 1)[0];
            nextState.unshift(moved);
          }
        } else {
          nextState.push(ticketWithPresence);
        }
        return nextState;
      },
      [...state],
    );

    // 🎯 LOG ESTRATÉGICO #2 - LOAD_TICKETS DEPOIS
    console.log("🟡 [REDUCER] LOAD_TICKETS - DEPOIS:", {
      finalStateLength: result.length,
      finalStateIds: result.map((t) => t.id),
      ticketsRemovidos: state
        .filter((t) => !result.some((nt) => nt.id === t.id))
        .map((t) => ({ id: t.id, status: t.status })),
      ticketsAdicionados: result
        .filter((nt) => !state.some((t) => t.id === nt.id))
        .map((nt) => ({ id: nt.id, status: nt.status })),
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  if (action.type === "RESET_UNREAD") {
    const ticketId = action.payload;

    const ticketIndex = state.findIndex((t) => t.id === ticketId);
    if (ticketIndex !== -1) {
      state[ticketIndex].unreadMessages = 0;
    }

    if (sortDir && ["ASC", "DESC"].includes(sortDir)) {
      sortDir === "ASC"
        ? state.sort(ticketSortAsc)
        : state.sort(ticketSortDesc);
    }

    return [...state];
  }

  if (action.type === "UPDATE_TICKET") {
    const ticket = action.payload;

    return state.map((t) => {
      if (t.id === ticket.id) {
        const currentContact = t.contact;
        const incomingContact = ticket.contact || {};
        // Preservar contact mais recente do estado local
        const mergedContact = { ...incomingContact, ...currentContact };
        return { ...t, ...ticket, contact: mergedContact };
      }
      return t;
    });
  }

  if (action.type === "UPDATE_TICKET_UNREAD_MESSAGES") {
    const ticket = action.payload;

    // 🎯 LOG ESTRATÉGICO #1 - UPDATE_TICKET_UNREAD_MESSAGES ANTES
    console.log("🔵 [REDUCER] UPDATE_TICKET_UNREAD_MESSAGES - ANTES:", {
      ticketId: ticket.id,
      ticketStatus: ticket.status,
      abaStatus: action.status,
      timestamp: new Date().toISOString(),
      currentStateLength: state.length,
      currentStateIds: state.map((t) => t.id),
    });

    const ticketIndex = state.findIndex((t) => t.id === ticket.id);

    if (ticketIndex !== -1) {
      // Ticket já existe no estado → atualiza e move para o topo
      console.log(
        "[REDUCER][UPDATE_TICKET_UNREAD_MESSAGES] ticket EXISTENTE, movendo para o topo. index:",
        ticketIndex,
      );
      state[ticketIndex] = {
        ...state[ticketIndex],
        ...ticket,
        reactionPreview: null,
        presence: null,
      };
      state.unshift(state.splice(ticketIndex, 1)[0]);
    } else {
      // Ticket NÃO existe no estado ainda
      // CORREÇÃO: comparar ticket.status com action.status de forma segura
      const ticketStatus = ticket?.status;
      const abaStatus = action.status;

      console.log(
        "[REDUCER][UPDATE_TICKET_UNREAD_MESSAGES] ticket NOVO (não está no estado).",
        {
          ticketStatus,
          abaStatus,
          match: ticketStatus === abaStatus,
        },
      );

      if (ticketStatus && abaStatus && ticketStatus === abaStatus) {
        console.log(
          "[REDUCER][UPDATE_TICKET_UNREAD_MESSAGES] ✅ inserindo ticket novo no topo do estado.",
        );
        state.unshift(ticket);
      } else {
        console.warn(
          "[REDUCER][UPDATE_TICKET_UNREAD_MESSAGES] ⚠️ ticket NÃO inserido. Status não bate ou está undefined.",
          {
            ticketStatus,
            abaStatus,
          },
        );
      }
    }

    if (sortDir && ["ASC", "DESC"].includes(sortDir)) {
      sortDir === "ASC"
        ? state.sort(ticketSortAsc)
        : state.sort(ticketSortDesc);
    }

    // 🎯 LOG ESTRATÉGICO #1 - UPDATE_TICKET_UNREAD_MESSAGES DEPOIS
    console.log("🔵 [REDUCER] UPDATE_TICKET_UNREAD_MESSAGES - DEPOIS:", {
      ticketId: ticket.id,
      wasInserted: ticketIndex !== -1,
      newStateLength: state.length,
      newStateIds: state.map((t) => t.id),
      timestamp: new Date().toISOString(),
    });

    return [...state];
  }

  if (action.type === "UPDATE_TICKET_CONTACT") {
    const contact = action.payload;

    const normalize = (n) => n?.replace(/\D/g, "");

    return state.map((t) => {
      const matchById = t.contactId === contact.id;
      const matchByNumber =
        t.contact?.number &&
        normalize(t.contact.number) === normalize(contact.number);
      const matchByName =
        t.contact?.name && contact.name && t.contact.name === contact.name;

      if (matchById || matchByNumber || matchByName) {
        const mergedContact = {
          ...t.contact,
          id: contact.id,
          number: contact.number,
          name: contact.name,
          urlPicture: contact.urlPicture,
          profilePicUrl: contact.profilePicUrl,
          pictureUpdated: contact.pictureUpdated,
        };
        // Mesma fórmula da página de Contatos
        mergedContact._picCachedBust = Date.now();
        return { ...t, contact: mergedContact };
      }
      return t;
    });
  }

  if (action.type === "FILTER_TICKETS_BY_QUEUE") {
    return state.filter((ticket) => {
      if (!ticket.queueId) return true;
      return action.payload.indexOf(ticket.queueId) > -1;
    });
  }

  if (action.type === "DELETE_TICKET") {
    const ticketId = action.payload;
    const ticketIndex = state.findIndex((t) => t.id === ticketId);
    if (ticketIndex !== -1) {
      state.splice(ticketIndex, 1);
    }

    if (sortDir && ["ASC", "DESC"].includes(sortDir)) {
      sortDir === "ASC"
        ? state.sort(ticketSortAsc)
        : state.sort(ticketSortDesc);
    }

    return [...state];
  }

  if (action.type === "RESET") {
    console.log("⚪ [REDUCER] RESET - Limpando todo o state!", {
      timestamp: new Date().toISOString(),
    });
    return [];
  }

  return state;
};

const TicketsListCustom = (props) => {
  const {
    setTabOpen,
    status,
    searchParam,
    searchOnMessages,
    tags,
    users,
    showAll,
    selectedQueueIds,
    updateCount,
    style,
    whatsappIds,
    forceSearch,
    statusFilter,
    userFilter,
    sortTickets,
  } = props;

  const classes = useStyles();
  const [pageNumber, setPageNumber] = useState(1);
  let [ticketsList, dispatch] = useReducer(reducer, []);
  const { user, socket } = useContext(AuthContext);

  // Preservar fotos mais recentes dos contatos entre RESET/load
  const preservedPicsRef = useRef({});

  // Junto com os outros refs
  const recentTicketsRef = useRef({}); // { [ticketId]: ticket }

  //Adicionar junto com os outros refs, após o useReducer
  const presenceCacheRef = useRef({});

  // Salvar fotos atualizadas na ref quando chegam
  useEffect(() => {
    ticketsList.forEach((t) => {
      if (t.contact?.urlPicture && t.contact.urlPicture.includes("?t=")) {
        preservedPicsRef.current[t.contact.number] = t.contact.urlPicture;
      }
    });
  }, [ticketsList]);

  const { profile, queues } = user;
  const showTicketWithoutQueue = user.allTicket === "enable";
  const companyId = user.companyId;

  useEffect(() => {
    console.log("⚪ [COMPONENTE] useEffect RESET disparado", {
      timestamp: new Date().toISOString(),
      motivo: "Mudança nos filtros/status",
      status,
      searchParam,
      showAll,
    });
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [
    status,
    searchParam,
    dispatch,
    showAll,
    tags,
    users,
    forceSearch,
    selectedQueueIds,
    whatsappIds,
    statusFilter,
    sortTickets,
    searchOnMessages,
  ]);

  const { tickets, hasMore, loading } = useTickets({
    pageNumber,
    searchParam,
    status,
    showAll,
    searchOnMessages: searchOnMessages ? "true" : "false",
    tags: JSON.stringify(tags),
    users: JSON.stringify(users),
    queueIds: JSON.stringify(selectedQueueIds),
    whatsappIds: JSON.stringify(whatsappIds),
    statusFilter: JSON.stringify(statusFilter),
    userFilter,
    sortTickets,
  });

  useEffect(() => {
    if (companyId) {
      // 🎯 LOG ESTRATÉGICO #3 - useEffect que dispara LOAD_TICKETS
      console.log("🟢 [COMPONENTE] useEffect LOAD_TICKETS disparado:", {
        ticketsCount: tickets.length,
        ticketIds: tickets.map((t) => t.id),
        ticketStatuses: tickets.map((t) => ({ id: t.id, status: t.status })),
        timestamp: new Date().toISOString(),
      });

      console.log(
        "[LOAD_TICKETS] despachando com presenceCache:",
        presenceCacheRef.current,
      );
      dispatch({
        type: "LOAD_TICKETS",
        payload: tickets,
        status,
        sortDir: sortTickets,
        presenceCache: presenceCacheRef.current, // ← passa o cache para o reducer reaplicar
        recentTickets: recentTicketsRef.current, // <- passa tickets recentes
      });
    }
  }, [tickets]);

  useEffect(() => {
    dispatch({
      type: "FILTER_TICKETS_BY_QUEUE",
      payload: selectedQueueIds,
    });
  }, [selectedQueueIds]);

  const shouldUpdateTicket = useCallback(
    (ticket) => {
      return (
        (!ticket?.userId || ticket?.userId === user?.id || showAll) &&
        ((!ticket?.queueId && showTicketWithoutQueue) ||
          selectedQueueIds.indexOf(ticket?.queueId) > -1)
      );
    },
    [user?.id, showAll, showTicketWithoutQueue, selectedQueueIds],
  );

  const notBelongsToUserQueues = useCallback(
    (ticket) => {
      return ticket.queueId && selectedQueueIds.indexOf(ticket.queueId) === -1;
    },
    [selectedQueueIds],
  );

  const onCompanyTicketTicketsList = useCallback(
    (data) => {
      if (data.action === "updateUnread") {
        dispatch({
          type: "RESET_UNREAD",
          payload: data.ticketId,
          status,
          sortDir: sortTickets,
        });
        return;
      }

      if (
        data.action === "update" &&
        shouldUpdateTicket(data.ticket) &&
        data.ticket.status === status
      ) {
        if (recentTicketsRef.current[data.ticket.id]) {
          console.log(
            `[SOCKET][ticket] ✅ ticket ${data.ticket.id} confirmado pelo backend, removendo do recentTicketsRef`,
          );
          delete recentTicketsRef.current[data.ticket.id];
        }
        dispatch({
          type: "UPDATE_TICKET_UNREAD_MESSAGES", // ← Mudou aqui
          payload: data.ticket,
          status,
          sortDir: sortTickets,
        });
        return;
        // dispatch({
        //   type: "UPDATE_TICKET",
        //   payload: data.ticket,
        //   status,
        //   sortDir: sortTickets,
        // });
        // return;
      }

      if (data.action === "update" && notBelongsToUserQueues(data.ticket)) {
        dispatch({
          type: "DELETE_TICKET",
          payload: data.ticket?.id,
          status,
          sortDir: sortTickets,
        });
        return;
      }

      if (data.action === "delete") {
        dispatch({
          type: "DELETE_TICKET",
          payload: data?.ticketId,
          status,
          sortDir: sortTickets,
        });
      }
    },
    [dispatch, status, sortTickets, shouldUpdateTicket, notBelongsToUserQueues],
  );

  const onCompanyAppMessageTicketsList = useCallback(
    (data) => {
      if (data.action === "reaction:update") {
        dispatch({
          type: "UPDATE_TICKET_REACTION_PREVIEW",
          payload: {
            ticketId: data.ticketId,
            contactId: data.contactId,
            emoji: data.reaction.emoji ?? null,
            messagePreview: data.reaction.messagePreview ?? null,
            reactionUserId: data.reaction.userId ?? null,
            skipSidebar: data.skipSidebar,
            fromMe: data.reaction.fromMe ?? false,
          },
        });
        return;
      }

      if (data.action === "presence:update") {
        const { ticket: presenceTicket, status: presenceStatus } = data;

        if (!presenceTicket) return;

        // Atualiza pelo ticketId específico — mesmo critério que UPDATE_TICKET usa
        dispatch({
          type: "UPDATE_TICKET_PRESENCE",
          payload: {
            ticketId: presenceTicket.id,
            contactId: presenceTicket.contactId,
            status: presenceStatus,
          },
        });

        // Atualiza cache por contactId para sobreviver ao RESET/LOAD
        if (presenceStatus) {
          presenceCacheRef.current[`contact-${presenceTicket.contactId}`] =
            presenceStatus;
        } else {
          delete presenceCacheRef.current[
            `contact-${presenceTicket.contactId}`
          ];
        }
        return;
      }

      if (data.action === "create" && data.ticket) {
        const incomingTicketStatus = data.ticket?.status;

        // CORREÇÃO PRINCIPAL: cada instância só processa eventos do seu próprio status
        // A instância "open" não deve processar tickets "pending", e vice-versa
        if (incomingTicketStatus && status && incomingTicketStatus !== status) {
          console.log(
            `[SOCKET][appMessage] ignorando create — status do ticket (${incomingTicketStatus}) ≠ status da aba (${status})`,
          );
          return;
        }

        // 🎯 LOG ESTRATÉGICO #5 - Socket recebe CREATE
        console.log("⚡ [SOCKET] RECEBEU CREATE:", {
          ticketId: data.ticket?.id,
          ticketStatus: incomingTicketStatus,
          abaStatus: status,
          timestamp: new Date().toISOString(),
          ticketCompleto: data.ticket,
        });

        if (!shouldUpdateTicket(data.ticket)) {
          console.warn(
            "[SOCKET][appMessage] ⛔ shouldUpdateTicket retornou false.",
            { ticketId: data.ticket?.id, ticketUserId: data.ticket?.userId },
          );
          return;
        }

        if (notBelongsToUserQueues(data.ticket)) {
          console.warn(
            "[SOCKET][appMessage] ⛔ notBelongsToUserQueues retornou true.",
            { ticketId: data.ticket?.id, queueId: data.ticket?.queueId },
          );
          return;
        }

        const contactId = data.ticket?.contactId || data.contact?.id;
        if (contactId) {
          const cacheKey = `contact-${contactId}`;
          if (presenceCacheRef.current[cacheKey]) {
            console.log(
              `[SOCKET][appMessage] 🧹 limpando presence do cache ao receber mensagem do contato ${contactId}`,
            );
            delete presenceCacheRef.current[cacheKey];
          }
        }

        const ticketPayload = {
          ...data.ticket,
          status: incomingTicketStatus || status,
        };

        console.log(
          "[SOCKET][appMessage] ✅ despachando UPDATE_TICKET_UNREAD_MESSAGES:",
          {
            ticketId: ticketPayload.id,
            ticketStatus: ticketPayload.status,
            abaStatus: status,
          },
        );

        // Salvar no ref para sobreviver ao RESET/LOAD
        recentTicketsRef.current[ticketPayload.id] = ticketPayload;
        console.log(
          `[SOCKET][appMessage] 💾 ticket ${ticketPayload.id} salvo no recentTicketsRef`,
        );

        // Agendar remoção do ref após 30s (tempo suficiente para o backend confirmar)
        setTimeout(() => {
          delete recentTicketsRef.current[ticketPayload.id];
          console.log(
            `[SOCKET][appMessage] 🗑️ ticket ${ticketPayload.id} removido do recentTicketsRef`,
          );
        }, 30_000);

        dispatch({
          type: "UPDATE_TICKET_UNREAD_MESSAGES",
          payload: ticketPayload,
          status,
          sortDir: sortTickets,
        });

        return;
      }

      if (data.action === "update") {
        if (data.ticket) {
          if (
            !shouldUpdateTicket(data.ticket) ||
            notBelongsToUserQueues(data.ticket)
          ) {
            dispatch({
              type: "DELETE_TICKET",
              payload: data.ticket.id,
              status,
              sortDir: sortTickets,
            });
            return;
          }

          dispatch({
            type: "UPDATE_TICKET",
            payload: data.ticket,
            sortDir: sortTickets,
          });
        }

        if (data.message) {
          dispatch({
            type: "UPDATE_TICKET",
            payload: {
              id: data.message.ticketId,
              lastMessage: data.message.body,
            },
            sortDir: sortTickets,
          });
        }
      }
    },
    [dispatch, status, sortTickets, shouldUpdateTicket, notBelongsToUserQueues],
  );

  const onCompanyContactTicketsList = useCallback(
    (data) => {
      if (data.action === "update" && data.contact) {
        dispatch({
          type: "UPDATE_TICKET_CONTACT",
          payload: data.contact,
          status,
          sortDir: sortTickets,
        });
      }
    },
    [dispatch, status, sortTickets],
  );

  const onConnectTicketsList = useCallback(() => {
    if (status) {
      socket.socket.emit("joinTickets", status);
    } else {
      socket.socket.emit("joinNotification");
    }
  }, [socket, status]);

  useEffect(() => {
    if (!companyId) return;

    const eventTicket = `company-${companyId}-ticket`;
    const eventAppMessage = `company-${companyId}-appMessage`;
    const eventContact = `company-${companyId}-contact`;

    console.log("[SOCKET] companyId:", companyId);
    console.log("[SOCKET] connected?", socket.socket?.connected);
    console.log("[SOCKET] namespace:", socket.socket?.nsp);
    console.log("[SOCKET] id:", socket.socket?.id);
    console.log("[SOCKET] listening event:", eventAppMessage);

    const debugPresence = (data) => {
      console.log("[SOCKET] EVENTO RECEBIDO:", eventAppMessage, data);
    };

    socket.socket.on("connect", onConnectTicketsList);
    socket.socket.on(eventTicket, onCompanyTicketTicketsList);
    socket.socket.on(eventAppMessage, onCompanyAppMessageTicketsList);
    socket.socket.on(eventContact, onCompanyContactTicketsList);

    return () => {
      socket.socket.off("connect", onConnectTicketsList);
      socket.socket.off(eventTicket, onCompanyTicketTicketsList);
      socket.socket.off(eventAppMessage, onCompanyAppMessageTicketsList);
      socket.socket.off(eventContact, onCompanyContactTicketsList);
    };
  }, [
    companyId,
    onCompanyTicketTicketsList,
    onCompanyAppMessageTicketsList,
    onCompanyContactTicketsList,
    onConnectTicketsList,
  ]);

  useEffect(() => {
    if (typeof updateCount === "function") {
      updateCount(ticketsList.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketsList]);

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  // Re-aplicar fotos preservadas que foram perdidas no RESET/LOAD
  if (Object.keys(preservedPicsRef.current).length > 0) {
    const normalize = (n) => n?.replace(/\D/g, "");
    ticketsList = ticketsList.map((t) => {
      for (const number in preservedPicsRef.current) {
        if (
          t.contact?.number &&
          normalize(t.contact.number) === normalize(number)
        ) {
          const newPic = preservedPicsRef.current[number];
          if (t.contact.urlPicture !== newPic) {
            t = { ...t, contact: { ...t.contact, urlPicture: newPic } };
          }
          break;
        }
      }
      return t;
    });
  }

  // 🎯 LOG ESTRATÉGICO #4 - FILTRO FINAL
  console.log("🔴 [FILTRO FINAL] Verificando antes do filtro por status:", {
    statusFiltro: status,
    timestamp: new Date().toISOString(),
    antesDoFiltro: {
      count: ticketsList.length,
      ids: ticketsList.map((t) => t.id),
      statuses: ticketsList.map((t) => ({ id: t.id, status: t.status })),
    },
  });

  if (status && status !== "search") {
    const removidos = ticketsList.filter((ticket) => ticket.status !== status);

    if (removidos.length > 0) {
      console.warn(
        `🔴 [FILTRO FINAL] ⚠️ Tickets serão REMOVIDOS pelo filtro:`,
        {
          removidosCount: removidos.length,
          removidos: removidos.map((t) => ({
            id: t.id,
            status: t.status,
            esperado: status,
          })),
          timestamp: new Date().toISOString(),
        },
      );
    }

    ticketsList = ticketsList.filter((ticket) => ticket.status === status);

    console.log("🔴 [FILTRO FINAL] Após filtro:", {
      timestamp: new Date().toISOString(),
      depoisDoFiltro: {
        count: ticketsList.length,
        ids: ticketsList.map((t) => t.id),
      },
    });
  }

  return (
    <Paper className={classes.ticketsListWrapper} style={style}>
      <Paper
        square
        name="closed"
        elevation={0}
        className={classes.ticketsList}
        onScroll={handleScroll}
      >
        <List style={{ paddingTop: 0 }}>
          {ticketsList.length === 0 && !loading ? (
            <div className={classes.noTicketsDiv}>
              <span className={classes.noTicketsTitle}>
                {i18n.t("ticketsList.noTicketsTitle")}
              </span>
              <p className={classes.noTicketsText}>
                {i18n.t("ticketsList.noTicketsMessage")}
              </p>
            </div>
          ) : (
            <>
              {ticketsList.map((ticket) => (
                // <List key={ticket.id}>
                //     {console.log(ticket)}
                <TicketListItemCustom
                  ticket={ticket}
                  key={ticket.id}
                  setTabOpen={setTabOpen}
                />
                // </List>
              ))}
            </>
          )}
          {loading && <TicketsListSkeleton />}
        </List>
      </Paper>
    </Paper>
  );
};

export default TicketsListCustom;
