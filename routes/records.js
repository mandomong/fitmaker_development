var express = require('express');
var gcm = require('node-gcm');
var router = express.Router();
var async = require('async');

//getConnection
function getConnection(callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            callback(err);
        } else {
            callback(null, connection);
        }
    });
}



function isLoggedIn(req, res, next) {

    if (!req.isAuthenticated()) {

        var ERROR = {
            "code": "E0401",
            "message": "로그인이 필요합니다..."
        };
        next(ERROR);

        //var err = new Error('로그인이 필요합니다...');
        //err.status = 401;
        //next(err);
    } else {
        next();
    }
}

// --- 16. 운동기록 --- //
router.route('/').post(isLoggedIn, function (req, res, next) {

    var user_id = req.user.id;

    //운동기록
    function insertRecord(connection, callback) {
        var sql = "INSERT INTO fitmakerdb.record (project_id, course_seq, playdate) " +
          "      VALUES (?, ?, sysdate()) ";
        var project_id = req.body.project_id;
        var course_seq = req.body.course_seq;

        connection.query(sql, [project_id, course_seq], function (err, result) {

            //console.log(result);
            if (err) {
                connection.release();
                callback(err);
            } else {
                callback(null, connection);
            }
        });
    }

    //운동시간을 통한 뱃지 달성 여부
    function hoursBadge(connection, callback) {

        //운동시간 조회
        var sql = "SELECT sum(course_totaltime) as mytotaltime" +
          "      FROM record r join project p on (r.project_id = p.project_id) " +
          "                    join curri_course cc on (p.curri_id = cc.curri_id and r.course_seq = cc.course_seq) " +
          "                    join course c on (c.course_id = cc.course_id) " +
          "      WHERE p.user_id = ? ";

        connection.query(sql, [user_id], function (err, results) {

            //console.log(results);
            if (err) {
                connection.release();
                callback(err);
            } else {
                // 운동 총시간이 100분이상이면 1번 뱃지 발급
                // 운동 총시간이 200분이상이면 2번 뱃지 발급
                // 운동 총시간이 300분이상이면 3번 뱃지 발급
                // 운동 총시간이 500분이상이면 4번 뱃지 발급
                // 운동 총시간이 700분이상이면 5번 뱃지 발급
                // 운동 총시간이 1000분이상이면 6번 뱃지 발급

                if (results[0].mytotaltime / 60 >= 100 && results[0].mytotaltime / 60 < 200) {

                    callback(null, 1, connection);

                } else if (results[0].mytotaltime / 60 >= 200 && results[0].mytotaltime / 60 < 300) {

                    callback(null, 2, connection);

                } else if (results[0].mytotaltime / 60 >= 300 && results[0].mytotaltime / 60 < 500) {

                    callback(null, 3, connection);

                } else if (results[0].mytotaltime / 60 >= 500 && results[0].mytotaltime / 60 < 700) {

                    callback(null, 4, connection);

                } else if (results[0].mytotaltime / 60 >= 700 && results[0].mytotaltime / 60 < 1000) {

                    callback(null, 5, connection);

                } else if (results[0].mytotaltime / 60 >= 1000 && results[0].mytotaltime / 60 < 1200) {

                    callback(null, 6, connection);

                } else {

                    callback(null, 7, connection);

                }


            }
        });
    }

    //뱃지 중복조회
    function checkBadges(badge_id, connection, callback) {


        var sql = "SELECT badge_id " +
          "      FROM user_badge " +
          "      WHERE user_id = ? ";


        connection.query(sql, [user_id], function (err, results) {

            if (err) {
                connection.release();
                callback(err);
            } else {

                if (badge_id === 7) {
                    callback(null, 7, connection);
                }

                var mybadges = [];

                function iterator(item, callback) {
                    mybadges.push(item.badge_id);
                    callback(null);
                }

                async.each(results, iterator, function (err) {
                    if (err) {
                        connection.release();
                        callback(err);
                    } else {

                        if (mybadges.indexOf(badge_id) === -1) {
                            callback(null, badge_id, connection);
                        } else {
                            callback(null, 7, connection);
                        }
                    }
                });

            }
        });
    }

    //뱃지 저장
    function insertBadge(badge_id, connection, callback) {
        if (badge_id === 7) {

            callback(null, 7, connection);
        } else {

            var sql = "INSERT INTO fitmakerdb.user_badge (user_id, badge_id, badge_date) " +
              "      VALUES (?, ?, sysdate()) ";

            connection.query(sql, [user_id, badge_id], function (err, result) {

                if (err) {
                    connection.release();
                    callback(err);
                } else {
                    callback(null, badge_id, connection);
                }
            });
        }
    }


    function pushFriend(badge_id, connection, callback){
        var sql = "select u.registration_token " +
        "from user u join friend f on(u.user_id = f.user_id_res) " +
        "where f.user_id_req = ? and f.state = 1";

        connection.query(sql, [user_id], function(err, results){
            connection.release();
            if (err){
                callback(err);
            }else{
                var regTokenArr = [];

                if(results.length) {
                    function iterator(item, callback) {
                        regTokenArr.push(item.registration_token);
                        callback(null);
                    }

                    async.each(results, iterator, function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, badge_id, regTokenArr);
                        }
                    });

                } else {
                    callback(null, badge_id, regTokenArr);
                }
            }
        });
    }


    function makeJSON(badge_id, regTokenArr, callback) {


        var result = {
            "message": "운동기록에 성공하였습니다",
            "badge_id": badge_id,
            "regTokenArr": regTokenArr
        };
        callback(null, result);

    }


    async.waterfall([getConnection, insertRecord, hoursBadge, checkBadges, insertBadge, pushFriend, makeJSON], function (err, result) {
        if (err) {
            var ERROR = {
                "error" : {
                    "code":"E0016",
                    "message":"운동기록에 실패하였습니다..."
                }
            };
            next(ERROR);
        } else {
            /* url 쪽으로 데이터를 가지고 이동 */

            //push
            var message = new gcm.Message({
                collapseKey: 'demo',
                delayWhileIdle: true,
                timeToLive: 3
            });

            //사용자
            message.addNotification("title", "FITMAKER");
            //내용 ex) ~~님이 운동을 완료하였습니다
            var name = "김혜민";
            var parser = name + "님이 오늘의 운동을 완료하였습니다!";
            message.addNotification("body", parser);
            message.addNotification("icon", "fit_logo");

            var regTokens = [];
            regTokens = result.regTokenArr;

            //내 gcm
            //var sender = new gcm.Sender('AIzaSyCu1ualuW7tJ4quKlL6RRyBVklvx7_1lj4');

            //준태gcm
            var sender = new gcm.Sender('AIzaSyD9cBFNuRFTZDPlKHNQK27iYT4An27LIZg');

            //var regTokens = ["eLi_NL0z3zs:APA91bFNBi5owAYiWiXoOYsFSe-0ns-i7xcAN1gTSbpStUI9WITu9nxmmNcW2pb8-tDdMwirugabWgY7F2oCW2lNeT2E8fIYDIe8neww92lHY6Qcb8y5E64EuUWfKECUW_mDxlFu-gvZ","d9Hy9FCEzVU:APA91bFxKvIz2ugi7vW-fa7fmKci8zIwp6SQyI3W4xhPDTIYgxgRIdbz2Z7Wh9HqYTVNCTwzGlNGRHDLNMuOwGWDOWPSe1JqfvCGbc4RA2wzO8bLRbOWmHovFU9VNkXRStzQRAmZZOD2"];

            if(regTokens.length) {
                sender.send(message, regTokens, function (err) {
                    if (err) {
                        next(err);
                    } else {
                        delete result.regTokenArr;
                        res.json({"result": result});
                    }
                });
            }else{
                delete result.regTokenArr;
                res.json({"result": result});
            }

        }
    });

});

module.exports = router;