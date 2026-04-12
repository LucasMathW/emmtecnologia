import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../../services/api";
import useWhatsApps from "../../hooks/useWhatsApps";
import WavoipPhoneWidget from "../../components/WavoipCall";
import { AuthContext } from "../Auth/AuthContext";

const WhatsAppsContext = createContext();

const WhatsAppsProvider = ({ children }) => {
  const whatsAppData = useWhatsApps();
  const { loading = false, whatsApps = [] } = whatsAppData || {};
  const { user } = useContext(AuthContext);

  const [wavoipToken, setWavoipToken] = useState(null);
  const [whatsappId, setWhatsappId] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      console.log('[WAVOIP-CTX] Buscando token WavoIP...');
      try {
        const { data } = await api.get("/call/historical/user/whatsapp");
        console.log('[WAVOIP-CTX] Resposta da API:', JSON.stringify(data, null, 2));
        console.log('[WAVOIP-CTX] Token encontrado:', data?.whatsapp?.wavoip ? data.whatsapp.wavoip.substring(0, 10) + '...' : 'NULL');
        console.log('[WAVOIP-CTX] WhatsApp ID:', data?.whatsapp?.id);
        setWavoipToken(data?.whatsapp?.wavoip || null);
        setWhatsappId(data?.whatsapp?.id || null);
      } catch (err) {
        console.error("[WAVOIP-CTX] Erro ao buscar token:", err.response?.data || err.message);
        setWavoipToken(null);
        setWhatsappId(null);
      } finally {
        setLoadingSession(false);
      }
    };
    fetchSession();
  }, []);


  if (error) {
    console.warn("WhatsAppsProvider error:", error);
  }

  return (
    <WhatsAppsContext.Provider value={{ whatsApps, loading, error }}>
      {children}
      {wavoipToken ? (
        <WavoipPhoneWidget
          token={wavoipToken}
          whatsappId={whatsappId}
          position="bottom-right"
          name={user?.company?.name || "waVoip"}
          country="BR"
          autoConnect={true}
          onCallStarted={(data) => console.log("Chamada iniciada:", data)}
          onCallEnded={(data) => console.log("Chamada finalizada:", data)}
          onConnectionStatus={(status) => console.log("Status:", status)}
          onError={(error) => console.error("Erro:", error)}
        />
      ) : (
        console.log('[WAVOIP-CTX] ❌ Widget NÃO renderizado — wavoipToken é NULL')
      )}
    </WhatsAppsContext.Provider>
  );
};

export { WhatsAppsContext, WhatsAppsProvider };