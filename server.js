const express =  require('express');
const bodyParser = require('body-parser');
// const request = require('request');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const async = require('async');
const nanoid = require("nanoid");
const session = require('express-session');
const formidable = require('formidable');
const fs = require('fs');

const validator = require('./helper/validator.js');
// const viewHelper = require('./helper/view_helper');

const appConfig = {
  url: 'http://localhost:3000',
  port: 3000,
  app_message: 'Test app started...',
  tokenTime: 30, // minute
  mail_service: 'gmail',
  mail_user: 'tktthack@gmail.com',
  mail_pass: '01686601430',
  image_path: './public/uploads/images/',
  reset_password_token_length: 6,

  mysql_connection: {
    host: 'localhost',
    user: 'root',
    password: 'vantho',
    database: 'chat'
  }

};

const gmail = nodemailer.createTransport({
  service: appConfig.mail_service,
  auth: {
    user: appConfig.mail_user,
    pass: appConfig.mail_pass
  }
});

const app = express();

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(session({
  cookieName: 'session',
  secret: 'random_string_goes_here',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  resave: true,
  saveUninitialized: true
}));

// Set up mysql
const mySql = mysql.createConnection(appConfig.mysql_connection);

mySql.connect((err) => {
  if (err) throw err;
  console.log('Connected database!');
});

showHome = (req, res) => {
  async.waterfall([
    (callback) => {
      mySql.query("SELECT * FROM items ORDER BY created_at DESC LIMIT 6",[], (error, newItem) => {
        if (error) throw error;
        callback(null, newItem);
      });
    },
    (newItem, callback) => {
      mySql.query("SELECT * FROM items ORDER BY sold DESC LIMIT 6",[], (error, hotItem) => {
        if (error) throw error;
        callback(null, newItem, hotItem);
      });
    }
  ], (error, newItem, hotItem) => {
    if (error) throw error;
    res.render('index', {newItem: newItem, hotItem: hotItem});
  });
};

showRegisterForm = (req, res) => {
  res.render('register');
};

showLoginForm = (req, res) => {
  res.render('login');
};

userRegister = (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let name = req.body.name;

  // an field is missing
  if (!validator.lengthValid(email, 5, 200) || !validator.lengthValid(password, 5, 100)) {
    res.render('register', {error: 'Chieu dai e or pass'});
  } else if (!validator.lengthValid(name, 5, 200)) {
    res.render('register', {error: 'Chieu dai ten'});
  } else {
    // password length not satisfied
    if (password.length < 8 || password.length > 20) {
      res.render('register', {error: 'do dai'});
    } else if (!validator.isEmail(email)) { // Wrong format
      res.render('register', {error: 'dinh dang email'});
    } else if (!validator.alphabetOnly(password)) {
      res.render('register', {error: 'dinh dang password'});
    } else {
      // Check if exist before
      mySql.query("SELECT * FROM users WHERE email=?", [email], function (error, result) {
        if (error) throw error;
        if (result.length > 0 && parseInt(result[0]['confirmed']) === 1) {
          res.render('register', {error: 'email da dang ky'});
        } else {
          if (result.length > 0) {
            mySql.query("DELETE FROM users WHERE email = ?", [email]);
          }
          bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt, function(err, hash) {
              if (err) throw err;
              // Generate an token
              let token = nanoid();
              let tokenExpired = new Date();
              tokenExpired.setMinutes(tokenExpired.getMinutes() + appConfig.tokenTime);
              mySql.query("INSERT INTO users (email, name, password, confirmed, token, token_expired_at) VALUES (?, ?, ?, ?, ?, ?)", [email, name, hash, 0, token, tokenExpired], (error) => {
                if (error) throw error;
                // Send an email
                let mailBody = `De hoan tat dang ky:
                        link: ${appConfig.url}/confirm-email?email=${email}&token=${token}"`;
                sendMail('Admin', email, 'Hoan tat dang ky thanh', mailBody, (error) => {
                  if (error) throw error;
                  res.render('register', {message: `Email da duoc gui toi ${email}, hay xac nhan trong 30p`});
                });
              })
            });
          });
        }
      });
    }
  }
};

