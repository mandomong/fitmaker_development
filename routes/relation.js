var express = require('express');
var router = express.Router();
var async = require('async');

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



// --- 11. 친구 요청 보내기 --- //
router.route('/')
    .post(isLoggedIn, function (req, res, next) {

        var user_id = req.user.id;
        ;
        var friend_id = req.body.friend_id;


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

        function insertRelation(connection, callback) {
            var sql = "insert into fitmakerdb.friend (user_id_req, user_id_res, state) " +
                "values (?, ?, ?)";

            connection.query(sql, [user_id, friend_id, 0], function (err, result) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    var friend_id = result.insertId;
                    callback(null, friend_id);
                }
            });
        }

        function resultJSON(result, callback) {
            var message = {
                "message": "친구 요청에 성공하였습니다..."
            };
            callback(null, message);
        }

        async.waterfall([getConnection, insertRelation, resultJSON], function (err, result) {
            if (err) {
                var ERROR = {
                    "error" :{
                        "code": "E0011",
                        "message": "친구 요청에 실패하였습니다..."
                    }

                };
                next(ERROR);
            } else {
                res.json({"result":result});
            }
        });
    });

// --- 12. 친구 요청 응답 하기 --- //
router.route('/:friend_id')
    .put(isLoggedIn, function (req, res, next) {

        var user_id = req.user.id;
        var friend_id = req.params.friend_id;
        var state = req.body.state;

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

        function updateRelation(connection, callback) {
            var sql = "UPDATE friend SET state=? WHERE user_id_req=? and user_id_res=?";

            connection.query(sql, [state, friend_id, user_id], function (err, result) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    if (result.affectedRows === 0) {
                        var ERROR = {
                            "error": {
                                "code": "E0012",
                                "message": "친구의 요청에 대한 응답에 실패하였습니다..."
                            }
                        };
                        next(ERROR);
                    } else {
                        callback(null);
                    }
                }
            });
        }

        function resultJSON(callback) {

            var result = {
                "result": {
                    "message": "친구의 요청에 대한 응답에 성공하였습니다..."
                }
            };
            callback(null, result);

        }

        async.waterfall([getConnection, updateRelation, resultJSON], function (err, result) {
            if (err) {
                var ERROR = {
                    "error" : {
                        "error": {
                            "code": "E0012",
                            "message": "친구의 요청에 대한 응답에 실패하였습니다..."
                        }
                    }

                };
                next(ERROR);
            } else {
                res.json(result);
            }
        });
    });

module.exports = router;
