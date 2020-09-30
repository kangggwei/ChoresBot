require("dotenv").config();

const { Telegraf } = require("telegraf");
const Stage = require("telegraf/stage");
const Markup = require("telegraf/markup");
const session = require("telegraf/session");
const Scene = require("telegraf/scenes/base");
const { leave } = Stage;
const mongoose = require("mongoose");
const uri = process.env.ATLAS_URI;
const User = require("./models/user");
const Chore = require("./models/chore");
const Days = require("./models/days");

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const bot = new Telegraf(process.env.BOT_TOKEN);
const stage = new Stage();

const addChoreName = new Scene("addChoreName");
stage.register(addChoreName);
const addChoreEffort = new Scene("addChoreEffort");
stage.register(addChoreEffort);
const addChoreFrequency = new Scene("addChoreFrequency");
stage.register(addChoreFrequency);
const viewChore = new Scene("viewChore");
stage.register(viewChore);
const editChore = new Scene("editChore");
stage.register(editChore);
const addUserName = new Scene("addUserName");
stage.register(addUserName);
const editName = new Scene("editName");
stage.register(editName);
const deleteUser = new Scene("deleteUser");
stage.register(deleteUser);
const selectDate = new Scene("selectDate");
stage.register(selectDate);
const updateUser = new Scene("updateUser");
stage.register(updateUser);
const selectAvailability = new Scene("selectAvailability");
stage.register(selectAvailability);
const selectTime = new Scene("selectTime");
stage.register(selectTime);

bot.use(Telegraf.log());
bot.use(session());
bot.use(stage.middleware());

////////////////////////////////////////
//                                    //
//          General Functions         //
//                                    //
////////////////////////////////////////

function split(array, n) {
  let arr = array;
  var res = [];
  while (arr.length) {
    res.push(arr.splice(0, n));
  }
  return res;
}

function get_date(days = 0) {
  const dt = new Date().getTime();
  return new Date(dt + days * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB");
}

function toDate(dateString) {
  const full = dateString.split("/");
  return new Date(full[2], full[1], full[0]);
}

function dateDiff(first, second) {
  return Math.round((toDate(second) - toDate(first)) / (1000 * 60 * 60 * 24));
}

function daysAgo(first) {
  return dateDiff(first, new Date().toLocaleDateString("en-GB"));
}

////////////////////////////////////////
//                                    //
//            Main Screen             //
//                                    //
////////////////////////////////////////

bot.command("random", async (ctx) => {
  const users = await User.find();

  ctx.replyWithMarkdown(
    `The chosen one is: *${
      users[Math.floor(Math.random() * users.length)].name
    }*`
  );
});

bot.start((ctx) => {
  ctx.reply(
    `Main Menu \n`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton("👁️ Outstanding Chores", "outstanding"),
        Markup.callbackButton("🧹 Assign Chores", "assign"),
      ],
      [
        Markup.callbackButton("⏰ Update Availability", "availability"),
        Markup.callbackButton("✂️ Edit Chores/Users", "edit"),
      ],
    ])
      .oneTime()
      .resize()
      .extra()
  );
});

const mainButton = [
  [
    Markup.callbackButton("➕ Add Chores", "addChores"),
    Markup.callbackButton("👁️ View Chores", "viewChores"),
  ],
  [
    Markup.callbackButton("➕ Add Users", "addUsers"),
    Markup.callbackButton("👁️ View Users", "viewUsers"),
  ],
];

bot.action("edit", (ctx) => {
  ctx.editMessageText(
    `Hello ${ctx.from.first_name}, what would you like to do?`,
    Markup.inlineKeyboard(mainButton).oneTime().resize().extra()
  );
});

bot.action("mainScreen", (ctx) => {
  ctx.reply(
    `Main Menu \n`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton("👁️ Outstanding Chores", "outstanding"),
        Markup.callbackButton("🧹 Assign Chores", "assign"),
      ],
      [
        Markup.callbackButton("⏰ Update Availability", "availability"),
        Markup.callbackButton("✂️ Edit Chores/Users", "edit"),
      ],
    ])
      .oneTime()
      .resize()
      .extra()
  );
  ctx.editMessageReplyMarkup();
});