userLogin = (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  if (!validator.lengthValid(email, 5, 200) || !validator.lengthValid(password, 5, 100)) {
    res.render('login', {error: 'e or pass invalid'});
  } else {
    mySql.query("SELECT * FROM users WHERE email=? AND confirmed=?", [email, 1], (error, result) => {
      if (error) throw error;
      if (result.length === 0) {
        res.render('login', {error: 'Sai thogn tin1'});
      } else {
        let user = result[0];
        bcrypt.compare(password, user['password'], (error, result) => {
          if (error) throw error;
          if (result) {
            req.session.user = {
              id: user['id'],
              name: user['name'],
              email: user['email'],
              level: parseInt(user['level']),
              logged_in: true
            };
            res.render('login', {error: 'Dang nhap thanh cong'});
          } else {
            res.render('login', {error: 'Sai thogn tin2'});
          }
        })
      }
    });
  }
};

confirmRegisterEmail = (req, res) => {
  let email = req.query.email;
  let token = req.query.token;
  if (!email || !token || email.length > 100 || token.length > 100) {
    res.render('message-only', {message: 'Xac minh that bai1'});
  } else {
    mySql.query("SELECT token, token_expired_at FROM users where email=? and confirmed=?", [email, 0], (error, result) => {
      if (error) throw error;
      if (!(result.length > 0 && new Date() < Date.parse(result[0]['token_expired_at']))) {
        res.render('message-only', {message: 'Xac minh that bai2'});
      } else {
        mySql.query("UPDATE users SET confirmed = ?, token=?, token_expired_at=?", [1, '', ''], (error) => {
          if (error) throw error;
          res.render('message-only', {message: 'Da xac minh'});
        })
      }
    });
  }
};

showForgotPasswordForm = (req, res) => {
  res.render('forgot_password');
};

createPasswordRecoverEmail = (req, res) => {
  let email = req.body.email;
  if (email && validator.lengthValid(email, 5, 100) && validator.isEmail(email)) {
    mySql.query("SELECT * FROM users WHERE email = ? AND confirmed = ?", [email, 1], (err, result) => {
      if (err) throw err;
      if (result.length === 0) {
        return res.json({
          status: 'failed',
          message: 'not found'
        });
      } else {
        let token = nanoid(appConfig.reset_password_token_length);
        let tokenExpired = new Date();
        tokenExpired.setMinutes(tokenExpired.getMinutes() + appConfig.tokenTime);
        mySql.query("UPDATE users SET token=?, token_expired_at=? WHERE email=?", [token, tokenExpired, email], (error) => {
          if (error) throw error;
          // Send an email
          let mailBody = `Vui long nhap ma sau de lay lai mat khau: ${token}`;
          sendMail('Admin', email, 'Khoi phuc lai mat khau', mailBody, (error) => {
            if (error) throw error;

            return res.json({
              status: 'success',
              message: 'Đã gửi Email khôi phục mật khẩu!'
            })
          });
        })
      }
    })
  } else {
    res.json({
      status: 'failed',
      message: 'Email không hợp lệ!'
    })
  }
};

confirmEmailResetPassword = (req, res) => {
  let email = req.body.email;
  let token = req.body.token;
  let password = req.body.password;

  if (!email || !validator.lengthValid(email, 5, 100) || !validator.isEmail(email)) {
    return res.json({
      status: 'failed',
      error_field: 'email'
    });
  } else if (token || token.length !== appConfig.reset_password_token_length) {
    return res.json({
      status: 'failed',
      error_field: 'token'
    });
  } else if (password || !validator.lengthValid(password, 5, 100)) {
    return res.json({
      status: 'failed',
      error_field: 'password'
    });
  } else {
    mySql.query("SELECT * FROM users WHERE email = ? AND confirmed = ?", [email, 1], (err, result) => {
      if (err) throw err;
      if (result.length === 0) {
        return res.json({
          status: 'failed',
          message: 'not found'
        });
      } else {
        if (new Date() < Date.parse(result[0]['token_expired_at'])) {
          return res.json({
            status: 'failed',
            message: 'token expired'
          })
        } else {
          bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt, function(err, hash) {
              if (err) throw err;
              mySql.query("UPDATE users set password = ? WHERE email = ?", [hash, email], (err) => {
                if (err) throw err;
                res.json({
                  status: 'success',
                  message: 'changed successfully'
                })
              })
            });
          });
        }
      }
    })
  }
};

