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

var Monitor = require('../models/monitor');
var Device = require('../models/device');



router.get('/ids/:deviceId', function(req, res){
	var id = req.params.deviceId;
	var isValid=false;
	var error = "You must provide an device id!";
	if (id !== undefined){
		isValid = Monitor.isObjectIdStringValid(id);
		error = "invalid device id provided!";
	}
	if (isValid){

		Monitor.listByDeviceId(id, function(err, items){
			if(err) {
				req.flash('error_msg', err.message);
				//throw err;
				
			} else {
				var str = JSON.stringify(items);
					req.flash('success_msg', str);
					
			}
			res.redirect('/message');
		});
		
	} else {
		req.flash('error',	error );
		
	}
});

var getPins = function(url, callback) {
	request.get(url,	function (err, res, body) {
		if (res) {
			console.log("get pins statuscode:"+res.statusCode);
			//we got the pinvalues, so let's save them
			callback(null, body);
		} else {
			callback(err, body);
		}
	});
};

var getAvailableMonitorPins = function getAvailableMonitorPins(device, callback) {
	var urlid = device.url+'/pins';
	getPins(urlid, function(err, body){
		if(err || body === null) {
			callback(err, null);
		} else {
		
			var pinObject = JSON.parse(body);
			
			var allPins = pinObject.pins;
			var pinsToRemove = [];
			//todo: Next, we need to exclude all pins that have monitors and add theyr pinnumbers to pinsToRemove
			var availablePins = allPins.filter(m => {
				console.log(m);
				return !pinsToRemove.includes(m.pin);
			});
			callback(err, availablePins);
		}
	});
};


router.get('/:deviceId/register', lib.authenticatePowerUrl, function(req, res) {
	var deviceId = req.params.deviceId;
	if (deviceId != undefined) {
		Device.getById(deviceId, function(err, device) {
			if(err || device === null) {
				req.flash('error',	'Could not find device.' );
				res.redirect('/result');
			} else {
				var ipAddress = device._doc.url;
				ipAddress = lib.removeSchemaAndPortFromUrl(ipAddress);
				if (!lib.isUserOrDeviceAuthenticated(req, ipAddress)){
					res.statusCode = 404;
					return res.json({text:'Error 404: You are not not authorized'});
				}

				var newDevice = {
						id:device._id,
						name:device.name,
						description:device.description,
						owners:device.owners,
						type:device.type,
						url:device.url
					};
				var urlid = device._doc.url+'/pins';
				getAvailableMonitorPins(newDevice, function(err, availablePins){
					if(err || availablePins === null) {
						req.flash('error',	'Could not get device pins.' );
						res.redirect('/result');
					} else {
					
						newDevice.pins=availablePins;
						//todo: Next, we need to exclude all pins that have monitors
						res.render('register-monitor', {device:JSON.stringify(newDevice),deviceName:newDevice.name});
					}
				});
			}
		});
	}
});

router.get('/:deviceId/register/:monitorId', lib.authenticatePowerUrl, function(req, res) {
	var deviceId = req.params.deviceId;
	var id = req.params.monitorId;

	if (deviceId != undefined) {
		Device.getById(deviceId, function(err, device){
			if(err || device === null) {
				req.flash('error',	'Could not find device.' );
				res.redirect('/result');
			} 
			else {
				if (id !== undefined) {
					Monitor.getById(id, function(err, monitor) {
						if(err || monitor === null) {
							req.flash('error', 'Could not find monitor.');
							res.redirect('/result');
						} else{
							res.render('register-monitor', {device:JSON.stringify(device),monitor:JSON.stringify(monitor)});
						}
					});
				}
			}

		});
	}
});

//monitors device pin status to the database
router.post('/pins', function(req, res) {
	
	req.checkBody('pins', 'pins are required').notEmpty();
	req.checkBody('deviceId', 'deviceId is required').notEmpty();
	var errors = req.validationErrors();
	
	if(!errors){
		if (!Monitor.isObjectIdStringValid(req.body.deviceId)) {
			errors = {error:"Invalid device id provided!"};
		}
	}

	if(errors){
		res.status(422).json(errors);
	} else {
			var deviceId = req.body.deviceId;
			var pins = req.body.pins.slice();
			Monitor.monitorJsonAsText(
				deviceId,
				pins, 
				function(err, item) {
					if(err) {throw err;}
					console.log(item);
					res.status(200).json({message: "??? succeded!"});
			});
	}
});

