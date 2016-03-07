var express = require('express');
var bcrypt = require('bcrypt');
var async =require('async');

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



// --- 6. 회원 가입 --- //
router.post('/', function (req, res, next) {

    if(req.secure) {

        var username = req.body.username;
        var password = req.body.password;
        var email = req.body.email;
        var exctypeid = 3;
        var usertype = 1;


        // 1. salt generation -- 원본에 대한 보안성을 높이기 위해서 rainbow table에 salt값을 추가
        function generateSalt(callback) {
            var rounds = 10;
            bcrypt.genSalt(rounds, function (err, salt) {
                if (err) {
                    console.log("salt에러");
                    callback(err);
                } else {

                    callback(null, salt);
                }
            }); //salt 생성횟수

        }

        // 2. hash password generation
        function generateHashPassword(salt, callback) {
            bcrypt.hash(password, salt, function (err, hashPassword) {
                if (err) {
                    console.log("hash에러");
                    callback(err);
                } else {
                    callback(null, hashPassword);
                }
            });
        }

        // 3. get connection
        function getConnection(hashPassword, callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    console.log("connection에러");
                    console.log(err);
                    callback(err);
                } else {

                    callback(null, connection, hashPassword);
                }
            });
        }

        // 4. DB insert
        function insertMember(connection, hashPassword, callback) {
            var sql = "insert into fitmakerdb.user (user_name, password, email, exctype_id, user_type) " +
                "values (?, ?, ?, ?, ?)";
            connection.query(sql, [username, hashPassword, email, exctypeid, usertype], function (err, result) {
                connection.release();

                if (err) {
                    console.log("insert에러");
                    callback(err);
                } else {
                    callback(null, {
                        "id": result.insertId
                    });
                }
            });
            var result = {};
            callback(null, result);
        }

        async.waterfall([generateSalt, generateHashPassword, getConnection, insertMember], function (err, result) {
            if (err) {
                next(err);
            } else {
                result.message = "회원가입이 정상적으로 처리되었습니다...";
                res.json(result);
            }
        })

    }else{
        var err = new Error('SSL/TLS Upgrade Required!!!'); // =  err.message ?!
        err.status = 426;
        next(err);
    }

});

//// --- 7. facebook 로그인 --- //
//router.get('/facebook', function (req, res, nex) {
//
//    res.json({
//        "message": "페이스북 로그인이 정상적으로 처리되었습니다."
//    });
//
//});

// --- 8. 마이페이지 --- //
router.route('/me')

    .get(isLoggedIn, function (req, res, next) {

                if (req.secure) {

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

                    function selectProfile(connection, callback){
                        var sql = "select * " +
                          "from user u left join exercisetype et on(et.exctype_id = u.exctype_id) " +
                          "left join project p on(u.user_id = p.user_id) " +
                          "left join user_badge ub on(u.user_id = ub.user_id) " +
                          "left join badge b on (ub.badge_id = b.badge_id) " +
                          "where u.user_id = ?";

                        connection.query(sql, [user_id], function(err, results){
                            connection.release();
                            if(err){
                                console.log("DB SELECT 에러...");
                                callback(err);
                            }else{
                                callback(null, results);
                            }
                        });
                    }

                    function resultJSON(results, callback){
                        var result = {
                            "result": {
                                "message": "마이페이지가 정상적으로 조회되었습니다...",
                                "user_name": results[0].user_name,
                                "user_photourl": results[0].user_photourl,
                                //"badge_Cnt": 5,
                                //"hours": 250,
                                "exctype_name": results[0].exctype_name,
                                "project_history": [{"project_id":results[0].project_id, "project_name":results[0].project_name},
                                    {"project_id":results[1].project_id, "project_name":results[1].project_name},
                                    {"project_id":results[2].project_id, "project_name":results[2].project_name}],
                                "badges": [{"badge_name": results[0].badge_name, "badge_photourl": results[0].badge_photourl},
                                    {"badge_name": results[1].badge_name, "badge_photourl": results[1].badge_photourl},
                                    {"badge_name": results[2].badge_name, "badge_photourl": results[2].badge_photourl}]
                                //"project_history": [{"project_id": 1, "name": "비키니 프로젝트!", "ing": true},
                                //                    {"project_id": 2, "name": "힙업 삼주완성!", "ing": false},
                                //                    {"project_id": 3, "name": "해범이 만들기!", "ing": true}],
                                //"badges": [{"badge_name": "출석왕", "badge_photourl": "/images/badge/first.jpg", "own_badge": true},
                                //    {"badge_name": "에스라인마스터", "badge_photourl": "/images/badge/sline.jpg", "own_badge": true}]
                            }
                        };
                        callback(null, result);
                    }

                    //res.json({
                    //    "result": {
                    //        "message": "마이페이지가 정상적으로 조회되었습니다...",
                    //        "user_name": "천우희",
                    //        "user_photourl": "/images/profile/woohee.jpg",
                    //        "badge_Cnt": 3,
                    //        "hours": 300,
                    //        "exctype_name": "발레리나 타입",
                    //        "project_history": [{"project_id": 1, "name": "비키니 프로젝트!", "ing": true},
                    //            {"project_id": 2, "name": "힙업 삼주완성!", "ing": false},
                    //            {"project_id": 3, "name": "해범이 만들기!", "ing": true}],
                    //        "badges": [{
                    //            "badge_name": "출석왕",
                    //            "badge_photourl": "/images/badge/first.jpg",
                    //            "own_badge": true
                    //        },
                    //            {
                    //                "badge_name": "에스라인마스터",
                    //                "badge_photourl": "/images/badge/second.jpg",
                    //                "own_badge": true
                    //            }]
                    //    }
                    //});

                    async.waterfall([getConnection, selectProfile, resultJSON], function(err, results){
                        if(err){
                            next(err);
                        }else{
                            res.json(results);
                        }
                    });




                } else {
                    var err = new Error('SSL/TLS Upgrade Required');
                    err.status = 426;
                    next(err);
                }

    })

    // --- 9. 프로필사진변경 --- //

    .put(isLoggedIn, function (req, res, next) {

                res.json({
                    "message": "프로필 사진이 성공적으로 변경되었습니다"
                });

    });

 // --- 10. 친구 프로필 보기 --- //
