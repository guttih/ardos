/*
        VoffCon is a system for controlling devices and appliances from anywhere.
        It consists of two programs.  A “node server” and a “device server”.
        Copyright (C) 2016  Gudjon Holm Sigurdsson

        This program is free software: you can redistribute it and/or modify
        it under the terms of the GNU General Public License as published by
        the Free Software Foundation, version 3 of the License.

        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        GNU General Public License for more details.

        You should have received a copy of the GNU General Public License
        along with this program.  If not, see <http://www.gnu.org/licenses/>. 
        
You can contact the author by sending email to gudjonholm@gmail.com or 
by regular post to the address Haseyla 27, 260 Reykjanesbar, Iceland.
*/
var express = require('express');
var router = express.Router();
var request = require('request');
var lib = require('../utils/glib');
var Card = require('../models/card');
var Control = require('../models/control');
var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({
	storage: storage,
	limits: { fileSize: 100024 }
}).single('card');

router.get('/', lib.authenticateUrl, function (req, res) {
	res.render('index-card');
});

router.get('/register', lib.authenticateUrl, function (req, res) {
	res.render('register-card');/*this is the views/card.handlebars*/
});

router.get('/register/:cardID', lib.authenticatePowerUrl, function (req, res) {
	var id = req.params.cardID;
	if (id !== undefined) {
		Card.getById(id, function (err, card) {
			if (err || card === null) {
				req.flash('error', 'Could not find card.');
				res.redirect('/result');
			} else {
				var obj = {
					id: id,
					name: card.name
				};
				var str = JSON.stringify(obj);
				res.render('register-card', { item: str });
			}
		});

	}
});

router.post('/register', lib.authenticatePowerRequest, function (req, res) {
	// Validation
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('description', 'description is required').notEmpty();
	req.checkBody('code', 'javascript code is required').notEmpty();
	var errors = req.validationErrors();

	if (errors) {
		//todo: user must type all already typed values again, fix that
		res.render('register-card', { errors: errors });
	} else {
		var newCard = new Card({
			name: req.body.name,
			description: req.body.description,
			helpurl: req.body.helpurl,
			code: req.body.code,
			owners: [],
			users: []
		});

		newCard.owners.push(req.user._id);
		newCard.users.push(req.user._id);
		console.log("todo: uncomment");
		console.log(newCard._doc);
		Card.create(newCard, function (err, card) {
			if (err) { throw err; }
			console.log("card created:");
			console.log(card);
		});

		req.flash('success_msg', 'You successfully created the \"' +
			newCard._doc.name + '\" card');
		//todo: redirect to what?
		res.redirect('/cards/list');
	}
});

router.post('/register/:cardID', lib.authenticateCardOwnerUrl, function (req, res) {
	var id = req.params.cardID;
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('description', 'description is required').notEmpty();
	req.checkBody('code', 'javascript code is required').notEmpty();
	var errors = req.validationErrors();

	if (errors) {
		//todo: user must type all already typed values again, fix that
		res.render('register-card', { errors: errors });
	} else {
		var values = {
			name: req.body.name,
			description: req.body.description,
			helpurl: req.body.helpurl,
			code: req.body.code
		};
		Card.modify(id, values, function (err, result) {
			if (err || result === null || result.ok !== 1) {//(result.ok===1 result.nModified===1)
				//res.send('Error 404 : Not found or unable to update! ');
				req.flash('error', ' unable to update');
			} else {
				if (result.nModified === 0) {
					req.flash('success_msg', 'Card is unchanged!');
				} else {
					req.flash('success_msg', 'Card updated!');
				}
			}
			res.redirect('/cards/run/' + id);
		});
	}
});
              
router.post('/register/no-close/:cardID', lib.authenticateCardOwnerUrl, function (req, res) {
	var id = req.params.cardID;
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('description', 'description is required').notEmpty();
	req.checkBody('code', 'javascript code is required').notEmpty();
	var errors = req.validationErrors();

	if (errors) {
		res.status(422).json(errors);
	} else {
		var values = {
			name: req.body.name,
			description: req.body.description,
			helpurl: req.body.helpurl,
			code: req.body.code
		};
		Card.modify(id, values, function (err, result) {
			if (err || result === null || result.ok !== 1) {//(result.ok===1 result.nModified===1)
				res.status(400).json({ "error": "unable to update!" });
			} else {
				if (result.nModified === 0) {
					res.status(200).json({"success":"Card is unchanged!"});
				} else {
					res.status(200).json({"success":"Card updated!"});
				}
			}
		});
	}
});

router.delete('/:cardID', lib.authenticateCardOwnerRequest, function (req, res) {
	var id = req.params.cardID;
	Card.delete(id, function (err, result) {
		if (err !== null) {
			res.status(404).send('unable to delete card "' + id + '".');
		} else {
			res.status(200).send('Card deleted.');
		}
	});

});

/*render a page with list of users*/
router.get('/list', lib.authenticateUrl, function (req, res) {
	res.render('list-card');
});



