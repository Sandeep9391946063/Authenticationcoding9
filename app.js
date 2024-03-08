const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const validatepassword = password => {
  return password.length > 4
}

// REGISTER API

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body

  const hasedPassword = await bcrypt.hash(password, 10)
  const SelectUserQuery = `SELECT * FROM user WHERE username = ${username};`

  const DatabaseUser = await db.get(SelectUserQuery)

  if (DatabaseUser === undefined) {
    const createUserQuery = `
    INSERT INTO
    user(username,name,password,gender,location)
    VALUES(
      '${username}',
      '${name}',
      '${hasedPassword}',
      '${gender}',
      '${location}');`

    if (validatepassword(password)) {
      await db.run(createUserQuery)
      response.send('User created successfully')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

///LOGIN API
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const SelectUserQuery = `SELECT * FROM user WHERE username = ${username}`

  const DatabaseUser = await db.get(SelectUserQuery)

  if (DatabaseUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordmatched = bcrypt.compare(password, DatabaseUser.password)
    if (isPasswordmatched === true) {
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body

  const SelectUserQuery = `SELECT * FROM user WHERE username = ${username}`

  const DatabaseUser = await db.get(SelectUserQuery)

  if (DatabaseUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordmatched = await bcrypt.compare(
      oldPassword,
      DatabaseUser.password,
    )
    if (isPasswordmatched === true) {
      if (validatepassword(newPassword)) {
        const hasedPassword = await bcrypt.hash(newPassword, 10)
        const UpdatePasswordQuery = `
        UPDATE
        user
        SET
          password ='${hasedPassword}'
        WHERE
          username = '${username}';`
        const user = await db.run(UpdatePasswordQuery)
        response.send('Password updated')
      } else {
        response.status(400)
        response.send('Password is too short')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})

module.exports = app
