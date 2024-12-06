class LogInfo extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // -- imposto livello e messaggio in base agli attributi
        const lvl = this.getAttribute("lvl") || "success";
        const msg = this.getAttribute("msg") || "";
        const icons = ["check", "error", "warning", "info" ];
        // -- imposto la struttura HTML interna del log
        this.classList.add("log", `_${lvl}`);
        this.innerHTML = `<div class="log-container">
            <div class="i-container">
                <span class="material-symbols-rounded">${icons[lvl]}</span>
            </div>
            <p>${msg}</p>
        </div>`;
        // -- rimuovo il log automaticamente dopo un certo periodo
        setTimeout(() => this.classList.add("chiudi"), 7500);
        setTimeout(() => this.remove(), 8000);
        // -- rimuovo il log se cliccato
        this.addEventListener("click", () => {
            this.classList.add("chiudi")
            setTimeout(() => {
                this.remove();
            }, 500);
        });
    }
}

customElements.define("log-info", LogInfo);