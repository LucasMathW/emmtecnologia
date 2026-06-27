/**
 * DNS Patch - Resolve *.whatsapp.net via DoH quando DNS padrão falha
 *
 * IMPORTANTE: NÃO intercepta undici (causa ERR_INVALID_IP_ADDRESS)
 * O undici usa host: "mmg.whatsapp.net" que resolve normalmente via DNS público
 * Este patch serve apenas como fallback para casos onde dns.lookup é usado
 */
import dns from "node:dns";
import https from "node:https";

// Apenas intercepta domínios que NÃO resolvem via DNS público normal
// a.whatsapp.net = não existe no DNS público
// mmg.whatsapp.net = resolve normalmente, NÃO interceptar
const BROKEN_HOSTS = new Set(["a.whatsapp.net", "b.whatsapp.net"]);

const dnsCache = new Map<string, string>();

function resolveViaDoH(hostname: string): Promise<string | null> {
  return new Promise(resolve => {
    const req = https.get(
      {
        hostname: "1.1.1.1",
        path: `/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
        headers: { accept: "application/dns-json" },
        timeout: 5000
      },
      res => {
        let data = "";
        res.on("data", c => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const ip = (json.Answer || [])
              .filter((r: any) => r.type === 1)
              .map((r: any) => String(r.data || "").trim())
              .find((ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
            resolve(ip || null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Patch apenas no dns.lookup (NÃO no undici - causa problemas)
if (!(dns as any).__emmPatchedV4) {
  (dns as any).__emmPatchedV4 = true;
  const _orig = dns.lookup.bind(dns);

  (dns as any).lookup = (hostname: string, optsOrCb: any, cbMaybe?: any) => {
    const cb = typeof optsOrCb === "function" ? optsOrCb : cbMaybe;
    const opts = typeof optsOrCb === "object" ? optsOrCb : {};

    if (BROKEN_HOSTS.has(hostname)) {
      // Verifica cache primeiro
      const cached = dnsCache.get(hostname);
      if (cached) {
        setImmediate(() => cb(null, cached, 4));
        return;
      }
      // Resolve via DoH e usa mmg.whatsapp.net como fallback
      resolveViaDoH(hostname)
        .then(ip => {
          const resolved = ip || "157.240.254.60"; // IP do mmg.whatsapp.net como fallback
          dnsCache.set(hostname, resolved);
          console.log(`[DNS-PATCH] ${hostname} → ${resolved}`);
          cb(null, resolved, 4);
        })
        .catch(() => {
          cb(null, "157.240.254.60", 4); // fallback sempre funciona
        });
      return;
    }

    return _orig(hostname, opts, cb);
  };
}

console.log("[DNS-PATCH] Ativo (apenas dns.lookup, sem undici).");
