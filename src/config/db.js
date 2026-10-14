const mongoose = require('mongoose');

const connectDB = async (retries = 10) => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vistabem';
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri);
      console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`❌ Falha ao conectar no MongoDB (tentativa ${attempt}/${retries}): ${error.message}`);
      if (attempt === retries) process.exit(1);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};

module.exports = connectDB;
