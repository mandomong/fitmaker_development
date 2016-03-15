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

// --- 1. 회원 검색  --- //
router.route('/')
    .get(isLoggedIn, function (req, res, next) {
        var friend_email = req.query.email;
        var user_id = req.user.id;

        var f_email = '%' + friend_email + '%';

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

        function searchUser(connection, callback) {
            var sql = "SELECT u.user_id, u.user_name, u.email, u.user_photourl, r.state " +
                "FROM user u LEFT JOIN (SELECT u.user_id, u.user_name, u.email, f.state " +
                "FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_res = u.user_id " +
                "WHERE user_id_req = ? " +
                "UNION ALL " +
                "SELECT u.user_id, u.user_name, u.email, f.state " +
                "FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_req = u.user_id " +
                "WHERE user_id_res = ? ) r " +
                "ON (u.user_id = r.user_id) " +
                "WHERE u.email LIKE ? AND u.user_id != ?";

            connection.query(sql, [user_id, user_id, f_email, user_id], function (err, results) {
                connection.release();
                if (err) {

                    console.log("DB SELECT 에러...");
                    callback(err);
                } else {
                    var search_users = [];

                    function iterator(item, callback) {
                        search_users.push({
                            "friend_id": item.user_id,
                            "friend_name": item.user_name,
                            "friend_email": item.email,
                            "friend_photourl": item.user_photourl,
                            "friend_state": item.state == null ? 2 : item.state
                        });
                        callback(null);
                    }

                    async.each(results, iterator, function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, search_users);
                        }
                    });
                }
            });
        }

        function resultJSON(search_users, callback) {
            var result = {
                "message": "회원 검색에 성공하였습니다...",
                "friends": search_users
            };
            callback(null, {"result":result});
        }

        async.waterfall([getConnection, searchUser, resultJSON], function (err, results) {
            if (err) {
                var ERROR = {
                    "code": "E0004",
                    "message": "회원 검색에 실패하였습니다..."
                };
                next(ERROR);
            } else {
                /* 넘겨주는 results.state 정보는 -1, 0 1 값을 가질 수 있다
                 * -1은 거절 상태를 말하며 안드로이드에서 버튼선택 불가하게 처리
                 * 0은 DB에 테이블이 없는 상태 state 값을 0 으로 INSERT 할 수 있도록 post에서 처리 해야한다
                 * 1은 친구인 상태*/
                res.json(results);
            }
        });
    });

// ---  5. 회원 가입 --- //
router.post('/', function (req, res, next) {

    if (req.secure) {

        var username = req.body.user_name;
        var password = req.body.password;
        var email = req.body.email;
        var birthday = req.body.birthday;
        //var usertype = 1; // usertype 1은 회원, 0은 비회원


        //중복 체크

        function getConnection1(callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    console.log("connection에러");
                    console.log(err);
                    callback(err);
                } else {

                    callback(null, connection);
                }
            });
        }

        function checkEmail(connection, callback) {
            var sql = "SELECT * " +
                "FROM fitmakerdb.user " +
                "WHERE email = ?";

            connection.query(sql, [email], function (err, results) {
                connection.release();
                if (err) {
                    console.log("DB select 에러...");
                    callback(err);
                } else {
                    if (results.length > 0) {
                        callback(new Error("email 주소가 중복되었습니다..."));
                    } else {
                        callback(null);
                    }

                }
            });
        }


        //


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
            var sql = "insert into fitmakerdb.user (user_name, password, email, birthday) " +
                "values (?, ?, ?, ?)";
            connection.query(sql, [username, hashPassword, email, birthday], function (err, result) {
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

        async.waterfall([getConnection1, checkEmail, generateSalt, generateHashPassword, getConnection, insertMember], function (err, result) {
            if (err) {
                var ERROR = {
                    "code": "E0005",
                    "message": "회원가입에 실패하였습니다..."
                };
                next(ERROR);
            } else {
                result.message = "회원가입이 정상적으로 처리되었습니다...";
                res.json({"result" : result});
            }
        })

    } else {
        var err = new Error('SSL/TLS Upgrade Required!!!'); // =  err.message ?!
        err.status = 426;
        next(err);
    }

});


// --- 6. 마이페이지 --- //
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
                    "message": "마이페이지가 정상적으로 조회되었습니다...",
                    "user": user,
                    "project_history": project_history,
                    "mybadges": mybadges
                };
                callback(null, {"result":result});

            }


            async.waterfall([getConnection, selectProfile, selectHistory, selectMyBadges, resultJSON], function (err, result) {
                if (err) {
                    var ERROR = {
                        "code": "E0006",
                        "message": "마이페이지 조회에 실패하였습니다..."
                    };
                    next(ERROR);
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

    // --- 7. 프로필사진변경 --- //
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

        function checkPhoto(connection, callback) {
            var sql = "select user_id, user_photourl " +
                "from fitmakerdb.user " +
                "where user_id = ?";
            connection.query(sql, [user_id], function (err, results) {
                if (err) {
                    connection.release();
                    callback(err);
                } else {
                    console.log("results - user_photourl : " + results[0].user_photourl);
                    if (results[0].user_photourl == null) {
                        callback(null, connection);
                    } else {
                        var filename = path.basename(results[0].user_photourl);
                        console.log(filename);
                        var s3 = new AWS.S3({
                            "accessKeyId": s3Config.key,
                            "secretAccessKey": s3Config.secret,
                            "region": s3Config.region
                        });
                        var params = {
                            "Bucket": s3Config.bucket,
                            "Key": s3Config.imageDir + "/" + filename
                        };

                        //s3.deleteObject(params, function (err, data) {
                        //    if (err) {
                        //        connection.release();
                        //        console.log(err, err.stack);
                        //    } else {
                        //        callback(null, connection);
                        //    }
                        //});
                    }
                }
            });

        }

        function changePhoto(connection, callback) {

            var form = new formidable.IncomingForm();
            form.uploadDir = path.join(__dirname, '../uploads');
            form.keepExtensions = true;
            form.multiples = true;

            form.parse(req, function (err, fields, files) {

                var file = files['photo'];
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
                                    console.log(result);
                                    //변경됨을 알리는 메세지 안드로이드에 전송
                                    var result = {
                                        "message": "프로필 사진이 성공적으로 변경되었습니다"
                                    };
                                    callback(null, {"result":result});
                                }
                            });

                        }
                    })

            });

        }

        async.waterfall([getConnection, checkPhoto, changePhoto], function (err, result) {
            if (err) {
                var ERROR = {
                    "error": {
                        "code": "E0007",
                        "message": "프로필 사진 변경에 실패하였습니다..."
                    }
                };
                next(ERROR);
            } else {
                res.json(result);
            }
        });

    });


module.exports = router;