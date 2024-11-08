export class CError extends Error {
    constructor(name, message, status_code = 500) {
        super(message);
        this.name = name;
        this.status_code = status_code;
    }
}