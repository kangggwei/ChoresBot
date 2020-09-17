require("dotenv").config();

const { Telegraf, Composer } = require("telegraf");
const mongoose = require("mongoose");
const uri = process.env.ATLAS_URI;
const User = require("./models/user");
const csv = require("csv-parser");
const fastcsv = require("fast-csv");
const fs = require("fs");

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const Markup = require("telegraf/markup");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(Telegraf.log());

const generalBot = new Composer();

var listings = [];
var chores;

fs.createReadStream("chores.csv")
  .pipe(csv())
  .on("data", (row) => {
    listings.push(row);
  })
  .on("end", () => {
    // stores will contain the different Stores from the menu.csv.
    chores = [...new Set(listings.map((item) => item.Chore))];
  });

generalBot.start((ctx) => {
  ctx.reply(
    `Hello ${ctx.from.first_name}, what would you like to do?`,
    Markup.inlineKeyboard([
      Markup.callbackButton("Fill up your schedule", "fill"),
      Markup.callbackButton("Assign Chores", "assign"),
    ])
      .oneTime()
      .resize()
      .extra()
  );
});

bot.launch();

generalBot.action("fill", async (ctx) => {
  const dates = [];

  const date = new Date();

  for (let i = 0; i < 7; i++) {
    dates.push(
      date.setDate(new Date().getDate() + i).toLocaleDateString("en-GB")
    );
  }

  ctx.editMessageText(
    "Choose the date you would like to fill in:",
    Markup.inlineKeyboard([dates.map((x) => Markup.callbackButton(x, x))])
      .oneTime()
      .resize()
      .extra()
  );
  // Following this, the deliveryman would be informed on how many orders are there sent to each location (Queens Lawn OR Princes Gardens)
  // ctx.editMessageReplyMarkup();
});
