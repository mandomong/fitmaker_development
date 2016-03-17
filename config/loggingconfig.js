var winston = require('winston');
var fileRotateDate = require('winston-filerotatedate');
//var DailyRotateFile = require('winston-daily-rotate-file');
var path = require('path');

var logging = {
  transports: [
    //new winston.transports.Console({
    //  level: 'error',
    //  json: false
    //}),
    //new winston.transports.File({
    //  level: 'warn',
    //  filename: 'warn-'
    //}),
    new fileRotateDate.FileRotateDate({
      name: 'warnLogger',
      level: 'warn',
      filename: path.join(__dirname,'../logging/app_daily.log'),
      maxsize: 1024*1024
    }),

    //new fileRotateDate.FileRotateDate({
    //  name: 'debugLogger',
    //  level: 'debug',
    //  filename: path.join(__dirname,'../logging/app_daily.log'),
    //  maxsize: 1024*1024
    //}),

    new winston.transports.Console({
      name: 'debugLogger',
      level: 'debug',
      filename: path.join(__dirname,'../logging/app_daily_debug.log'),
      maxsize: 1024*1024
    })

    //new DailyRotateFile({
    //  name: 'warnLogger',
    //  level: 'warn',
    //  filename: 'warn-',
    //  //datePattern: 'yyyy-MM-ddTHH-mm.log'
    //  datePattern: 'yyyy-MM-dd_HH.log',
    //  json: false
    //}),
    //new DailyRotateFile({
    //  name: 'debugLogger',
    //  level: 'debug',
    //  filename: 'debug-',
    //  datePattern: 'yyyy-MM-dd_HH.log',
    //  json: false
    //})

  ]
};

module.exports = logging;