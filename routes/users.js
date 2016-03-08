var express = require('express');
var bcrypt = require('bcrypt');
var async = require('async');

var formidable = require('formidable');
var AWS = require('aws-sdk');
var path = require('path');
var s3Config = require('../config/s3Config');
var fs = require('fs');
var mime = require('mime');
var util = require('util');

var router = express.Router();

function isLoggedIn(req, res, next) {

    if (!req.isAuthenticated()) {
        var err = new Error('로그인이 필요합니다...');
        err.status = 401;
        next(err);
    } else {
        next();
    }
}

// --- 6. 회원 가입 --- //
router.post('/', function (req, res, next) {

    if (req.secure) {

        var username = req.body.username;
        var password = req.body.password;
        var email = req.body.email;
        var exctypeid = 3;
        var usertype = 1;


        // 1. salt generation -- 원본에 대한 보안성을 높이기 위해서 rainbow table에 salt값을 추가
        function generateSalt(callback) {
            var rounds = 10;
            bcrypt.genSalt(rounds, function (err, salt) {
                if (err) {
                    console.log("salt에러");
                    callback(err);
                } else {

                    callback(null, salt);
                }
            }); //salt 생성횟수

        }

        // 2. hash password generation
        function generateHashPassword(salt, callback) {
            bcrypt.hash(password, salt, function (err, hashPassword) {
                if (err) {
                    console.log("hash에러");
                    callback(err);
                } else {
                    callback(null, hashPassword);
                }
            });
        }

        // 3. get connection
        function getConnection(hashPassword, callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    console.log("connection에러");
                    console.log(err);
                    callback(err);
                } else {

                    callback(null, connection, hashPassword);
                }
            });
        }

        // 4. DB insert
        function insertMember(connection, hashPassword, callback) {
            var sql = "insert into fitmakerdb.user (user_name, password, email, exctype_id, user_type) " +
                "values (?, ?, ?, ?, ?)";
            connection.query(sql, [username, hashPassword, email, exctypeid, usertype], function (err, result) {
                connection.release();

                if (err) {
                    console.log("insert에러");
                    callback(err);
                } else {
                    callback(null, {
                        "id": result.insertId
                    });
                }
            });
            var result = {};
            callback(null, result);
        }

        async.waterfall([generateSalt, generateHashPassword, getConnection, insertMember], function (err, result) {
            if (err) {
                next(err);
            } else {
                result.message = "회원가입이 정상적으로 처리되었습니다...";
                res.json(result);
            }
        })

    } else {
        var err = new Error('SSL/TLS Upgrade Required!!!'); // =  err.message ?!
        err.status = 426;
        next(err);
    }

});

//// --- 7. facebook 로그인 --- //
//router.get('/facebook', function (req, res, nex) {
//
//    res.json({
//        "message": "페이스북 로그인이 정상적으로 처리되었습니다."
//    });
//
//});

