const MemDiag = {
    interval: null,
    lastHeap: 0,
    start(label = 'default') {
        if (this.interval) clearInterval(this.interval);
        console.log(`[MemDiag] Avvio monitor: ${label}`);
        this.interval = setInterval(() => this.log(label), 3000);
    },
    stop() {
        clearInterval(this.interval);
        this.interval = null;
        console.log(`[MemDiag] Monitor terminato.`);
    },
    log(label) {
        const heap = performance.memory.usedJSHeapSize / 1024 / 1024;
        const total = performance.memory.totalJSHeapSize / 1024 / 1024;
        const diff = heap - this.lastHeap;
        this.lastHeap = heap;

        const domCount = document.getElementsByTagName('*').length;
        console.log(`[${label}] JS Heap: ${heap.toFixed(2)} MB (${diff >= 0 ? '+' : ''}${diff.toFixed(2)}), DOM nodes: ${domCount}`);

        if ('gc' in window) {
            console.log(`[${label}] Forzando GC...`);
            gc(); // solo in Chrome con --enable-precise-memory-info e --js-flags="--expose-gc"
        }
    }
};

window.MemDiag = MemDiag;