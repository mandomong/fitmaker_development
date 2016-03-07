//var config = {
//        "host" : '',
//        "user" : 'root',
//        "password" : 'dove0985',
//        "debug" : false
//};
var config = {
    "host": process.env.FITMAKER_DB_SERVER,
    "port": process.env.FITMAKER_DB_PORT,
    "user": process.env.FITMAKER_DB_USERNAME,
    "password": process.env.FITMAKER_DB_PASSWORD,
    "database": process.env.FITMAKER_DB,
    "ssl": "Amazon RDS",
    "debug": true
};

//

module.exports = config;
