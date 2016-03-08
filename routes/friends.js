// 작성자 : 장한솔
var express = require('express');
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

// --- 친구 목록 --- //
router.route('/').get(isLoggedIn, function (req, res, next) {



    // 친구 목록 가져오기
    function selectFriends(connection, callback) {
        var sql = "SELECT u.user_id, u.user_name " +
            "      FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_res = u.user_id " +
            "      WHERE user_id_req = ? AND state = 1 " +
            "      UNION ALL " +
            "      SELECT u.user_id, u.user_name " +
            "      FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_req = u.user_id " +
            "      WHERE user_id_res = ? AND state = 1 ";

        var user_id = req.user.id;


        connection.query(sql, [user_id, user_id], function (err, results) {
            connection.release();
            if (err) {
                callback(err);
            } else {

                var myfriends = [];

                function iterator(item, callback) {
                    myfriends.push({
                        "friend_id": item.user_id,
                        "friend_name": item.user_name
                    });
                    callback(null);
                }

                async.each(results, iterator, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, myfriends)
                    }
                });

            }


        });
    }

    function makeJSON(myfriends, callback) {


        var result = {
            "message": "친구목록 조회 요청에 성공하였습니다",
            "friends": myfriends

        };
        callback(null, result);


    }

    async.waterfall([getConnection, selectFriends, makeJSON], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json(result);
        }
    });


});

module.exports = router;