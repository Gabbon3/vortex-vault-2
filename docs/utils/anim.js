export class Anim {
    /**
     * Just an utility to stend-by something
     * @param {number} milliseconds 
     * @returns {Promise}
     */
    static sleep = (milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }
    /**
     * For loop that sleep each iteration
     * @param {number} start_value 
     * @param {number} end_value 
     * @param {number} increaser 
     * @param {number} sleep_time milliseconds
     * @param {Function} _function passed arguments (i)
     * @returns {boolean} true if for loop end, false if for loop dont manage to reach its end
     */
    static async forsleep(start_value, end_value, increaser, sleep_time ,_function) {
        for (let i = start_value; i < end_value; i += increaser) {
            if (!_function(i)) return false;
            await this.sleep(sleep_time);
        }
        return true;
    }
}