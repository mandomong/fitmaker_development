var express = require('express');
var router = express.Router();

function isLoggedIn(req, res, next){

  if(!req.isAuthenticated()){
    var err = new Error('로그인이 필요합니다...');
    err.status = 401;
    next(err);
  } else{
    next();
  }
}

// --- 받은 친구 요청에 대한 응답 보기 --- //
router.route('/')
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

module.exports = router;