userLogout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

showItem = (req, res) => {
  let itemId = req.params['itemId'];
  mySql.query("SELECT * FROM items WHERE id = ?", [itemId], (error, item) => {
    if (error) throw error;
    if (item.length === 0) {
      res.render('error/404', { url: req.url });
    } else {
      mySql.query("SELECT * FROM items ORDER BY RAND() LIMIT 3", [], (error, randomItem) => {
        if (error) throw error;
        mySql.query("SELECT * FROM ratings WHERE item_id = ?", [itemId], (error, ratings) => {
          if (error) throw error;
          res.render('item', {item: item[0], randomItem: randomItem, ratings: ratings});
        })
      })
    }
  })
};

/*
 * Admin function
 */

adminShowLogin = (req, res) => {
  let data = {
    email: req.body.email
  };
  if (req.flashStatus && req.flashMessage) {
    data.flashStatus = req.flashStatus;
    data.flashMessage = req.flashMessage;
  }

  res.render('admin/login', data)
};

adminLoginAttempt = (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  if (email && password && validator.isEmail(email) && validator.lengthValid(email, 5, 100) && validator.lengthValid(password, 5, 100)) {
    mySql.query("SELECT * FROM users WHERE email=? AND confirmed=? AND level!=?", [email, 1, 1], (error, result) => {
      if (error) throw error;
      if (result.length === 0) {
        req.flashStatus = 'danger';
        req.flashMessage = 'Sai thông tin đăng nhập!';
        return adminShowLogin(req, res);
      } else {
        let user = result[0];
        bcrypt.compare(password, user['password'], (error, result) => {
          if (error) throw error;
          if (result) {
            req.session.user = {
              id: user['id'],
              name: user['name'],
              email: user['email'],
              level: parseInt(user['level']),
              logged_in: true
            };
            return adminShowGeneral(req, res);
          } else {
            req.flashStatus = 'danger';
            req.flashMessage = 'Sai thông tin đăng nhập!';
            return adminShowLogin(req, res);
          }
        })
      }
    });
  } else {
    req.flashStatus = 'danger';
    req.flashMessage = 'Sai thông tin đăng nhập!';
    return adminShowLogin(req, res);
  }
};

redirectToGeneral = (req, res) => {
  res.redirect('/admin/general');
};

adminShowGeneral = (req, res) => {
  res.render('admin/general', {});
};

adminShowConfigs = (req, res) => {
  mySql.query("SELECT * FROM config WHERE 1", [], (error, rawConfigs) => {
    if (error) throw error;
    let configs = {};
    rawConfigs.forEach((conf) => {
      configs[conf['name']] = conf['value'];
    });
    let data = {configs: configs};
    if (req.flashStatus && req.flashMessage) {
      data.flashStatus = req.flashStatus;
      data.flashMessage = req.flashMessage;
    }
    res.render('admin/configs', data);
  });
};

adminUpdateConfigs = (req, res) => {
  let configArray = [
    'page_name', 'shop_owner', 'phone', 'email', 'facebook', 'address', 'shop_description', 'atm'
  ];
  configArray.forEach((conf, index) => {
    if (req.body[conf]) {
      mySql.query("UPDATE config SET value=? WHERE name=?", [req.body[conf], conf], (error) => {
        if (error) throw error;
        if (index === configArray.length - 1) {
          req.flashStatus = 'success';
          req.flashMessage = 'Cập nhật thành công!';
          return adminShowConfigs(req, res);
        }
      });
    }
  });

};

adminShowItems = (req, res) => {
  mySql.query("SELECT `items`.*, `categories`.`name` as category_name FROM `items` INNER JOIN `categories` ON `items`.`category_id` = `categories`.`id` WHERE 1", [], (err, items) => {
    if (err) throw err;
    mySql.query("SELECT * FROM categories WHERE parent_id != 0", [], (err, categories) => {
      if (err) throw err;
      let data = {items: items, categories: categories};
      if (req.flashStatus && req.flashMessage) {
        data.flashStatus = req.flashStatus;
        data.flashMessage = req.flashMessage;
      }
      res.render('admin/items', data);
    })
  });
};

