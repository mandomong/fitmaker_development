var express = require('express');
var async = require('async');
var router = express.Router();
var bcrypt = require('bcrypt');
var passport = require('passport');

router.post('/login', function(req, res, next){
    if(req.secure){
        passport.authenticate('local-login', function(err, user, info){
           if(err){
               next(err);
           } else if(!user){ //passwod가 다를 대는 user에 false가 넘어온다.
               var err = new Error('암호를 확인하시기 바랍니다.');
               err.status = 401;
               next(err);
           }else{
               req.logIn(user, function(err){
                  if(err){
                      var ERROR = {
                        "code": "E0002",
                        "message": "로그인에 실패하였습니다..."
                      };
                      next(ERROR);
                  } else{
                      res.json(user);
                  }
               }); //passport가 설치되면 req 객체에게 logIn이라는 함수를 쓸 수 있도록 연결해준다.

           }
        })(req,res,next);
    }else{
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

// logout을 위한 로그인 체크
function isLoggedIn2(req, res, next){

  if(!req.isAuthenticated()){
    var ERROR = {
      "code":"E0004",
      "message":"로그인 되어 있지않아 로그아웃에 실패하였습니다..."
    };
    next(ERROR);
  } else{
    next();
  }
}

router.post('/logout', isLoggedIn2, function (req, res, next) {

  req.logout();
  res.json({
    "message": "로그아웃 되었습니다..."
  });
});

router.get('/facebook', passport.authenticate('facebook', {"scope" : "email"}));
router.get('/facebook/callback', function(req,res,next){ //앱에서는 facebook token만 저장하기 때문에 콜백을 안 써도 된다.
  //콜백을 빼면 facebook_token...
  passport.authenticate('facebook', function(err, user, info){ // passport로부터 user객체 받아온다.
    if(err){
      next(err);
    } else if(!user) { //password가 다를 때는 user에 false가 넘어온다.
      var err = new Error('암호를 확인하시기 바랍니다.');
      err.status = 401;
      next(err);
    } else {
      req.logIn(user, function(err){
        if(err){
          next(err);
        } else {
          res.json(user);
        }
      }); // passport가 설치되면 req객체에게 logIn이라는 함수를 쓸 수 있도록 연결해준다.
    }
  })(req, res, next);
});

router.get('/facebook/token', function(req,res,next){
  //콜백을 빼고 facebook token이 되었다!

  if(req.secure)
  {

    passport.authenticate('facebook-token', function (err, user, info) { // passport로부터 user객체 받아온다.
      if (err) {
        next(err);
      } else {
        req.logIn(user, function (err) {
          if (err) {
            var ERROR = {
              "code": "E0003",
              "message": "페이스북 계정이 존재하지 않습니다..."
            };
            next(ERROR);
            next(err);
          } else {
            res.json(user);
          }
        }); // passport가 설치되면 req객체에게 logIn이라는 함수를 쓸 수 있도록 연결해준다.
      }
    })(req, res, next);
  }
});



module.exports = router;