const mainMenuButton = Markup.callbackButton(
  "🏠 Back to main...",
  "mainScreen"
);

////////////////////////////////////////
//                                    //
//        Adding Chores Scene         //
//                                    //
////////////////////////////////////////

bot.action("addChores", (ctx) => {
  ctx.replyWithMarkdown("Please enter the *name* of the chore");
  ctx.scene.enter("addChoreName");
  ctx.editMessageReplyMarkup();
});

const addChoreMarkup = [
  [Markup.callbackButton("Restart", "addChores"), mainMenuButton],
];

addChoreName.on("text", async (ctx) => {
  ctx.session.chore = { name: ctx.update.message.text.trim() };

  const existingChore = await Chore.findOne({ name: ctx.session.chore.name });

  if (existingChore) {
    ctx.replyWithMarkdown(
      `There is a chore called _${ctx.session.chore.name}_ that already exists. Please enter a new chore name.`
    );
  } else {
    ctx.session.message = "Name: " + ctx.session.chore.name + "\n";
    ctx.replyWithMarkdown(
      `You have added:\n\n_${ctx.session.message}_\nKey in the number of *effort* level (out of 10) given to the chore.`,
      Markup.inlineKeyboard(addChoreMarkup).oneTime().resize().extra()
    );
    await ctx.scene.leave("addChoreName");
    ctx.scene.enter("addChoreEffort");
  }
});

addChoreEffort.on("text", async (ctx) => {
  ctx.session.chore.effort = parseFloat(ctx.update.message.text.trim());
  if (isNaN(ctx.session.chore.effort)) {
    ctx.reply(`You did not enter a number. Please try again.`);
  } else if (ctx.session.chore.effort > 10) {
    ctx.reply(`The number you entered is greater than 10. Please try again.`);
  } else if (ctx.session.chore.effort <= 0) {
    ctx.reply(
      `The number you entered is less than or equal to zero. Please try again.`
    );
  } else {
    ctx.session.message += "Effort: " + ctx.session.chore.effort + "/10\n";
    ctx.replyWithMarkdown(
      `You have added:\n\n${ctx.session.message}\nKey in the *frequency* of the chore (times per month i.e. 28 days).`,
      Markup.inlineKeyboard(addChoreMarkup).oneTime().resize().extra()
    );
    await ctx.scene.leave("addChoreEffort");
    ctx.scene.enter("addChoreFrequency");
  }
});

addChoreFrequency.on("text", async (ctx) => {
  ctx.session.chore.frequency = parseInt(ctx.update.message.text.trim());
  if (isNaN(ctx.session.chore.frequency)) {
    ctx.reply(`You did not enter a number. Please try again.`);
  } else if (ctx.session.chore.frequency > 28) {
    ctx.reply(
      `The number you entered is greater than 28 (more than once a day). Please try again.`
    );
  } else if (ctx.session.chore.frequency < 0) {
    ctx.reply(
      `The number you entered is less than or equal to zero. Please try again.`
    );
  } else {
    ctx.session.message +=
      "Frequency: " + ctx.session.chore.frequency + " times per month\n";
    ctx.replyWithMarkdown(
      `You have added:\n\n_${ctx.session.message}_\nWhat do you want to do next?`,
      Markup.inlineKeyboard([
        [Markup.callbackButton("✅ Submit", "submitChore")],
        ...addChoreMarkup,
      ])
        .oneTime()
        .resize()
        .extra()
    );
    await ctx.scene.leave("addChoreFrequency");
  }
});