// --- 8. 마이페이지 --- //
router.route('/me')

    .get(isLoggedIn, function (req, res, next) {

        if (req.secure) {

            var user_id = req.user.id;

            function getConnection(callback) {
                pool.getConnection(function (err, connection) {
                    if (err) {
                        console.log("DB connection 에러...");
                        callback(err);
                    } else {
                        callback(null, connection);
                    }
                });
            }

            function selectProfile(connection, callback) {
                var sql = "SELECT u.user_name, u.user_photourl, vub.badgecnt, vuh.user_tothours, et.exctype_name " +
                    "      FROM fitmakerdb.user u JOIN exercisetype et ON (et.exctype_id = u.exctype_id) " +
                    "                             LEFT JOIN v_user_hours vuh ON (u.user_id = vuh.user_id) " +
                    "                             LEFT JOIN v_user_badgecnt vub ON (vub.user_id = u.user_id) " +
                    "      WHERE u.user_id = ?";

                connection.query(sql, [user_id], function (err, results) {

                    if (err) {
                        console.log("DB SELECT 에러...");
                        callback(err);
                    } else {
                        console.log("user_id : " + user_id);
                        var user = {
                            "user_name": results[0].user_name,
                            "user_photourl": results[0].user_photourl,
                            "badgeCnt": results[0].badgeCnt,
                            "hours": results[0].user_tothours,
                            "exctype_name": results[0].exctype_name
                        };
                        callback(null, user, connection);
                    }
                });
            }

            function selectHistory(user, connection, callback) {
                var sql = "SELECT project_id, project_name, " +
                    "             (CASE WHEN project_enddate > DATE(date_format(CONVERT_TZ(now(), '+00:00', '+9:00'), '%Y-%m-%d %H-%i-%s')) THEN 1 ELSE 0 END) AS project_on " +
                    "      FROM fitmakerdb.project " +
                    "      WHERE user_id = ?";

                connection.query(sql, [user_id], function (err, results) {

                    if (err) {
                        console.log("DB SELECT 에러...");
                        callback(err);
                    } else {
                        var project_history = [];

                        function iterator(item, callback) {
                            project_history.push({
                                "project_id": item.project_id,
                                "project_name": item.project_name,
                                "project_on": item.project_on > 0 ? true : false
                            });
                            callback(null);
                        }

                        async.each(results, iterator, function (err) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, project_history, user, connection);
                            }
                        });


                    }
                });
            }

            function selectMyBadges(project_history, user, connection, callback) {
                var sql = "SELECT b.badge_id, b.badge_name, b.badge_photourl " +
                    "      FROM user_badge ub JOIN badge b ON ub.badge_id = b.badge_id " +
                    "      WHERE user_id = ? ";

                connection.query(sql, [user_id], function (err, results) {
                    connection.release();
                    if (err) {
                        console.log("DB SELECT 에러...");
                        callback(err);
                    } else {
                        var mybadges = [];

                        function iterator(item, callback) {
                            mybadges.push({
                                "badge_id": item.badge_id,
                                "badge_name": item.badge_name,
                                "badge_photourl": item.badge_photourl
                            });
                            callback(null);
                        }

                        async.each(results, iterator, function (err) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, mybadges, project_history, user);
                            }
                        });


                    }
                });
            }

            function resultJSON(mybadges, project_history, user, callback) {


                var result = {
                    "result": {
                        "message": "마이페이지가 정상적으로 조회되었습니다...",
                        "user": user,
                        "project_history": project_history,
                        "mybadges": mybadges

                    }
                };
                callback(null, result);
            }


            async.waterfall([getConnection, selectProfile, selectHistory, selectMyBadges, resultJSON], function (err, result) {
                if (err) {
                    next(err);
                } else {
                    res.json(result);
                }
            });


        } else {
            var err = new Error('SSL/TLS Upgrade Required');
            err.status = 426;
            next(err);
        }

    })

    // --- 9. 프로필사진변경 --- //

    .put(isLoggedIn, function (req, res, next) {

        var user_id = req.user.id;

        function getConnection(callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    console.log("DB connection 에러...");
                    callback(err);
                } else {
                    callback(null, connection);
                }
            });
        }

        //function checkPhoto(connection, callback){
        //    var sql = "select user_id, user_photourl" +
        //              "from user";
        //    connection.query(sql,[user_id],function(err,results){
        //       if(err){
        //           connection.release();
        //           callback(err);
        //       } else{
        //           //TODO : 할일
        //       }
        //    });
        //
        //}

        function changePhoto(connection, callback) {

            var form = new formidable.IncomingForm();
            form.uploadDir = path.join(__dirname, '../uploads');
            form.keepExtensions = true;
            form.multiples = true;

            form.parse(req, function (err, fields, files) {
                var file = files['photo'];
                console.log("파일의 내용 " + file.name);
                console.log("필드의 내용 " + fields);
                var mimeType = mime.lookup(path.basename(file.path));
                var s3 = new AWS.S3({
                    "accessKeyId": s3Config.key,
                    "secretAccessKey": s3Config.secret,
                    "region": s3Config.region,
                    "params": {
                        "Bucket": s3Config.bucket,
                        "Key": s3Config.imageDir + "/" + path.basename(file.path), // 목적지의 이름
                        "ACL": s3Config.imageACL,
                        "ContentType": mimeType //mime.lookup
                    }
                });

                //file stream 연결 (pipe)와 유사
                var body = fs.createReadStream(file.path);
                s3.upload({"Body": body})
                    .on('httpUploadProgress', function (event) {
                        console.log(event);
                    })
                    .send(function (err, data) {
                        if (err) {
                            console.log(err);
                            callback(err);
                        } else {
                            fs.unlink(file.path, function () {
                                console.log(files['photo'].path + " 파일이 삭제되었습니다...");
                            });

                            var sql = "update fitmakerdb.user " +
                                "set user_photourl= ? " +
                                "where user_id= ?";
                            var s3_location = data.Location;
                            connection.query(sql, [s3_location, user_id], function (err, result) {

                                connection.release();
                                if (err) {
                                    callback(err);
                                } else {
                                    var result = {
                                        "result": "프로필 사진이 성공적으로 변경되었습니다"
                                    };
                                    callback(null, result);
                                }
                            });

                        }
                    })

            });

        }

        async.waterfall([getConnection, changePhoto], function (err, result) {
            if (err) {
                next(err);
            } else {
                res.json(result);
            }
        });

    });


