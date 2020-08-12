const ObjectId = require("bson")

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

    static async uploadPost(id, title, content, video, color1, color2, date) {
        try {

        } catch (error) {
            console.error(`Error ${error}`)
            return { error: error }
        }
    }





}


module.exports = DAO