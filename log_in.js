const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
const path = require("path");

app.get("/", (req, res) => res.type('html').send(html));

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Welcome to Kappa Sigma</title>
    <style>
      body {
        background: #185012;
        font-family: Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
      .login-container {
        background-color: #ffffff;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        width: 900px;
      }
      h2 {
        text-align: center;
        margin-bottom: 20px;
      }
      label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
      }
      input[type="text"],
      input[type="password"] {
        width: 100%;
        padding: 10px;
        margin-bottom: 15px;
        border: 1px solid #ccc;
        border-radius: 5px;
      }
      button {
        width: 100%;
        padding: 10px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
      }
      button:hover {
        background-color: #0056b3;
      }
    </style>
  </head>
  <body>
    <div id="login" style="display: block;">
      <h2>LOG IN</h2>
      <label for="username">Username</label>
      <input type="text" id="username" name="username" required>
            
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required>
            
      <button onclick="showScreen('home')">LOG IN</button> 
    <div>

    <div id="home" style="display: none;>
      <h2>Kappa Sigma Fraternity</h2>
    <div>

    <script>
      function showScreen(id) {
        document.querySelectorAll('div').forEach(div => div.style.display = 'none');
        document.getElementById(screenId).style.display = 'block';
      }
    </script>
  </body>
</html>
`
