var express = require('express');
var router = express.Router();
var async = require('async');

//getConnection
function getConnection(callback){
    pool.getConnection(function(err, connection){
        if(err){
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

// --- 4. 운동기록 --- //
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
    function hoursBadge(connection, callback){

        //운동시간 조회
        var sql = "SELECT sum(course_totaltime) as mytotaltime" +
            "      FROM record r join project p on (r.project_id = p.project_id) " +
            "                    join curri_course cc on (p.curri_id = cc.curri_id and r.course_seq = cc.course_seq) " +
            "                    join course c on (c.course_id = cc.course_id) " +
            "      WHERE p.user_id = ? ";




        connection.query(sql, [user_id], function(err, results){



            //console.log(results);
            if(err){
                callback(err);
            } else {
                // 운동 총시간이 30분이상이면 1번 뱃지 발급
                if (results[0].mytotaltime/60 > 30) {
                    callback(null, 1, connection);
                } else {
                    callback(null, null, connection);
                }


            }
        });
    }

    //뱃지 저장
    function insertBadge(badge_id, connection, callback) {
        console.log(badge_id);
        if(!badge_id) {
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

    async.waterfall([getConnection, insertRecord, hoursBadge, insertBadge, makeJSON], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json(result);
        }
    });
    /*
     res.json(
     {
     "result": {
     "message": "운동기록에 성공하였습니다",
     "badge_id": 1
     }


     }
     );
     */
});

module.exports = router;