//render a page with list of monitors
router.get('/list', lib.authenticateUrl, function(req, res){
	res.render('list-monitor');
});
//opens a page which shows monitors as a table for a specific device
router.get('/device/:deviceID', lib.authenticateRequest, function(req, res) {
	// todo: how to authenticate? now a logged in user can use all devices
	var deviceId = req.params.deviceID;

	if (deviceId === undefined){ 
		res.status(422).json({"error":"No device id provided!"});
	}
	else{

			Device.getById(deviceId, function(err, retDevice){
					if(err || retDevice === null) {
						req.flash('error',	'Could not find device.' );
						res.redirect('/result');
					} else{
						var device = {
							id:deviceId,
							name:retDevice._doc.name
						};
						res.render('devicemonitor', { item:device, device:JSON.stringify(device) });
					}
				});
	}
});

//returns a Json object with all monitors from the specific device
router.get('/list/:deviceID', lib.authenticateRequest, function(req, res){
	// todo: how to authenticate? now a monitorged in user can use all devices
	var deviceId = req.params.deviceID;

	if (deviceId === undefined){ 
		res.status(422).json({"error":"No device id provided!"});
	}
	else{
			Monitor.listByDeviceId(deviceId, function(err, data){
				res.json(data);
	});
	}
});

router.delete('/list/:deviceId', lib.authenticateDeviceOwnerRequest, function(req, res){
	var id = req.params.deviceId;
	console.log('deleting:' + id)
	Monitor.deleteAllDeviceRecords(id, function(err, result){
		if(err !== null){
			res.status(404).send({message:'unable to delete monitor', id:id});
		} else {
			res.status(200).send({id:id});
		}
	});
});

//listing all devices and which have monitors and return them as a json array
router.get('/device-list', lib.authenticatePowerRequest, function(req, res) {

	var monitorDevices = [];
	var saveData;
	Monitor.devicesMonitorCount(function(err, data) {
		if(err) {throw err;}
		monitorDevices = [];
		var i = 0;
		for(i = 0; i < data.length; i++) {
			monitorDevices.push({ id:data[i]._id.toString(), count:data[i].count});
			if (data.length == monitorDevices.length) {

				//now let's get device information about the devices
				Device.listByOwnerId(req.user._id, function(err, deviceList){
					var arr = [];
					var item;
					var isOwner;
					for(var i = 0; i < deviceList.length; i++){
						item = deviceList[i];
						var findId = item._id.toString(); 
						var monitorIndex = monitorDevices.map(function(e) {return e.id;}).indexOf(findId);
						if (monitorIndex > -1) {
							isOwner = lib.findObjectID(item._doc.owners, req.user._id);
							arr.push({	name:deviceList[i].name, 
										description:deviceList[i].description,
										id:deviceList[i]._id,
										type:deviceList[i].type,
										url:deviceList[i].url,
										isOwner:isOwner,
										recordCount:monitorDevices[monitorIndex].count
									});
						}
					}
					res.json(arr);
				});
			}
		} //for
	});
});


router.delete('/:monitorID', lib.authenticateDeviceOwnerRequest, function(req, res){
	var id = req.params.monitorID;
	Monitor.delete(id, function(err, result){
		if(err !== null){
			res.status(404).send({message:'unable to delete monitor', id:id});
		} else {
			res.status(200).send({id:id});
		}
	});
	
});

//	save pinout to monitors
router.get('/pins/:deviceId', function(req, res){
	var deviceId = req.params.deviceId;

	Device.getById(deviceId, function(err, device){
		if (err !== null || device === null) {
			res.statusCode = 404;
			return res.json({text:'Error 404: User device not found!'});
		}
		var ipAddress = device._doc.url;
		ipAddress = lib.removeSchemaAndPortFromUrl(ipAddress);
		if (!lib.isUserOrDeviceAuthenticated(req, ipAddress)){
			res.statusCode = 404;
			return res.json({text:'Error 404: You are not not authorized'});
		}
		console.log(urlid);
		var urlid = device._doc.url+'/pins';
		request.get(urlid,	function (err, res, body) {
			if (res) {
				console.log("get pins statuscode:"+res.statusCode);
				//we got the pinvalues, so let's save them
				var obj, pins;
				obj = JSON.parse(body);
					pins = obj.pins; 
				Monitor.monitorJsonAsText(
					deviceId,
					Monitor.MonitorTypes.indexOf('OBJECTTYPE_PINS'),
					pins, 
					function(err, item) {
						if(err) {throw err;}
						console.log(item);
				});
			}

			if (err) {
				return console.error(err);
			}
			return body;
		}
			).pipe(res);
	});
});

module.exports = router;