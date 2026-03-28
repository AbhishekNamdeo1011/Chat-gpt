require('dotenv').config()
const app = require('./src/app')
const connectToDb = require('./src/db/db')
const initSocketServer = require("./src/sockets/socket.server")
const httpServer = require('http').createServer(app)


connectToDb()

initSocketServer(httpServer)
httpServer.listen(3002,()=>{
    console.log("Server is running on the port 3002");
    
})