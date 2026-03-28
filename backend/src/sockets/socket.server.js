const { Server } = require("socket.io")
const cookie = require("cookie")
const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")
const aiService = require("../service/ai.service")
const messageModel = require("../models/message.model")
const { createMemory, queryMemory } = require("../service/vector.service")
const { chat } = require("@pinecone-database/pinecone/dist/assistant/data/chat")

function initSocketServer(httpServer) {
    const io = new Server(httpServer, {})

    io.use(async (socket, next) => {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || "")
        if (!cookies.token) {
            next(new Error("Authentication error : No token provided"))
        }


        try {

            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET)
            const user = await userModel.findById(decoded.id)

            socket.user = user
            next()

        } catch (error) {
            next(new Error("Authentication error: Invalid token"))
        }
    })


    io.on("connection", (socket) => {


        socket.on('ai-message', async (messagePayload) => {

            console.log(messagePayload);


            const [message, vectors] = await Promise.all([
                messageModel.create({
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    content: messagePayload.content,
                    role: 'user'
                }),

                aiService.generateVector(messagePayload.content),

               

            ])
 await  createMemory({
                    vectors,
                    messageId: message._id,
                    metadata: {
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        text: messagePayload.content
                    }

                })
           const [memory, chatHistory] = await Promise.all([
  queryMemory({
    queryVector: vectors,
    limit: 3,
    metadata: {}
  }),

  (async () => (
    await messageModel
      .find({ chat: messagePayload.chat })
      .sort({ createdAt: -1 })
      .limit(20)
  ).reverse())()
]);


            const stm = chatHistory.map(item => {
                return {
                    role: item.role,
                    parts: [{ text: item.content }]
                }
            })


            const ltm = [{
                role: "user",
                parts: [{
                    text: `
        these are some previous message from the chat ,use them to generate a resposne
        ${memory.map(item => item.metadata.text).join('\n')}
        
        `}]
            }]




            console.log(ltm[0]);
            console.log(stm);





            const response = await aiService.genrateResponse([...ltm, ...stm]);

              socket.emit("ai-response", {
                content: response,
                chat: messagePayload.chat
            })
         const [responseMessage,responseVector] = await Promise.all([
                messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: response,
                role: 'model'
            })
,
             aiService.generateVector(response)
         ])

            await createMemory({
                vectors: responseVector,
                messageId: responseMessage._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: response
                }
            })
          
        })

    })

}

module.exports = initSocketServer;
