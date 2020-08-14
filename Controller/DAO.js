const ObjectId = require("bson")
const moment = require(moment);
let posts
let zarcocms
let polls
let users
let sessions

const DEFAULT_SORT = [["date", -1]]

class DAO {
    static async injectDB(conn) {
        if (posts) {
            return
        }
        try {
            zarcocms = await conn.db(process.env.DB_NAME)
            posts = await conn.db(process.env.DB_NAME).collection("posts")
            polls = await conn.db(process.env.DB_NAME).collection("polls")
            users = await conn.db(process.env.DB_NAME).collection("users")
            sessions = await conn.db(process.env.DB_NAME).collection("sessions")
        } catch (error) {
            console.error(`Connection not established ${error}`)
        }
    }

    //AUTH

    static async addUser(userInfo) {
        try {
            await users.insertOne({ name: userInfo.name, email: userInfo.email, password: userInfo.password })
            return { success: true }

        } catch (error) {
            if (String(error).startsWith("MongoError: E11000 duplicate key error")) {
                return { error: "user with given mail already exists" }
            }
            console.error(`Error while adding new user, ${error}.`)
            return { "error": error }
        }
    }

    static async getUser(email) {
        return await users.findOne({ email: email })
    }

    static async getMod(email) {
        return await users.findOne({ email: email, isMod: "true" })
    }

    static async getAdmin(email) {
        return await users.findOne({ email: email, isAdmin: "true" })
    }

    static async check(jwt) {
        try {
            return await sessions.findOne({ "jwt": jwt })
        } catch (error) {
            console.log(error)
        }
    }

    static async loginUser(email, jwt) {
        try {
            await sessions.updateOne(
                { user_id: email },
                { $set: { jwt: jwt } },
                { upsert: true }
            )
            return { success: true }
        } catch (error) {
            console.error(`Error logging in ${error}`)
            return { error: error }
        }
    }

    static async logoutUser(email) {
        try {
            await sessions.deleteOne({ user_id: email })
            return { success: true }
        } catch (error) {
            console.error(`Error while logging out ${error}`)
            return { error: error }
        }
    }


    static async getPosts({
        filters = null,
        page = 0,
        postsPerPage = 1000,
    } = {}) {
        let queryParams = {}
        if (filters) {
            if ("text" in filters) {
                queryParams = this.textSearchQuery(filters["text"])
            }
        }

        let { query = {}, project = {}, sort = DEFAULT_SORT } = queryParams
        let cursor
        try {
            cursor = await posts
                .find(query)
                .project(project)
                .sort(sort)
        } catch (error) {
            console.error(`Unable to issue find command ${error}`)
            return { postsList: [], totalNumPosts: 0 }
        }
        const displayCursor = cursor.skip(postsPerPage * page).limit(postsPerPage)
        try {
            const postsList = await displayCursor.toArray()
            const totalNumPosts = page === 0 ? await posts.countDocuments(query) : 0
            return { postsList, totalNumPosts }
        } catch (error) {
            console.error(`Unable to convert cursor array ${error}`)
            return { postsList: [], totalNumPosts: 0 }
        }

    }



    static async getPostById(id) {
        try {
            return await posts.findOne({ id: id })

        } catch (error) {
            console.error(error)
            throw (error)
        }
    }

    static async uploadPost(title, content, video, color1, color2, date) {
        try {
            await posts.insertOne({
                "id": `${Math.floor(Math.random() * Math.floor(10000000)) }`,
                "title": title,
                "content": content,
                "video": video,
                "color1": color1,
                "color2": color2,
                "date": moment().format('MMM Do YY'),
                "edited": false,
                "comments": {
                    "First" : "First comment"
                }
            })
            return { success: true }

        } catch (error) {
            console.error(`Error ${error}`)
            return { error: error }
        }
    }

    static async editPost(id, title, content, video, color1, color2, date) {
        try {
            await posts.updateOne({ id: id }, {
                $set: {
                    "title": title,
                    "content": content,
                    "video": video,
                    "color1": color1,
                    "color2": color2,
                    "date": moment().format('MMM Do YY'),
                    "date": true
                }
            })
            return { success: true }

        } catch (error) {
            Console.error(`Error ${error}`)
            return { error:error }
        }
    }

    static async deletePost(id) {
        try {
            await posts.deleteOne({ "id": id })

            return { success : true }

        } catch (error) {
            Console.error(`Error ${error}`)
            return { error : error }
        }
    }

    static async comment(id, comment) {
        try {
            await posts.update(
                { id: id },
                { $push: { comments : comment } }
            )
            return { success : true }


        } catch (error) {
            Console.error(`Error ${error}`)
            return { error:error }
        }
    }

    static async uploadPoll (pollName, desc, op1, op2, op3, op4) {
        try {
            await polls.insertOne({
                id: `${Math.floor(Math.random() * Math.floor(10000000))}`,
                pollName: pollName,
                desc: desc,
                option1: op1,
                option1_votes: [],
                option2: op2,
                option2_votes: [],
                option3: op3,
                option3_votes: [],
                option4: op4,
                option4_votes: [],
                "date": moment().format('MMM Do YY'),
            })

            return { success : true }

        } catch (error) {
            Console.error(`Error ${error}`)
            return { error : error }
        }
    }

    static async deletePoll (id) {
        try {
            await polls.deleteOne({ "id": id })

            return { success : true } 

        } catch (error) {
            Console.error(`Error ${error}`)
            return { error : error }
        }
    }

    static async pollVote(id, option) {
        try {
            let choice
            switch (option) {
                case "op1":
                    choice = option1_votes;
                    break;
                case "op2":
                    choice = option2_votes;
                    break;
                case "op3":
                    choice = option3_votes;
                    break;
                case "op4":
                    choice = option4_votes;
                    break;
                default:
                    choice = option1_votes;
                    break;
            }

            await polls.update(
                { id: id },
                { $push: {choice: "vote" } }
            )


        } catch (error) {
            Console.error(`Error ${error}`)
            return { error : error }
        }
    }


    static async getPolls({
        filters = null,
        page = 0,
        pollsPerPage = 1000,
    } = {}) {
        let queryParams = {}
        if (filters) {
            if ("text" in filters) {
                queryParams = this.textSearchQuery(filters["text"])
            }
        }

        let { query = {}, project = {}, sort = DEFAULT_SORT } = queryParams
        let cursor
        try {
            cursor = await polls
                .find(query)
                .project(project)
                .sort(sort)
        } catch (error) {
            console.error(`Unable to issue find command ${error}`)
            return { pollsList: [], totalNumPolls: 0 }
        }
        const displayCursor = cursor.skip(pollsPerPage * page).limit(pollsPerPage)
        try {
            const pollsList = await displayCursor.toArray()
            const totalNumPolls = page === 0 ? await polls.countDocuments(query) : 0
            return { pollsList, totalNumPolls }
        } catch (error) {
            console.error(`Unable to convert cursor array ${error}`)
            return { pollsList: [], totalNumPolls: 0 }
        }

    }





}
//for (var i = 0; i < 50; i++) {
//    let rei = [];
//    rei.push(i);
//    [1,2,34,45,6,7,78]
//}


module.exports = DAO