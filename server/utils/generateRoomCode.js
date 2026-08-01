const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default generateRoomCode;
