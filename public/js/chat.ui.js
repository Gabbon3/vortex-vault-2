import { ChatService } from "../service/chat.service.js";

window.ChatService = ChatService;

document.addEventListener("DOMContentLoaded", async () => {
    ChatService.init();
});