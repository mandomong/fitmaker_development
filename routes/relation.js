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


// --- 회원 친구 추가 --- //
router.route('/')
  .post(isLoggedIn, function (req, res, next){

    var user_id = req.user.id;
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

    function resultJSON(result, results, callback) {

      var result_info = {
        "message": "회원 검색에 성공하였습니다...",
        "user": {"user_id": user_id},
        "friends": {
          "friend_id": result.friends.friend_id,
          "friend_name": result.friends.friend_name,
          "friend_photourl": result.friends.friend_photourl},
        "state":results.state
      };
      callback(null, result_info);

    }

    async.waterfall([getConnection, insertRelation, resultJSON],function(err, result){
      if(err){
        next(err);
      }else{
        res.json("친구 관계가 생성되었습니다...");
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

      connection.query(sql, [state, friend_id, user_id], function(err, result){
        connection.release();
        if(err){
          callback(err);
        } else{
          callback(null);
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
        next(err);
      }else{
        res.json(result);
      }
    });
  });

module.exports = router;
