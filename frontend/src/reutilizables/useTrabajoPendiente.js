import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { peticionesApi } from "../api/peticiones";

export default function useTrabajoPendiente() {
  const { pathname } = useLocation();
  const [conteo, setConteo] = useState({ por_firmar: 0, por_entregar: 0 });

  const recargar = useCallback(async () => {
    try {
      const res = await peticionesApi.pendientes();
      const d = res?.data ?? res;
      setConteo({
        por_firmar: Number(d?.por_firmar) || 0,
        por_entregar: Number(d?.por_entregar) || 0,
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Se actualiza al cambiar de pantalla (por ejemplo, después de firmar)
  useEffect(() => {
    recargar();
  }, [pathname, recargar]);

  // Y cada 30 segundos
  useEffect(() => {
    const t = setInterval(recargar, 30000);
    return () => clearInterval(t);
  }, [recargar]);

  return conteo;
}