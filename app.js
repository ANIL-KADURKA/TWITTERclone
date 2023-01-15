const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "1234567890", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        console.log(request.username);
        next();
      }
    });
  }
};
app.post("/register", async (request, response) => {
  const { username, name, password, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
      console.log("1");
    } else {
      const createUserQuery = `
      INSERT INTO 
        user (name,username,password,gender) 
      VALUES 
        (
          '${name}', 
          '${username}',
          '${hashedPassword}', 
          '${gender}'
        )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      console.log(newUserId);
      response.send("User created successfully");
      response.status(200);
    }
  } else {
    response.status(400);
    response.send("User already exists");
    console.log("7");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "1234567890");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { username } = request;
  //console.log(username);
  const dbUser = `select * from user where username= '${username}';`;
  const dbResponse = await db.get(dbUser);
  const user_id = dbResponse.user_id;
  const db2 = ` select following_user_id from follower where follower_user_id
  =${user_id}`;
  const dbRe = await db.all(db2);
  let bc = [];
  for (let i of dbRe) {
    bc.push(i.following_user_id);
  }
  const f1_user_id = bc[0];
  const f2_user_id = bc[1];
  //   console.log(bc);
  //console.log(dbRe);
  const dbF = `select tweet,user_id,date_time from tweet where 
  (user_id =${f1_user_id} or user_id=${f2_user_id})
  order by date_time limit  4 offset 0;`;
  const dbRep = await db.all(dbF);
  // console.log(dbRep);
  const po = `select username from user where user_id = ${f1_user_id} or 
   user_id = ${f2_user_id}`;
  const op = await db.all(po);
  let cd = [];
  for (let i of op) {
    cd.push(i.username);
  }
  //   console.log(cd);
  let arr = [];
  let name = -1;
  let obj = null;
  for (let i of dbRep) {
    // console.log(i);
    // console.log(i.user_id);
    if (i.user_id === f1_user_id) {
      name = 0;
    }
    if (i.user_id === f2_user_id) {
      name = 1;
    }
    obj = {
      username: cd[name],
      tweet: i.tweet,
      dateTime: i.date_time,
    };
    arr.push(obj);
  }
  console.log("HELLO WORLD");
  response.send(arr);
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  const { username } = request;
  //console.log(username);
  const dbUser = `select * from user where username= '${username}';`;
  const dbResponse = await db.get(dbUser);
  const user_id = dbResponse.user_id;
  const db2 = ` select following_user_id from follower where follower_user_id
    =${user_id}`;
  const dbRe = await db.all(db2);
  let bc = [];
  for (let i of dbRe) {
    bc.push(i.following_user_id);
  }
  const f1_user_id = bc[0];
  const f2_user_id = bc[1];
  const po = `select username from user where user_id = ${f1_user_id} or 
    user_id = ${f2_user_id}`;
  const op = await db.all(po);
  response.send(op);
  console.log(12);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const { username } = request;
  //console.log(username);
  const dbUser = `select * from user where username= '${username}';`;
  const dbResponse = await db.get(dbUser);
  const user_id = dbResponse.user_id;
  const db2 = ` select follower_user_id from follower where following_user_id
        =${user_id}`;
  const dbRe = await db.all(db2);
  console.log(dbRe);
  let bc = [];
  for (let i of dbRe) {
    bc.push(i.follower_user_id);
  }
  const f1_user_id = bc[0];
  const f2_user_id = bc[1];
  const po = `select username from user where user_id = ${f1_user_id} or
        user_id = ${f2_user_id}`;
  const op = await db.all(po);
  response.send(op);
  console.log(12);
});
// app.get("/tweets/:tweetId/",async(request,response) => {

// });
module.exports = app;
