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
      "        VALUES ((SELECT curri_name " +
      "        FROM curriculum " +
      "        WHERE curri_id = ?), " +
      "              sysdate(), date_add(sysdate(), interval 28 day), ?, ?) ";
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

  if (!project_id) {

    var ERROR = {
      "error" : {
        "code":"E0015",
        "message":"프로젝트 페이지 요청에 실패하였습니다..."
      }
    };
    next(ERROR);

  }

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

        async.eachSeries(results, iterator, function (err) {
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
      "             ct.contents_info, ct.contents_notice, ct.contents_voiceurl, ct.thumbnail_url " +
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
              "contents_voiceurl": item.contents_voiceurl,
              "thumbnail":item.thumbnail_url
            }
          );

          callback(null);
        }

          async.eachSeries(results, iterator, function (err) {
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
      "        FROM fitmakerdb.project " +
      "        WHERE project_enddate > date(date_format(CONVERT_TZ(now(), '+00:00', '+9:00'), '%Y-%m-%d %H-%i-%s')) " +
      "        AND user_id = ? " +
      "        ORDER BY project_id desc";


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

          async.eachSeries(results, iterator, function (err) {
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
        "             (CASE WHEN DATE(max(DATE(date_format(CONVERT_TZ(playdate, '+00:00', '+9:00'), '%Y-%m-%d %H-%i-%s')))) = DATE(date_format(CONVERT_TZ(now(), '+00:00', '+9:00'), '%Y-%m-%d %H-%i-%s')) THEN 1 ELSE 0 END) AS playcheck " +
        "      FROM record " +
        "      WHERE project_id = ? ";


    connection.query(sql, [project_id], function (err, results) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        var check = results[0].playcheck > 0 ? true : false;
        var position = results[0].seq;

        console.log("check, position");
        console.log(check, position);

        if (check) {
          position = position - 1;
        } else {
          if (!position) {
            position = 1;
          }
        }

        var today = {
          "position" : position,
          "check" : check                };

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


// --- 19.진행중인 프로젝트 동영상
router.get('/:project_id/video', function(req, res, next) {
  var project_id = req.params.project_id;


  //커리큘럼 가져오기
  function selectCurriculum(connection, callback) {
    var sql = "SELECT c.curri_id, c.curri_name, c.curri_type, c.curri_photourl, c.curri_info " +
      "      FROM project p JOIN curriculum c ON (p.curri_id = c.curri_id) " +
      "      WHERE project_id = ? ";


    connection.query(sql, [project_id], function (err, results) {

      if (err) {
        connection.release();
        callback(err);
      } else {

        var curriculum = {
          "curri_id" : results[0].curri_id,
          "curri_name" : results[0].curri_name,
          "curri_type" : results[0].curri_type,
          "curri_photourl" : results[0].curri_photourl,
          "curri_info" : results[0].curri_info,
          "contents" : []
        };
        callback(null, curriculum, connection);
      }

    });
  }

  //컨텐츠 동영상 가져오기
  function selectContentsVideo(curriculum, connection, callback) {
    var sql = "SELECT pc.project_id, pc.curri_id, pc.project_name, pc.course_id, cont.contents_id, cont.contents_name, cont.contents_target, cont.thumbnail_url, cont.contents_url " +
      "      FROM (SELECT p.project_id, p.project_name, cc.curri_id, cs.course_id, cs.course_name " +
      "            FROM project p JOIN curri_course cc ON (p.curri_id = cc.curri_id) " +
      "                           JOIN course cs ON (cc.course_id = cs.course_id) " +
      "            GROUP BY p.project_id, cs.course_id " +
      "            HAVING p.project_id = ?) pc JOIN course_contents csc ON (pc.course_id = csc.course_id) " +
      "                                        JOIN contents cont ON (cont.contents_id = csc.contents_id) " +
      "      ORDER BY pc.course_id, csc.contents_seq ";


    connection.query(sql, [project_id], function (err, results) {
      connection.release();
      if (err) {

        callback(err);
      } else {

        function iterator(item, callback) {
          curriculum.contents.push(
            {
              "contents_id": item.contents_id,
              "contents_name": item.contents_name,
              "contents_target": item.contents_target,
              "thumbnail_url": item.thumbnail_url,
              "contents_url": item.contents_url
            }
          );

          callback(null);
        }

          async.eachSeries(results, iterator, function (err) {
          if (err) {
            callback(err);
          } else {
            callback(null, curriculum);
          }
        });

      }

    });
  }

  function makeJSON(curriculum, callback) {


    var result = {
      "message": "컨텐츠 동영상 페이지 요청이 성공하였습니다..",
      "curriculum": curriculum
    };
    callback(null, result);
  }

  async.waterfall([getConnection, selectCurriculum, selectContentsVideo, makeJSON], function (err, result) {
    if (err) {
      var ERROR = {
        "error" : {
          "code":"E0020",
          "message":"컨텐츠 동영상 페이지 요청이 실패하였습니다.."
        }
      };
      next(ERROR);
    } else {
      res.json({"result":result});
    }
  });

});
module.exports = router;


