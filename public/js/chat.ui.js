import { ChatService } from "../service/chat.service.js";
import { ECDH } from "../secure/ecdh.js";

window.ECDH = ECDH;
window.ChatService = ChatService;

document.addEventListener("DOMContentLoaded", async () => {
    ChatService.init();
});