adminCreateItem = (req, res) => {
  if (req.body.name && req.body.description && req.body.seo_keywords && req.body.category_id && req.body.price && req.body.available) {
    mySql.query("INSERT INTO `items`(`name`, `description`, `seo_keywords`, `category_id`, `price`, `available`)" +
      " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [req.body.name, req.body.description, req.body.seo_keywords, req.body.category_id, req.body.price, req.body.available], (error, result) => {
      if (error) throw error;
      let itemId = result.insertId;
      });
  } else {

  }




  let form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    let oldPath = files.image.path;
    let newPath = appConfig.image_path + files.image.name;
    fs.rename(oldPath, newPath, function (err) {
      if (err) throw err;
      req.flashStatus = 'success';
      req.flashMessage = 'Tạo sản phẩm thành công!';
      return adminShowItems(req, res);
    });
  });
};

adminUpdateItem = (req, res) => {

};

adminDeleteItem = (req, res) => {
  if (req.body.item_id) {
    mySql.query("DELETE FROM items WHERE id=?", [req.body.item_id], (err, result) => {
      if (err) throw err;
      return res.json({
        status: (result && result.affectedRows > 0) ? 'success' : 'failed',
      });
    })
  } else {
    return res.json({
      status: 'failed'
    });
  }
};

adminShowCategories = (req, res) => {
  mySql.query("SELECT * FROM categories WHERE 1 ORDER BY id DESC", [], (error, categories) => {
    if (error) throw error;
    let data = {categories: categories};
    if (req.flashStatus && req.flashMessage) {
      data.flashStatus = req.flashStatus;
      data.flashMessage = req.flashMessage;
    }
    res.render('admin/categories', data);
  })
};

adminUpdateCategory = (req, res) => {
  if (req.body.category_id && req.body.name && req.body.parent_id) {
    mySql.query("UPDATE categories SET name = ?, parent_id = ? WHERE id = ?",
      [req.body.name, req.body.parent_id, req.body.category_id], (err, result) => {
      if (err) throw err;
        return res.json({
          status: (result && result.affectedRows > 0) ? 'success' : 'failed',
        });
    })
  } else {
    return res.json({
      'status': 'failed'
    });
  }
};

adminDeleteCategory = (req, res) => {
  if (req.body.category_id) {
    mySql.query("DELETE FROM categories WHERE id=?", [req.body.category_id], (err, result) => {
        if (err) throw err;
          return res.json({
            status: (result && result.affectedRows > 0) ? 'success' : 'failed',
          });
      })
  } else {
    return res.json({
      status: 'failed'
    });
  }
};

adminShowUsers = (req, res) => {
    mySql.query("SELECT * FROM users WHERE level = 1", [], (err, users) => {
      if (err) throw err;
      let data = {users: users};
      if (req.flashStatus && req.flashMessage) {
        data.flashStatus = req.flashStatus;
        data.flashMessage = req.flashMessage;
      }
      res.render('admin/users', data);
    })
};

adminUpgradeUser = (req, res) => {
  if (req.body.user_id) {
    mySql.query("UPDATE users set level = ? WHERE id=? AND level=?", [2, req.body.user_id, 1], (err, result) => {
      if (err) throw err;
      return res.json({
        status: (result && result.affectedRows > 0) ? 'success' : 'failed',
      });
    })
  } else {
    return res.json({
      status: 'failed'
    });
  }
};

adminDeleteUser = (req, res) => {
  if (req.body.user_id) {
    mySql.query("DELETE FROM users WHERE id=? AND level=?", [req.body.user_id, 1], (err, result) => {
        if (err) throw err;
        return res.json({
          status: (result && result.affectedRows > 0) ? 'success' : 'failed',
        });
      })
  } else {
    return res.json({
      status: 'failed'
    });
  }
};

adminShowManagers = (req, res) => {
  mySql.query("SELECT * FROM users WHERE level != 1", [], (err, admins) => {
    if (err) throw err;
    let data = {admins: admins};
    if (req.flashStatus && req.flashMessage) {
      data.flashStatus = req.flashStatus;
      data.flashMessage = req.flashMessage;
    }
    res.render('admin/admins', data);
  })
};

