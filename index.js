require("dotenv").config();

const { Telegraf } = require("telegraf");
const Stage = require("telegraf/stage");
const session = require("telegraf/session");
const Scene = require("telegraf/scenes/base");
const { leave } = Stage;
const mongoose = require("mongoose");
const uri = process.env.ATLAS_URI;
const User = require("./models/user");
const Chore = require("./models/chore");

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const Markup = require("telegraf/markup");

const bot = new Telegraf(process.env.BOT_TOKEN);
const stage = new Stage();

const addChoreName = new Scene("addChoreName");
stage.register(addChoreName);
const addChoreEffort = new Scene("addChoreEffort");
stage.register(addChoreEffort);
const addChoreTime = new Scene("addChoreTime");
stage.register(addChoreTime);
const addChorePeople = new Scene("addChorePeople");
stage.register(addChorePeople);

bot.use(Telegraf.log());
bot.use(session());
bot.use(stage.middleware());

bot.start((ctx) => {
  ctx.reply(
    `Hello ${ctx.from.first_name}, what would you like to do?`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton("Add Chores", "add_chores"),
        Markup.callbackButton("View Chores", "view_chores"),
      ],
      [
        Markup.callbackButton("Add Users", "add_users"),
        Markup.callbackButton("View Users", "view_users"),
      ],
    ])
      .oneTime()
      .resize()
      .extra()
  );
});

bot.action("add_chores", (ctx) => {
  ctx.reply("Please enter the name of the chore");
  ctx.scene.enter("addChoreName");
});

addChoreName.on("text", async (ctx) => {
  ctx.session.chore = { name: ctx.update.message.text.trim() };
  ctx.session.message = "Name: " + ctx.session.chore.name + "\n";
  ctx.reply(
    `You have added:\n\n${ctx.session.message}\nKey in the number of effort level (out of 10) given to the chore.`,
    Markup.inlineKeyboard([
      Markup.callbackButton("Enter new chore instead.", "add_chores"),
    ])
      .oneTime()
      .resize()
      .extra()
  );
  await ctx.scene.leave("addChoreName");
  ctx.scene.enter("addChoreEffort");
});

addChoreEffort.on("text", async (ctx) => {
  ctx.session.chore.effort = parseFloat(ctx.update.message.text.trim());
  ctx.session.message += "Effort: " + ctx.session.chore.effort + "/10\n";
  ctx.reply(
    `You have added:\n\n${ctx.session.message}\nKey in the amount of time (in minutes) given to the chore.`,
    Markup.inlineKeyboard([
      Markup.callbackButton("Enter new chore instead.", "add_chores"),
    ])
      .oneTime()
      .resize()
      .extra()
  );
  await ctx.scene.leave("addChoreEffort");
  ctx.scene.enter("addChoreTime");
});

addChoreTime.on("text", async (ctx) => {
  ctx.session.chore.time = parseInt(ctx.update.message.text.trim());
  ctx.session.message += "Time taken: " + ctx.session.chore.time + "minutes\n";
  ctx.reply(
    `You have added:\n\n${ctx.session.message}\nKey in the amount of time (in minutes) given to the chore.`,
    Markup.inlineKeyboard([
      Markup.callbackButton("Enter new chore instead.", "add_chores"),
    ])
      .oneTime()
      .resize()
      .extra()
  );
  await ctx.scene.leave("addChoreTime");
  ctx.scene.enter("addChorePeople");
});

bot.action("select_date", (ctx) => {
  const dt = new Date().getTime();

  const dates = [];

  for (let i = 0; i < 7; i++) {
    dates.push(
      new Date(dt + i * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")
    );
  }

  ctx.editMessageText(
    "Choose the date you would like to fill in:",
    Markup.inlineKeyboard(dates.map((x) => [Markup.callbackButton(x, x)]))
      .oneTime()
      .resize()
      .extra()
  );
});

bot.launch();
