import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from "react";
import List from "@material-ui/core/List";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import { VariableSizeList } from "react-window";
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
  const sortDir = action.sortDir;

  if (action.type === "UPDATE_TICKET_REACTION_PREVIEW") {
    const { contactId, emoji, messagePreview, reactionUserId, skipSidebar } =
      action.payload;

    const fromMe = action.payload.fromMe ?? false;

    if (skipSidebar) {
      return state;
    }

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
    const { ticketId, contactId, status, memberName } = action.payload;

    return state.map((t) => {
      // Filtra pelo ticketId exato — mesmo ticket, mesma fila, mesmo chip
      if (t.id === ticketId) {
        return {
          ...t,
          presence: status,
          presenceMemberName: memberName || null,
        };
      }
      return t;
    });
  }

  if (action.type === "LOAD_TICKETS") {
    const newTickets = action.payload;
    const presenceCache = action.presenceCache || {};
    const recentTickets = action.recentTickets || {};

    // Tickets que vieram via socket mas ainda não estão na resposta do backend
    const recentIds = Object.keys(recentTickets).map(Number);
    const backendIds = newTickets.map((t) => t.id);
    const missingFromBackend = recentIds.filter(
      (id) => !backendIds.includes(id)
    );

    // Começa com os tickets recentes que o backend ainda não retornou
    const ticketsToKeep = missingFromBackend.map((id) => recentTickets[id]);

    const result = newTickets.reduce(
      (nextState, ticket) => {
        // Busca cache por contactId
        const cachedPresence =
          presenceCache[`contact-${ticket.contactId}`] ?? null;

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
      [...state]
    );

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
    const abaStatus = action.status;

    const ticketIndex = state.findIndex((t) => t.id === ticket.id);

    if (ticketIndex !== -1) {
      return state.map((t, i) => {
        if (i !== ticketIndex) return t;
        const currentContact = t.contact;
        const incomingContact = ticket.contact || {};
        // Preservar contact mais recente do estado local
        const mergedContact = { ...incomingContact, ...currentContact };
        return { ...t, ...ticket, contact: mergedContact };
      });
    }

    // Ticket ainda não existe no state (provavelmente foi descartado no
    // evento "create" por ainda não ter queueId). Só insere se ele
    // realmente pertence à aba atual, evitando vazar tickets de outros status.
    if (ticket?.status && abaStatus && ticket.status === abaStatus) {
      return [ticket, ...state];
    }

    return state;
  }

  if (action.type === "UPDATE_TICKET_UNREAD_MESSAGES") {
    const ticket = action.payload;

    const ticketIndex = state.findIndex((t) => t.id === ticket.id);

    if (ticketIndex !== -1) {
      // Ticket já existe no estado → atualiza e move para o topo
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

      if (ticketStatus && abaStatus && ticketStatus === abaStatus) {
        state.unshift(ticket);
      } else {
        console.warn(
          "[REDUCER][UPDATE_TICKET_UNREAD_MESSAGES] ⚠️ ticket NÃO inserido. Status não bate ou está undefined.",
          {
            ticketStatus,
            abaStatus,
          }
        );
      }
    }

    if (sortDir && ["ASC", "DESC"].includes(sortDir)) {
      sortDir === "ASC"
        ? state.sort(ticketSortAsc)
        : state.sort(ticketSortDesc);
    }

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

  const preservedPicsRef = useRef({});

  const recentTicketsRef = useRef({}); // { [ticketId]: ticket }

  const presenceCacheRef = useRef({});

  const presenceTimeoutsRef = useRef({});

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
    [user?.id, showAll, showTicketWithoutQueue, selectedQueueIds]
  );

  const notBelongsToUserQueues = useCallback(
    (ticket) => {
      return ticket.queueId && selectedQueueIds.indexOf(ticket.queueId) === -1;
    },
    [selectedQueueIds]
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
          delete recentTicketsRef.current[data.ticket.id];
        }
        dispatch({
          type: "UPDATE_TICKET_UNREAD_MESSAGES", // ← Mudou aqui
          payload: {
            ...data.ticket,
            mediaType:
              data.ticket?.lastMessageMediaType ||
              data.ticket?.mediaType ||
              null,
          },
          status,
          sortDir: sortTickets,
        });
        return;
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
    [dispatch, status, sortTickets, shouldUpdateTicket, notBelongsToUserQueues]
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

        dispatch({
          type: "UPDATE_TICKET_PRESENCE",
          payload: {
            ticketId: presenceTicket.id,
            contactId: presenceTicket.contactId,
            status: presenceStatus,
            memberName: presenceTicket.memberName || null,
          },
        });

        if (presenceStatus) {
          presenceCacheRef.current[`contact-${presenceTicket.contactId}`] =
            presenceStatus;

          clearTimeout(presenceTimeoutsRef.current[presenceTicket.id]);

          setTimeout(() => {
            dispatch({
              type: "UPDATE_TICKET_PRESENCE",
              payload: {
                ticketId: presenceTicket.id,
                contactId: presenceTicket.contactId,
                status: null,
                memberName: null,
              },
            });
            delete presenceCacheRef.current[
              `contact-${presenceTicket.contactId}`
            ];
            delete presenceTimeoutsRef.current[presenceTicket.id];
          }, 10_000);
        } else {
          clearTimeout(presenceTimeoutsRef.current[presenceTicket.id]);
          delete presenceCacheRef.current[
            `contact-${presenceTicket.contactId}`
          ];
          delete presenceTimeoutsRef.current[presenceTicket.id];
        }
        return;
      }

      if (data.action === "create" && data.ticket) {
        const incomingTicketStatus = data.ticket?.status;

        // CORREÇÃO PRINCIPAL: cada instância só processa eventos do seu próprio status
        // A instância "open" não deve processar tickets "pending", e vice-versa
        if (incomingTicketStatus && status && incomingTicketStatus !== status) {
          return;
        }

        if (!shouldUpdateTicket(data.ticket)) {
          console.warn(
            "[SOCKET][appMessage] ⛔ shouldUpdateTicket retornou false.",
            { ticketId: data.ticket?.id, ticketUserId: data.ticket?.userId }
          );
          return;
        }

        if (notBelongsToUserQueues(data.ticket)) {
          console.warn(
            "[SOCKET][appMessage] ⛔ notBelongsToUserQueues retornou true.",
            { ticketId: data.ticket?.id, queueId: data.ticket?.queueId }
          );
          return;
        }

        const contactId = data.ticket?.contactId || data.contact?.id;
        if (contactId) {
          const cacheKey = `contact-${contactId}`;
          if (presenceCacheRef.current[cacheKey]) {
            delete presenceCacheRef.current[cacheKey];
          }
        }

        const ticketPayload = {
          ...data.ticket,
          status: incomingTicketStatus || status,
          mediaType: data.message?.mediaType || data.ticket?.mediaType || null,
          lastMessage: data.message?.body || data.ticket?.lastMessage,
        };

        // Salvar no ref para sobreviver ao RESET/LOAD
        recentTicketsRef.current[ticketPayload.id] = ticketPayload;

        // Agendar remoção do ref após 30s (tempo suficiente para o backend confirmar)
        setTimeout(() => {
          delete recentTicketsRef.current[ticketPayload.id];
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
              mediaType: data.message.mediaType || null,
            },
            sortDir: sortTickets,
          });
        }
      }
    },
    [dispatch, status, sortTickets, shouldUpdateTicket, notBelongsToUserQueues]
  );

  const onCompanyContactTicketsList = useCallback(
    (data) => {
      // if (data.action === "update" && data.contact) {
      //   dispatch({
      //     type: "UPDATE_TICKET_CONTACT",
      //     payload: data.contact,
      //     status,
      //     sortDir: sortTickets,
      //   });
      // }
      if (data.action === "update") {
        if (data.ticket) {
          // Só remove quando o ticket foi transferido para uma fila que não
          // pertence ao usuário. NÃO remove apenas por !shouldUpdateTicket,
          // pois isso apagaria tickets pendentes sem fila recém-adicionados.
          if (notBelongsToUserQueues(data.ticket)) {
            dispatch({
              type: "DELETE_TICKET",
              payload: data.ticket.id,
              status,
              sortDir: sortTickets,
            });
            return;
          }

          if (shouldUpdateTicket(data.ticket)) {
            dispatch({
              type: "UPDATE_TICKET",
              payload: data.ticket,
              status,
              sortDir: sortTickets,
            });
          }
        }

        if (data.message) {
          dispatch({
            type: "UPDATE_TICKET",
            payload: {
              id: data.message.ticketId,
              lastMessage: data.message.body,
              mediaType: data.message.mediaType || null,
            },
            status,
            sortDir: sortTickets,
          });
        }
      }
    },
    [dispatch, status, sortTickets]
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

  const displayedTicketsList = useMemo(() => {
    if (status && status !== "search") {
      return ticketsList.filter((ticket) => ticket.status === status);
    }
    return ticketsList;
  }, [ticketsList, status]);

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
          {displayedTicketsList.length === 0 && !loading ? (
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
              {displayedTicketsList.map((ticket) => (
                <TicketListItemCustom
                  ticket={ticket}
                  key={ticket.id}
                  setTabOpen={setTabOpen}
                />
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
