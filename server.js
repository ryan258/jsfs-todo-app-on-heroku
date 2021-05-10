let express = require('express') // handle server business
let mongodb = require('mongodb') // give node the ability to work w/a mongo db
// this package will allow us to sanitize inputs
let sanitizeHTML = require('sanitize-html')

// create a server
let app = express()
let db

// if we're in the host env this will make sense
let port = process.env.PORT
// else we're local and we'll use our own port (localhost:3000)
if (port == null || port == '') {
  port = 3000
}

//! make contents of /public available in the root of our server
// - this is for STATIC files
app.use(express.static('public'))

//! create the connect()
let connectionString = 'mongodb+srv://Ryan:Sizzle66@cluster0.oi90j.mongodb.net/TodoApp?retryWrites=true&w=majority'

// args for mongodb.connect
// - 0 - the connection string for the mongo db
// - 1 - mongodb config object
// - 2 - fn that will be called after a connection has been made
//     - arg -
//           - 0 - err - if there was an error while connection
//           - 1 - client - contains info about the mongodb env that we just connected to
mongodb.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, client) {
  //! update the global db variable w/ data from our mongodb
  db = client.db()
  // - so this won't run until mongodb has established a connection
  //! listen for incoming requests
  app.listen(port)
})

// take async requests instead of submitted forms
app.use(express.json())

//! "hey express, add all form values to a body object! so we can get user's input data"
app.use(express.urlencoded({ extended: false }))

function passwordProtected(req, res, next) {
  //! v - arg0 - this will make the browser ask for use to auth themselves
  //! v - arg1 - this will give the app a name
  res.set('WWW-Authenticate', 'basic realm="Simple Todo App"')
  // next() says move on to the next function
  // next()
  console.log(req.headers.authorization)
  if (req.headers.authorization == 'Basic bGVhcm46amF2YXNjcmlwdA==') {
    // learn / javascript
    next()
  } else {
    res.status(401).send('Authentication required')
  }
}

//! apply password protection to all our routes
app.use(passwordProtected)

//! what server should do if there's a get request to the home page
// we can provide multiple functions in .get()
// app.get('/', passwordProtected, function (req, res) {
app.get('/', function (req, res) {
  //! this chain will make sure things are found in the DB before
  db.collection('items')
    .find() // the mongo way of saying "READ", in ()s we can add a query, finds the docs in our collection
    .toArray(function (err, items) {
      // toArray adds them to the items variable as a simple JS ARRAY as "items" and array of all the objects in the db
      // console.log(items);
      //! now we can pass in items
      // - but we will do the item rendering magic in public/browser.js
      res.send(`<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Simple To-Do App</title>
          <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha384-GJzZqFGwb1QTTN6wy59ffF1BuGJpLSa9DkKMp0DgiMDm4iYMj70gZWKYbI706tWS" crossorigin="anonymous">
        </head>
        <body>
          <div class="container">
            <h1 class="display-4 text-center py-1">👻 To-Do App 👻</h1>
            
            <div class="jumbotron p-3 shadow-sm">
              <form id="create-form" action="/create-item" method="POST">
                <div class="d-flex align-items-center">
                  <input id="create-field" name="item" autofocus autocomplete="off" class="form-control mr-3" type="text" style="flex: 1;">
                  <button class="btn btn-primary">Add New Item</button>
                </div>
              </form>
            </div>
            
            <ul id="item-list" class="list-group pb-5"></ul>
            
          </div>

          <script>
            let items = ${JSON.stringify(items)}
          </script>

          <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
          <script src="/browser.js"></script>
          
        </body>
        </html>`)
    })
})

//! note the CREATE pattern
app.post('/create-item', function (req, res) {
  // console.log(req.body.item);
  //! sanitize the input! - no HTML tags or attributes
  let safeText = sanitizeHTML(req.body.text, { allowedTags: [], allowedAttributes: {} })
  //! let's save the new item to the mongo database
  // - db variable is the mongo db we set up a connection to
  // - select 'items' collection in the database
  // - insertOne - create
  //   - args
  //     - 0 - the obect we're creating that will be stored in the DB
  //     - 1 - function to run AFTER the document has been placed in the DB
  db.collection('items').insertOne({ text: safeText }, function (err, info) {
    // res.send('thanks for submission!');
    // res.send("Success")
    // info - send back the JSON object that was just created
    // - insde the info js obj there will be an array called ops
    // - ops comes stock i guess
    res.json(info.ops[0])
  })
})

//! NOTE THE UPDATE PATTERN!
app.post('/update-item', function (req, res) {
  let safeText = sanitizeHTML(req.body.text, { allowedTags: [], allowedAttributes: {} })
  // console.log(req.body.text);
  db.collection('items')
    // vv this is a CRUD method
    .findOneAndUpdate(
      // arg0 - which item in the db collection
      { _id: new mongodb.ObjectId(req.body.id) },
      // arg1 - what to update on that item/doc - $set matters!
      { $set: { text: safeText } },
      // arg2 - the function that runs when this database action is complete
      function () {
        res.send('Success')
      }
    )
})

//! NOTE THE DELETE PATTERN!
app.post('/delete-item', function (req, res) {
  // .deleteOne(a, b)
  // - a - obj: which doc to delete
  // - b - fn: that runs after db action is complete
  db.collection('items').deleteOne({ _id: new mongodb.ObjectId(req.body.id) }, function () {
    res.send('success')
  })
})
