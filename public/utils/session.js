export class SessionStorage {
    static prefix = 'vortex-vault';
    static set(key, value) {
        sessionStorage.setItem(`${SessionStorage.prefix}-${key}`, JSON.stringify(value));
    }
    static get(key) {
        const value = sessionStorage.getItem(`${SessionStorage.prefix}-${key}`);
        return value? JSON.parse(value) : null;
    }
    static remove(key) {
        sessionStorage.removeItem(`${SessionStorage.prefix}-${key}`);
    }
}