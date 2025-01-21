import { date } from "../../utils/dateUtils.js";
import { Mailer } from "../../config/mail.js";

const automated_emails = {
  /**
   * genera il testo e l'html che inserisce il codice anti phishing
   * @param {string} email 
   */
  antiphishing_code: (email) => {
    const code = Mailer.message_authentication_code(email);
    const html = `<p>Message Authentication Code: <strong>${code}</strong></p>`
    const text = `Message Authentication Code: ${code}`;
    // ---
    return { text, html };
  },
  /**
   * testo per il codice otp
   * @param {object} options 
   * @returns 
   */
  otpCode: ({ email, code }) => {
    const { text: aptext, html: aphtml } = automated_emails.antiphishing_code(email);
    return `${code.match(/.{1,3}/g).join(' ')}\n${aptext}`;
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
 - Time: ${date.format("%d %M %Y at %H:%i")}

If it wasn't you, you can still rest assured since that device is locked, but you need to change your password immediately as your vault could be at risk.

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
      <li><strong>Time:</strong> ${date.format("%d %M %Y at %H:%i")}</li>
    </ul>
    <p>
      If it wasn't you, you can still rest assured since that device is blocked, but you need to change your password immediately as your vault could be at risk.
    </p>
    <p>The Vortex Vault team</p>
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
    // -- anti phishing text
    const { text: aptext, html: aphtml } = automated_emails.antiphishing_code(email);

    const text = `
Hello ${email.split('@')[0]},
We noticed that a new passkey has been associated with your account, for more information visit the app.

The Vortex Vault team
${aptext}`;

    const html = `
<html>
  <body>
    <h4>Hello ${email.split('@')[0]},</h4>
    <p>We noticed that a new passkey has been associated with your account, for more information visit the app.</p>
    <p>The Vortex Vault team</p>
    ${aphtml}
  </body>
</html>
      `;

    return { text, html };
  },

  /**
   * Avviso per tentativi OTP errati
   * @param {object} options
   * @returns
   */
  otpFailedAttempt: ({ email, ip_address }) => {
    // -- anti phishing text
    const { text: aptext, html: aphtml } = automated_emails.antiphishing_code(email);
    // ---
    const text = `
Hello ${email.split("@")[0]},
We noticed several failed attempts to enter the OTP code for your account. Here are the details:

 - IP: ${ip_address}
 - Time: ${date.format("%d %M %Y at %H:%i")}

If you have not attempted to access your account, be aware that further attempts will be refused.

The Vortex Vault team
${aptext}`;

    const html = `
<html>
  <body>
    <h4>Hello ${email.split("@")[0]},</h4>
    <p>We noticed several failed attempts to enter the OTP code for your account. Here are the details:</p>
    <ul>
      <li><strong>IP:</strong> ${ip_address}</li>
      <li><strong>Time:</strong> ${date.format("%d %M %Y at %H:%i")}</li>
    </ul>
    <p>If you have not attempted to access your account, be aware that further attempts will be refused.</p>
    <p>The Vortex Vault team</p>
    ${aphtml}
  </body>
</html>`;

    return { text, html };
  },
  /**
   * Text to notify the user that their password has been successfully changed.
   * @param {object} options
   * @returns
   */
  changePassword: ({ email }) => {
    // -- anti-phishing text
    const { text: aptext, html: aphtml } = automated_emails.antiphishing_code(email);
    // ---
    const text = `
Hello ${email.split("@")[0]},
Your password has been successfully changed.

To complete the operation and ensure your data is restored correctly, please make sure to restore the backup file that was just downloaded.

The Vortex Vault team
${aptext}`;

    const html = `
<html>
<body>
  <h4>Hello ${email.split("@")[0]},</h4>
  <p>Your password has been successfully changed.</p>
  <p>To complete the operation and ensure your data is restored correctly, please make sure to restore the backup file that was just downloaded.</p>
  <p>The Vortex Vault team</p>
  ${aphtml}
</body>
</html>`;

    return { text, html };
  },
  /**
   * Text to notify the user that their account has been successfully deleted.
   * @param {object} options
   * @returns
   */
  deleteAccount: ({ email }) => {
    // -- anti-phishing text
    const { text: aptext, html: aphtml } = automated_emails.antiphishing_code(email);
    // ---
    const text = `
Hello ${email.split("@")[0]},
We wanted to inform you that your account has been successfully deleted. 

If this action was taken by you, no further action is required. 

If you did not request account deletion, please contact our support team immediately to secure your account.

The Vortex Vault team
${aptext}`;

    const html = `
<html>
<body>
  <h4>Hello ${email.split("@")[0]},</h4>
  <p>We wanted to inform you that your account has been successfully deleted.</p>
  <p>If this action was taken by you, no further action is required.</p>
  <p>If you did not request account deletion, please contact our support team immediately to secure your account.</p>
  <p>The Vortex Vault team</p>
  ${aphtml}
</body>
</html>`;

    return { text, html };
  }
};

export default automated_emails;
