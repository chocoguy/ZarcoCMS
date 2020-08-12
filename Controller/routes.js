const express = require('express');
const router = express.Router();
const controller = require('./controller.js');


//post routes
//a single post can hold plain text, images, yt video, and other stuff
router.route("/get-post/:id").get(controller.getPost);
router.route("/get-posts").get(controller.getPosts);
router.route("/upload-post").post(controller.uploadPost);
router.route("/edit-post/:id").put(controller.editPost);
router.route("/delete-post/:id").delete(controller.deletePost);
router.route("/upload-image").post(controller.uploadImage);
router.route("/comment/:id").post(controller.comment); //update done on DAO 

//routes relating to polls
//webmaster can create and edit polls, users can vote, polls are live between 1 hour to 7 days
router.route("/upload-poll").post(controller.uploadPoll);
router.route("/edit-poll/:id").put(controller.editPoll); //for put request combine get and put
router.route("/delete-poll/:id").delete(controller.deletePoll)
router.route("/poll-vote").post(controller.pollVote) //set cookie for poll indicating that the enduser has already voted on that poll
//comment

//routes so webmaster can login and logout
router.route("/login").post(controller.login);
router.route("/logout").post(controller.logout);
router.route("/register").post(controller.register);


//More routes can be added to expand functionality of CMS