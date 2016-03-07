var express = require('express');
var async = require('async');
var router = express.Router();

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


// --- 6. 프로젝트 생성 --- //
router.route('/').post(isLoggedIn, function (req, res, next) {


  // Project table insert
  function insertProject(connection, callback){
    var sql = "INSERT INTO project(project_name, project_startdate, project_enddate, user_id, curri_id) " +
      "VALUES ((SELECT curri_name " +
      "FROM curriculum " +
      "WHERE curri_id = ?), " +
      "sysdate(), date_add(sysdate(), interval 28 day), ?, ?) ";
    var curri_id = req.body.curri_id;
    var user_id = req.user.id;

    connection.query(sql, [curri_id, user_id, curri_id], function(err, projectResult){
      connection.release();
      console.log(projectResult);
      if(err){
        callback(err);
      } else {
        callback(null,projectResult);
      }
    });
  }




  function makeJSON(projectResult, callback) {


    var result = {
      "message": "프로젝트를 생성 하는데 성공하였습니다",
      "project_id": projectResult.insertId
    };
    callback(null, result);



  }

  async.waterfall([getConnection, insertProject, makeJSON],function(err,result){
    if(err){
      next(err);
    }else{
      res.json(result);
    }
  });

});


// --- 3. 프로젝트 메인 --- //
router.get('/1', function (req, res, next) {


  // 운동타입 가져오기(큐레이션 결과)
  function selectProject(connection, callback){
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

  async.waterfall([getConnection, selectCurriculum, makeJSON],function(err,result){
    if(err){
      next(err);
    }else{
      res.json(result);
    }
  });
});

// --- 11. 참여중인 프로젝트 --- //
router.get('/', function(req, res, next) {

  res.json({
    "message" : "참여중인 프로젝트 조회 요청에 성공하였습니다...",
    "project_history" :[{"project_id":1, "project_name":"비키니 프로젝트!"},
      {"project_id":2, "project_name":"힙업 삼주완성"}]
  });

});

module.exports = router;