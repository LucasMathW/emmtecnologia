import { useState, useEffect, useReducer, useContext } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_WHATSAPPS") {
    const whatsApps = action.payload;
    return [...whatsApps];
  }

  if (action.type === "UPDATE_WHATSAPPS") {
    const whatsApp = action.payload;
    const whatsAppIndex = state.findIndex((s) => s.id === whatsApp.id);

    if (whatsAppIndex !== -1) {
      state[whatsAppIndex] = {
        ...state[whatsAppIndex],
        ...whatsApp,
      };
      return [...state];
    } else {
      return [whatsApp, ...state];
    }
  }

  if (action.type === "UPDATE_SESSION") {
    const whatsApp = action.payload;
    const whatsAppIndex = state.findIndex((s) => s.id === whatsApp.id);

    if (whatsAppIndex !== -1) {
      state[whatsAppIndex] = {
        ...state[whatsAppIndex],
        ...whatsApp,
      };
      return [...state];
    } else {
      return [...state];
    }
  }

  if (action.type === "DELETE_WHATSAPPS") {
    const whatsAppId = action.payload;
    const whatsAppIndex = state.findIndex((s) => s.id === whatsAppId);
    if (whatsAppIndex !== -1) {
      state.splice(whatsAppIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

const useWhatsApps = () => {
  const [whatsApps, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(true);
  const { user, socket } = useContext(AuthContext);

  useEffect(() => {
    setLoading(true);
    const fetchSession = async () => {
      try {
        const { data } = await api.get("/whatsapp/?session=0");
        dispatch({ type: "LOAD_WHATSAPPS", payload: data });
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar WhatsApps:", err);
        setLoading(false);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (
      user?.companyId &&
      socket &&
      typeof socket.on === "function" &&
      typeof socket.off === "function"
    ) {
      const companyId = user.companyId;

      const onCompanyWhatsapp = (data) => {
        console.log("Recebido evento whatsapp:", data);
        if (data.action === "update") {
          dispatch({ type: "UPDATE_WHATSAPPS", payload: data.whatsapp });
        }
        if (data.action === "delete") {
          dispatch({ type: "DELETE_WHATSAPPS", payload: data.whatsappId });
        }
      };

      const onCompanyWhatsappSession = (data) => {
        console.log("Recebido evento whatsapp session:", data);
        if (data.action === "update") {
          dispatch({ type: "UPDATE_SESSION", payload: data.session });
        }
      };

      const whatsappEvent = `company-${companyId}-whatsapp`;
      const sessionEvent = `company-${companyId}-whatsappSession`;

      socket.on(whatsappEvent, onCompanyWhatsapp);
      socket.on(sessionEvent, onCompanyWhatsappSession);

      return () => {
        if (socket && typeof socket.off === "function") {
          socket.off(whatsappEvent, onCompanyWhatsapp);
          socket.off(sessionEvent, onCompanyWhatsappSession);
        }
      };
    } else {
      console.log("Condições não atendidas para listeners WhatsApp:", {
        hasCompanyId: !!user?.companyId,
        hasSocket: !!socket,
        hasOnMethod: socket && typeof socket.on === "function",
        hasOffMethod: socket && typeof socket.off === "function",
      });
    }
  }, [socket, user?.companyId]);

  return { whatsApps, loading };
};

export default useWhatsApps;
