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
const viewChore = new Scene("viewChore");
stage.register(viewChore);
const editChore = new Scene("editChore");
stage.register(editChore);

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

bot.action("main_screen", (ctx) => {
  ctx.reply(
    `What would you like to do?`,
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
  ctx.editMessageReplyMarkup();
});

////////////////////////////////////////
//                                    //
//        Adding Chores Scene         //
//                                    //
////////////////////////////////////////

bot.action("add_chores", (ctx) => {
  ctx.reply("Please enter the name of the chore");
  ctx.scene.enter("addChoreName");
  ctx.editMessageReplyMarkup();
});

const addChoreMarkup = [
  [Markup.callbackButton("Enter new chore instead.", "add_chores")],
  [Markup.callbackButton("Back to main...", "main_screen")],
];

addChoreName.on("text", async (ctx) => {
  ctx.session.chore = { name: ctx.update.message.text.toLowerCase().trim() };

  const existingChore = await Chore.findOne({ name: ctx.session.chore.name });

  if (existingChore) {
    ctx.reply(
      `There is a chore called ${ctx.session.chore.name} that already exists. Please enter a new chore name.`
    );
  } else {
    ctx.session.message = "Name: " + ctx.session.chore.name + "\n";
    ctx.reply(
      `You have added:\n\n${ctx.session.message}\nKey in the number of effort level (out of 10) given to the chore.`,
      Markup.inlineKeyboard(addChoreMarkup).oneTime().resize().extra()
    );
    await ctx.scene.leave("addChoreName");
    ctx.scene.enter("addChoreEffort");
  }
});

addChoreEffort.on("text", async (ctx) => {
  ctx.session.chore.effort = parseFloat(ctx.update.message.text.trim());
  ctx.session.message += "Effort: " + ctx.session.chore.effort + "/10\n";
  ctx.reply(
    `You have added:\n\n${ctx.session.message}\nKey in the amount of time (in minutes) given to the chore.`,
    Markup.inlineKeyboard(addChoreMarkup).oneTime().resize().extra()
  );
  await ctx.scene.leave("addChoreEffort");
  ctx.scene.enter("addChoreTime");
});

addChoreTime.on("text", async (ctx) => {
  ctx.session.chore.time = parseInt(ctx.update.message.text.trim());
  ctx.session.message += "Time taken: " + ctx.session.chore.time + " minutes\n";
  ctx.reply(
    `You have added:\n\n${ctx.session.message}\nKey in the number of people required for the chore.`,
    Markup.inlineKeyboard(addChoreMarkup).oneTime().resize().extra()
  );
  await ctx.scene.leave("addChoreTime");
  ctx.scene.enter("addChorePeople");
});

addChorePeople.on("text", async (ctx) => {
  ctx.session.chore.people = parseInt(ctx.update.message.text.trim());
  ctx.session.message += "People: " + ctx.session.chore.people + "\n";
  ctx.reply(
    `You have added:\n\n${ctx.session.message}\nWhat do you want to do next?`,
    Markup.inlineKeyboard([
      [Markup.callbackButton("Add this chore.", "submit_chore")],
      ...addChoreMarkup,
    ])
      .oneTime()
      .resize()
      .extra()
  );
  await ctx.scene.leave("addChorePeople");
});

bot.action("submit_chore", async (ctx) => {
  const myChore = new Chore({
    name: ctx.session.chore.name,
    effort: ctx.session.chore.effort,
    time: ctx.session.chore.time,
    people: ctx.session.chore.people,
    assigned: [],
    isAssigned: false,
  });

  myChore.save();

  ctx.reply(
    `The chore has been added!\n\n${ctx.session.message}`,
    Markup.inlineKeyboard([
      [Markup.callbackButton("Add another chore.", "add_chores")],
      [Markup.callbackButton("Do something else.", "main_screen")],
    ])
      .oneTime()
      .resize()
      .extra()
  );
});

////////////////////////////////////////
//                                    //
//        Viewing Chores Scene        //
//                                    //
////////////////////////////////////////

bot.action("view_chores", async (ctx) => {
  const existingChores = await Chore.find();

  const choresList = existingChores.map((x) => [
    Markup.callbackButton(x.name, "<" + x.name),
  ]);

  if (choresList.length) {
    ctx.editMessageText(
      "Which chore would you like to view in detail?",
      Markup.inlineKeyboard([
        ...choresList,
        [Markup.callbackButton("Back to main...", "main_screen")],
      ])
        .oneTime()
        .resize()
        .extra()
    );
    ctx.scene.enter("viewChore");
  } else {
    ctx.editMessageText(
      "There are no chores currently. Please add chores to view them.",
      Markup.inlineKeyboard([
        [
          Markup.callbackButton("Add Chores", "add_chores"),
          Markup.callbackButton("Back to main...", "main_screen"),
        ],
      ])
        .oneTime()
        .resize()
        .extra()
    );
  }
});

const viewChoreMarkup = [
  [
    Markup.callbackButton("View chores", "view_chores"),
    Markup.callbackButton("Back to main...", "main_screen"),
  ],
];

viewChore.action(/^</, async (ctx) => {
  ctx.session.existingChore = await Chore.findOne({
    name: ctx.update.callback_query.data.replace("<", ""),
  });
  ctx.editMessageText(
    `The chore in detail is:\n
Name: ${ctx.session.existingChore.name}
Effort points: ${ctx.session.existingChore.effort}
Time taken: ${ctx.session.existingChore.time}
Number of people required: ${ctx.session.existingChore.people}\n
Do you want to edit any information?`,
    Markup.inlineKeyboard([
      [Markup.callbackButton("Name", "<name")],
      [Markup.callbackButton("Effort Points", "<effort")],
      [Markup.callbackButton("Time taken", "<time")],
      [Markup.callbackButton("Number of people required", "<people")],
      [Markup.callbackButton("Delete this chore", "delete_chore")],
      ...viewChoreMarkup,
    ])
      .oneTime()
      .resize()
      .extra()
  );
  await ctx.scene.leave("viewChore");
  ctx.scene.enter("editChore");
});

editChore.action("delete_chore", async (ctx) => {
  await Chore.deleteOne({ name: ctx.session.existingChore.name });
  ctx.editMessageText(
    `The chore "${ctx.session.existingChore.name}" has been deleted.`,
    Markup.inlineKeyboard(viewChoreMarkup).oneTime().resize().extra()
  );
});

editChore.action(/^</, async (ctx) => {
  ctx.session.change = ctx.update.callback_query.data.replace("<", "");
  ctx.reply(`Please key in the new value for "${ctx.session.change}"`);
  ctx.editMessageReplyMarkup();
});

editChore.on("text", async (ctx) => {
  switch (ctx.session.change) {
    case "effort":
      ctx.session.value = parseFloat(ctx.update.message.text.trim());
      await Chore.updateOne(
        { name: ctx.session.existingChore.name },
        { effort: ctx.session.value }
      );
      break;
    case "time":
      ctx.session.value = parseInt(ctx.update.message.text.trim());
      await Chore.updateOne(
        { name: ctx.session.existingChore.name },
        { time: ctx.session.value }
      );
      break;
    case "people":
      ctx.session.value = parseInt(ctx.update.message.text.trim());
      await Chore.updateOne(
        { name: ctx.session.existingChore.name },
        { people: ctx.session.value }
      );
      break;
    default:
      ctx.session.value = ctx.update.message.text.toLowerCase().trim();
      await Chore.updateOne(
        { name: ctx.session.existingChore.name },
        { name: ctx.session.value }
      );
  }
  ctx.reply(
    `"${ctx.session.change}" has been updated to ${ctx.session.value}.`,
    Markup.inlineKeyboard(viewChoreMarkup).oneTime().resize().extra()
  );
  await ctx.scene.leave("editChore");
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
