const moment = require("moment");
moment.locale('fr'); 

function formatMessage(username , message){
    return {
        username,
        message,
        time : moment().format('h:mm:ss a')
    }
};

module.exports = formatMessage;