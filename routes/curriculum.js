// 작성자 : 장한솔

//curriculum
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

//로그인 확인 코드
function isLoggedIn(req, res, next){

    if(!req.isAuthenticated()){
        var err = new Error('로그인이 필요합니다...');
        err.status = 401;
        next(err);
    } else{
        next();
    }
}

// --- 5. 운동타입 및 커리큘럼 추천 --- //

// - 쿼리 스트링에 q1, q3, q6 (큐레이션) 값이 있다면 : 큐레이샨 결과인 exctype과 추천 커리큘럼 출력
// - 큐레이션을 할때 마다 자신의 exctype변경
// - 쿼리스트링이 없을 경우 session에 user_id 정보를 이용하여 exctype의 유무를 확인
// - exctype 이 존재할 경우 : exctype과 추천커리큘럼 출력
// - exctype이 없고 쿼리스트링 값도 없다면 전체 출력
router.route('/').get(isLoggedIn, function (req, res, next) {



    var user_id = req.user.id;
    // 큐레이션 결과
    function selectExerciseId(connection, callback){
        var sql = "SELECT exctype_id " +
            "      FROM fitmakerdb.curation " +
            "      WHERE curation_q1 = ? and curation_q3 = ? and curation_q6 = ? ";

        var q1 = req.query.q1;
        var q3 = req.query.q3;
        var q6 = req.query.q6;

        console.log(q1,q3,q6);

        connection.query(sql, [q1, q3, q6], function(err, results){

            if(err){
                callback(err);
            } else {
                // 운동 타입
                callback(null,results[0].exctype_id, connection);

            }


        });
    }

    // 운동타입 가져오기
    function selectExerciseType(exctype_id, connection, callback){
        var sql = "SELECT exctype_id, exctype_name, exctype_info, exctype_photourl " +
            "      FROM fitmakerdb.exercisetype " +
            "      WHERE exctype_id = ? ";



        connection.query(sql, [exctype_id], function(err, results){

            if(err){
                callback(err);
            } else {
                var exctype = {
                    "exctype_id" : results[0].exctype_id,
                    "exctype_name" : results[0].exctype_name,
                    "exctype_info" : results[0].exctype_info,
                    "exctype_photourl" : results[0].exctype_photourl
                };

                callback(null,exctype,connection);

            }


        });
    }

    // 커리큘럼 가져오기(운동타입에 따른 추천 커리큘럼)
    function selectCurriculum(exctype, connection, callback){
        console.log(exctype);
        var sql = "SELECT  c.curri_id, c.curri_name, c.curri_photourl, c.curri_type, c.curri_info " +
            "        FROM curriculum c join (SELECT  exctype_id, curri_id " +
            "                                FROM exctype_curri " +
            "                                WHERE exctype_id = ?) ec " +
            "        on (c.curri_id = ec.curri_id) ";


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
                    }
                });
                console.log(curriculum);
                callback(null,exctype, curriculum);

            }
        });
    }

    // 전체 커리큘럼 가져오기(운동타입을 따로 출력하지 않는다.)
    function selectAllCurriculum(connection, callback){

        var sql = "SELECT  curri_id, curri_name, curri_photourl, curri_type, curri_info " +
            "      FROM curriculum  ";


        connection.query(sql, function(err, results){

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
                    }
                });
                console.log(curriculum);
                callback(null, curriculum);

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


    //큐레이션 유무 확인
    var q1 = req.query.q1;
    if (!q1) {
        // 큐레이션값이 없을 때
        // exctype 유무 확인 : 있으면 해당 exctype과 추천 커리큘럼 출력
        //                    없으면 (9) 전체 커리큘럼 출력
        //var user_id = req.user.id;
        var exctypesql = "SELECT exctype_id " +
            "             FROM fitmakerdb.user " +
            "             WHERE user_id = ?";

        console.log(user_id);
        pool.getConnection(function(err, connection){
            if(err){
                callback(err);
            } else {
                connection.query(exctypesql, [user_id] ,function (err, results) {

                    if(err){
                        callback(err);
                    } else {
                        if(parseInt(results[0].exctype_id) === 9) {
                            //exctype 이 존재하지 않을때
                            //exctype_id = 9 가 null값 = 디폴트
                            function makeAllJSON(curriculum, callback) {


                                var result = {
                                    "message": "전체 커리큘럼 요청에 성공하였습니다",
                                    "curriculum": curriculum

                                };
                                callback(null, result);

                            }

                            async.waterfall([getConnection, selectAllCurriculum, makeAllJSON],function(err,result){
                                if(err){
                                    next(err);
                                }else{

                                    res.json(result);
                                }
                            });


                        } else {
                            //exctype 이 존재
                            //해당 exctype과 추천 커리큘럼 출력
                            async.waterfall([getConnection,
                                function (connection, callback) {
                                    if(err) {
                                        callback(err);
                                    } else {
                                        callback(null,results[0].exctype_id,connection);
                                    }

                                },selectExerciseType, selectCurriculum, makeJSON], function (err, result) {
                                if (err) {
                                    next(err);
                                } else {
                                    res.json(result);
                                }
                            });

                        }
                    }


                });
            }
        });


    } else {
        // 큐레이션 값이 존재 : 큐레이션 결과와 추천 커리큘럼 출력
        // 자신의 운동 타입이 변경 됨
        async.waterfall([getConnection, selectExerciseId, selectExerciseType, selectCurriculum, makeJSON],function(err,result){
            if(err){
                next(err);
            } else {
                //타입 변경
                function updateExctype(connection, callback) {
                    var sql = "UPDATE fitmakerdb.user " +
                        "      SET exctype_id = ? " +
                        "      WHERE user_id = ?";


                    connection.query(sql, [result.exctype.exctype_id, user_id], function (err, result) {
                        connection.release();
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, result);

                        }


                    });
                }

                async.waterfall([getConnection, updateExctype], function (err, result) {
                    if (err) {
                        next(err);
                    } else {

                    }
                });

                //출력
                res.json(result);
            }
        });
    }










});

module.exports = router;