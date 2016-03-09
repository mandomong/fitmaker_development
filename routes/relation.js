var express = require('express');
var router = express.Router();
var async =require('async');

function isLoggedIn(req, res, next){

  if(!req.isAuthenticated()){
    var err = new Error('로그인이 필요합니다...');
    err.status = 401;
    next(err);
  } else{
    next();
  }
}

// -------------- 친구 요청 ------------------- //

// --- 16. 회원 검색 --- //

//router.route('/req')
//
//.get(isLoggedIn, function (req, res, next){
//  var friend_email = req.query.email;
//  var user_id = req.user.id;
//
//  function getConnection(callback){
//    pool.getConnection(function (err, connection){
//      if(err){
//        console.log("DB connection 에러...");
//        callback(err);
//      }else{
//        callback(null, connection);
//      }
//    });
//  }
//
//  //친구 검색 query
//  function searchUser(connection, callback){
//    var sql = "select user_id, user_name, email, user_photourl " +
//      "from user " +
//      "where email = ?";
//
//    connection.query(sql, [friend_email], function(err, results){
//      connection.release();
//      if(err){
//        console.log("DB SELECT 에러...");
//        callback(err);
//      }else{
//        callback(null, results);
//      }
//    });
//  }
//
//  function resultJSON(results, callback){
//    var result = {
//      "message" : "회원 검색에 성공하였습니다...",
//      "user" : {"user_id":user_id},
//      "friends" : {"friend_id":results[0].user_id, "friend_name":results[0].user_name, "friend_photourl":results[0].user_photourl}
//    };
//    callback(null, result);
//
//  }
//
//  async.waterfall([getConnection, searchUser, resultJSON],function(err, results){
//    if(err){
//      next(err);
//    }else{
//      res.json(results);
//    }
//  });
//});

// --- 16. 회원 검색 --- //
router.route('/')

  .get(isLoggedIn, function (req, res, next){
    var friend_email = req.query.email;
    var user_id = req.user.id;

    function getConnection(callback){
      pool.getConnection(function (err, connection){
        if(err){
          console.log("DB connection 에러...");
          callback(err);
        }else{
          callback(null, connection);
        }
      });
    }

    //친구 검색 query
    function searchUser(connection, callback){
      var sql = "select user_id, user_name, email, user_photourl " +
        "from user " +
        "where email = ?";

      connection.query(sql, [friend_email], function(err, results){

        if(err){
          connection.release();
          console.log("DB SELECT 에러...");
          callback(err);
        }else{
          callback(null, results, connection);
        }
      });
    }

    function resultJSON(results, connection, callback){
      var result = {
        "message" : "회원 검색에 성공하였습니다...",
        "user" : {"user_id":user_id},
        "friends" : {"friend_id":results[0].user_id, "friend_name":results[0].user_name, "friend_photourl":results[0].user_photourl}
      };
      callback(null, result, connection);

    }

    function searchState(result, connection, callback){
      var sql = "select user_id_req, user_id_res, state " +
                "from friend " +
                "where user_id_req = ? and user_id_res = ?";
      connection.query(sql, [result.user.user_id, result.friends.friend_id], function(err, results){
        connection.release();
        if(err){
          console.log("DB SELECT 에러...");
          callback(err);
        }else{
          // state 값이 없을때
          if(results.state == undefined){
            results.state=2;
            // -------------------------------------------------- state -1: 거절, state 0: 요청상태, state, 1: 친구상태, 2: DB에 없는상태
          }
          callback(null, result, results)
        }
      });
    }

    function resultJSON2(result, results, callback) {
      var result_info = {
        "message": "회원 검색에 성공하였습니다...",
        "user": {"user_id": user_id},
        "friends": {
          "friend_id": result.friends.friend_id,
          "friend_name": result.friends.friend_name,
          "friend_photourl": result.friends.friend_photourl},
        "state":results.state
      };
      console.log(result_info);
      callback(null, result_info);

    }


    async.waterfall([getConnection, searchUser, resultJSON, searchState, resultJSON2],function(err, results){
      if(err){
        next(err);
      }else{
        /* 넘겨주는 results.state 정보는 -1, 0 1 값을 가질 수 있다
        * -1은 거절 상태를 말하며 안드로이드에서 버튼선택 불가하게 처리
        * 0은 DB에 테이블이 없는 상태 state 값을 0 으로 INSERT 할 수 있도록 post에서 처리 해야한다
        * 1은 친구인 상태*/
        res.json(results);
      }
    });
  });


