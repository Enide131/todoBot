const { Telegraf } = require('telegraf');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const db = require('./db');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const tasks = {};

function scheduleTask(userId, task) {
  const delay = task.time.diff(dayjs()) - 2 * 60 * 60 * 1000; // вычтем 2 часа

  if (delay <= 0) {
    console.log(`Пропущена просроченная задача "${task.text}"`);
    return;
  }

  task.timer = setTimeout(async () => {
    try {
      console.log(`Отправка уведомления: "${task.text}"`);
      await bot.telegram.sendMessage(userId, `⏰ Задача "${task.text}" наступила!`);

      await pool.query('DELETE FROM tasks WHERE id = $1', [task.id]);
      console.log(`Задача "${task.text}" удалена из базы`);
    } catch (err) {
      console.error(`Ошибка при отправке задачи "${task.text}":`, err);
    }

    tasks[userId] = tasks[userId].filter(t => t.id !== task.id);
  }, delay);
}

bot.command('start', (ctx) => {
  ctx.reply('Привет! Я бот для управления задачами. Используй /add для добавления задачи, /list для просмотра и /del для удаления.'); 
});

bot.command('add', async (ctx) => {
  const userId = ctx.from.id;
  const input = ctx.message.text.replace('/add ', '').trim();
  const parts = input.split('|');
  if (parts.length !== 2) return ctx.reply('Неверный формат! Используй:\n/add Текст задачи | ДД.MM ЧЧ:ММ или просто ЧЧ:ММ)');



  const text = parts[0].trim();
  const dateTimeStr = parts[1].trim();


  const now = dayjs();
  let time = dayjs(`${dateTimeStr} ${now.year()}`, 'DD.MM HH:mm YYYY');

  if (dateTimeStr.includes(' ')) 
  {
    time = dayjs(`${dateTimeStr} ${now.year()}`, 'DD.MM HH:mm YYYY');
    if (time.isValid() && time.isBefore(now)) time = time.add(1, 'year');
  } 
  else 
  {
    time = dayjs(`${now.format('DD.MM.YYYY')} ${dateTimeStr}`, 'DD.MM.YYYY HH:mm');
    if (time.isValid() && time.isBefore(now)) time = time.add(1, 'day');
  }

  if (!time.isValid()) return ctx.reply('Неверная дата/время. Используй формат ДД.MM ЧЧ:ММ');

  const result = await db.query(
    'INSERT INTO tasks(user_id, text, time) VALUES ($1, $2, $3) RETURNING id',
    [userId, text, time.toDate()]
  );

  const task = { id: result.rows[0].id, text, time, timer: null };
  if (!tasks[userId]) tasks[userId] = [];
  tasks[userId].push(task);
  scheduleTask(userId, task);

  ctx.reply(`Задача добавлена с ID ${task.id}:\n"${text}" на ${time.format('DD.MM.YYYY HH:mm')}`);
});



bot.command('list', async (ctx) => {
  const userId = ctx.from.id;
  const res = await db.query('SELECT id, text, time FROM tasks WHERE user_id = $1 ORDER BY time', [userId]);
  if (res.rows.length === 0) return ctx.reply('Список задач пуст.');

  let msg = 'Твои задачи:\n';
  res.rows.forEach(t => {
    msg += `ID ${t.id}: "${t.text}" — ${dayjs(t.time).format('DD.MM.YYYY HH:mm')}\n`;
  });
  ctx.reply(msg);
});

bot.command('del', async (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(' ');
  if (args.length !== 2) return ctx.reply('Используй: /del ID');

  const id = Number(args[1]);
  if (isNaN(id)) return ctx.reply('ID должен быть числом.');

  await db.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userId]);

  if (tasks[userId]) {
    const i = tasks[userId].findIndex(t => t.id === id);
    if (i !== -1) {
      clearTimeout(tasks[userId][i].timer);
      tasks[userId].splice(i, 1);
    }
  }

  ctx.reply(`Задача с ID ${id} удалена.`);
});

bot.launch();
console.log('Бот запущен');

(async () => {
  try {
    const res = await db.query('SELECT id, user_id, text, time FROM tasks');
    const now = dayjs();

    for (const row of res.rows) {
      const taskTime = dayjs(row.time);

      if (taskTime.isBefore(now)) {
        console.log(`Удаление просроченной задачи "${row.text}" (ID ${row.id})`);
        await db.query('DELETE FROM tasks WHERE id = $1', [row.id]);
        continue;
      }

      const task = {
        id: row.id,
        text: row.text,
        time: taskTime,
        timer: null,
      };

      if (!tasks[row.user_id]) tasks[row.user_id] = [];
      tasks[row.user_id].push(task);
      scheduleTask(row.user_id, task);
    }

    console.log('Все актуальные задачи загружены');
  } catch (err) {
    console.error('Ошибка при загрузке задач:', err);
  }
})();