bot.action("submitChore", (ctx) => {
  const myChore = new Chore({
    name: ctx.session.chore.name,
    effort: ctx.session.chore.effort,
    frequency: ctx.session.chore.frequency,
  });

  myChore.save();

  ctx.editMessageText(
    `The chore has been added!\n\n${ctx.session.message}`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton("➕ Add chore", "addChores"),
        Markup.callbackButton("👁️ View chores", "viewChores"),
      ],
      [mainMenuButton],
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

bot.action("viewChores", async (ctx) => {
  const existingChores = await Chore.find();

  const choresList = existingChores.map((x) => [
    Markup.callbackButton(x.name, "<" + x.name),
  ]);

  if (choresList.length) {
    ctx.editMessageText(
      "Which chore would you like to view in detail?",
      Markup.inlineKeyboard([...choresList, [mainMenuButton]])
        .oneTime()
        .resize()
        .extra()
    );
    ctx.scene.enter("viewChore");
  } else {
    ctx.editMessageText(
      "There are currently no chores. Please add chores to view them.",
      Markup.inlineKeyboard([
        [Markup.callbackButton("➕ Add Chores", "addChores"), mainMenuButton],
      ])
        .oneTime()
        .resize()
        .extra()
    );
  }
});

const viewChoreMarkup = [
  [Markup.callbackButton("👁️ View chores", "viewChores"), mainMenuButton],
];

viewChore.action(/^</, async (ctx) => {
  ctx.session.existingChore = await Chore.findOne({
    name: ctx.update.callback_query.data.replace("<", ""),
  });
  ctx.editMessageText(
    `The chore in detail is:\n
Name: ${ctx.session.existingChore.name}
Effort points: ${ctx.session.existingChore.effort}
Frequency (times per month): ${ctx.session.existingChore.frequency}\n
Do you want to edit any information?`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton("Name", "<name"),
        Markup.callbackButton("Effort Points", "<effort"),
      ],
      [Markup.callbackButton("Frequency", "<frequency")],
      [Markup.callbackButton("Delete this chore", "deleteChore")],
      ...viewChoreMarkup,
    ])
      .oneTime()
      .resize()
      .extra()
  );
  await ctx.scene.leave("viewChore");
  ctx.scene.enter("editChore");
});

editChore.action("deleteChore", async (ctx) => {
  await Chore.deleteOne({ name: ctx.session.existingChore.name });
  ctx.editMessageText(
    `The chore "${ctx.session.existingChore.name}" has been removed.`,
    Markup.inlineKeyboard(viewChoreMarkup).oneTime().resize().extra()
  );
});

editChore.action(/^</, async (ctx) => {
  ctx.session.change = ctx.update.callback_query.data.replace("<", "");
  ctx.replyWithMarkdown(
    `Please key in the new value for _${ctx.session.change}_`
  );
  ctx.editMessageReplyMarkup();
});

editChore.on("text", async (ctx) => {
  let success = true;
  if (isNaN(parseInt(ctx.update.message.text.trim()))) {
    success = false;
  }

  switch (ctx.session.change) {
    case "effort":
      ctx.session.value = parseFloat(ctx.update.message.text.trim());
      if (success) {
        await Chore.updateOne(
          { name: ctx.session.existingChore.name },
          { effort: ctx.session.value }
        );
      }
      break;
    case "frequency":
      ctx.session.value = parseInt(ctx.update.message.text.trim());
      if (success) {
        await Chore.updateOne(
          { name: ctx.session.existingChore.name },
          { frequency: ctx.session.value }
        );
      }
      break;
    default:
      ctx.session.value = ctx.update.message.text.trim();
      await Chore.updateOne(
        { name: ctx.session.existingChore.name },
        { name: ctx.session.value }
      );
  }
  if (success || ctx.session.change === "name") {
    ctx.replyWithMarkdown(
      `_${ctx.session.change}_ has been updated to _${ctx.session.value}_.`,
      Markup.inlineKeyboard(viewChoreMarkup).oneTime().resize().extra()
    );
    await ctx.scene.leave("editChore");
  } else {
    ctx.reply(`You did not enter a number. Please try again.`);
  }
});

////////////////////////////////////////
//                                    //
//        Adding User Scene           //
//                                    //
////////////////////////////////////////

bot.action("addUsers", (ctx) => {
  ctx.editMessageText("Enter the name of the user you would like to add.");
  ctx.session.new = true;
  ctx.scene.enter("addUserName");
});

