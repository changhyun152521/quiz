const mongoose = require('mongoose');

// mathchang DB 연결 (User 조회용)
let mathchangConnection = null;

const connectDB = async () => {
  try {
    let mongoURI;

    if (process.env.MONGODB_ATLAS_URL) {
      mongoURI = process.env.MONGODB_ATLAS_URL;
    } else if (process.env.MONGODB_URI) {
      mongoURI = process.env.MONGODB_URI;
    } else {
      mongoURI = 'mongodb://localhost:27017/quiz';
    }

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // mathchang DB 연결 (User 조회용)
    if (process.env.MATHCHANG_DB_URL) {
      try {
        mathchangConnection = mongoose.createConnection(process.env.MATHCHANG_DB_URL, {
          serverSelectionTimeoutMS: 5000,
        });
        await mathchangConnection.asPromise();
      } catch (mathchangErr) {
        console.error('mathchang DB 연결 실패:', mathchangErr.message);
      }
    }

    return conn;
  } catch (error) {
    console.error('MongoDB 연결 오류:', error.message);
    throw error;
  }
};

// mathchang DB 연결 객체 반환
const getMathchangConnection = () => mathchangConnection;

module.exports = connectDB;
module.exports.getMathchangConnection = getMathchangConnection;
