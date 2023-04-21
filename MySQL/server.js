var express = require('express');
var app = express();
var myParser = require("body-parser");
var session = require('express-session');
var products_data = require('./products.json');
var nodemailer = require('nodemailer');
var cookieParser = require('cookie-parser');
var fs = require('fs');
var qs = require('qs');
const queryString = require('query-string');
const res = require('express/lib/response');
//Defines file in variable for later usage
var filename = 'user_data.json';
app.use(cookieParser());

app.use(myParser.urlencoded({ extended: true }));
app.use(session({secret: "ITM352 rocks!",resave: false, saveUninitialized: true, cookie: {secure: false }}));

app.all('*', function (request, response, next) {
  // need to initialize an object to store the cart in the session. We do it when there is any request so that we don't have to check it exists
  // anytime it's used
  if (typeof request.session.cart == 'undefined') { request.session.cart = {}; }
  request.session.save();
  next();
});

//Checks for file
if (fs.existsSync(filename)) {
    stats = fs.statSync(filename);
    console.log(`user_data.json has ${stats['size']} characters`);
    var data = fs.readFileSync(filename, 'utf-8');
    var users_reg_data = JSON.parse(data);
} else {
    console.log (`Error: ${Filename} does not exist.`);
}

//Processes user login, code taken and expanded upon from lab 14 and assignment 2 examples
app.post("/process_login", function (req, res) {
  var LogError = [];
  the_email = req.body.email.toLowerCase(); //Formatting of username to fit specifications
  if (typeof users_reg_data[the_email] != 'undefined') { 
    if (req.body.password == users_reg_data[req.body.email].password) {
      var users_pass = req.body.password;
      res.cookie(`users_name`, the_email, {maxAge: 5 * 60 * 1000});
      res.cookie('session_id', req.sessionID, {maxAge: 5 * 60 * 1000});
      console.log(req.cookies);
    //  response.send(`cookie sent for ${users_name}`);
    res.redirect('/invoice.html?' + 'email=' + req.body.email);
    //This redirects to the invoice if the appropriate password is entered
    } else { //Wrong password
        LogError.push = ('Invalid Password');
        console.log(LogError);
        req.query.email= the_email;
        req.query.name= users_reg_data[the_email].name;
        req.query.LogError=LogError.join(';');
    }
  } else { //States invalid email and redirects
      LogError.push = ('Invalid Username');
      console.log(LogError);
      req.query.email= the_email;
      req.query.LogError=LogError.join(';');
  }
  res.redirect('./login_page.html?' + qs.stringify(req.query));
});


//To create code on server side
//Taken from assignment 2
app.post("/process_registration", function (req, res) {
  qstr = req.body;
  console.log(qstr);
  var errors = [];

  if (/^[A-Za-z]+$/.test(req.body.name)) { //Allows for only letters
  }
  else {
    errors.push('Use Only Letters for Full Name');
  }
  // Checks for full name
  if (req.body.name == "") {
    errors.push('Invalid Full Name');
  }
  // Need length of full name, fix in order to make it fit
if ((req.body.fullname.length > 25 && req.body.fullname.length <0)) {
  errors.push('Full Name Too Long');
}
//checks email 
  var reguser = req.body.email; 
  if (typeof users_reg_data[reguser] != 'undefined') { //Gives error
    errors.push('Email taken --> Hit back arrow to go back and edit');
  }

  //password needs to be 6 characters
  if (req.body.password.length < 6) {
    errors.push('Password Too Short --> Hit back arrow to go back and edit');
  }
  // matches passwords and checks
  if (req.body.password !== req.body.repeat_password) { 
    errors.push('Password Not a Match');
  }
  //Shows error, code taken directly from code 14
  if (errors.length == 0) {
    POST = req.body;
    console.log('no errors');
    var email = POST['email'];
    users_reg_data[email] = {}; 
    users_reg_data[email].name = email;
    users_reg_data[email].password= POST['password'];
    data = JSON.stringify(users_reg_data); 
    fs.writeFileSync(filename, data, "utf-8");
    console.log(email);
    res.redirect('./invoice.html?' + qs.stringify(req.query));
  }

  if (errors.length > 0) {
      console.log(errors);
      req.query.name = req.body.name;
      req.query.password = req.body.password;
      req.query.repeat_password = req.body.repeat_password;
      req.query.email = req.body.email;

      req.query.errors = errors.join(';');
      res.send(req.query.errors);
      res.redirect('./registration.html?' + qs.stringify(req.query));
  }
});

//taken from Prof Ports assignment 3 example code
app.get("/get_products_data", function (request, response) {
  response.json(products_data);
});

app.get("/get_cart_total", function (req, res) {
  let cart_total = 0;
  const currentCart = req.session.cart;

  for (let product_key of Object.keys(currentCart)) {
    for (let product_name of Object.keys(currentCart[product_key])) {
      cart_total += currentCart[product_key][product_name]
    }
  }
  
  res.json({ cart_total });
});