// --- 16. 회원 검색 --- //
router.route('/')

    .get(isLoggedIn, function (req, res, next) {
        var friend_email = req.query.email;
        var user_id = req.user.id;
        var relation_state;

        function getConnection(callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    console.log("DB connection 에러...");
                    callback(err);
                } else {
                    callback(null, connection);
                }
            });
        }

        //친구 검색 query
        function searchUser(connection, callback) {
            var sql = "select user_id, user_name, email, user_photourl " +
                "FROM user " +
                "where email = ?";

            connection.query(sql, [friend_email], function (err, results) {

                if (err) {
                    connection.release();
                    console.log("DB SELECT 에러...");
                    callback(err);
                } else {
                    callback(null, results, connection);
                }
            });
        }

        function resultJSON(results, connection, callback) {
            var result = {

                "message": "회원 검색에 성공하였습니다...",
                "user": {"user_id": user_id},
                "friends": {
                    "friend_id": results[0].user_id,
                    "friend_name": results[0].user_name,
                    "friend_photourl": results[0].user_photourl
                }
            };
            callback(null, result, connection);

        }

        function searchState(result, connection, callback) {
            var sql = "select user_id_req, user_id_res, state " +
                "from friend " +
                "where user_id_req = ? and user_id_res = ? " +
                "union all " +
                "select user_id_req, user_id_res, state " +
                "from friend " +
                "where user_id_req = ? and user_id_res = ?";
            connection.query(sql, [result.user.user_id, result.friends.friend_id, result.friends.friend_id, result.user.user_id], function (err, results) {
                connection.release();
                if (err) {
                    console.log("DB SELECT 에러...");
                    callback(err);
                } else {
                    // state 값이 없을때
                    if (results.length === 0) {
                        relation_state = 2; // 관계가 없어서 친구요청(버튼)
                        // -------------------------------------------------- state -1: 거절, state 0: 요청상태, state, 1: 친구상태, 2: DB에 없는상태
                    } else if (results[0].state == 0) {
                        relation_state = 0; // 친구 요청중
                    } else if (results[0].state == 1) {
                        relation_state = 1; // 친구 상태일때
                    } else {
                        relation_state = -1; // 거절 상태
                    }

                    callback(null, result);
                }
            });
        }

        function resultJSON2(result, callback) {
            console.log(relation_state);
            var result_info = {
                "result": {
                    "message": "회원 검색에 성공하였습니다...",
                    "user": {"user_id": user_id},
                    "friends": {
                        "friend_id": result.friends.friend_id,
                        "friend_name": result.friends.friend_name,
                        "friend_photourl": result.friends.friend_photourl
                    },
                    "state": relation_state
                }
            };
            callback(null, result_info);

        }

        async.waterfall([getConnection, searchUser, resultJSON, searchState, resultJSON2], function (err, results) {
            if (err) {
                next(err);
            } else {
                /* 넘겨주는 results.state 정보는 -1, 0 1 값을 가질 수 있다
                 * -1은 거절 상태를 말하며 안드로이드에서 버튼선택 불가하게 처리
                 * 0은 DB에 테이블이 없는 상태 state 값을 0 으로 INSERT 할 수 있도록 post에서 처리 해야한다
                 * 1은 친구인 상태*/
                res.json(results);
            }
        });
    });


module.exports = router;
