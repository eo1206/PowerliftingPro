if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registro = await navigator.serviceWorker.register("./sw.js", {
        updateViaCache: "none"
      });
      await registro.update();
    } catch (error) {
      console.error("No se pudo registrar el Service Worker:", error);
    }
  });
}
