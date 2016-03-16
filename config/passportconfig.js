var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var FacebookTokenStrategy = require('passport-facebook-token');
var bcrypt = require('bcrypt');
var async = require('async');
var authConfig = require('./facebookconfig');

module.exports = function(passport) {

    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) { // 사용자 프로필 등 사용자의 정보가 필요할 때 호출
        //var user = findUser(id); // 사용자 정보찾기
        pool.getConnection(function (err, connection) {
            if (err) {
                done(err);
            } else {
                var sql = "SELECT user_id, user_name, email, user_photourl, " +
                  "facebook_id, facebook_email, facebook_username, facebook_photo " +
                  "FROM fitmakerdb.user " +
                  "WHERE user_id = ?";

                connection.query(sql, [id], function (err, results) { //select일 경우 results에 rows와 fields 정보가 넘어온다. results 는 배열이다.
                    connection.release();
                    if (err) {
                        done(err);
                    } else {
                        var user = { // results로부터 가져온다.
                            "id": results[0].user_id,
                            "username": results[0].user_name,
                            "email": results[0].email,
                            "photourl" : results[0].user_photourl //사진 경로를 넣는다면 이런 식으로 넣자...
                        };
                        done(null, user);
                    }
                });
            }
        });
    });

    passport.use('local-login', new LocalStrategy({ // 로그인할 때 사용하겠다
        usernameField: "email",//email을 id로 사용
        passwordField: "password",
        passReqToCallback: true //false일 경우 다음 함수의 req를 받지 않는다.

    }, function (req, email, password, done) {

        // registration_id : 안드로이드 기기 토큰 받아오기
        var registration_token = req.body.registration_token;

        function getConnection(callback) {
            //pool에서 connection 얻어오기.
            pool.getConnection(function (err, connection) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, connection);
                }
            });
        }

        function selectUser(connection, callback) {
            // DB에서 username과 관련딘 id와 password를 조회하는 쿼리를 작성한다.
            var sql = "SELECT user_id, user_name, email, password, registration_token " +
              "FROM fitmakerdb.user " +
              "WHERE email=?";

            connection.query(sql, [email], function (err, results) {

                if (err) {
                    connection.release();
                    callback(err);
                } else {

                    //사용자가 요청한 username이 있는지 검사한다.
                    if (results.length === 0) {
                        connection.release();
                        callback(err); // 또는 callback(null, false).
                    } else {
                        //회원이나 registration_token이 없을때
                        if(results[0].registration_token == null && registration_token != undefined){
                            var sql2 = "update user " +
                                       "set registration_token = ? " +
                                       "where user_id = ?";

                            connection.query(sql2, [registration_token, results[0].user_id], function(err, update_result){
                                connection.release();
                                if(err){
                                    console.log("registration_token 업데이트에 실패하였습니다");
                                    callback(err);
                                }else{
                                    // callback(null);
                                    var user = {
                                        //"result":"로그인이 정상적으로 처리되었습니다",
                                        "id": results[0].user_id,
                                        "hashPassword": results[0].password
                                    };
                                    console.log(user.id + "번 회원이 로그인 하였습니다...");
                                    callback(null, user);

                                }
                            });

                        }else{
                            //회원이면서 registration_token이 있을때 기존의 registration_token과 다르면
                            if(results[0].registration_token != registration_token && registration_token != undefined){
                                var sql3 = "update user " +
                                  "set registration_token = ? " +
                                  "where user_id = ?";

                                connection.query(sql3, [registration_token, results[0].user_id], function(err, update_token){
                                    connection.release();
                                    if(err){
                                        console.log("registration_token 업데이트에 실패하였습니다");
                                        callback(err);
                                    }else{
                                        var user = {
                                            //"result":"로그인이 정상적으로 처리되었습니다",
                                            "id": results[0].user_id,
                                            "hashPassword": results[0].password,
                                        };
                                        console.log(user.id + "번 회원이 로그인 하였습니다...");
                                        callback(null, user);
                                    }
                                });
                            }else{
                                connection.release();
                                var user = {
                                    //"result":"로그인이 정상적으로 처리되었습니다",
                                    "id": results[0].user_id,
                                    "hashPassword": results[0].password
                                };
                                console.log(user.id + "번 회원이 로그인 하였습니다...");
                                callback(null, user);

                            }

                        }
                    }
                }
            });
        }

        function compareUserInput(user, callback) {
            bcrypt.compare(password, user.hashPassword, function (err, result) { // 해시 전 패스워드 다음에 해시 후 패스워드가 와야 한다. 순서 중요
                if (err) {
                    callback(err);
                } else {
                    if (result) { //true
                        callback(null, user);
                    } else { //false
                        callback(null, false); //비밀번호가 틀렸을 때
                    }
                }
            });
        }

        // task 수행 간 결과를 입력으로 전달하는 구조를 지원
        async.waterfall([getConnection, selectUser, compareUserInput], function (err, user) {
            if (err) {
                var ERROR = {
                    "code":"E0001",
                    "message":"로그인에 실패하였습니다..."
                };
                done(ERROR);
            } else {
                //user 객체에서 password와 hash를 빼서 보내줘야 한다. 보안상 문제가 되기 때문에
                delete user.hashPassword;
                user.message = "로그인이 정상적으로 처리되었습니다...";
                done(null, user);
            }
        });
    }));



    passport.use('facebook', new FacebookStrategy({
        "clientID" : authConfig.facebook.appId,
        "clientSecret" : authConfig.facebook.appSecret,
        "callbackURL" : authConfig.facebook.callbackURL,
        "profileFields" : ["id", "displayName", "email", "photos"]
    }, function(accessToken, refreshToken, profile, done){

        function getConnection(callback){
            pool.getConnection(function (err, connection){
                if(err){
                    callback(err);
                }else{
                    callback(null, connection);
                }
            });
        }

        function selectOrCreateUser(connection, callback){
            //DB에서 username과 관련된 id와 password를 조회하는 쿼리를 작성한다.
            var sql = "SELECT user_id, facebook_id, facebook_email, facebook_username, facebook_photo " +
              "FROM fitmakerdb.user " +
              "WHERE facebook_id = ?";
            connection.query(sql, [profile.id], function(err, results){
                if(err){
                    connection.release();
                    callback(err);
                }else{
                    if(results.length === 0){
                        var insert = "INSERT INTO fitmakerdb.user (facebook_id, facebook_token, " +
                          "                  facebook_email, facebook_username, facebook_photo) " +
                          "VALUES (?,?,?,?,?)";
                        connection.query(insert, [profile.id, accessToken, profile.emails[0].value,
                            profile.displayName,profile.photos[0].value],function(err, result){
                            if(err){
                                connection.release();
                                callback(err);
                            }else{
                                connection.release();
                                var user = {
                                    "id" : result.insertId,
                                    "facebookId" : profile.id,
                                    "facebookEmail" : profile.emails[0].value,
                                    "facebookName" : profile.displayName,
                                    "facebookPhoto" : profile.photos[0].value
                                };
                                callback(null, user);
                            }
                        });
                    }else{
                        if(accessToken === results[0].facebook_token){
                            connection.release();
                            var user = {
                                "id" : results[0].id,
                                "facebookId" : results[0].facebook_id,
                                "facebookEmail" : results[0].facebook_email,
                                "facebookName" : results[0].facebook_username,
                                "facebookPhoto" : results[0].facebook_photo
                            };
                            callback(null, user);
                        }else{
                            var update = "UPDATE fitmakerdb.user " +
                              "SET facebook_token = ?, " +
                              "    facebook_email = ?, " +
                              "    facebook_username = ?, " +
                              "    facebook_photo = ? " +
                              "WHERE facebook_id = ?";

                            connection.query(update, [accessToken, profile.emails[0].value,
                                profile.displayName, profile.photos[0].value, profile.id],function(err, result){
                                connection.release();
                                if(err){
                                    callback(err);
                                }else{
                                    var user = {
                                        "id" : results[0].id,
                                        "facebookId" : profile.id,
                                        "facebookEmail" : profile.emails[0].value,
                                        "facebookName" : profile.displayName,
                                        "facebookPhoto" : profile.photos[0].value
                                    };
                                    callback(null, user);
                                }
                            });
                        }
                    }
                }
            });
        }

        async.waterfall([getConnection, selectOrCreateUser], function(err, user){
            if (err){
                done(err);
            }else{
                done(null, user);
            }
        });
    }));

    passport.use('facebook-token', new FacebookTokenStrategy({
        "clientID" : authConfig.facebook.appId,
        "clientSecret" : authConfig.facebook.appSecret,
        "profileFields" : ["id", "displayName", "email", "photos"],
        "passReqToCallback" : true //req.body.registration_id
    }, function(req, accessToken, refreshToken, profile, done){


        var registration_token = req.body.registration_token;
        //console.log(registration_token);
        console.log(profile);

        function getConnection(callback){
            pool.getConnection(function (err, connection){

                if(err){
                    callback(err);
                }else{
                    callback(null, connection);
                }
            });
        }

        function selectOrCreateUser(connection, callback){

            var sql = "SELECT user_id, facebook_id, email, user_name, user_photourl, facebook_token, registration_token " +
              "FROM user " +
              "WHERE facebook_id = ?";
            connection.query(sql, [profile.id], function (err, results){
                if(err){
                    connection.release();
                    callback(null);
                } else{

                    if(results.length != 0) {
                        // registration_token 유효성 검사
                        if (registration_token == undefined) {
                            if (results[0].registration_token != null) {
                                registration_token = results[0].registration_token;
                            } else {
                                registration_token = null;
                            }
                        } else {
                            if (registration_token != results[0].registration_token) {
                                registration_token = registration_token;
                            }
                        }
                    }

                    if(results.length === 0){



                        var insert = "INSERT INTO user (facebook_id, facebook_token, " +
                          "                  email, user_name, user_photourl, registration_token) " +
                          "VALUES (?,?,?,?,?,?)";

                        connection.query(insert, [profile.id, accessToken, profile.emails[0].value, profile.displayName,
                            profile.photos[0].value, registration_token], function(err, result){
                            if(err){
                                connection.release();
                                callback(err);
                            }else{
                                connection.release();
                                var user = {
                                    "id" : result.insertId,
                                    "facebookId" : profile.id,
                                    "facebookEmail" : profile.emails[0].value,
                                    "facebookName" : profile.displayName,
                                    "facebookPhoto" : profile.photos[0].value
                                };
                                callback(null, user);
                            }
                        });
                    } else {


                        //DB에 사용자정보가 있으며 DB의 facebook 토큰과 안드로이드로 부터 받은 facebook 토큰이 같을때
                        if(accessToken === results[0].facebook_token){


                            // 사용자가 registration_token 을 갖고있지 않을때
                            if(results[0].registration_token == null){
                                var addRegistration_token = "UPDATE fitmakerdb.user " +
                                "SET registration_token = ? " +
                                "WHERE user_id = ?";

                                connection.query(addRegistration_token, [registration_token, results[0].user_id], function(err, result){
                                   if(err){
                                       callback(err);
                                   } else{

                                       connection.release();
                                       var user = {
                                           "id" : results[0].user_id,
                                           "facebookId" : results[0].facebook_id,
                                           "facebookEmail" : results[0].email,
                                           "facebookName" : results[0].user_name,
                                           "facebookPhoto" : results[0].user_photourl
                                       };
                                       callback(null, user);

                                   }
                                });
                            }else if(results[0].registration_token != registration_token){
                                var addRegistration_token = "UPDATE fitmakerdb.user " +
                                  "SET registration_token = ? " +
                                  "WHERE user_id = ?";

                                connection.query(addRegistration_token, [registration_token, results[0].user_id], function(err, result){
                                    if(err){
                                        callback(err);
                                    } else{

                                        connection.release();
                                        var user = {
                                            "id" : results[0].user_id,
                                            "facebookId" : results[0].facebook_id,
                                            "facebookEmail" : results[0].email,
                                            "facebookName" : results[0].user_name,
                                            "facebookPhoto" : results[0].user_photourl
                                        };
                                        callback(null, user);

                                    }
                                });
                            }
                            var user = {
                                "id" : results[0].user_id,
                                "facebookId" : results[0].facebook_id,
                                "facebookEmail" : results[0].email,
                                "facebookName" : results[0].user_name,
                                "facebookPhoto" : results[0].user_photourl
                            };
                            callback(null, user);


                        }else{

                            var update = "UPDATE fitmakerdb.user " +
                              "SET facebook_token = ?, " +
                              "    email = ?, " +
                              "    user_name = ?, " +
                              "    user_photourl = ?, " +
                              "    registration_token = ? " +
                              "WHERE user_id = ?";

                            //profile.id
                            connection.query(update, [accessToken, profile.emails[0].value,
                                profile.displayName, profile.photos[0].value, registration_token, results[0].user_id], function(err, result){


                                connection.release();
                                if(err){
                                    callback(err);
                                }else{

                                    var user = {
                                        "id" : results[0].id,
                                        "facebookId" : profile.id,
                                        "facebookEmail" : profile.emails[0].value,
                                        "facebookName" : profile.displayName,
                                        "facebookPhoto" : profile.photos[0].value
                                    };

                                    callback(null, user);
                                }
                            });
                        }
                    }

                }
            });
        }

        async.waterfall([getConnection, selectOrCreateUser],function(err, user){
            if(err){
                done(err);
            }else{
                done(null, user);
            }
        });
    }));
};