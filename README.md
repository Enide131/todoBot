✅ Telegram Todo Bot
A simple and lightweight Telegram bot for managing personal tasks with automatic reminders and PostgreSQL storage.

📌 Features
Add tasks with time (DD.MM HH:mm or just HH:mm)

List all upcoming tasks

Delete tasks by ID

Get notified 2 hours before the task time

Store all data in a PostgreSQL database

Automatically remove outdated tasks

🧪 Example Commands
bash
Копіювати
Редагувати
/add Finish homework | 22.06 17:00
/list
/del 5
Bot will send:
⏰ Task "Finish homework" is coming up! (2 hours before the scheduled time)

🛠 Technologies Used
Node.js

Telegraf.js – Telegram Bot API framework

Day.js – Lightweight JavaScript date library

PostgreSQL – For storing tasks

📥 Installation
Clone the repository:

git clone https://github.com/yourusername/todo-bot.git
cd todo-bot
Install dependencies:


npm install
Create a .env file and set your environment variables:

env
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_postgresql_connection_string
Start the bot:

node index.js
📌 How It Works
Users send commands to add tasks.

Each task is scheduled to trigger a notification 2 hours before the due time.

Tasks are stored in a PostgreSQL database.

Expired tasks are automatically cleaned up.

When the bot restarts, it reloads and reschedules all upcoming tasks.

