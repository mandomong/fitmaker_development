// 작성자 : 장한솔
// badges
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

// --- 뱃지 조회 --- //
router.route('/:badge_id').get(isLoggedIn, function (req, res, next) {




    var badge_id = req.params.badge_id;
    console.log(badge_id);



    // 뱃지조회하기
    function selectBadge(connection, callback) {
        var sql = "SELECT badge_name, badge_photourl " +
            "      FROM fitmakerdb.badge " +
            "      WHERE badge_id = ? ";




        connection.query(sql, [badge_id], function (err, results) {
            connection.release();
            if (err) {
                callback(err);
            } else {

                var badge = {
                    "badge_name" : results[0].badge_name,
                    "badge_photourl" : results[0].badge_photourl,
                };
                callback(null, badge);

            }


        });
    }

    function makeJSON(badge, callback) {


        var result = {
            "message": "뱃지 가져오기에 성공하였습니다",
            "badge": badge

        };
        callback(null, result);


    }

    async.waterfall([getConnection, selectBadge, makeJSON], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json(result);
        }
    });




});

module.exports = router;