/*listing all devices and return them as a json array*/
router.get('/card-list', lib.authenticateRequest, function (req, res) {
	Card.listByOwnerAndUserId(req.user._id, function (err, cardList) {

		var arr = [];
		var isOwner;
		var item;
		for (var i = 0; i < cardList.length; i++) {
			isOwner = false;
			item = cardList[i];

			isOwner = lib.findObjectID(item._doc.owners, req.user._id);
			arr.push({
				id: item._id,
				name: item.name,
				description: item.description,
				helpurl: item.helpurl,
				isOwner: isOwner
			});
		}
		res.json(arr);
	});
});



router.get('/item/:cardID', lib.authenticateCardUserUrl, function (req, res) {
	var id = req.params.cardID;
	if (id !== undefined) {
		Card.getById(id, function (err, card) {
			if (err || card === null) {
				res.send('Error 404 : Not found! ');
			} else {
				res.json(card);
			}
		});
	}
});

/*render a page wich runs a card, that is if the user is a registered user for that card (has access)*/
router.get('/run/:cardID', lib.authenticateCardUserUrl, function (req, res) {
	var id = req.params.cardID;
	Card.getById(id, function (err, card) {
		if (err || card === null) {
			req.flash('error', 'Could not find card.');
			res.redirect('/result');
		} else {

			var code = card._doc.code;
			var title = card._doc.name;
			var template = '<p id="prufa">Þetta er prufa</p>';
			var using = lib.extractUsingArray(code);
			var obj = {
				template: template,
				code: code
			};
			Control.getByNames(using, function (err, controls) {
				
				if (err || controls === null) {
					req.flash('error', 'Could not find controls.');
					res.redirect('/result');
				} else {
					if (controls === null) {
						controls = [];
					}
					var ctrlCode = "", ctrlTemplate = "";
					for (var i = 0; i < controls.length; i++) {
						ctrlCode += '// control: ' + controls[i]._doc.name +
							'\n' + controls[i]._doc.code + '\n\n';
						ctrlTemplate += controls[i]._doc.template + '\n\n';
					}
					ctrlCode += "\n\n//The card\n\n" + code;
					res.render('run-card', { template: ctrlTemplate, code: ctrlCode, title: card._doc.name });
				}
			});
		}
	});
});

/*render a page wich runs a card, that is if the user is a registered user for that card (has access)*/
router.get('/useraccess/:cardID', lib.authenticateCardOwnerUrl, function (req, res) {
	var id = req.params.cardID;
	Card.getById(id, function (err, retCard) {
		if (err || retCard === null) {
			req.flash('error', 'Could not find card.');
			res.redirect('/result');
		} else {
			var card = {
				id: id,
				name: retCard._doc.name
			};
			res.render('useraccess_card', { card: card });
		}
	});
});

router.post('/useraccess/:cardID', lib.authenticateCardOwnerRequest, function (req, res) {
	var id = req.params.cardID,
		owners = JSON.parse(req.body.owners),
		users = JSON.parse(req.body.users);
	var values = {
		owners: owners,
		users: users
	};

	Card.modifyUserAccess(id, values, function (err, result) {
		var code = 500;
		if (err) {//(result.ok===1 result.nModified===1)
			//res.send('Error 404 : Not found or unable to update! ');
			var msg = "Error modifying users access.";
			if (err.messageToUser !== undefined) {
				msg += "<br/><br/>" + err.messageToUser;
				if (err.statusCode !== undefined) {
					code = err.statusCode;
				}
			}
			res.status(code).send(msg);
		} else {
			res.status(200).send('Users access changed.');
		}
	});
});

router.get('/export/:cardID', lib.authenticatePowerUrl, function (req, res) {
	var id = req.params.cardID;
	if (id !== undefined) {
		Card.getById(id, function (err, card) {
			if (err || card === null) {
				req.flash('error', 'Could not find card.');
				res.redirect('/result');
			} else {

				var obj = {
					name: card._doc.name,
					description: card._doc.description,
					code: card._doc.code,
					helpurl: card._doc.helpurl,
				};
				var data = JSON.stringify(obj);
				res.writeHead(200, { 'Content-Type': 'application/force-download', 'Content-disposition': 'attachment; filename=' + lib.makeValidFilename(card.name) + '.voffcon.card' });
				res.end(data);
			}
		});
	}
});


router.get('/upload', lib.authenticateUrl, function (req, res) {
	res.render('upload-card');
});

router.post('/upload', lib.authenticateUrl, function (req, res, next) {
	// req.file is the `avatar` file
	// req.body will hold the text fields, if there were any
	upload(req, res, function (err) {
		if (err || req.file === undefined || req.file.fieldname !== "card") {
			return res.end("Error uploading file.");
		}
		//console.log(req.file.fieldname);
		//console.log(req.file.originalname);
		var str = req.file.buffer.toString();
		var obj;
		try {
			obj = JSON.parse(str);

			if (obj.name !== undefined && obj.description !== undefined && obj.code !== undefined && obj.template === undefined) {
				res.render('register-card', { itemUpload: str });
			} else {
				req.flash('error', 'Error uploading file, invalid object.');
				res.redirect('/result');

			}
		}
		catch (e) {
			req.flash('error', 'Error uploading file, error parsing object');
			res.redirect('/result');
		}
	});
});

module.exports = router;