addUserName.on("text", async (ctx) => {
  ctx.session.username = ctx.update.message.text.trim();
  const existingUser = await User.findOne({ name: ctx.session.username });
  ctx.session.action = ctx.session.new
    ? "add"
    : `change ${ctx.session.updateUser} to`;

  if (existingUser) {
    ctx.reply(
      `There is an existing user called "${ctx.session.username}". Please try again.`
    );
  } else {
    ctx.replyWithMarkdown(
      `You have requested to ${ctx.session.action}: _${ctx.session.username}_`,
      Markup.inlineKeyboard([
        [
          Markup.callbackButton("Submit Name", "submitName"),
          Markup.callbackButton("Re-type Name", "addUsers"),
        ],
        [mainMenuButton],
      ])
        .oneTime()
        .resize()
        .extra()
    );
    await ctx.scene.leave("addUserName");
  }
});

bot.action("submitName", async (ctx) => {
  if (ctx.session.new) {
    const myUser = new User({
      name: ctx.session.username,
      points: 0,
    });
    myUser.save();
  } else {
    await User.updateOne(
      { name: ctx.session.updateUser },
      { name: ctx.session.username }
    );
  }

  ctx.session.action = ctx.session.new ? "added to the list" : "modified";

  ctx.reply(
    `_${ctx.session.username}_ has been ${ctx.session.action}.`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton("➕ Add User", "addUsers"),
        Markup.callbackButton("👁️ View Users", "viewUsers"),
      ],
      [mainMenuButton],
    ])
      .oneTime()
      .resize()
      .extra()
  );
  ctx.editMessageReplyMarkup();
});

////////////////////////////////////////
//                                    //
//        Viewing User Scene          //
//                                    //
////////////////////////////////////////

bot.action("viewUsers", async (ctx) => {
  ctx.session.existingUsers = await User.find();
  ctx.session.userList = ctx.session.existingUsers.map((x) => [
    Markup.callbackButton(x.name, "<" + x.name),
  ]);

  if (ctx.session.existingUsers.length) {
    ctx.editMessageText(
      `Your current users and their points are:${ctx.session.existingUsers.map(
        (x) => `\n${x.name}: ${x.points}`
      )}`,
      Markup.inlineKeyboard([
        [Markup.callbackButton("➕ Add a user", "addUsers")],
        [Markup.callbackButton("Update user data", "updateUser")],
        [Markup.callbackButton("Delete a user", "deleteUser")],
        [mainMenuButton],
      ])
        .oneTime()
        .resize()
        .extra()
    );
  } else {
    ctx.editMessageText(
      "There are currently no users. Please add users to view them.",
      Markup.inlineKeyboard([
        [Markup.callbackButton("➕ Add Users", "addUsers")],
        [mainMenuButton],
      ])
        .oneTime()
        .resize()
        .extra()
    );
  }
});

bot.action("updateUser", async (ctx) => {
  ctx.editMessageText(
    `Which user would you like to edit?`,
    Markup.inlineKeyboard([...ctx.session.userList, [mainMenuButton]])
      .oneTime()
      .resize()
      .extra()
  );

  await ctx.scene.enter("updateUser");
});

updateUser.action(/^</, async (ctx) => {
  ctx.session.updateUser = ctx.update.callback_query.data.replace("<", "");

  ctx.editMessageText(
    `What would you like to change?`,
    Markup.inlineKeyboard([
      [Markup.callbackButton("✂️ Edit name", "editName")],
      [Markup.callbackButton("🔄 Reset points", "reset")],
      [mainMenuButton],
    ])
      .oneTime()
      .resize()
      .extra()
  );
});

updateUser.action("reset", async (ctx) => {
  await User.updateOne({ name: ctx.session.updateUser }, { points: 0 });

  ctx.editMessageText(
    `${ctx.session.updateUser}'s points have been reset.`,
    Markup.inlineKeyboard([
      Markup.callbackButton("👁️ View Users", "viewUsers"),
      mainMenuButton,
    ])
  );
  ctx.session.new = false;
});

