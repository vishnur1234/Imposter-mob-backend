const registerRoomSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("joinRoomChannel", (roomCode) => {
      socket.join(roomCode);
    });

    socket.on("leaveRoomChannel", (roomCode) => {
      socket.leave(roomCode);
    });

    socket.on("disconnect", () => {});
  });
};

export default registerRoomSocket;
