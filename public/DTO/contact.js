export class Contact {
    /**
     * Scheda di contatto
     * @param {string} uuid 
     * @param {string} email 
     * @param {Uint8Array} secret 
     * @param {string} nickname 
     */
    constructor(uuid, email, secret, nickname = "New Contact *") {
        this.uuid = uuid;
        this.email = email;
        this.secret = secret;
        this.nickname = nickname;
    }
}