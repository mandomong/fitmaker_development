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

// --- 10. 친구 프로필 보기 --- //
router.get('/:friend_id', isLoggedIn, function (req, res, next) {
    if (req.secure) {

        var friend_id = req.params.friend_id;

        function selectProfile(connection, callback) {
            var sql = "SELECT u.user_name, u.user_photourl, vub.badgecnt, vuh.user_tothours, et.exctype_name " +
                "      FROM fitmakerdb.user u JOIN exercisetype et ON (et.exctype_id = u.exctype_id) " +
                "                             LEFT JOIN v_user_hours vuh ON (u.user_id = vuh.user_id) " +
                "                             LEFT JOIN v_user_badgecnt vub ON (vub.user_id = u.user_id) " +
                "      WHERE u.user_id = ?";

            connection.query(sql, [friend_id], function (err, results) {

                if (err) {
                    console.log("DB SELECT 에러...");
                    callback(err);
                } else {

                    var friend = {
                        "friend_name": results[0].user_name,
                        "friend_photourl": results[0].user_photourl,
                        "badgeCnt": results[0].badgeCnt,
                        "hours": results[0].user_tothours,
                        "exctype_name": results[0].exctype_name
                    };
                    callback(null, friend, connection);
                }
            });
        }

        function selectHistory(friend, connection, callback) {
            var sql = "SELECT project_id, project_name, " +
                "             (CASE WHEN project_enddate > DATE(date_format(CONVERT_TZ(now(), '+00:00', '+9:00'), '%Y-%m-%d %H-%i-%s')) THEN 1 ELSE 0 END) AS project_on " +
                "      FROM fitmakerdb.project " +
                "      WHERE user_id = ?";

            connection.query(sql, [friend_id], function (err, results) {

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
                            callback(null, project_history, friend, connection);
                        }
                    });


                }
            });
        }

        function selectMyBadges(project_history, friend, connection, callback) {
            var sql = "SELECT b.badge_id, b.badge_name, b.badge_photourl " +
                "      FROM user_badge ub JOIN badge b ON ub.badge_id = b.badge_id " +
                "      WHERE user_id = ? ";

            connection.query(sql, [friend_id], function (err, results) {
                connection.release();
                if (err) {
                    console.log("DB SELECT 에러...");
                    callback(err);
                } else {
                    var friend_badges = [];

                    function iterator(item, callback) {
                        friend_badges.push({
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
                            callback(null, friend_badges, project_history, friend);
                        }
                    });


                }
            });
        }

        function resultJSON(friend_badges, project_history, friend, callback) {


            var result = {
                "result": {
                    "message": "친구프로필 페이지가 정상적으로 조회되었습니다...",
                    "friend": friend,
                    "project_history": project_history,
                    "friend_badges": friend_badges

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

});

module.exports = router;