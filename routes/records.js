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
        var err = new Error('로그인이 필요합니다...');
        err.status = 401;
        next(err);
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

                    callback(null, null, connection);

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
                callback(err);
            } else {
                var mybadges = [];

                function iterator(item, callback) {
                    mybadges.push(item.badge_id);
                    callback(null);
                }

                async.each(results, iterator, function (err) {
                    if (err) {
                        callback(err);
                    } else {

                        if (mybadges.indexOf(badge_id) === -1) {
                            callback(null, badge_id, connection);
                        } else {
                            callback(null, null, connection);
                        }
                    }
                });

            }
        });
    }

    //뱃지 저장
    function insertBadge(badge_id, connection, callback) {
        if (!badge_id) {
            callback(null, null);
        } else {

            var sql = "INSERT INTO fitmakerdb.user_badge (user_id, badge_id, badge_date) " +
                "      VALUES (?, ?, sysdate()) ";

            connection.query(sql, [user_id, badge_id], function (err, result) {
                connection.release(); //커넥션을 반납해야 한다.

                if (err) {
                    callback(err);
                } else {
                    callback(null, badge_id);
                }
            });
        }
    }


    function makeJSON(badge_id, callback) {


        var result = {
            "message": "운동기록에 성공하였습니다",
            "badge_id": badge_id
        };
        callback(null, result);


    }

    async.waterfall([getConnection, insertRecord, hoursBadge, checkBadges, insertBadge, makeJSON], function (err, result) {
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

            //var message = new gcm.Message();
            ////알림은 Noti
            //message.addNotification("title", "mandoo");
            //message.addNotification("body", "LOL let's play");
            //message.addNotification("icon", "ic_launcher");
            //var regTokens ="dnGt_RNzIr4:APA91bF7LljoeCYJhQ5QQbv6fS0OwCQRdRT2WJfYhfV-BeCjtEh-h5Lcai0PJhS16FBcus6jfGf6So5OJyauBpzFFYM7HRp6k1iJUJsmuamgkvAmSKr5XInYdAV-Jc-s49rFuZy5OzjB";
            //
            //
            //var sender = new gcm.Sender('AIzaSyCu1ualuW7tJ4quKlL6RRyBVklvx7_1lj4');
            //
            //sender.send(message, regTokens, function(err) {
            //    if (err) {
            //        next(err);
            //    } else {
            //        res.json({"result":result});
            //
            //    }
            //});

            res.json({"result":result});

        }
    });

});

module.exports = router;