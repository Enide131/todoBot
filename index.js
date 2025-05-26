const { Telegraf } = require('telegraf');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);

const tasks = {};

function scheduleTask(userId, task) {
  const delay = task.time.diff(dayjs());

  console.log(`Планируем задачу "${task.text}" через ${delay} мс (${task.time.format('DD.MM.YYYY HH:mm')})`);

  if (delay <= 0) {
    bot.telegram.sendMessage(userId, `⏰ Задача "${task.text}" наступила!`)
      .catch(err => console.error('Ошибка при немедленной отправке:', err));
    return;
  }

  task.timer = setTimeout(async () => {
    try {
      console.log(`Отправка сообщения для задачи "${task.text}" через ${delay} мс`);
      await bot.telegram.sendMessage(userId, `⏰ Задача "${task.text}" наступила!`);
      console.log(`Отправлено уведомление для задачи "${task.text}"`);
    } catch (err) {
      console.error(`Ошибка при отправке задачи "${task.text}" пользователю ${userId}:`, err);
    }

    // Удаляем задачу
    tasks[userId] = tasks[userId].filter(t => t.id !== task.id);
  }, delay);
}


bot.command('add', (ctx) => {
  const userId = ctx.from.id;
  const input = ctx.message.text.replace('/add ', '').trim();
  const parts = input.split('|');
  if (parts.length !== 2) return ctx.reply('Неверный формат! Используй:\n/add Текст задачи | ДД.MM.ГГГГ ЧЧ:ММ');

  const text = parts[0].trim();
  const timeStr = parts[1].trim();

  const time = dayjs(timeStr, 'DD.MM.YYYY HH:mm');
if (!time.isValid()) return ctx.reply('Неверная дата/время. Используй формат ДД.MM.ГГГГ ЧЧ:ММ');

  if (!tasks[userId]) tasks[userId] = [];

  const id = tasks[userId].length ? tasks[userId][tasks[userId].length - 1].id + 1 : 1;

  const task = { id, text, time, timer: null };
  tasks[userId].push(task);

  scheduleTask(userId, task);

  ctx.reply(`Задача добавлена с ID ${id}:\n"${text}" на ${time.format('DD.MM.YYYY HH:mm')}`);
});

bot.command('list', (ctx) => {
  const userId = ctx.from.id;
  const userTasks = tasks[userId];
  if (!userTasks || userTasks.length === 0) return ctx.reply('Список задач пуст.');

  let msg = 'Твои задачи:\n';
  userTasks.forEach(t => {
    msg += `ID ${t.id}: "${t.text}" — ${t.time.format('DD.MM.YYYY HH:mm')}\n`;
  });
  ctx.reply(msg);
});

bot.command('del', (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(' ');
  if (args.length !== 2) return ctx.reply('Используй: /del ID');

  const id = Number(args[1]);
  if (isNaN(id)) return ctx.reply('ID должен быть числом.');

  if (!tasks[userId]) return ctx.reply('Список задач пуст.');

  const taskIndex = tasks[userId].findIndex(t => t.id === id);
  if (taskIndex === -1) return ctx.reply(`Задача с ID ${id} не найдена.`);

  clearTimeout(tasks[userId][taskIndex].timer);
  tasks[userId].splice(taskIndex, 1);
  ctx.reply(`Задача с ID ${id} удалена.`);
});

bot.launch();

console.log('Бот запущен');
