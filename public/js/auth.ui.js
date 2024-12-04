import { Form } from "../utils/form.js";
import { AuthService } from "../service/auth.service.js";
import { Log } from "../utils/log.js";

$(document).ready(() => {
    /**
     * CAMBIO PASSWORD
     */
    Form.onsubmit('form-change-password', async (form, elements) => {
        // -- check if new passwords corresponds
        if (elements.new_password !== elements.new_password_2) return Log.summon(1, 'New Password doesn\'t match');;
        // ---
        if (!confirm('A locally backup will be made, the password of the backup will be the new password that you have chosen now, after the password is changed, you will have to restore from that backup your vault, do you confirm that you understand?')) return;
        if (!confirm('Really?')) return;
        // ---
        if (await AuthService.change_password(elements.old_password, elements.new_password)) {
            Log.summon(0, "Password changed successfully");
            $(form).trigger('reset');
        }
    });
});