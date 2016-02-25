var express = require('express');
var router = express.Router();

// --- 2. 프로젝트 생성 --- //
router.post('/', function (req, res, next) {

    res.json({
        "result": {
            "message": "프로젝트를 생성 하는데 성공하였습니다.",
            "project_id": 3
        }

    });
});


// --- 3. 프로젝트 메인 --- //
router.get('/1', function (req, res, next) {

    res.json({
        "result": {
            "message": "프로젝트 페이지 요청에 성공하였습니다",
            "location": 3,
            "courses": [
                {
                    "course_id": 1,
                    "contents": [
                        {
                            "content_id": 15,
                            "contents_name": "스쿼트",
                            "contents_type": "반복운동",
                            "contents_time": null,
                            "contents_count": 5,
                            "contents_set": 3,
                            "contents_url": "http://youtube.com/2Keidkxmdl",
                            "contents_seq": 3,
                            "contents_target": "엉덩이",
                            "contents_info": "스쿼트란 굴술운동이란 뜻이며, 일반적으로는 … ",
                            "contents_notice": "무릎이 발 바깥쪽으로 나가지 않도록 주의합니다.",
                            "contents_voiceurl":"/voice/1.mp3"
                        },

                        {
                            "content_id": 16,
                            "contents_name": "런지",
                            "contents_type": "반복운동",
                            "contents_time": null,
                            "contents_count": 5,
                            "contents_set": 3,
                            "contents_url": "http://youtube.com/2Keidkxmdl",
                            "contents_seq": 3,
                            "contents_target": "엉덩이",
                            "contents_info": "스쿼트란 굴술운동이란 뜻이며, 일반적으로는 … ",
                            "contents_notice": "무릎이 발 바깥쪽으로 나가지 않도록 주의합니다.",
                            "contents_voiceurl":"/voice/2.mp3"
                        }
                    ]
                },
                {
                    "course_id": 2,
                    "contents": [
                        {
                            "content_id": 17,
                            "contents_name": "스쿼트",
                            "contents_type": "반복운동",
                            "contents_time": null,
                            "contents_count": 5,
                            "contents_set": 3,
                            "contents_url": "http://youtube.com/2Keidkxmdl",
                            "contents_seq": 3,
                            "contents_target": "엉덩이",
                            "contents_info": "스쿼트란 굴술운동이란 뜻이며, 일반적으로는 …",
                            "contents_notice": "무릎이 발 바깥쪽으로 나가지 않도록 주의합니다.",
                            "contents_voiceurl":"/voice/3.mp3"
                        },

                        {
                            "content_id": 18,
                            "contents_name": "스쿼트",
                            "contents_type": "반복운동",
                            "contents_time": null,
                            "contents_count": 5,
                            "contents_set": 3,
                            "contents_url": "http://youtube.com/2Keidkxmdl",
                            "contents_seq": 3,
                            "contents_target": "엉덩이",
                            "contents_info": "스쿼트란 굴술운동이란 뜻이며, 일반적으로는 …",
                            "contents_notice": "무릎이 발 바깥쪽으로 나가지 않도록 주의합니다.",
                            "contents_voiceurl":"/voice/4.mp3"
                        }
                    ]
                }
            ],
            "badeges": [
                {
                    "badge_name": "첫 걸음마 달성",
                    "badge_date": "2016-02-20",
                    "badge_location": 2
                },

                {
                    "badge_name": "100시간 돌파",
                    "badge_date": "2016-02-26",
                    "badge_location": 6
                }
            ]
        }

    });
});

// --- 11. 참여중인 프로젝트 --- //
router.get('/', function(req, res, next) {

    res.json({
        "message" : "참여중인 프로젝트 조회 요청에 성공하였습니다...",
        "project_history" :[{"project_id":1, "name":"비키니 프로젝트!"},
            {"project_id":2, "name":"힙업 삼주완성"}]
    });

});

module.exports = router;