updateUser.action("editName", async (ctx) => {
  await ctx.scene.enter("addUserName");
  ctx.reply(`Please enter the new name for ${ctx.session.updateUser}`);
  ctx.session.new = false;
});

bot.action("deleteUser", async (ctx) => {
  ctx.editMessageText(
    `Which user would you like to delete?`,
    Markup.inlineKeyboard([...ctx.session.userList, [mainMenuButton]])
      .oneTime()
      .resize()
      .extra()
  );
  ctx.scene.enter("deleteUser");
});

deleteUser.action(/^</, async (ctx) => {
  ctx.session.deleteUser = ctx.update.callback_query.data.replace("<", "");
  await User.deleteOne({ name: ctx.session.deleteUser });
  ctx.reply(
    `The user "${ctx.session.deleteUser}" has been removed.`,
    Markup.inlineKeyboard([
      [Markup.callbackButton("Delete Another", "deleteUser")],
      [mainMenuButton],
    ])
      .oneTime()
      .resize()
      .extra()
  );
  await ctx.scene.leave("deleteUser");
  ctx.session.existingUsers = await User.find();
  ctx.session.userList = ctx.session.existingUsers.map((x) => [
    Markup.callbackButton(x.name, "<" + x.name),
  ]);
});

////////////////////////////////////////
//                                    //
//      Selecting Dates Scene         //
//                                    //
////////////////////////////////////////

bot.action("availability", async (ctx) => {
  ctx.session.existingUsers = await User.find();
  ctx.session.userList = ctx.session.existingUsers.map((x) => [
    Markup.callbackButton(x.name, "<" + x.name),
  ]);

  ctx.editMessageText(
    `Whose availibility would you like to update?`,
    Markup.inlineKeyboard([...ctx.session.userList, [mainMenuButton]])
      .oneTime()
      .resize()
      .extra()
  );
  ctx.scene.enter("selectAvailability");
});

