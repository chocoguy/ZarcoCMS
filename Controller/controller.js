const DAO = require("./DAO.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// AUTH

const hashpassword = async password => await bcrypt.hash(password, 10)

class User {
    constructor({ name, email, password, isadmin, ismod = {} } = {}) {
        this.name = name
        this.email = email
        this.password = password
        this.isadmin = isadmin
        this.ismod = ismod
    }
    toJson() {
        return { name: this.name, email: this.email, }
    }
    async comparePassword(plainText) {
        return await bcrypt.compare(plainText, this.password)
    }
    encoded() {
        return jwt.sign(
            {
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
                ...this.toJson(),
            },
            process.env.JWT_SECRET
        )
    }
    static async decoded(userJwt) {
        return jwt.verify(userJwt, process.env.JWT_SECRET, (error, res) => {
            if (error) {
                return { error }
            }
            return new User(res)
        })
    }
}


class controller {

    //!---------------------------------------------------------Only admin can add admins or mods-----------------------------------------------------
    //ismod: true, isadmin: true



    static async checkuser(req, res) {
        try {
            if (req.get("Authorization") == null) {
                res.status(401).json({ "msg": "Unauthorized, Incident will be reported" })
                return
            }
            const userJWT = req.get("Authorization").slice("Bearer ".length)
            const user = await User.decoded(userJWT)
            var { error } = user
            if (error) {
                res.status(401).json({ "msg": "Unauthorized, Incident will be reported" })
                return
            }
            return true
        } catch (error) {
            res.status(500).json({ "msg": error })
            console.error(error)
        }
    }




    static async register(req, res) {
        try {
            //Remove when creating FIRST user. FIRST user must be an admin
            //if (this.checkuser(req, res) != true) {
            //    res.status(401).json({ "msg": "Unauthorized. Incident will be reported" })
            //    return
            //}

            //let status = await DAO.getAdmin(user.email)
            //if (!status) {
            //    res.status(401).json({ "msg": "Unauthorized, Only admin role can create users" })
            //    return
            //}
            //--------------------------------


            const userFromBody = req.body
            let errors = {}

            if (Object.keys(errors).length > 0) {
                res.status(400).json({ "msg": error })
                console.error(error)
                return
            }

            const userInfo = {
                ...userFromBody,
                password: await hashpassword(userFromBody.password)
            }

            const insertResult = await DAO.addUser(userInfo)
            if (!insertResult.success) {
                console.error("Error while registering")
                res.status(400).json({ "msg": error })
                return
            }

            const userFromDB = await DAO.getUser(userFromBody.email)
            if (!userFromDB) {
                console.error("Error while getting registed user")
                res.status(400).json({ "msg": error })
                return
            }

            if (Object.keys(errors).length > 0) {
                res.status(400).json({ "msg": error })
                console.error(error)
                return
            }

            const user = new User(userFromDB)

            res.json({ auth_token: user.encoded(), info: user.toJson() })

        } catch (error) {
            res.status(500).json({ "msg": error })
            console.error(error)
        }
    }


    static async login(req, res, next) {
        try {

            const { email, password } = req.body
            if (!email || typeof email !== "string") {
                res.status(400).json({ "msg": "Bad email, string expected" })
                return
            }
            if (!password || typeof password !== "string") {
                res.status(400).json({ "msg": "Bad password, string expected" })
                return
            }
            let userdata = await DAO.getUser(email)
            if (!userdata) {
                res.status(401).json({ "msg": "Wrong credentials" })
                return
            }
            const user = new User(userData)

            if (!(await user.comparePassword(password))) {
                res.status(401).json({ "msg": "Wrong credentials" })
                return
            }

            const loginResponse = await DAO.loginUser(user.email, user.encoded())
            if (!loginResponse.success) {
                res.status(500).json({ "msg": loginResponse.error })
                console.error(loginResponse.error)
                return
            }

            res.json({ auth_token: user.encoded(), info: user.toJson })

        } catch (error) {
            res.status(400).json({ "msg": error })
            console.error(error)
            return
        }
    }

    static async logout(req, res) {
        try {
            const userJwt = req.get("Authorization").slice("Bearer ".length)
            const userObj = await User.decoded(userJwt)
            var { error } = userObj
            if (error) {
                res.status(401).json({ "msg": error })
                console.error(error)
                return
            }

            const logoutResult = await DAO.logoutUser(userObj.email)
            var { error } = logoutResult
            if (error) {
                res.status(500).json({ "msg": error })
                console.error(error)
                return
            }

            res.json(logoutResult)
        } catch (error) {
            res.status(500).json({ "msg": error })
            console.error(error)
        }
    }




    static async getPosts(req, res) {
        try {
            postsPerPage = 1000;
            const { postsList, totalNumPosts } = await DAO.getPosts();
            let response = {
                posts: postsList,
                page: 0,
                entries_per_page: postsPerPage,
                total_results: totalNumPosts,
            }
            res.json(response);
        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error);
        }
    }


    static async getPost(req, res) {
        try {
            let id = req.params.id;
            let result = await DAO.getPostById(id);
            if (!result) {
                res.status(404).json({ error: 'Not found' })
                return
            }
            res.json(result);
        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error);
        }
    }

    static async uploadPost(req, res) {
        try {
            if (this.checkuser(req, res) != true) {
                res.status(401).json({ "msg": "Unauthorized. Incident will be reported" })
                return
            }

            const { title, content, video, color1, color2 } = req.body;

            let post = await DAO.uploadPost(title, content, video, color1, color2)
            if (!post) {
                res.status(400).json({ "msg": "Error when posting" })
                return
            }

            res.json({ "msg": "Post has been posted" })


        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error)
        }
    }


    static async editPost(req, res) {
        try {
            let id = req.params.id;
            if (this.checkuser(req, res) != true) {
                res.status(401).json({ "msg": "Unauthorized. Incident will be reported" })
                return
            }

            const { title, content, video, color1, color2, date } = req.body;

            let update = await DAO.editPost(id, title, content, video, color1, color2)
            if (!update) {
                res.status(400).json({ "msg": "Error when updating" })
                return
            }

            res.json({ "msg": "Post has been updated" })


        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error)
        }



    }


    static async deletePost(req, res) {
        try {
            let id = req.params.id;
            if (this.checkuser(req, res) != true) {
                res.status(401).json({ "msg": "Unathorized. Incident will be reported" })
                return
            }

            let delete2 = await DAO.deletePost(id)
            if (!delete2) {
                res.status(400).json({ "msg": "error when deleteing" })
                return
            }

            res.json({ "msg" : "Post has been deleted" })


        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error)
        }
    }


    static async comment(req, res) {
        try {
            let id = req.params.id;
            const { comment} = req.body;
            let comment1 = DAO.comment(id, comment);
            if (!comment1) {
                res.status(400).json({ "msg": "Error when commenting" })
                return 
            }

            res.json({ "msg" : "Comment has been uploaded" })

        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error)
        }
    }

    static async uploadPoll(req, res) {
        try {
            if (this.checkuser(req, res) != true) {
                res.status(401).json({ "msg": "Unathorized. Incident will be reported" })
                return
            }
            const { pollName, desc, op1, op2, op3, op4 } = req.params;
            let poll1 = DAO.uploadPoll(pollName, desc, op1, op2, op3, op4);
            if (!poll1) {
                res.status(400).json({ "msg": "Error when uploading poll" })
                return
            }

            res.json({ "msg" : "Poll has been uploaded!"})

        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error);
        }
    }

    static async deletePoll(req, res) {
        try {
            let id = req.params.id;
            if (this.checkuser(req, res) != true) {
                res.status(401).json({ "msg": "Unathorized. Incident will be reported" })
                return
            }
            let deletepoll1 = DAO.deletePoll(id);
            if (!deletepoll1) {
                res.status(400).json({ "msg": "error when deleting poll" })
                return
            }

            res.json({ "msg" : "Poll has been deleted!" })

        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error);
        }
    }

    static async pollVote(req, res) {
        try {
            let id = req.params.id;
            const { option } = req.params;
            let pollVote = pollVote(id, option);
            if (!pollVote) {
                res.status(400).json({ "msg": "error when voting" })
                return
            }

            res.json({ "msg": "Poll has been deleted!" })


        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error);
        }
    }

    static async getPolls(req, res) {
        try {
            pollsPerPage = 1000;
            const { pollsList, totalNumPolls } = await DAO.getPolls();
            let response = {
                posts: postsList,
                page: 0,
                entries_per_page: postsPerPage,
                total_results: totalNumPosts,
            }
            res.json(response);

        } catch (error) {
            res.status(500).json({ "msg": error });
            console.error(error);
        }
    }


}

module.exports = controller