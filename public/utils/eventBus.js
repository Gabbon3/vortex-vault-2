// event bus
export const Bus = new EventTarget();

export const notify = (title, body) => {
    if (document.visibilityState !== "visible") {
        new Notification(title, {
            body,
            icon: "./img/vortex_vault_logo.png",
        });
    }
}