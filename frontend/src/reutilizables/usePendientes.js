import { useCallback, useEffect, useState } from "react";
import { notificacionesApi } from "../api/notificaciones";

export default function usePendientes() {
  const [pendientes, setPendientes] = useState([]);

  const recargar = useCallback(async () => {
    try {
      const res = await notificacionesApi.listar();
      // funciona si tu cliente devuelve el arreglo directo o { data }
      const lista = Array.isArray(res) ? res : res?.data ?? [];
      setPendientes(lista.filter((n) => !(n.leida ?? n.leido)));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    recargar();
    const t = setInterval(recargar, 30000);
    return () => clearInterval(t);
  }, [recargar]);

  return { pendientes, recargar };
}