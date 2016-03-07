var express = require('express');
var router = express.Router();

// --- 5. 랭킹 보기 --- //
router.get('/', function (req, res, next) {
    res.json(
        {
            "result": {
                "message": "친구 랭킹보기에 성공하였습니다...",
                "rankfriends": [
                    {
                        "user_id": 27,
                        "user_name": "천우희",
                        "user_photourl": "/images/profile/woohee.jpg",
                        "hours": 300
                    },

                    {
                        "user_id": 21,
                        "user_name": "김별",
                        "user_photourl": "/images/profile/kimstar.jpg",
                        "hours": 200
                    }
                ]
            }
        }
    );
});

module.exports = router;