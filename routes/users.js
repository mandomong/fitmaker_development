var express = require('express');
var bcrypt = require('bcrypt');
var async =require('async');

var router = express.Router();

function isLoggedIn(req, res, next){
    if(!req.session.userId){
        var err = new Error('로그인이 필요합니다...');
        err.status = 401;
        next(err);
    } else{
        next();
    }
}



// --- 6. 회원 가입 --- //
router.post('/', function (req, res, next) {

    //var username = req.body.username;
    //var email = req.body.email;
    //var password = req.body.password;
    //var birthday = req.body.birthday;
    //
    ////1 . salt generation
    //function generateSalt(callback){
    //    var rounds = 10;
    //    bcrypt.genSalt(rounds, function(err, salt){
    //       if(err){
    //           console.log("salt error...");
    //           callback(err);
    //       }else{
    //           callback(null, salt);
    //       }
    //    });
    //}
    //
    //// 2. hash password generation
    //function generateHashPassword(salt, callback){
    //    bcrypt.hash(password, salt, function(err, hashPassword){
    //       if(err){
    //           console.log("hesh error...");
    //           callback(err);
    //       } else{
    //           callback(null, hashPassword);
    //       }
    //    });
    //}
    //
    //// 3. get connection
    //function getConnection(hashPassword, callback){
    //    pool.getConnection(function(err, connection){
    //        if(err){
    //            console.log("connection error...");
    //            callback(err);
    //        }else{
    //            callback(null, connection, hashPassword);
    //        }
    //    });
    //}
    //
    //// 4. DB insert
    //function insertMember(connection, hashPassword, callback) {
    //    var sql = "insert into "
    //}



    res.json({
        "message": "회원가입이 정상적으로 처리되었습니다..."
    });

});

// --- 7. facebook 로그인 --- //
router.get('/facebook', function (req, res, nex) {

    res.json({
        "message": "페이스북 로그인이 정상적으로 처리되었습니다."
    });

});

// --- 8. 마이페이지 --- //
router.route('/me')

    .get(function (req, res, next) {

                if (req.secure) {
                    //var user = req.user;

                    res.json({
                        "result": {
                            "message": "마이페이지가 정상적으로 조회되었습니다...",
                            "user_name": "천우희",
                            "user_photourl": "/images/profile/woohee.jpg",
                            "badge_Cnt": 3,
                            "hours": 300,
                            "exctype_name": "발레리나 타입",
                            "project_history": [{"project_id": 1, "name": "비키니 프로젝트!", "ing": true},
                                {"project_id": 2, "name": "힙업 삼주완성!", "ing": false},
                                {"project_id": 3, "name": "해범이 만들기!", "ing": true}],
                            "badges": [{
                                "badge_name": "출석왕",
                                "badge_photourl": "/images/badge/first.jpg",
                                "own_badge": true
                            },
                                {
                                    "badge_name": "에스라인마스터",
                                    "badge_photourl": "/images/badge/second.jpg",
                                    "own_badge": true
                                }]
                        }
                    });


                } else {
                    var err = new Error('SSL/TLS Upgrade Required');
                    err.status = 426;
                    next(err);
                }

    })

    // --- 9. 프로필사진변경 --- //

    .put(function (req, res, next) {

                res.json({
                    "message": "프로필 사진이 성공적으로 변경되었습니다"
                });

    });

// --- 10. 친구 프로필 보기 --- //
router.get('/5', function (req, res, next) {

    if (req.secure) {
        res.json({
            "result": {
                "message": "친구프로필 페이지가 정상적으로 조회되었습니다...",
                "user_name": "장한솔",
                "user_photourl": "/images/profile/jang.jpg",
                "badge_Cnt": 5,
                "hours": 250,
                "exctype_name": "헬스 타입",
                "project_history": [{"project_id": 1, "name": "비키니 프로젝트!", "ing": true},
                    {"project_id": 2, "name": "힙업 삼주완성!", "ing": false},
                    {"project_id": 3, "name": "해범이 만들기!", "ing": true}],
                "badges": [{"badge_name": "출석왕", "badge_photourl": "/images/badge/first.jpg", "own_badge": true},
                    {"badge_name": "에스라인마스터", "badge_photourl": "/images/badge/sline.jpg", "own_badge": true}]
            }
        });
    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }

});

router.get('/photos', function (req, res, next) {
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, 'uploads');
    form.encoding = 'utf-8';

});

module.exports = router;
