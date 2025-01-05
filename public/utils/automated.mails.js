import { date } from "../../utils/dateUtils.js";

const automated_emails = {
    newSignIn: ({ email, user_agent, ip_address }) => {
        // -- user agent
        const [browser, browser_version, os, os_version] = user_agent.split('-') // Chrome-131-Windows-10
        const text = `
  Hello ${email.split('@')[0]},
  We noticed that a new device attempted to sign-in to your account. Below are the details:
  
   - Device: ${os}
   - IP: ${ip_address}
   - Time: ${date.format('%d/%m/%Y at %H:%i')}
  
  If it wasn't you, you can still rest assured since that device is locked, but you need to change your password immediately as your vault could be at risk.
  
  Thank you for your attention
  
  The Vortex Vault team
      `;

        const html = `
  <html>
    <body>
      <h4>Hello ${email.split('@')[0]},</h4>
      <p>We noticed that a new device attempted to sign-in to your account. Below are the details:</p>
      <ul>
        <li><strong>Device:</strong> ${os}</li>
        <li><strong>IP:</strong> ${ip_address}</li>
        <li><strong>Time:</strong> ${date.format('%d/%m/%Y at %H:%i')}</li>
      </ul>
      <p>
        If it wasn't you, you can still rest assured since that device is blocked, but you need to change your password immediately as your vault could be at risk.
      </p>
      <p>Thank you for your attention<br><br>The Vortex Vault team</p>
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
