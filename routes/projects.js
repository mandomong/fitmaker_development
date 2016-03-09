
// 작성자 : 장한솔
var express = require('express');
var async = require('async');
var router = express.Router();

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



// --- 14. 프로젝트 생성 --- //
router.post('/', function (req, res, next) {


    var user_id = req.user.id;
    // Project table insert
    function insertProject(connection, callback) {
        var sql = "INSERT INTO project(project_name, project_startdate, project_enddate, user_id, curri_id) " +
          "VALUES ((SELECT curri_name " +
          "FROM curriculum " +
          "WHERE curri_id = ?), " +
          "sysdate(), date_add(sysdate(), interval 28 day), ?, ?) ";
        var curri_id = req.body.curri_id;


        connection.query(sql, [curri_id, user_id, curri_id], function (err, projectResult) {
            connection.release();
            console.log(projectResult);
            if (err) {
                callback(err);
            } else {
                callback(null, projectResult);
            }
        });
    }


    function makeJSON(projectResult, callback) {


        var result = {
            "message": "프로젝트를 생성 하는데 성공하였습니다",
            "project_id": projectResult.insertId
        };
        callback(null, {"result":result});


    }

    async.waterfall([getConnection, insertProject, makeJSON], function (err, result) {
        if (err) {
            var ERROR = {
                "error" : {
                    "code":"E0014",
                    "message":"프로젝트를 생성 하는데 실패하였습니다..."
                }
            };
            next(ERROR);
        } else {
            res.json(result);
        }
    });

});

// --- 15. 프로젝트 가져오기 --- //
router.get('/:project_id', function (req, res, next) {

    var project_id = req.params.project_id;
    var user_id = req.user.id;

    // 코스 가져오기
    function selectCourses(connection, callback) {
        var sql = "SELECT currics.course_id, currics.course_seq " +
          "      FROM fitmakerdb.project p JOIN curriculum curri ON p.curri_id = curri.curri_id " +
          "                                JOIN curri_course currics ON curri.curri_id = currics.curri_id " +
          "      WHERE project_id = ? " +
          "      ORDER BY course_seq ";


        console.log(project_id);

        connection.query(sql, [project_id], function (err, results) {

            if (err) {
                callback(err);
            } else {
                var courses = [];

                function iterator(item, callback) {
                    //console.log(item.course_id);
                    courses.push(
                      {
                          "course_seq": item.course_seq,
                          "course_id": item.course_id,
                          "contents": [],
                      }
                    );
                    //console.log(courses);
                    callback(null);
                }

                async.each(results, iterator, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, courses, connection);
                    }
                });


            }


        });
    }

    // 컨텐츠 가져오기
    function selectContents(courses, connection, callback) {
        console.log(courses);
        var sql = "SELECT cs.course_id, currics.course_seq, ct.contents_id, ct.contents_name, csct.contents_time, " +
          "             csct.contents_count, csct.contents_set, ct.contents_url, csct.contents_seq, ct.contents_target, " +
          "             ct.contents_info, ct.contents_notice, ct.contents_voiceurl " +
          "      FROM fitmakerdb.project p JOIN curriculum curri ON p.curri_id = curri.curri_id " +
          "                                JOIN curri_course currics ON curri.curri_id = currics.curri_id " +
          "                                JOIN course cs ON cs.course_id = currics.course_id " +
          "                                JOIN course_contents csct ON csct.course_id = cs.course_id " +
          "                                JOIN contents ct ON ct.contents_id = csct.contents_id " +
          "      WHERE project_id = ? " +
          "      ORDER BY course_seq, contents_seq ";


        connection.query(sql, [project_id], function (err, results) {

            if (err) {
                callback(err);
            } else {
                var contents = [];

                function iterator(item, callback) {


                    var idx = item.course_seq - 1;
                    console.log(courses[idx]);
                    courses[idx].contents.push(
                      {
                          "contents_id": item.contents_id,
                          "contents_name": item.contents_name,
                          "contents_time": item.contents_time,
                          "contents_count": item.contents_count,
                          "contents_set": item.contents_set,
                          "contents_url": item.contents_url,
                          "contents_seq": item.contents_seq,
                          "contents_target": item.contents_target,
                          "contents_info": item.contents_info,
                          "contents_notice": item.contents_notice,
                          "contents_voiceurl": item.contents_voiceurl
                      }
                    );
                    callback(null);
                }

                async.each(results, iterator, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, courses, connection);
                    }
                });


            }


        });
    }

    // 참여중인 프로젝트 가져오기
    function selectIngProjects(courses, connection, callback) {
        var sql = "SELECT project_id, project_name " +
          "      FROM fitmakerdb.project " +
          "      WHERE project_enddate > date(date_format(CONVERT_TZ(now(), '+00:00', '+9:00'), '%Y-%m-%d %H-%i-%s')) " +
          "      AND user_id = ?";


        connection.query(sql, [user_id], function (err, results) {

            if (err) {
                callback(err);
            } else {
                var projects_ing = [];

                function iterator(item, callback) {

                    projects_ing.push(
                      {
                          "project_id": item.project_id,
                          "project_name": item.project_name
                      }
                    );

                    callback(null);
                }

                async.each(results, iterator, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, courses, projects_ing, connection);
                    }
                });


            }


        });
    }

    // 오늘의 운동
    function selectToday(courses, projects_ing, connection, callback) {
        var sql = "SELECT (max(course_seq) + 1) AS seq, " +
          "             (CASE WHEN DATE(max(playdate)) = DATE(date_format(CONVERT_TZ(now(), '+00:00', '+9:00'), '%Y-%m-%d %H-%i-%s')) THEN 1 ELSE 0 END) AS playcheck " +
          "      FROM record " +
          "      WHERE project_id = ? ";


        connection.query(sql, [project_id], function (err, results) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                var today = {
                    "position" : results[0].seq,
                    "check" : results[0].playcheck > 0 ? true : false
                };

                callback(null, courses, projects_ing, today);

            }


        });
    }


    function makeJSON(courses, projects_ing, today, callback) {


        var result = {
            "message": "프로젝트 페이지 요청에 성공하였습니다",
            "projects_ing": projects_ing,
            "today" : today,
            "courses": courses
        };
        callback(null, result);


    }

    async.waterfall([getConnection, selectCourses, selectContents, selectIngProjects, selectToday, makeJSON], function (err, result) {
        if (err) {
            var ERROR = {
                "error" : {
                    "code":"E0015",
                    "message":"프로젝트 페이지 요청에 실패하였습니다..."
                }
            };
            next(ERROR);
        } else {
            res.json({"result":result});
        }
    });

});

module.exports = router;


