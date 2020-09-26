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
const Days = require("./models/days");

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const Markup = require("telegraf/markup");

const bot = new Telegraf(process.env.BOT_TOKEN);
const stage = new Stage();

function split(array, n) {
  let arr = array;
  var res = [];
  while (arr.length) {
    res.push(arr.splice(0, n));
  }
  return res;
}

const edit = new Scene("edit");
stage.register(edit);
const addChoreName = new Scene("addChoreName");
stage.register(addChoreName);
const addChoreEffort = new Scene("addChoreEffort");
stage.register(addChoreEffort);
const addChoreTime = new Scene("addChoreTime");
stage.register(addChoreTime);
const addChorePeople = new Scene("addChorePeople");
stage.register(addChorePeople);
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

bot.start((ctx) => {
  ctx.reply(
    `Main Menu`,
    Markup.inlineKeyboard([
      [Markup.callbackButton("🧹 Assign Chores", "assign")],
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
    Markup.callbackButton("➕ Add Chores", "add_chores"),
    Markup.callbackButton("👁️ View Chores", "view_chores"),
  ],
  [
    Markup.callbackButton("➕ Add Users", "add_users"),
    Markup.callbackButton("👁️ View Users", "view_users"),
  ],
];

bot.action("edit", (ctx) => {
  ctx.scene.enter("edit");
  ctx.editMessageText(
    `Hello ${ctx.from.first_name}, what would you like to do?`,
    Markup.inlineKeyboard(mainButton).oneTime().resize().extra()
  );
});

bot.action("main_screen", (ctx) => {
  ctx.reply(
    `Main Menu`,
    Markup.inlineKeyboard([
      [Markup.callbackButton("Assign Chores", "assign")],
      [
        Markup.callbackButton("Update Availability", "availability"),
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
  "main_screen"
);

////////////////////////////////////////
//                                    //
//        Adding Chores Scene         //
//                                    //
////////////////////////////////////////

edit.action("add_chores", (ctx) => {
  ctx.reply("Please enter the name of the chore");
  ctx.scene.enter("addChoreName");
  ctx.editMessageReplyMarkup();
});

const addChoreMarkup = [
  [Markup.callbackButton("Restart", "add_chores"), mainMenuButton],
];

addChoreName.on("text", async (ctx) => {
  ctx.session.chore = { name: ctx.update.message.text.trim() };

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
    ctx.reply(
      `You have added:\n\n${ctx.session.message}\nKey in the amount of time (in minutes) given to the chore.`,
      Markup.inlineKeyboard(addChoreMarkup).oneTime().resize().extra()
    );
    await ctx.scene.leave("addChoreEffort");
    ctx.scene.enter("addChoreTime");
  }
});

addChoreTime.on("text", async (ctx) => {
  ctx.session.chore.time = parseInt(ctx.update.message.text.trim());
  if (isNaN(ctx.session.chore.time)) {
    ctx.reply(`You did not enter a number. Please try again.`);
  } else if (ctx.session.chore.time < 0) {
    ctx.reply(
      `The number you entered is less than or equal to zero. Please try again.`
    );
  } else {
    ctx.session.message +=
      "Time taken: " + ctx.session.chore.time + " minutes\n";
    ctx.reply(
      `You have added:\n\n${ctx.session.message}\nKey in the frequency for the chore in a month (4 weeks).`,
      Markup.inlineKeyboard(addChoreMarkup).oneTime().resize().extra()
    );
    await ctx.scene.leave("addChoreTime");
    ctx.scene.enter("addChoreFrequency");
  }
});

addChoreFrequency.on("text", async (ctx) => {
  ctx.session.chore.frequency = parseInt(ctx.update.message.text.trim());
  if (isNaN(ctx.session.chore.frequency)) {
    ctx.reply(`You did not enter a number. Please try again.`);
  } else if (ctx.session.chore.frequency < 0) {
    ctx.reply(
      `The number you entered is less than or equal to zero. Please try again.`
    );
  } else {
    ctx.session.message +=
      "Frequency: " + ctx.session.chore.time + " times per month\n";
    ctx.reply(
      `You have added:\n\n${ctx.session.message}\nKey in the number of people required for the chore.`,
      Markup.inlineKeyboard(addChoreMarkup).oneTime().resize().extra()
    );
    await ctx.scene.leave("addChoreFrequency");
    ctx.scene.enter("addChorePeople");
  }
});

addChorePeople.on("text", async (ctx) => {
  ctx.session.chore.people = parseInt(ctx.update.message.text.trim());
  if (isNaN(ctx.session.chore.people)) {
    ctx.reply(`You did not enter a number. Please try again.`);
  } else if (isNaN(ctx.session.chore.people)) {
    ctx.reply(
      `The number you entered is less than or equal to zero. Please try again.`
    );
  } else {
    ctx.session.message += "People: " + ctx.session.chore.people + "\n";
    ctx.reply(
      `You have added:\n\n${ctx.session.message}\nWhat do you want to do next?`,
      Markup.inlineKeyboard([
        [Markup.callbackButton("✅ Submit", "submit_chore")],
        ...addChoreMarkup,
      ])
        .oneTime()
        .resize()
        .extra()
    );
    await ctx.scene.leave("addChorePeople");
  }
});

bot.action("submit_chore", (ctx) => {
  const myChore = new Chore({
    name: ctx.session.chore.name,
    effort: ctx.session.chore.effort,
    time: ctx.session.chore.time,
    people: ctx.session.chore.people,
  });

  myChore.save();

  ctx.reply(
    `The chore has been added!\n\n${ctx.session.message}`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton("➕ Add another chore", "add_chores"),
        Markup.callbackButton("👁️ View chores", "view_chores"),
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

edit.action("view_chores", async (ctx) => {
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
        [Markup.callbackButton("➕ Add Chores", "add_chores"), mainMenuButton],
      ])
        .oneTime()
        .resize()
        .extra()
    );
  }
});

const viewChoreMarkup = [
  [Markup.callbackButton("👁️ View chores", "view_chores"), mainMenuButton],
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
Frequency (times per month): ${ctx.session.existingChore.frequency}
Number of people required: ${ctx.session.existingChore.people}\n
Do you want to edit any information?`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton("Name", "<name"),
        Markup.callbackButton("Effort Points", "<effort"),
      ],
      [
        Markup.callbackButton("Time taken", "<time"),
        Markup.callbackButton("Frequency", "<frequency"),
      ],
      [Markup.callbackButton("Number of people", "<people")],
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
    `The chore "${ctx.session.existingChore.name}" has been removed.`,
    Markup.inlineKeyboard(viewChoreMarkup).oneTime().resize().extra()
  );
});

editChore.action(/^</, async (ctx) => {
  ctx.session.change = ctx.update.callback_query.data.replace("<", "");
  ctx.reply(`Please key in the new value for "${ctx.session.change}"`);
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
    case "time":
      ctx.session.value = parseInt(ctx.update.message.text.trim());
      if (success) {
        await Chore.updateOne(
          { name: ctx.session.existingChore.name },
          { time: ctx.session.value }
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
    case "people":
      ctx.session.value = parseInt(ctx.update.message.text.trim());
      if (success) {
        await Chore.updateOne(
          { name: ctx.session.existingChore.name },
          { people: ctx.session.value }
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
    ctx.reply(
      `"${ctx.session.change}" has been updated to ${ctx.session.value}.`,
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

edit.action("add_users", (ctx) => {
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
    ctx.reply(
      `You have requested to ${ctx.session.action}: ${ctx.session.username}`,
      Markup.inlineKeyboard([
        [
          Markup.callbackButton("Submit Name", "submit_name"),
          Markup.callbackButton("Re-type Name", "add_users"),
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

bot.action("submit_name", async (ctx) => {
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
    `${ctx.session.username} has been ${ctx.session.action}.`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton("➕ Add User", "add_users"),
        Markup.callbackButton("👁️ View Users", "view_users"),
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

edit.action("view_users", async (ctx) => {
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
        [Markup.callbackButton("➕ Add a user", "add_user")],
        [Markup.callbackButton("Update user data", "update_user")],
        [Markup.callbackButton("Delete a user", "delete_user")],
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
        [Markup.callbackButton("➕ Add Users", "add_users")],
        [mainMenuButton],
      ])
        .oneTime()
        .resize()
        .extra()
    );
  }
});

bot.action("update_user", async (ctx) => {
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
      [Markup.callbackButton("✂️ Edit name", "edit_name")],
      [mainMenuButton],
    ])
      .oneTime()
      .resize()
      .extra()
  );
});

updateUser.action("edit_name", async (ctx) => {
  await ctx.scene.enter("addUserName");
  ctx.reply(`Please enter the new name for ${ctx.session.updateUser}`);
  ctx.session.new = false;
});

bot.action("delete_user", async (ctx) => {
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
      [Markup.callbackButton("Delete Another", "delete_user")],
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
          `${ctx.session.check.length ? "Des" : "S"}elect All`,
          "select_all"
        ),
      ],
      [Markup.callbackButton("✅ Submit", "submit_timings")],
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
  ctx.session.check = ctx.session.times.filter((x) => x.clicked === false);
  const clicked = ctx.update.callback_query.data.replace("<", "");

  ctx.session.times.map((x) => {
    if (x.time === clicked) {
      x.clicked = x.clicked ? false : true;
    }
  });

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
          "select_all"
        ),
      ],
      [Markup.callbackButton("✅ Submit", "submit_timings")],
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

selectTime.action("select_all", async (ctx) => {
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
          "select_all"
        ),
      ],
      [Markup.callbackButton("✅ Submit", "submit_timings")],
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

selectTime.action("submit_timings", async (ctx) => {
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
//      Assigning Chores Scene        //
//                                    //
////////////////////////////////////////

bot.action("assign", async (ctx) => {});

bot.launch();
