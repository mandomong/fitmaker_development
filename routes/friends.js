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

// --- 친구 목록 --- //
router.get('/', function (req, res, next) {

  var rank = req.query.rank; //랭킹목록일 경우 최대 몇순위까지 볼것인지

  if (!rank) { //전체 친구 목록

    // 친구 목록 가져오기
    function selectFriends(connection, callback) {
      var sql = "SELECT u.user_id, u.user_name " +
        "      FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_res = u.user_id " +
        "      WHERE user_id_req = ? AND state = 1 " +
        "      UNION ALL " +
        "      SELECT u.user_id, u.user_name " +
        "      FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_req = u.user_id " +
        "      WHERE user_id_res = ? AND state = 1 ";

      var user_id = 2;


      connection.query(sql, [user_id, user_id], function(err, results){
        connection.release();
        if(err){
          callback(err);
        } else {

          var myfriends = [];
          function iterator (item, callback) {
            myfriends.push({
              "friend_id" : item.user_id,
              "friend_name" : item.user_name
            });
            callback(null);
          }
          async.each(results, iterator, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, myfriends)
            }
          });

        }


      });
    }

    function makeJSON(myfriends, callback) {


      var result = {
        "message": "친구목록 조회 요청에 성공하였습니다",
        "friends": myfriends

      };
      callback(null, result);



    }

    async.waterfall([getConnection, selectFriends, makeJSON],function(err,result){
      if(err){
        next(err);
      }else{
        res.json(result);
      }
    });

  } else { //친구랭킹

    // 친구 랭킹 가져오기
    function selectFriendsRank(connection, callback) {
      var sql = "SELECT f.user_id, f.user_name, vuh.user_tothours " +
        "      FROM v_user_hours vuh JOIN (SELECT u.user_id, u.user_name " +
        "                                  FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_res = u.user_id " +
        "                                  WHERE user_id_req = ? AND state = 1 " +
        "                                  UNION ALL " +
        "                                  SELECT u.user_id, u.user_name " +
        "                                  FROM fitmakerdb.friend f JOIN fitmakerdb.user u ON f.user_id_req = u.user_id " +
        "                                  WHERE user_id_res = ? AND state = 1) f " +
        "                            ON (vuh.user_id = f.user_id) " +
        "      ORDER BY user_tothours DESC " +
        "      LIMIT ? ";

      var user_id = 2;


      connection.query(sql, [user_id, user_id, parseInt(rank)], function(err, results){
        console.log(results);
        connection.release();
        if(err){
          callback(err);
        } else {

          var rankfriends = [];
          function iterator (item, callback) {
            rankfriends.push({
              "friend_id" : item.user_id,
              "friend_name" : item.user_name,
              "friend_hours" : item.user_tothours
            });
            callback(null);
          }
          async.each(results, iterator, function (err) {
            if (err) {
              callback(err);
            } else {
              callback(null, rankfriends)
            }
          });

        }


      });
    }

    function makeJSON(rankfriends, callback) {


      var result = {
        "message": "친구목록 랭킹 요청에 성공하였습니다",
        "friends": rankfriends

      };
      callback(null, result);



    }

    async.waterfall([getConnection, selectFriendsRank, makeJSON],function(err,result){
      if(err){
        next(err);
      }else{
        res.json(result);
      }
    });
  }



});

module.exports = router;