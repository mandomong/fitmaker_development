// 작성자 : 장한솔

var express = require('express');
var async = require('async');
var router = express.Router();


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

// --- 10. 요청 받은 친구 목록 --- //
router.route('/')
    .get(isLoggedIn, function (req, res, next) {

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

        function responseList(connection, callback) {


            var sql = "select u.user_id, u.user_name, u.user_photourl, f.state " +
                "from user u join " +
                "(select f.user_id_req, f.state " +
                "from user u join friend f on(f.user_id_res = u.user_id) " +
                "where u.user_id = ? ) f " +
                "on (u.user_id = f.user_id_req)";


            connection.query(sql, [user_id], function (err, results) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    callback(null, results);
                }
            });
        }

        function resultJSON(results, callback) {

            var friends = [];

            function iterator(item, callback) {
                if (item.state == 0) {
                    friends.push({
                        "friend_id": item.user_id,
                        "friend_name": item.user_name,
                        "friend_photourl": item.user_photourl,
                        "friend_state": item.state
                    });
                }
                callback(null);
            }

            async.eachSeries(results, iterator, function (err) {
                if (err) {
                    callback(err);
                } else {
                    console.log(friends);
                    callback(null, friends);
                }
            });

        }

        async.waterfall([getConnection, responseList, resultJSON], function (err, results) {
            if (err) {
                var ERROR = {
                    "error" : {
                        "code": "E0010",
                        "message": "요청 받은 친구목록 조회에 실패하였습니다.."
                    }

                };
                next(ERROR);
            } else {

                var result = {
                    "result": {
                        "message": "나에게 친구요청을 한 사람들의 목록을 가져왔습니다...",
                        "friends": results
                    }
                };

                res.json(result);
            }
        });

    });

module.exports = router;