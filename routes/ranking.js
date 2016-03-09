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

function isLoggedIn(req, res, next){

    if(!req.isAuthenticated()){
        var err = new Error('로그인이 필요합니다...');
        err.status = 401;
        next(err);
    } else{
        next();
    }
}

// --- 5. 랭킹 보기 --- //
router.route('/').get(isLoggedIn, function (req, res, next) {
    // 친구 랭킹 가져오기
    function selectFriendsRank(connection, callback) {
        var sql = "SELECT f.user_id, f.user_name, vuh.user_tothours " +
            "      FROM v_user_hours vuh JOIN (SELECT u.user_id, u.user_name " +
            "                                  FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_res = u.user_id " +
            "                                  WHERE user_id_req = ? AND state = 1 " +
            "                                  UNION ALL " +
            "                                  SELECT u.user_id, u.user_name " +
            "                                  FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_req = u.user_id " +
            "                                  WHERE user_id_res = ? AND state = 1) f " +
            "                            ON (vuh.user_id = f.user_id) " +
            "      ORDER BY user_tothours DESC " +
            "      LIMIT 10 ";

        var user_id = req.user.id;


        connection.query(sql, [user_id, user_id], function (err, results) {
            console.log(results);
            connection.release();
            if (err) {
                callback(err);
            } else {

                var rankfriends = [];

                function iterator(item, callback) {
                    rankfriends.push({
                        "friend_id": item.user_id,
                        "friend_name": item.user_name,
                        "friend_hours": item.user_tothours
                    });
                    callback(null);
                }

                async.each(results, iterator, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, rankfriends)
                    }
                });

            }


        });
    }

    function makeJSON(rankfriends, callback) {

        var result = {
            "message": "친구 랭킹 요청에 성공하였습니다...",
            "friends": rankfriends

        };
        callback(null, result);
    }

    async.waterfall([getConnection, selectFriendsRank, makeJSON], function (err, result) {
        if (err) {
            var ERROR = {
                "error" : {
                    "code":"E0017",
                    "message":"친구 랭킹 요청에 실패하였습니다..."
                }

            };
            next(ERROR);
        } else {
            res.json({"result":result});
        }
    });

});

module.exports = router;