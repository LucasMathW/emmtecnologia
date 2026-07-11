import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env"
});

// Patch de DNS: resolve *.whatsapp.net via DNS público (8.8.8.8)
// Necessário quando o container Docker herda um DNS do host que bloqueia esses domínios
import "./helpers/dns-patch";