router.get('/:friend_id', isLoggedIn, function (req, res, next) {
    if (req.secure) {

        var friend_id = parseInt(req.params.friend_id);

        function getConnection(callback){
            pool.getConnection(function (err, connection){
                if(err){
                    console.log("DB connection 에러...")
                    callback(err);
                }else{
                    callback(null, connection);
                }
            });
        }

        function selectProfile(connection, callback){
            var sql = "select * " +
              "from user u left join exercisetype et on(et.exctype_id = u.exctype_id) " +
              "left join project p on(u.user_id = p.user_id) " +
              "left join user_badge ub on(u.user_id = ub.user_id) " +
              "left join badge b on (ub.badge_id = b.badge_id) " +
              "where u.user_id = ?";

            connection.query(sql, [friend_id], function(err, results){
                connection.release();
                if(err){
                    console.log("DB SELECT 에러...");
                    callback(err);
                }else{
                    callback(null, results);
                }
            });
        }

        function resultJSON(results, callback) {

            var result = {
                "result": {
                    "message": "친구프로필 페이지가 정상적으로 조회되었습니다...",
                    "user_name": results[0].user_name,
                    "user_photourl": results[0].user_photourl,
                    //"badge_Cnt": 5,
                    //"hours": 250,
                    "exctype_name": results[0].exctype_name,
                    "project_history": [{"project_id":results[0].project_id, "project_name":results[0].project_name},
                                        {"project_id":results[1].project_id, "project_name":results[1].project_name},
                                        {"project_id":results[2].project_id, "project_name":results[2].project_name}],
                    "badges": [{"badge_name": results[0].badge_name, "badge_photourl": results[0].badge_photourl},
                               {"badge_name": results[1].badge_name, "badge_photourl": results[1].badge_photourl},
                               {"badge_name": results[2].badge_name, "badge_photourl": results[2].badge_photourl}]
                    //"project_history": [{"project_id": 1, "name": "비키니 프로젝트!", "ing": true},
                    //                    {"project_id": 2, "name": "힙업 삼주완성!", "ing": false},
                    //                    {"project_id": 3, "name": "해범이 만들기!", "ing": true}],
                    //"badges": [{"badge_name": "출석왕", "badge_photourl": "/images/badge/first.jpg", "own_badge": true},
                    //    {"badge_name": "에스라인마스터", "badge_photourl": "/images/badge/sline.jpg", "own_badge": true}]
                }
            };
            callback(null, result);
        }

        async.waterfall([getConnection, selectProfile, resultJSON], function(err, results){
            if(err){
                next(err);
            }else{
                res.json(results);
            }
        });

    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }

});

// --- 16. 회원 검색 --- //
router.route('/')

  .get(isLoggedIn, function (req, res, next){
      var friend_email = req.query.email;
      var user_id = req.user.id;
      var relation_state;

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
                    "FROM user " +
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
          "where user_id_req = ? and user_id_res = ? " +
          "union all " +
          "select user_id_req, user_id_res, state " +
          "from friend " +
          "where user_id_req = ? and user_id_res = ?";
          connection.query(sql, [result.user.user_id, result.friends.friend_id, result.friends.friend_id, result.user.user_id], function(err, results){
              connection.release();
              if(err){
                  console.log("DB SELECT 에러...");
                  callback(err);
              }else{
                  // state 값이 없을때
                  if(results.length === 0){
                      relation_state = 2; // 관계가 없어서 친구요청(버튼)
                      // -------------------------------------------------- state -1: 거절, state 0: 요청상태, state, 1: 친구상태, 2: DB에 없는상태
                  }else if(results[0].state == 0){
                      relation_state = 0; // 친구 요청중
                  }else if(results[0].state == 1){
                      relation_state = 1; // 친구 상태일때
                  }else{
                      relation_state = -1; // 거절 상태
                  }

                  callback(null, result);
              }
          });
      }

      function resultJSON2(result, callback) {
          console.log(relation_state);
          var result_info = {
              "result": {
                  "message": "회원 검색에 성공하였습니다...",
                  "user": {"user_id": user_id},
                  "friends": {
                      "friend_id": result.friends.friend_id,
                      "friend_name": result.friends.friend_name,
                      "friend_photourl": result.friends.friend_photourl
                  },
                  "state": relation_state
              }
          };
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




router.get('/photos', function (req, res, next) {
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, 'uploads');
    form.encoding = 'utf-8';

});

module.exports = router;