selectAvailability.on("callback_query", (ctx) => {
  ctx.session.updateUser = ctx.update.callback_query.data.replace("<", "");
  ctx.scene.enter("selectDate");
  const dt = new Date().getTime();

  ctx.session.dates = [];

  for (let i = 1; i < 8; i++) {
    ctx.session.dates.push(
      new Date(dt + i * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")
    );
  }

  ctx.editMessageText(
    "Choose the date you would like to fill in:",
    Markup.inlineKeyboard(
      ctx.session.dates.map((x) => [Markup.callbackButton(x, x)])
    )
      .oneTime()
      .resize()
      .extra()
  );
});

selectDate.on("callback_query", async (ctx) => {
  await ctx.scene.leave("selectDate");
  ctx.scene.enter("selectTime");

  // selectedDate: day, month, year
  ctx.session.selectedDate = ctx.update.callback_query.data;

  ctx.session.existingEntry = await Days.findOne({
    name: ctx.session.updateUser,
    date: ctx.session.selectedDate,
  });

  let x = 60; //minutes interval
  ctx.session.times = []; // time array
  let curr_time = 8 * 60; // start time
  let ap = ["AM", "PM"]; // AM-PM

  //loop to increment the time and push results in array
  for (let i = 0; curr_time < 22 * 60; i++) {
    let hour = Math.floor(curr_time / 60); // get hours of day in 0-24 format
    let min = curr_time % 60; // get minutes of the hour in 0-55 format
    if (hour == 12) {
      ctx.session.times.push({
        time: "12" + ":" + ("0" + min).slice(-2) + ap[Math.floor(hour / 12)],
      }); // pushing data in array in [00:00 - 12:00 AM/PM format]
    } else {
      ctx.session.times.push({
        time:
          ("0" + (hour % 12)).slice(-2) +
          ":" +
          ("0" + min).slice(-2) +
          ap[Math.floor(hour / 12)],
      }); // pushing data in array in [00:00 - 12:00 AM/PM format]
    }
    curr_time = curr_time + x;
  }

  if (ctx.session.existingEntry) {
    ctx.session.times.map(
      (x) =>
        (x.clicked = ctx.session.existingEntry.timings.includes(x.time)
          ? false
          : true)
    );
  }

  ctx.session.check = ctx.session.times.filter((x) => x.clicked === false);

  ctx.editMessageText(
    "Choose the times you are unavailable:",
    Markup.inlineKeyboard([
      ...split(
        ctx.session.times.map((x) =>
          Markup.callbackButton(
            `${x.clicked ? "❌ " : ""}${x.time}`,
            `<${x.time}`
          )
        ),
        2
      ),
      [
        Markup.callbackButton(
          `${ctx.session.check.length ? "S" : "Des"}elect All`,
          "selectAll"
        ),
      ],
      [Markup.callbackButton("✅ Submit", "submitTimings")],
      [
        Markup.callbackButton("⬅️ Back", "sameUserAvailability"),
        mainMenuButton,
      ],
    ])
      .oneTime()
      .resize()
      .extra()
  );
});

selectTime.action(/^</, async (ctx) => {
  const clicked = ctx.update.callback_query.data.replace("<", "");

  await Promise.all(
    ctx.session.times.map((x) => {
      if (x.time === clicked) {
        x.clicked = x.clicked ? false : true;
      }
    })
  );

  ctx.session.check = ctx.session.times.filter((x) => x.clicked === false);

  ctx.editMessageText(
    "Choose the times you are unavailable:",
    Markup.inlineKeyboard([
      ...split(
        ctx.session.times.map((x) =>
          Markup.callbackButton(
            `${x.clicked ? "❌ " : ""}${x.time}`,
            `<${x.time}`
          )
        ),
        2
      ),
      [
        Markup.callbackButton(
          `${ctx.session.check.length ? "S" : "Des"}elect All`,
          "selectAll"
        ),
      ],
      [Markup.callbackButton("✅ Submit", "submitTimings")],
      [
        Markup.callbackButton("⬅️ Back", "sameUserAvailability"),
        mainMenuButton,
      ],
    ])
      .oneTime()
      .resize()
      .extra()
  );
});

selectTime.action("selectAll", async (ctx) => {
  ctx.session.check = ctx.session.times.filter((x) => x.clicked === false);

  if (ctx.session.check.length) {
    ctx.session.times.map((x) => {
      x.clicked = true;
    });
  } else {
    ctx.session.times.map((x) => {
      x.clicked = false;
    });
  }

  ctx.editMessageText(
    "Choose the times you are unavailable:",
    Markup.inlineKeyboard([
      ...split(
        ctx.session.times.map((x) =>
          Markup.callbackButton(
            `${x.clicked ? "❌ " : ""}${x.time}`,
            `<${x.time}`
          )
        ),
        2
      ),
      [
        Markup.callbackButton(
          `${ctx.session.check.length ? "Des" : "S"}elect All`,
          "selectAll"
        ),
      ],
      [Markup.callbackButton("✅ Submit", "submitTimings")],
      [
        Markup.callbackButton("⬅️ Back", "sameUserAvailability"),
        mainMenuButton,
      ],
    ])
      .oneTime()
      .resize()
      .extra()
  );
});

selectTime.action("submitTimings", async (ctx) => {
  const availabileTimings = [];
  ctx.session.times.map((x) => {
    if (!x.clicked) {
      availabileTimings.push(x.time);
    }
  });

  if (ctx.session.existingEntry) {
    await Days.updateOne(
      { name: ctx.session.updateUser, date: ctx.session.selectedDate },
      { timings: availabileTimings, updatedBy: ctx.from.username }
    );
  } else {
    const myDays = new Days({
      name: ctx.session.updateUser,
      date: ctx.session.selectedDate,
      timings: availabileTimings,
      updatedBy: ctx.from.username,
    });
    myDays.save();
  }

  ctx.editMessageText(
    `You have updated ${ctx.session.updateUser}'s unavailable timings for ${ctx.session.selectedDate}.`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton(
          `Update ${ctx.session.updateUser}'s Availability`,
          "sameUserAvailability"
        ),
      ],
      [Markup.callbackButton(`Update Availability`, "availability")],
      [mainMenuButton],
    ])
      .oneTime()
      .resize()
      .extra()
  );
  await ctx.scene.leave("selectTime");
});

