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
            var sql = "SELECT user_id, user_name, email, password " +
              "FROM fitmakerdb.user " +
              "WHERE email=?";

            connection.query(sql, [email], function (err, results) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    //TODO: 5. 사용자가 요청한 username이 있는지 검사한다.
                    if (results.length === 0) {
                        var err = new Error('사용자가 존재하지 않습니다...');
                        callback(err); // 또는 callback(null, false).
                    } else {

                        var user = {
                            //"result":"로그인이 정상적으로 처리되었습니다",
                            "id": results[0].user_id,
                            "hashPassword": results[0].password
                        };
                        console.log(user.id + "번 회원이 로그인 하였습니다...");
                        callback(null, user);
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
                done(err);
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
        "profileFields" : ["id", "displayName", "eamil", "photos"]
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
            var sql = "SELECT user_id, facebook_id, facebook_email, facebook_username, facebook_photo " +
              "FROM user " +
              "WHERE facebook_id = ?";
            connection.query(sql, [profile.id], function (err, results){
                if(err){
                    connection.release();
                    callback(null);
                } else{
                    if(results.length === 0){
                        var insert = "INSERT INTO user (facebook_id, facebook_token, " +
                          "                  facebook_email, facebook_username, facebook_photo) " +
                          "VALUES (?,?,?,?,?)";

                        connection.query(insert, [profile.id, accessToken, profile.emails[0].value, profile.displayName,
                            profile.photos[0].value], function(err, result){
                            if(err){
                                connection.release();
                                callback(err);
                            }else{
                                connection.release();
                                var user = {
                                    "id" : reesult.insertId,
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
                            var update = "UPDATE firmakerdb.user " +
                              "SET facebook_token = ?, " +
                              "    facebook_email = ?, " +
                              "    facebook_username = ?, " +
                              "    facebook_photo = ? " +
                              "WHERE facebook_id = ?";
                            connection.query(update, [accessToken, profile.emails[0].value,
                                profile.displayName, profile.photos[0].value, profile.id], function(err, result){
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