// --- 회원 친구 추가 --- //
router.route('/')
  .post(isLoggedIn, function (req, res, next){

    var user_id = req.user.id;;
    var friend_id = req.body.friend_id;


    function getConnection(callback){
      pool.getConnection(function (err, connection){
        if(err){
          console.log("DB connection 에러...");
          callback(err);
        }else{
          callback(null, connection);
        }
      });
    }

    function insertRelation(connection, callback){
      var sql = "insert into fitmakerdb.friend (user_id_req, user_id_res, state) " +
                "values (?, ?, ?)";

      connection.query(sql, [user_id, friend_id, 0], function(err, result){
        connection.release();
        if(err){
          callback(err);
        } else{
          var friend_id = result.insertId;
          callback(null, friend_id);
        }
      });
    }

    function resultJSON(result, callback) {
      var message = {
        "message": "친구 요청에 성공하였습니다..."
      };
      callback(null, message);
    }

    async.waterfall([getConnection, insertRelation, resultJSON],function(err, result){
      if(err){
        var ERROR = {
          "code":"E0017",
          "message":"친구 요청에 실패하였습니다..."
        };
        next(ERROR);
      }else{
        res.json(result);
      }
    });
});

// --- 받은 친구 요청에 대한 응답 보기 --- //
router.route('/res')
  .get(isLoggedIn, function (req, res, next){

    var user_id = req.user.id;

    function getConnection(callback){
      pool.getConnection(function (err, connection){
        if(err){
          console.log("DB connection 에러...");
          callback(err);
        }else{
          callback(null, connection);
        }
      });
    }

  function responseList(connection, callback){
    var sql = "select u.user_id, u.user_name, u.user_photourl, f.state " +
              "from user u join " +
              "(select f.user_id_req, f.state " +
              "from user u join friend f on(f.user_id_res = u.user_id) " +
              "where u.user_id = ? ) f " +
              "on (u.user_id = f.user_id_req)";

    connection.query(sql, [user_id], function(err, results){
      connection.release();
      if (err) {
        callback(err);
      } else {
        console.log(user_id);
        console.log(results);
        callback(null, results);
      }
    });
  }

    function resultJSON(results, callback){

      var friends= [];

      function iterator(item, callback){

        friends.push({
          "friend_id":item.user_id,
          "friend_name":item.user_name,
          "friend_photourl":item.user_photourl,
          "state":item.state
        });
        callback(null);
      }

      async.each(results, iterator, function(err){
        if(err){
          callback(err);
        }else{
          console.log(friends);
          callback(null, friends);
        }
      });

    }

    async.waterfall([getConnection, responseList, resultJSON], function(err, results){
      if(err){
        next(err);
      }else{

        var result = {
          "result": {
            "message": "나에게 친구요청을 한 사람들의 목록을 가져왔습니다...",
            "friends":results
          }
        };
        //friend_id , friend_name, friend_photourl, state
        res.json(result);
      }
    });

  });



// --- 받은 친구 요청에 대한 응답 하기 --- //
router.route('/:friend_id')
  .put(isLoggedIn, function (req, res, next){

    var user_id = req.user.id;
    var friend_id = req.params.friend_id;
    var state = req.body.state;


    function getConnection(callback){
      pool.getConnection(function (err, connection){
        if(err){
          console.log("DB connection 에러...");
          callback(err);
        }else{
          callback(null, connection);
        }
      });
    }

    function updateRelation(connection, callback){
      var sql = "UPDATE friend SET state='?' WHERE user_id_req=? and user_id_res=?";

      connection.query(sql, [1, friend_id, user_id], function(err, result){
        connection.release();
        if(err){
          callback(err);
        } else{
          if(result.fieldCount == 0){
            var ERROR = {
              "code":"E0015",
              "message":"친구의 요청에 대한 응답에 실패하였습니다..."
            };
            next(ERROR);
          }else{
            callback(null);
          }
        }
      });
    }

    function resultJSON(callback) {

      var result = {
        "result": {
          "message": "친구의 요청에 대한 응답에 성공하였습니다..."
        }
      };
      callback(null, result);

    }

    async.waterfall([getConnection, updateRelation, resultJSON],function(err, result){
      if(err){
        var ERROR = {
          "code":"E0015",
          "message":"친구의 요청에 대한 응답에 실패하였습니다..."
        };
        next(ERROR);
      }else{
        res.json(result);
      }
    });
  });

module.exports = router;
