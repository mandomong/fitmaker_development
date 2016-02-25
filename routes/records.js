/**
 * Created by skplanet on 2016-02-23.
 */
var express = require('express');
var router = express.Router();


// --- 4. 운동기록 --- //

router.post('/', function (req, res, next) {

    res.json(
        {
            "result": {
                "message": "운동기록에 성공하였습니다",
                "badge_id" : 1
            }


        });
});

module.exports = router;