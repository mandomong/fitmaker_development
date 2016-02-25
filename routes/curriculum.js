/**
 * Created by skplanet on 2016-02-23.
 */
var express = require('express');
var router = express.Router();

// --- 1. 운동타입 및 커리큘럼 추천 --- //
router.get('/', function (req, res, next) {

    res.json({
        "result": {
            "exctype": {
                "message": "운동타입 페이지 요청에 성공하였습니다",
                "exctype_name": "발레리나 타입",
                "exctype_info": "당신은 유연하고 아름다운 선을 바라시는 타입이군요! 그런 당신에게 이 운동을 추천해 드립니다.",
                "exctype_photourl": "/images/exctype/bal.jpg"
            },
            "curriculum": [
                {
                    "curri_id": 1,
                    "curri_name": "다리 라인이 빛나는 요가 피트니스",
                    "curri_photourl": "/images/curriculum/yoga.jpg",
                    "curri_info": "힙업커리큘럼은 다음과 같이 구성되어 있으며..."
                },

                {
                    "curri_id": 2,
                    "curri_name": "허벅지, 종아리살을 빼주는 마일리 사일러스 운동법",
                    "curri_photourl": "/images/curriculum/mile.jpg",
                    "curri_info": "마일리 운동은 다음과 같이 구성되어 있으며..."
                }
            ]
        }

    });
});

module.exports = router;