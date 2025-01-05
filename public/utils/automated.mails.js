import { date } from "../../utils/dateUtils.js";
import { Mailer } from "../../config/mail.js";

const automated_emails = {
    /**
     * genera il testo e l'html che inserisce il codice anti phishing
     * @param {string} email 
     */
    antiphishing_code: (email) => {
        const code = Mailer.generate_antiphish_code(email);
        const html = `
  <p>Message Authentication Code: <strong>${code}</strong></p>
  <p>Copy and paste this code into the app to verify the authenticity of this communication if you feel the need. The code is valid for 24 hours.</p>`
        const text = `
  Message Authentication Code: ${code}
  Copy and paste this code into the app to verify the authenticity of this communication if you feel the need. The code is valid for 24 hours.`;
        // ---
        return { text, html };
    },
    /**
     * 
     * @param {object} options 
     * @returns 
     */
    newSignIn: ({ email, user_agent, ip_address }) => {
        // -- user agent
        const [browser, browser_version, os, os_version] =
            user_agent.split("-"); // Chrome-131-Windows-10
        // -- anti phishing text
        const { text: aptext, html: aphtml } = automated_emails.antiphishing_code(email);
        // ---
        const text = `
  Hello ${email.split("@")[0]},
  We noticed that a new device attempted to sign-in to your account. Below are the details:
  
   - Device: ${os}
   - IP: ${ip_address}
   - Time: ${date.format("%d/%m/%Y at %H:%i")}
  
  If it wasn't you, you can still rest assured since that device is locked, but you need to change your password immediately as your vault could be at risk.
  
  Thank you for your attention
  
  The Vortex Vault team
  ${aptext}`;

        const html = `
  <html>
    <body>
      <h4>Hello ${email.split("@")[0]},</h4>
      <p>We noticed that a new device attempted to sign-in to your account. Below are the details:</p>
      <ul>
        <li><strong>Device:</strong> ${os}</li>
        <li><strong>IP:</strong> ${ip_address}</li>
        <li><strong>Time:</strong> ${date.format("%d/%m/%Y at %H:%i")}</li>
      </ul>
      <p>
        If it wasn't you, you can still rest assured since that device is blocked, but you need to change your password immediately as your vault could be at risk.
      </p>
      <p>Thank you for your attention<br><br>The Vortex Vault team</p>
      ${aphtml}
    </body>
  </html>
      `;

        return { text, html };
    },
    /**
     * Testo per la nuova Passkey aggiunta all'account
     * @param {string} email 
     * @returns 
     */
    newPasskeyAdded: (email) => {
      const text = `
  Hello ${email.split('@')[0]},
  We noticed that a new passkey has been associated with your account, for more information visit the app.

  Thank you for your attention
  
  The Vortex Vault team
      `;

        const html = `
  <html>
    <body>
      <h4>Hello ${email.split('@')[0]},</h4>
      <p>We noticed that a new passkey has been associated with your account, for more information visit the app.</p>
      <p>
        If it wasn't you, you can still rest assured since that device is blocked, but you need to change your password immediately as your vault could be at risk.
      </p>
      <p>Thank you for your attention<br><br>The Vortex Vault team</p>
    </body>
  </html>
      `;

        return { text, html };
    },
};

export default automated_emails;
