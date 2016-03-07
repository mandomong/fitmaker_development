// 작성자 : 장한솔
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

// --- 5. 운동타입 및 커리큘럼 추천 --- //
router.get('/', function (req, res, next) {


    // 운동타입 가져오기(큐레이션 결과)
    function selectExerciseType(connection, callback){
        var sql = "SELECT e.exctype_id, e.exctype_name, e.exctype_info, e.exctype_photourl " +
          "FROM fitmakerdb.exercisetype e join (SELECT exctype_id " +
          "FROM fitmakerdb.curation " +
          "WHERE (curation_q1 = ? and curation_q4 = ? and curation_q6 = ?)) c " +
          "on (e.exctype_id = c.exctype_id) ";

        var q1 = req.query.q1;
        var q4 = req.query.q4;
        var q6 = req.query.q6;

        console.log(q1,q4,q6);

        connection.query(sql, [q1, q4, q6], function(err, results){

            if(err){
                callback(err);
            } else {
                var exctype = {
                    "exctype_id" : results[0].exctype_id,
                    "exctype_name" : results[0].exctype_name,
                    "exctype_info" : results[0].exctype_info,
                    "exctype_photourl" : results[0].exctype_photourl
                };
                console.log(exctype);
                callback(null,exctype,connection);

            }


        });
    }

    // 커리큘럼 가져오기(운동타입에 따른 추천 커리큘럼)
    function selectCurriculum(exctype, connection, callback){
        console.log(exctype);
        var sql = "SELECT  c.curri_id, c.curri_name, c.curri_photourl, c.curri_type, c.curri_info " +
          "FROM curriculum c join (SELECT  exctype_id, curri_id " +
          "FROM exctype_curri " +
          "WHERE exctype_id = ?) ec " +
          "on (c.curri_id = ec.curri_id) ";


        connection.query(sql, [exctype.exctype_id], function(err, results){

            connection.release(); //커넥션을 반납해야 한다.

            console.log(results);
            if(err){
                callback(err);
            } else {
                var curriculum = [];
                function iterator (item, callback) {
                    console.log(item);
                    curriculum.push(item);
                    callback(null);
                }
                async.each(results, iterator, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, results)
                    }
                });
                console.log(curriculum);
                callback(null,exctype, curriculum);

            }
        });
    }


    function makeJSON(exctype, curriculum, callback) {


        var result = {
            "message": "운동타입 및 추천커리큘럼 요청에 성공하였습니다",
            "exctype": exctype,
            "curriculum": curriculum

        };
        callback(null, result);



    }

    async.waterfall([getConnection, selectExerciseType, selectCurriculum, makeJSON],function(err,result){
        if(err){
            next(err);
        }else{
            res.json(result);
        }
    });

});

module.exports = router;