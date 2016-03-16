
//혜민
//module.exports = {
//  "key" : "AKIAI3YRT6JL6XDKFT4Q",
//  "secret" : "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",
//  "region" : "ap-northeast-2",
//  "bucket" : "fitmakerbucket",
//  "imageDir" : "test",
//  "imageprofileDir" : "profile",
//  "imageACL" : "public-read",
//};

//한솔
module.exports = {
  "key": process.env.FITMAKER_S3_KEY,
  "secret": process.env.FITMAKER_S3_SECRET,
  //"key" : "AKIAI5ZI3CVOYY4J2ZTA",
  //"secret" : "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",
  "region" : "ap-northeast-2",
  "bucket" : "fitmakerhansol",
  "imageDir" : "test",
  "imageprofileDir" : "profile",
  "imageACL" : "public-read"
};