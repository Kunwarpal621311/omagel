const express = require('express');
const app = express();
const indexRoutes = require('./routes/index');
const http = require("http");
const server = http.createServer(app);
const Socket = require("socket.io");
const io = Socket(server);

let waitingUser = [];
let rooms ={};
function findKeyByValue(obj, searchValue) {
    return Object.keys(obj).find(key => obj[key].includes(searchValue));
}
io.on("connection", (socket) => {
    socket.on("joinroom", () => {
        // console.log("User joined room");//
        if(waitingUser.length > 0){
            let partenr = waitingUser.shift();
            let roomname = `${socket.id}-${partenr.id}`;
            rooms[roomname] = [socket.id, partenr.id];
            // console.log(rooms);
            socket.join(roomname);
            partenr.join(roomname);
            // io.to(room).emit("startgame");
            io.to(roomname).emit("joined",roomname);
            console.log("User joined room server");
        }else{
            waitingUser.push(socket);
            // console.log("User added to waiting list");
        }
    
    });
    socket.on("signalingMessage",(data)=>{
        socket.broadcast.to(data.room).emit("signalingMessage",data.message);
    })
    socket.on("startVideoCall", ({room}) => {
        socket.broadcast.to(room).emit("incomingCall");
    });
    socket.on("acceptCall", ({room}) => {
        socket.broadcast.to(room).emit("callAccepted");
    });
    socket.on("rejectCall", ({room}) => {
        socket.broadcast.to(room).emit("callRejected");
    });
    socket.on("message", (data) => {
        // console.log(data);
        socket.broadcast.to(data.room).emit("message",data.message);
    });
    socket.on("disconnect", () => {
        let index = waitingUser.findIndex(waitingUser => waitingUser.id === socket.id);
        // console.log(waitingUser.id);
        if(index !== -1){
            waitingUser.splice(index, 1);
            
        }
        // console.log("after"+waitingUser.id);
        let key = findKeyByValue(rooms, socket.id);
            // console.log(key);
            if(key){
                let partenr = rooms[key].find(id => id !== socket.id);
                // console.log(partenr);
                io.to(partenr).emit("partnerdisconnected");
                delete rooms[key];
            }
    });

    
});

const port = 3000;
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use("/", indexRoutes)
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});