const oyentes = new Set();

export function mostrarPdf(fuente, titulo) {
  if (!fuente) return;
  if (oyentes.size === 0) {
    // Por si el visor no está montado: se abre en otra pestaña, como antes
    window.open(URL.createObjectURL(fuente), "_blank");
    return;
  }
  oyentes.forEach((fn) => fn({ fuente, titulo }));
}

export function suscribirVisor(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}