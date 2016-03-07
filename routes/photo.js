var express = require('express');
var router = express.Router();
var formidable = require('formidable');
var AWS = require('aws-sdk');
var path = require('path');

var s3Config = require('../config/s3Config');

var async = require('async');
var fs = require('fs');
var mime = require('mime');
var util = require('util');
var path = require('path');

router.post('/', function(req, res, next) {
  var form = new formidable.IncomingForm();
  form.uploadDir = path.join(__dirname, '../uploads');
  form.keepExtensions = true;
  form.multiples = true;

  form.parse(req, function(err, fields, files) {
    var results = [];
    if (files['photo'] instanceof Array) { // 사진을 여러 개 업로드 할 경우 async.each() ...
      async.each(files['photo'], function(file, cb) {
          var s3 = new AWS.S3({
            "accessKeyId" : s3Config.key,
            "secretAccessKey" : s3Config.secret,
            "region" : s3Config.region,
            "params" : {
              "Bucket": s3Config.bucket,
              "Key": s3Config.imageDir + "/" + path.basename(file.path), // 목적지의 이름
              "ACL": s3Config.imageACL,
              "ContentType": "image/jpeg" //mime.lookup
            }
          });
          var body = fs.createReadStream(file.path);
          s3.upload({ "Body": body }) //pipe역할
            .on('httpUploadProgress', function(event) {
              console.log(event);
            })
            .send(function(err, data) {
              if (err) {
                console.log(err);
                cb(err);
              } else {
                console.log(data);
                fs.unlink(file.path, function() {
                  console.log(file.path + " 파일이 삭제되었습니다...");
                  results.push({ "s3URL": data.Location });
                  cb();
                });
              }
            });
        },
        function(err) {
          if (err) {
            next(err);
          } else {
            res.json(results);
          }
        });

    } else if (!files['photo']) { // 사진을 올리지 않은 경우

    } else { // 기타 (사진을 하나 올렸을 경우)

      var file = files['photo'];
      console.log("파일의 내용 " + file.name);
      console.log("필드의 내용 " + fields);
      var mimeType = mime.lookup(path.basename(file.path));
      var s3 = new AWS.S3({
        "accessKeyId" : s3Config.key,
        "secretAccessKey" : s3Config.secret,
        "region" : s3Config.region,
        "params" : {
          "Bucket": s3Config.bucket,
          "Key": s3Config.imageDir + "/" + path.basename(file.path), // 목적지의 이름
          "ACL": s3Config.imageACL,
          "ContentType": mimeType //mime.lookup
        }
      });

      //file stream 연결 (pipe) 와 유사
      var body = fs.createReadStream(file.path);
      s3.upload({ "Body": body })
        .on('httpUploadProgress', function(event) {
          console.log(event);
        })
        .send(function(err, data) {
          if (err) {
            console.log(err);
            callback(err);
          } else {
            //console.log("데이터의 정보 " + data);
            //location = data.Location;
            //originalFilename = file.name;
            //modifiedFilename = path.basename(file.path);
            //photoType = file.type;
            fs.unlink(file.path, function () {
              console.log(files['photo'].path + " 파일이 삭제되었습니다...");
            });
            //var result = {
            //  "data":data
            //};
            //res.json(result);
          }
        });
      //

    }

    //var uploader = s3Client.uploadFile(params);
    //uploader.on('end', function() {
    //  var s3URL = s3.getPublicUrl(params.s3Params.Bucket, params.s3Params.Key, s3Config.region);
    //  //db 작업수행
    //  //업로드에 올라간 파일을 삭제(uploads)
    //});
  });
});

module.exports = router;
