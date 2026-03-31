import { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import { has, isArray } from "lodash";

import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { socketConnection } from "../../services/socket";
import moment from "moment";

let requestInterceptor = null;
let responseInterceptor = null;

const useAuth = () => {
  const history = useHistory();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});
  const [socket, setSocket] = useState(null);

  const listenersRef = useRef(new Set());

  useEffect(() => {
    // Remove interceptors antigos se existirem
    if (requestInterceptor !== null) {
      api.interceptors.request.eject(requestInterceptor);
    }
    if (responseInterceptor !== null) {
      api.interceptors.response.eject(responseInterceptor);
    }

    requestInterceptor = api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
          // ✅ FIX 3: Removido setIsAuth daqui — causava re-renders infinitos
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error?.response?.status === 403 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const { data } = await api.post("/auth/refresh_token");
            if (data) {
              localStorage.setItem("token", JSON.stringify(data.token));
              api.defaults.headers.Authorization = `Bearer ${data.token}`;
            }
            return api(originalRequest);
          } catch {
            localStorage.removeItem("token");
            api.defaults.headers.Authorization = undefined;
            setIsAuth(false);
            return Promise.reject(error);
          }
        }
        if (error?.response?.status === 401) {
          localStorage.removeItem("token");
          api.defaults.headers.Authorization = undefined;
          setIsAuth(false);
        }
        return Promise.reject(error);
      },
    );

    // Cleanup ao desmontar
    return () => {
      if (requestInterceptor !== null) {
        api.interceptors.request.eject(requestInterceptor);
        requestInterceptor = null;
      }
      if (responseInterceptor !== null) {
        api.interceptors.response.eject(responseInterceptor);
        responseInterceptor = null;
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    (async () => {
      if (token) {
        try {
          const { data } = await api.post("/auth/refresh_token");
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
          setIsAuth(true);
          setUser(data.user || data);
        } catch (err) {
          toastError(err);
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (Object.keys(user).length && user.id > 0) {
      console.log(
        "🔵 Criando socket para user",
        user.id,
        "🔵 Criando socket para Company",
        user.companyId,
      );

      if (socket) {
        listenersRef.current.forEach((eventName) => {
          if (socket.off) {
            socket.off(eventName);
          }
        });
        listenersRef.current.clear();
      }

      const socketInstance = socketConnection({
        user: {
          companyId: user.companyId,
          id: user.id,
        },
      });

      console.log("🟢 NOVO SOCKET CRIADO");

      socketInstance.on("connect", () => {
        console.log("🟢 SOCKET CONNECT ID:", socketInstance.id);
      });

      if (socketInstance) {
        setSocket(socketInstance);

        // Aguardar um pouco para garantir que o socket está configurado
        setTimeout(() => {
          const eventName = `company-${user.companyId}-user`;

          const handleUserUpdate = (data) => {
            if (data.action === "update" && data.user.id === user.id) {
              setUser(data.user);
            }
          };

          // Verificar se o socket tem o método 'on'
          if (socketInstance && typeof socketInstance.on === "function") {
            socketInstance.on(eventName, handleUserUpdate);
            listenersRef.current.add(eventName);
            console.log(`Listener adicionado para: ${eventName}`);
          } else {
            console.error(
              "Socket instance não tem método 'on'",
              socketInstance,
            );
          }
        }, 100);
      }
    }

    // Cleanup function
    return () => {
      if (socket && listenersRef.current.size > 0) {
        console.log("Limpando listeners do socket para user", user.id);
        listenersRef.current.forEach((eventName) => {
          if (socket.off) {
            socket.off(eventName);
          }
        });
        listenersRef.current.clear();
      }
    };
  }, [user.id, user.companyId]); // Dependências específicas

  // Effect para buscar dados do usuário atual
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user || data);
      } catch (err) {
        console.log("Erro ao buscar usuário atual:", err);
      }
    };

    if (isAuth) {
      fetchCurrentUser();
    }
  }, [isAuth]);

  const handleLogin = async (userData) => {
    setLoading(true);

    try {
      // ✅ Sem companyId — backend resolve pelo domínio via middleware
      const { data } = await api.post("/auth/login", userData);

      const {
        user: { company },
      } = data;

      // Lógica de configurações da empresa (mantém como estava)
      if (
        has(company, "companieSettings") &&
        isArray(company.companieSettings[0])
      ) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "campaignsEnabled",
        );
        if (setting && setting.value === "true") {
          localStorage.setItem("cshow", null);
        }
      }

      if (
        has(company, "companieSettings") &&
        isArray(company.companieSettings[0])
      ) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "sendSignMessage",
        );

        const signEnable = setting.value === "enable";

        if (setting && setting.value === "enabled") {
          localStorage.setItem("sendSignMessage", signEnable);
        }
      }

      localStorage.setItem("profileImage", data.user.profileImage);

      moment.locale("pt-br");
      let dueDate;
      if (data.user.company.id === 1) {
        dueDate = "2999-12-31T00:00:00.000Z";
      } else {
        dueDate = data.user.company.dueDate;
      }

      const hoje = moment(moment()).format("DD/MM/yyyy");
      const vencimento = moment(dueDate).format("DD/MM/yyyy");

      // Comparar apenas as datas (sem horas) para permitir acesso até 23h59 do dia do vencimento
      const hojeInicio = moment().startOf("day");
      const vencimentoInicio = moment(dueDate).startOf("day");

      var diff = vencimentoInicio.diff(hojeInicio, "days");
      var before = hojeInicio.isSameOrBefore(vencimentoInicio, "day");
      var dias = diff;

      if (before === true) {
        localStorage.setItem("token", JSON.stringify(data.token));
        localStorage.setItem("companyDueDate", vencimento);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setUser(data.user || data);
        setIsAuth(true);
        toast.success(i18n.t("auth.toasts.success"));

        if (Math.round(dias) < 5) {
          toast.warn(
            `Sua assinatura vence em ${Math.round(dias)} ${
              Math.round(dias) === 1 ? "dia" : "dias"
            } `,
          );
        }

        history.push("/tickets");
        setLoading(false);
      } else {
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setIsAuth(true);
        toastError(`Opss! Sua assinatura venceu ${vencimento}.
Entre em contato com o Suporte para mais informações! `);
        history.push("/financeiro-aberto");
        setLoading(false);
      }
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      if (socket) {
        listenersRef.current.forEach((eventName) => {
          if (socket.off) {
            socket.off(eventName);
          }
        });
        listenersRef.current.clear();

        if (typeof socket.disconnect === "function") {
          socket.disconnect();
        }
      }

      await api.delete("/auth/logout");
      setIsAuth(false);
      setUser({});
      setSocket(null);
      localStorage.removeItem("token");
      localStorage.removeItem("cshow");
      api.defaults.headers.Authorization = undefined;
      setLoading(false);
      const companyId = localStorage.getItem("companyId");

      if (companyId) {
        history.push(`/login?companyId=${companyId}`);
      } else {
        history.push("/login");
      }
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data } = await api.get("/auth/me");
      console.log(data);
      return data;
    } catch (_) {
      return null;
    }
  };

  return {
    isAuth,
    user,
    loading,
    handleLogin,
    handleLogout,
    getCurrentUserInfo,
    socket,
  };
};

export default useAuth;