app.get("/calc_cart", function(req, res) {
  const currentCart = req.session.cart;

  let subtotal = 0;
  for (let product_key of Object.keys(currentCart)) {
    for (let product_name of Object.keys(currentCart[product_key])) {
      let product = products_data[product_key].find(product => product.name === product_name);
      let quantity = currentCart[product_key][product_name];

      let extended_price = quantity * product.price;
      subtotal += extended_price;
    }
  }
                  
  // Compute sales tax
  var tax_rate = 0.0575;
  var sales_tax = subtotal * tax_rate;

  let shipping_cost = 0;
  // Compute shipping costs
  if (subtotal <= 50) {
    shipping_cost = 2;
  } else if (subtotal <= 100) {
    shipping_cost = 5;
  } else {
    shipping_cost = subtotal * 0.05;
  }

  // Compute grand total
  grand_total = subtotal + sales_tax;
  res.json({ subtotal, sales_tax, shipping_cost, grand_total });
});

app.get('/invoice', function (req, res) {
  res.redirect('/invoice.html?' + 'email=' + req.body.email);
})

//taken from Prof Ports assignment 3 example code
app.get("/add_to_cart", function (req, res) {
  console.log(req.query)
  var products_key = req.query['products_key']; // get the product key sent from the form post
  var product_name = req.query['product_name'];
  var quantities = Number(req.query['quantities']); // Get quantities from the form post and convert strings from form post to numbers

  const currentCart = req.session.cart;
  console.log(req.session.cart)

  if (currentCart[products_key]) {
    currentCart[products_key] = { ...currentCart[products_key], [product_name]: quantities };

  } else {
    currentCart[products_key] = { [product_name]: quantities };

  }

  req.session.cart = currentCart;
  res.redirect('./cart.html');
});

app.get("/update_cart", function(req, res) {
  const currentCart = req.session.cart;

  var product_key = req.query['product_key']; // get the product key sent from the form post
  var product_name = req.query['product_name'];
  var update = req.query['update'];

  console.log({ product_name, product_key, update});

  if (update === 'Add') {
    currentCart[product_key][product_name] += 1;

  } else {
    currentCart[product_key][product_name] -= 1;
  }

  if (currentCart[product_key][product_name] === 0) {
    delete currentCart[product_key][product_name]
  }

  req.session.cart = currentCart;
  res.redirect('./cart.html');
})

//taken from Prof Ports assignment 3 example code
app.get("/get_cart", function (request, response) {
  response.json(request.session.cart);
});


//taken from Prof Ports assignment 3 example code
app.get("/checkout", function (request, response) {
  //1: get cookies for username
  //2: if statement validation - if not logged in redired to login page ==> pseudo to check cookies

                               // if logged in continue;
  var user_email = request.query.email; // email address in querystring
// Generate HTML invoice string
  var invoice_str = `Thank you for your order ${user_email}!<table border><th>Quantity</th><th>Item</th>`;
  var shopping_cart = request.session.cart;
  for(product_key in products_data) {
    for(i=0; i<products_data[product_key].length; i++) {
        if(typeof shopping_cart[product_key] == 'undefined') continue;
        qty = shopping_cart[product_key][i];
        if(qty > 0) {
           subtotal = 0;
          
           extended_price = qty[i] * products_data[product_key][i].name;
           subtotal += extended_price;
           var tax_rate = 0.0575;
           var sales_tax = subtotal * tax_rate;
  
          // Compute shipping costs
          if (subtotal <= 50) {
            shipping_cost = 2;
          } else if (subtotal <= 100) {
            shipping_cost = 5;
          } else {
            shipping_cost = subtotal * 0.05;
          }
  
          // Compute grand total
          var grand_total = subtotal + sales_tax;
          invoice_str += `<tr><td>${qty}</td><td>${products_data[product_key][i].name}</td><td>${products_data[product_key][i].price}</td><td>${extended_price}</td>td>${grand_total}</td><tr>
          
          
          
          `;
        }
    }
}
  invoice_str += '</table>';



//taken from Prof Ports assignment 3 example code
// Set up mail server. Only will work on UH Network due to security restrictions
  var transporter = nodemailer.createTransport({
    host: "smtp.hawaii.edu",
    port: 25,
    secure: false, // use TLS
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false
    }
  });

  var mailOptions = {
    from: 'keycappa@gmail.com',
    to: user_email,
    subject: 'Your keytacular invoice',
    html: invoice_str
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      invoice_str += '<br>There was an error and your invoice could not be emailed :(';
    } else {
      invoice_str += `<br>Your invoice was mailed to ${user_email}`;
    }
    response.send(invoice_str);
  });

});

app.use(express.static('./public'));
app.listen(8080, () => console.log(`listening on port 8080`));