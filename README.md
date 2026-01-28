
# STAR SMM Panel - Telegram Bot (Node.js)

This is a Node.js bot that connects to your Firebase project to automate deposit request approvals and manage order statuses via Telegram.

## Setup Instructions

Follow these steps to get the bot running on your server or local machine.

### 1. Install Dependencies

First, you need to install Node.js (version 18 or newer is recommended). Then, open your terminal in this project directory and run:

```bash
npm install
```

This will install all the required packages listed in `package.json`.

### 2. Configure Firebase Admin (Database Connection)

The bot needs permission to access your Firestore database. This is the most important step.

1.  Go to your **Firebase Console**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  Select your project (`emote-80757`).
3.  Click the gear icon next to "Project Overview" and select **Project settings**.
4.  Go to the **Service accounts** tab.
5.  Click **"Generate new private key"**. A JSON file will be downloaded.
6.  **Rename** this downloaded file to `serviceAccountKey.json`.
7.  **Place** the `serviceAccountKey.json` file in the same directory as `bot.js`.

**Security Warning:** This file is the **key** to connecting your bot to the database. It gives full admin access to your Firebase project. Keep it secret and never share it publicly.

### 3. Configure Telegram Bot (.env file)

You need to provide your bot's secret token and channel IDs in a `.env` file. This is the most common place for errors.

1.  Create a **new file** in the same directory as `bot.js` and name it exactly **`.env`**.
2.  Copy the entire block of code below and paste it into your new `.env` file.
3.  Replace the placeholder values with your actual keys and IDs.

```env
# 1. Get this token from @BotFather on Telegram when you create your bot.
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE

# 2. Get this by sending a message to @MyIDBot on Telegram.
TELEGRAM_OWNER_ID=YOUR_PERSONAL_TELEGRAM_ID_HERE

# 3. Channel ID for Deposit Requests. MUST START WITH -100
TELEGRAM_DEPOSITS_CHANNEL_ID=YOUR_DEPOSITS_CHANNEL_ID_HERE

# 4. Channel ID for Standard Order Notifications. MUST START WITH -100
TELEGRAM_STANDARD_ORDERS_CHANNEL_ID=YOUR_STANDARD_ORDERS_CHANNEL_ID_HERE

# 5. Channel ID for Limited Offer Order Notifications. MUST START WITH -100
TELEGRAM_LIMITED_ORDERS_CHANNEL_ID=YOUR_LIMITED_ORDERS_CHANNEL_ID_HERE
```

#### How to Get Channel IDs Correctly (To Avoid "Chat Not Found" Error)

1.  **Create your channel(s)** on Telegram.
2.  **Add your bot** to each channel as an **Administrator**. Ensure it has the permission to `Post Messages`. This is a critical step.
3.  **Find the ID**: Forward any message *from your channel* to a helper bot like **@username_to_id_bot** or **@MyIDBot**.
4.  **Copy the ID**: The helper bot will reply with the channel's ID. For any public or private channel, it **must** start with `-100`. For example: `-1001234567890`.
5.  **Paste the full ID** (including the `-`) into your `.env` file for the correct variable.

### 4. Run the Bot

Once everything is configured, you can start the bot with this command:

```bash
npm start
```

Or directly:

```bash
node bot.js
```

The bot will now be running. You should receive a startup message from the bot in your personal chat on Telegram. To keep it running permanently on a VPS, you can use a process manager like `pm2`.

```bash
# Install pm2 globally (if not already installed)
npm install pm2 -g

# Start the bot with pm2
pm2 start bot.js --name "smm-telegram-bot"

# To see logs
pm2 logs smm-telegram-bot

# To stop the bot
pm2 stop smm-telegram-bot

# To restart the bot
pm2 restart smm-telegram-bot
```
