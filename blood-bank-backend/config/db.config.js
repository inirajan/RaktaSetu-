import { connect } from "mongoose";

async function dbConnect() {
  try {
    const isConnect = await connect(`${process.env.MONGO_URL}blood_Bank`);
    console.log(`MonogDB is connected.${isConnect.connection.host}`);
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
}

export { dbConnect };
