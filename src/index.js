const router = require("express-promise-router")();
const express = require("express");
const app = express();
const config = require("../config");
const MusicBot = require('./MusicBot');
router.get("/", (req, res) => {
    res.send("Hello Express app!");
});

app.use("/", router);
app.listen(config.port, () => {
    console.log("server started");
});

new MusicBot();



