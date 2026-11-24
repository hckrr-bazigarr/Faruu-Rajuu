💬 BaziGarr — Real-Time Private Chat Application

<p align="center">
  <img src="hacker.jpg" width="100%" alt="Faruu-Rajuu Chat Application">
</p><p align="center">
  <b>A Real-Time Messaging Experience with Voice Calling and Interactive Features.</b>
</p><p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js&logoColor=white">
  <img src="https://img.shields.io/badge/Express.js-Backend-black?style=for-the-badge&logo=express">
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-white?style=for-the-badge&logo=socket.io">
  <img src="https://img.shields.io/badge/MongoDB-Database-green?style=for-the-badge&logo=mongodb">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge">
</p>---

📌 About

Faruu-Rajuu is a real-time private chat web application designed to deliver an interactive messaging experience with a modern, mobile-friendly interface.

Built using Node.js, Express.js, Socket.IO, and MongoDB, the application supports instant messaging, persistent chat history, voice communication, online presence, and interactive personal features.

It combines real-time communication with a customized interface and engaging features to create a unique private chatting experience.

✨ Features

Feature| Description
💬 Real-Time Messaging| Instant message exchange using Socket.IO
🔐 Passcode Screen| Passcode-based chat unlock interface
📞 Voice Calling| Peer-to-peer audio calling with WebRTC signaling
✓✓ Message Status| Sent, delivered, and read indicators
❤️ Message Reactions| React to messages with emojis
↩️ Reply to Messages| Reply to specific messages
✏️ Edit Messages| Modify previously sent messages
🗑️ Delete Messages| Delete messages for yourself or everyone
🖼️ Image Sharing| Share images with client-side compression
🟢 Online Presence| Display currently active users
⌨️ Typing Indicator| Show when someone is typing
💌 Special Notes| Send personalized notes
🎁 Interactive Scratch Cards| Reveal hidden messages through scratching
⏳ Days Together Counter| Display a live relationship day counter
💾 Message Persistence| Store chat history using MongoDB
📱 Responsive Interface| Optimized for mobile and desktop screens

🛠️ Technology Stack

Technology| Purpose
HTML5| Application structure
CSS3| Styling and responsive interface
JavaScript| Frontend functionality
Node.js| Server-side runtime
Express.js| Web server framework
Socket.IO| Real-time communication
MongoDB| Database
Mongoose| MongoDB object modeling
WebRTC| Peer-to-peer audio communication
Render| Application hosting

⚙️ Requirements

Before installation, make sure you have:

- Node.js 18 or newer
- npm
- Git
- A MongoDB database
- A modern web browser

🚀 Installation

Step 1 — Clone Repository

git clone https://github.com/hckrr-bazigarr/Faruu-Rajuu.git

Step 2 — Open Project Directory

cd Faruu-Rajuu

Step 3 — Install Dependencies

npm install

Step 4 — Configure MongoDB

Create a MongoDB database and obtain its connection URI.

Set the database connection string as an environment variable:

export MONGO_URI="your_mongodb_connection_string"

Important: Replace the example value with your own MongoDB URI. Never publish database credentials or API secrets in your source code.

Step 5 — Start the Server

npm start

Step 6 — Open in Browser

http://localhost:3000

Your local chat server should now be running.

🌐 Live Demo

<p align="center">
  <a href="https://bazigar-moonie.onrender.com/">
    <img src="https://img.shields.io/badge/OPEN-LIVE%20APPLICATION-00C853?style=for-the-badge&logo=googlechrome&logoColor=white">
  </a>
</p>Live Application: https://bazigar-moonie.onrender.com/

📁 Project Structure

Faruu-Rajuu/
│
├── README.md
├── package.json
├── package-lock.json
├── server.js
├── index.html
├── hacker.jpg
├── unlock.mp4
└── .gitignore

☁️ Deployment

The application can be deployed on platforms such as Render.

General deployment configuration:

Setting| Value
Runtime| Node.js
Build Command| "npm install"
Start Command| "npm start"
Environment| "MONGO_URI"
Port| Automatically configured through "process.env.PORT"

Add your MongoDB connection string through the hosting platform's environment-variable settings. Do not commit it to GitHub.

🔒 Security Notice

- Keep database credentials private.
- Use environment variables for sensitive configuration.
- Never commit ".env" files or production secrets.
- Use HTTPS for public deployments.
- The passcode interface should not be treated as server-side authentication.
- Review access controls and WebSocket event permissions before using the application for sensitive conversations.

👨‍💻 Developer

<p align="center">
  <b>BAZIGARR</b>
  <br>
  Developer & Project Creator
  <br>
  <a href="https://github.com/hckrr-bazigarr">GitHub Profile</a>
</p>⭐ Support

If you find this project interesting:

- ⭐ Star the repository.
- 🍴 Fork the project.
- 🐛 Report bugs through GitHub Issues.
- 💡 Suggest improvements.
- 🤝 Contributions are welcome.

---

<p align="center">
  <b>💬 FARUU-RAJUU</b>
  <br>
  <i>Connected in Real Time. Designed with Care.</i>
  <br><br>
  Made with ❤️ by BaziGarr
</p>
