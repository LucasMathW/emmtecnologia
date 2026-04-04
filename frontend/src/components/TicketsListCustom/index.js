import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useMemo,
  useCallback,
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

    if (ticketIndex !== -1) {
      state[ticketIndex] = {
        ...state[ticketIndex],
        presence: action.payload.status,
      };
    }

    return [...state];
  }

  if (action.type === "LOAD_TICKETS") {
    // console.log("LOAD_TICKETS");

    const newTickets = action.payload;

    newTickets.forEach((ticket) => {
      const ticketIndex = state.findIndex((t) => t.id === ticket.id);
      if (ticketIndex !== -1) {
        state[ticketIndex] = {
          ...state[ticketIndex],
          ...ticket,
        };

        if (ticket.unreadMessages > 0) {
          state.unshift(state.splice(ticketIndex, 1)[0]);
        }
      } else {
        state.push(ticket);
      }
    });
    if (sortDir && ["ASC", "DESC"].includes(sortDir)) {
      sortDir === "ASC"
        ? state.sort(ticketSortAsc)
        : state.sort(ticketSortDesc);
    }

    return [...state];
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

    const ticketIndex = state.findIndex((t) => t.id === ticket.id);
    if (ticketIndex !== -1) {
      state[ticketIndex] = {
        ...state[ticketIndex],
        ...ticket,
      };
    } else {
      state.unshift(ticket);
    }
    if (sortDir && ["ASC", "DESC"].includes(sortDir)) {
      sortDir === "ASC"
        ? state.sort(ticketSortAsc)
        : state.sort(ticketSortDesc);
    }

    return [...state];
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
    const ticketIndex = state.findIndex((t) => t.contactId === contact.id);
    if (ticketIndex !== -1) {
      state[ticketIndex].contact = contact;
    }
    return [...state];
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

      if (data.action === "update") {
        if (data.ticket) {
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
