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

// import TicketListItem from "../TicketListItemCustom";
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
    const ticketIndex = state.findIndex(
      (t) => t.id === action.payload.ticketId,
    );
    if (ticketIndex === -1) return state; // ticket não está nessa lista, ignora

    // Imutável — cria novo array com novo objeto no índice correto
    return state.map((t) =>
      t.id === action.payload.ticketId
        ? { ...t, presence: action.payload.status }
        : t,
    );
  }

  if (action.type === "LOAD_TICKETS") {
    const newTickets = action.payload;

    return newTickets.reduce(
      (nextState, ticket) => {
        const ticketIndex = nextState.findIndex((t) => t.id === ticket.id);
        if (ticketIndex !== -1) {
          nextState[ticketIndex] = { ...nextState[ticketIndex], ...ticket };
          if (ticket.unreadMessages > 0) {
            const moved = nextState.splice(ticketIndex, 1)[0];
            nextState.unshift(moved);
          }
        } else {
          nextState.push(ticket);
        }
        return nextState;
      },
      [...state],
    );
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

    const ticketIndex = state.findIndex((t) => t.id === ticket.id);
    if (ticketIndex !== -1) {
      state[ticketIndex] = {
        ...state[ticketIndex],
        ...ticket,
        reactionPreview: null,
      };

      state.unshift(state.splice(ticketIndex, 1)[0]);
    } else {
      if (action.status === action.payload.status) {
        state.unshift(ticket);
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
    if (process.env.NODE_ENV === "development")
      console.log("[REDUCER ACTION RESET] Limpando todo o state!");
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
        dispatch({
          type: "UPDATE_TICKET",
          payload: data.ticket,
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
    [dispatch, status, sortTickets, shouldUpdateTicket, notBelongsToUserQueues],
  );

  const onCompanyAppMessageTicketsList = useCallback(
    (data) => {
      console.log("[APP_MESSAGE] chegou:", data);
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
        dispatch({
          type: "UPDATE_TICKET_PRESENCE",
          payload: {
            ticketId: data.ticket.id,
            status: data.status,
          },
        });
        return;
      }

      if (data.action === "create" && data.ticket) {
        if (
          !shouldUpdateTicket(data.ticket) ||
          notBelongsToUserQueues(data.ticket)
        ) {
          return;
        }

        dispatch({
          type: "UPDATE_TICKET_UNREAD_MESSAGES",
          payload: data.ticket,
          status,
          sortDir: sortTickets,
        });

        dispatch({
          type: "UPDATE_TICKET_PRESENCE",
          payload: {
            ticketId: data.ticket.id,
            status: data.status,
          },
        });

        return;
      }

      // if (data.action === "update") {
      //   if (data.ticket) {
      //     dispatch({
      //       type: "UPDATE_TICKET",
      //       payload: data.ticket,
      //       sortDir: sortTickets,
      //     });
      //   }

      //   if (data.message) {
      //     dispatch({
      //       type: "UPDATE_TICKET",
      //       payload: {
      //         id: data.message.ticketId,
      //         lastMessage: data.message.body,
      //       },
      //       sortDir: sortTickets,
      //     });
      //   }
      // }

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
    [dispatch, status, sortTickets],
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

  if (status && status !== "search") {
    ticketsList = ticketsList.filter((ticket) => ticket.status === status);
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