adminDowngradeManager = (req, res) => {
  let targetId = parseInt(req.body.admin_id);
  if (targetId) {
    if (targetId === req.session.user.id) {
      return res.json({
        status: 'failed',
        message: 'Bạn không thể sửa chính mình!'
      });
    } else if (req.session.user.level === 3) {
      mySql.query("UPDATE users set level = ? WHERE id=? AND level=?", [1, req.body.admin_id, 2], (err, result) => {
        if (err) throw err;
        return res.json({
          status: (result && result.affectedRows > 0) ? 'success' : 'failed',
        });
      })
    } else {
      return res.json({
        status: 'failed',
        message: 'Chỉ Super Admin mới được thực hiện thao tác này!'
      });
    }
  } else {
    return res.json({
      status: 'failed'
    });
  }
};

adminDeleteManager = (req, res) => {
  let targetId = parseInt(req.body.admin_id);
  if (targetId) {
    if (targetId === req.session.user.id) {
      return res.json({
        status: 'failed',
        message: 'Bạn không thể xóa chính mình!'
      });
    } else if (req.session.user.level === 3) {
      mySql.query("DELETE FROM users WHERE id=? AND level=?", [req.body.admin_id, 2], (err, result) => {
        if (err) throw err;
        return res.json({
          status: (result && result.affectedRows > 0) ? 'success' : 'failed',
        });
      })
    } else {
      return res.json({
        status: 'failed',
        message: 'Chỉ Super Admin mới được thực hiện thao tác này!'
      });
    }
  } else {
    return res.json({
      status: 'failed'
    });
  }
};

checkAdmin = (req, res, next) => {
  if (req.session.user.level === 2 || req.session.user.level === 3) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};
/*
 * End Admin function
 */

/*
 * Routes
 */
// User
app.get('/', showHome);

app.get('/login', showLoginForm);
app.post('/login', userLogin);
app.get('/register', showRegisterForm);
app.get('/confirm-email', confirmRegisterEmail);
app.post('/register', userRegister);
app.get('/logout', userLogout);

app.get('/product//:itemId', showItem);

app.get('/forget_password', showForgotPasswordForm);
app.post('/forget_password', createPasswordRecoverEmail);
app.post('/reset_password_token', confirmEmailResetPassword);

// Admin
app.get('/admin', redirectToGeneral);

app.get('/admin/login', adminShowLogin);
app.post('/admin/login', adminLoginAttempt);

app.get('/admin/general', adminShowGeneral);

app.get('/admin/configs', adminShowConfigs);
app.post('/admin/configs', adminUpdateConfigs);

app.get('/admin/product', adminShowItems);
app.post('/admin/product', adminCreateItem);
app.put('/admin/product', adminUpdateItem);
app.delete('/admin/product', adminDeleteItem);

app.get('/admin/categories', adminShowCategories);
app.put('/admin/categories', adminUpdateCategory);
app.delete('/admin/categories', adminDeleteCategory);


app.get('/admin/users', adminShowUsers);
app.put('/admin/users', adminUpgradeUser);
app.delete('/admin/users', adminDeleteUser);

app.get('/admin/managers', adminShowManagers);
app.put('/admin/managers', adminDowngradeManager);
app.delete('/admin/managers', adminDeleteManager);


/*
 * End Routes
 */

sendMail = (from, toEmail, subject, body, callback) => {
  let mailOptions = {
    from: from,
    to: toEmail,
    subject: subject,
    text: body
  };
  // res.render('login', {message: 'created'})
  gmail.sendMail(mailOptions, callback);
};

/*
 * Helper
 */
// app.locals = viewHelper;

app.locals.formatPrice = price => {
  price = price.toString();
  let rgx = /(\d+)(\d{3})/;
  while (rgx.test(price)) {
    price = price.replace(rgx, '$1' + '.' + '$2');
  }
  return '<small>đ</small>' + price;
};

app.locals.formatDay = (input, full = false) => {
  let time = new Date(input);
  let result = full ? `${('0' + time.getHours()).slice(-2)}:${ ('0' + time.getMinutes()).slice(-2)}:${('0' + time.getSeconds()).slice(-2)}`: ``;
  return result + ` ${('0' + time.getDate()).slice(-2)}/${('0' + (time.getMonth() + 1)).slice(-2)}/${time.getFullYear()}`
};

app.locals.logged_in = () => {
  return true;
};
/*
 * End Helper
 */

app.listen(appConfig.port, () => {
  console.log(appConfig.app_message);
});