bot.action("sameUserAvailability", (ctx) => {
  ctx.scene.enter("selectDate");

  ctx.editMessageText(
    "Choose the date you would like to fill in:",
    Markup.inlineKeyboard(
      ctx.session.dates.map((x) => [Markup.callbackButton(x, x)])
    )
      .oneTime()
      .resize()
      .extra()
  );
});

////////////////////////////////////////
//                                    //
//      Outstanding Chores Scene      //
//                                    //
////////////////////////////////////////

async function getOustanding() {
  const chores = await Chore.find();

  const outstanding = [];

  await Promise.all(
    chores.map(async (x) => {
      if (daysAgo(x.assignDate) <= 0) {
        outstanding.push({
          person: x.person,
          name: x.name,
          assignDate: x.assignDate,
        });
      }
    })
  );

  outstanding.sort((a, b) => {
    return (
      a.person.localeCompare(b.person) || dateDiff(b.assignDate, a.assignDate)
    );
  });

  return outstanding;
}

bot.action("outstanding", async (ctx) => {
  const outstanding = await getOustanding();
  if (outstanding.length) {
    ctx.replyWithMarkdown(
      `The outstanding chores are:${outstanding.map(
        (x) =>
          `\n\n*Name*: _${x.person}_, *Chore*: _${x.name}_, *Date*: _${x.assignDate}_`
      )}`,
      Markup.inlineKeyboard([[mainMenuButton]])
        .oneTime()
        .resize()
        .extra()
    );
    ctx.editMessageReplyMarkup();
  } else {
    ctx.editMessageText(`There are no chores to assign.`);
  }
});

////////////////////////////////////////
//                                    //
//        Assigning Chores Scene      //
//                                    //
////////////////////////////////////////
// function to get chores that need to be assigned
async function getAssignments() {
  const chores = await Chore.find({ frequency: { $lt: 28 } });

  const tasks = [];

  await Promise.all(
    chores.map(async (x) => {
      const daysBetween = 28 / x.frequency;
      if (!x.assignDate || daysAgo(x.assignDate) > daysBetween) {
        tasks.push({
          name: x.name,
          effort: x.effort,
          next: get_date(1),
          person: x.person,
        });
      } else if (daysAgo(x.assignDate) > 0) {
        tasks.push({
          name: x.name,
          effort: x.effort,
          next: get_date(daysBetween - daysAgo(x.assignDate)),
          person: x.person,
        });
      }
    })
  );

  return tasks;
}

// function to check if person is free for the day assigned
// if not available, a new person will be assigned
async function checkAvailability() {}

bot.action("assign", async (ctx) => {
  const outstandingChores = await getAssignments();

  const assigned = [];

  if (outstandingChores.length) {
    const users = await User.find();
    users.sort((x, y) => x.points - y.points);
    outstandingChores.sort((x, y) => x.effort - y.effort);

    outstandingChores.forEach(async (chore) => {
      const assignedUser = users.shift();
      await Chore.updateOne(
        { name: chore.name },
        { person: assignedUser.name, assignDate: chore.next }
      );
      users.push(assignedUser);
      await User.updateOne(
        { name: assignedUser.name },
        { points: assignedUser.points + chore.effort }
      );

      assigned.push({ chore: chore, person: assignedUser.name });
    });
    ctx.editMessageText(
      `Chores have been assigned.\n${assigned.map(
        (x) => `\n${x.person}: ${x.chore}`
      )}`,
      Markup.inlineKeyboard([
        [Markup.callbackButton("Outstanding Chores", "outstanding")],
        [mainMenuButton],
      ])
        .oneTime()
        .resize()
        .extra()
    );
  } else {
    ctx.editMessageText(
      `There are no chores to assign.`,
      Markup.inlineKeyboard([
        [Markup.callbackButton("Outstanding Chores", "outstanding")],
        [mainMenuButton],
      ])
        .oneTime()
        .resize()
        .extra()
    );
  }
});

bot.launch();
