/*!
* Builded by Impleplus application builder (https://builder.impleplus.com)
* Version 2.0.0
* Link https://www.impleplus.com
* Copyright impleplus.com
* Licensed under MIT (https://mit-license.org)
*/
var _ = require("lodash");
const common = require('../lib/common');
const moment = require('moment');
var fs = require("fs");
const path = require('path');
const Excel = require('exceljs');
const extract = require('extract-zip');
var mv = require('mv');
var impleplusHelper = require('../helper/impleplus-helper');
const { v4: uuidv4 } = require('uuid');
const store = require('store2');
const db  = require('../models/init-models');
const sequelize = require('../helper/db-connect');
var dbHelper = new (require('../helper/db'))(db(sequelize));

var exports = module.exports = {};
exports.index = async function (req, res, next) {
	try 
	{
		var redirectUrl = req.user.default_url??"";
		if(redirectUrl != "/" && redirectUrl!="." && redirectUrl!="") {
            res.redirect(redirectUrl);
		}
		else {
			res.render('index', { title: "impleplus's Application Builder"});
		}
	}
	catch (err) {
		next(err);
	}
}
exports.error404 = async function (req, res, next) {
	try {
		res.render('error/404', { title: 'Error 404', layout: false });
	}
	catch (err) {
		next(err);
	}
}
exports.error500 = async function (req, res, next) {
	try {
		res.render('error/500', { title: 'Error 500', layout: false });
	}
	catch (err) {
		next(err);
	}
}
exports.error503 = async function (req, res, next) {
	try {
		res.render('error/503', { title: 'Error 503', layout: false });
	}
	catch (err) {
		next(err);
	}
}
exports.error505 = async function (req, res, next) {
	try {
		res.render('error/505', { title: 'Error 505', layout: false });
	}
	catch (err) {
		next(err);
	}
}
exports.assignSave = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req,"save");
        const tableName = req.body.tableName;
        const [entityData] = await Promise.all([
        	dbHelper.findOne(tableName,{'id':param.id})
        ]);
        var oriAssignsValue = [];
        if(entityData.assign) {
            oriAssignsValue = JSON.parse(entityData.assign);
        }
        var assignsValue = oriAssignsValue;
        var assign_to_id = "";
        if(req.body.assign_to_cat == "department"){
            assign_to_id = req.body.department_id;
        }
        else if(req.body.assign_to_cat == "team"){
            assign_to_id = req.body.team_id;
        }
        else if(req.body.assign_to_cat == "user"){
            assign_to_id = req.body.user_id;
        }
        var fileName = "";
        if (req.files != undefined) {
			if (req.files.file != undefined ) {
				fileName = req.files.file.name;
			}
		}	
        var newId = uuidv4();
        if(req.body.action == "open") {            
            assignsValue.push({
                id:newId,
                date:common.toMySqlDateTimeFormat(new Date()),
                assign_by_id:req.user.id,
                assign_by_name:req.user.user_name,
                assign_to_id:assign_to_id,
                action:req.body.action,
                assign_to_cat:req.body.assign_to_cat,
                reason:req.body.reason,     
                file:fileName
            });
        }
        else if(req.body.action == "cancel") {
            var assignsValue = oriAssignsValue;
            _.remove(assignsValue,{id: req.body.id});
        }
        else if(req.body.action == "accept" || req.body.action == "reject") {
            var index = _.findIndex(assignsValue, {id: req.body.id});
            
            if(index != -1) {
                var updateDate = assignsValue[index];
                updateDate.action = "close";
                assignsValue.splice(index, 1, updateDate);                 
            }
            assignsValue.push({
                id:newId,
                date:common.toMySqlDateTimeFormat(new Date()),
                assign_by_id:req.user.id,
                assign_by_name:req.user.user_name,
                assign_to_id:assign_to_id,
                action:req.body.action,
                assign_to_cat:req.body.assign_to_cat,
                reason:req.body.reason,     
                file:fileName
            });
            if(req.body.action == "accept"){
                await dbHelper.update(tableName,{owner_id:assign_to_id}, {'id':param.id})
            }
        }
        const uploadPath = __config.uploadPath;
		if (req.files != undefined) {
			await common.uploadFile(req.files.file, path.join(uploadPath,newId));
		}
        await dbHelper.update(tableName,{assign:JSON.stringify(assignsValue)},{'id':param.id});
        return res.status(200).json({ success: true, message: 'Assign complete', refresh:true });
    }
    catch (err) {
        next(err);
    }
}
exports.locations = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];                
        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }
  
        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }

        const [org_locations] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from org_location ${sqlWhere}) totalcount from org_location ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);
        if (org_locations.length > 0) { totalcount = org_locations[0].totalcount; } 
		let org_locationsPagination = common.pagination(req, totalcount, paginationNum, page);
		res.render('organization/location/index', { title: 'locations', org_locations, org_locationsPagination,param});
	}
	catch (err) {
		next(err);
	}
}

exports.locationPage = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"page");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];                
        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }
         
        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }

        const [org_locations] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from org_location ${sqlWhere}) totalcount from org_location ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);
        if (org_locations.length > 0) { totalcount = org_locations[0].totalcount; } 
		let org_locationsPagination = common.pagination(req, totalcount, paginationNum, page);
        return res.status(200).json({ success: true, message: '' ,org_locations, org_locationsPagination,param });
	}
	catch (err) {
		next(err);
	}
}
exports.locationEdit = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
        const [org_location] = await Promise.all([
        	param.location!=undefined?dbHelper.findOne("org_location",{'id':param.location}):{}
        ]);
		
		res.render('organization/location/edit', { title: 'location: '+org_location.id,  org_location,param});
	}
	catch (err) {
		next(err);
	}
}
exports.locationDelete = async function (req, res, next) {
    try
    {
        var param = impleplusHelper.getFunctionParams(req,"delete");
        await Promise.all([
			dbHelper.delete("org_department",{'location_id':param.deleteId}),
			dbHelper.delete("org_team",{'location_id':param.deleteId}),
            dbHelper.delete("org_location",{'id':param.deleteId})
        ]);
        return res.status(200).json({ success: true });
    }
    catch (err) {
        next(err);
    }
}
exports.locationSave = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"save");
		var saveData = {
			name: req.body.name,
			address: req.body.address,
			remark: req.body.remark
		}
		var redirect = "";
		if (param.location == undefined) { saveData.id = uuidv4(); redirect = `/organization/location/edit?location=${saveData.id}` }                
        await param.location!=undefined?dbHelper.update("org_location",saveData,{'id':param.location}):dbHelper.create("org_location",saveData);
		return res.status(200).json({ success: true, message: 'Save complete.', param, redirect:redirect });
	}
	catch (err) {
		next(err);
	}
}
exports.departments = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];                
        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }

		arrWhere.push(`location_id = '${param.location??""}'`);
		
        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }

        const [org_departments] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from org_department ${sqlWhere}) totalcount  from org_department ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);
        if (org_departments.length > 0) { totalcount = org_departments[0].totalcount; } 
		let org_departmentsPagination = common.pagination(req, totalcount, paginationNum, page);
		res.render('organization/department/index', { title: 'departments', org_departments:org_departments, org_departmentsPagination:org_departmentsPagination,param});
	}
	catch (err) {
		next(err);
	}
}
exports.departmentPage = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"page");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];                
        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }   

		arrWhere.push(`location_id = '${param.location??""}'`);

        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }

        const [org_departments] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from org_department ${sqlWhere}) totalcount from org_department ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);

        if (org_departments.length > 0) { totalcount = org_departments[0].totalcount; } 
		let org_departmentsPagination = common.pagination(req, totalcount, paginationNum, page);
        return res.status(200).json({ success: true, message: '' ,org_departments, org_departmentsPagination,param });
	}
	catch (err) {
		next(err);
	}
}
exports.departmentEdit = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
        const [org_department] = await Promise.all([
        	param.id!=undefined?dbHelper.findOne("org_department",{'id':param.id}):{}
        ]);
		res.render('organization/department/edit', { title: 'department: '+org_department.id, param, org_department  });
	}
	catch (err) {
		next(err);
	}
}
exports.departmentSave = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"save");
		var saveData = {
			location_id: param.location,
			name: req.body.name,
			address: req.body.address,
			remark: req.body.remark
		}
		var redirect = "";
		if (param.id == undefined) { saveData.id = uuidv4(); redirect = `/organization/department/edit?location=${param.location}&id=${saveData.id}` }                
        await param.id!=undefined?dbHelper.update("org_department",saveData,{'id':param.id}):dbHelper.create("org_department",saveData);
		return res.status(200).json({ success: true, message: 'Save complete.', param, redirect:redirect });
	}
	catch (err) {
		next(err);
	}
}
exports.departmentDelete = async function (req, res, next) {
    try
    {
        var param = impleplusHelper.getFunctionParams(req,"delete");
        await Promise.all([
            dbHelper.delete("org_department",{'id':param.deleteId})
        ]);
        return res.status(200).json({ success: true });
    }
    catch (err) {
        next(err);
    }
}
exports.teams = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];      
		arrWhere.push(`location_id = '${param.location??""}'`);

        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }

        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }
		
        const [org_teams] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from org_team ${sqlWhere}) totalcount from org_team ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);

        if (org_teams.length > 0) { totalcount = org_teams[0].totalcount; } 
		let org_teamsPagination = common.pagination(req, totalcount, paginationNum, page);
		res.render('organization/team/index', { title: 'teams', org_teams, org_teamsPagination,param});
	}
	catch (err) {
		next(err);
	}
}
exports.teamPage = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"page");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];       
		arrWhere.push(`location_id = '${param.location??""}'`);         
        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }
         
        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }

        const [org_teams] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from org_team ${sqlWhere}) totalcount from org_team ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);

        if (org_teams.length > 0) { totalcount = org_teams[0].totalcount; } 
		let org_teamsPagination = common.pagination(req, totalcount, paginationNum, page);

        return res.status(200).json({ success: true, message: '' ,org_teams, org_teamsPagination,param});
	}
	catch (err) {
		next(err);
	}
}
exports.teamEdit = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");              
        const [org_team] = await Promise.all([
        	param.id!=undefined?dbHelper.findOne("org_team",{'id':param.id}):{}
        ]);
		res.render('organization/team/edit', { title: 'team: '+org_team.id, param, org_team});
	}
	catch (err) {
		next(err);
	}
}
exports.teamSave = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"save");
		var saveData = {
			location_id: param.location,
			name: req.body.name,
			address: req.body.address,
			remark: req.body.remark
		}
		var redirect = "";
		if (param.id == undefined) { saveData.id = uuidv4(); redirect = `/organization/team/edit?location=${param.location}&id=${saveData.id}` }                
        await param.id!=undefined?dbHelper.update("org_team",saveData,{'id':param.id}):dbHelper.create("org_team",saveData);
		return res.status(200).json({ success: true, message: 'Save complete.', param, redirect:redirect });
	}
	catch (err) {
		next(err);
	}
}

exports.teamDelete = async function (req, res, next) {
    try
    {
        var param = impleplusHelper.getFunctionParams(req,"delete");
        await Promise.all([
            dbHelper.delete("org_team",{'id':param.deleteId})
        ]);
        return res.status(200).json({ success: true});
    }
    catch (err) {
        next(err);
    }
}
exports.login = async function (req, res, next) {
	try
	{
		if(req.user) {
        	return res.redirect('/');
        }
		else {res.render('user/auth/login', { layout : false, title: 'login' });}	
	}
	catch (err) {
		next(err);
	}
}

exports.logout = function (req, res) {	
    res.clearCookie(__config.cookie.name, {domain: __config.cookie.domain});
    store.remove(req.user.id);
	res.redirect('/login');
  };

exports.authInfo = async function (req, res, next) {
	try 
	{
		res.render('user/auth', { title: 'user info'  });
	}
	catch (err) {
		next(err);
	}
}
exports.authInfoSave = async function (req, res, next) {
	try 
	{
		return res.status(200).json({ success: true, message: 'Save complete.' });
	}
	catch (err) {
		next(err);
	}
}
exports.authChangePassword = async function (req, res, next) {
	try 
	{
		res.render('user/password', { title: 'change password' });
	}
	catch (err) {
		next(err);
	}
}
exports.authChangePasswordSave = async function (req, res, next) {
	try 
	{
		return res.status(200).json({ success: true, message: 'Save complete.' })
	}
	catch (err) {
		next(err);
	}
}
exports.users = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];              
        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }
   
        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }

        const [users] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from user ${sqlWhere}) totalcount  from user ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);

        if (users.length > 0) { totalcount = users[0].totalcount; } 
		let usersPagination = common.pagination(req, totalcount, paginationNum, page);
		res.render('user/user/index', { title: 'Users',	users, usersPagination, param});
	}
	catch (err) {
		next(err);
	}
}
exports.userPage = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"page");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];       
        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }

        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }

        const [users] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from user ${sqlWhere}) totalcount from user ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);
        if (users.length > 0) { totalcount = users[0].totalcount; } 
		let usersPagination = common.pagination(req, totalcount, paginationNum, page);
        return res.status(200).json({ success: true, message: '' ,users, usersPagination, param });
	}
	catch (err) {
		next(err);
	}
}
exports.userEdit = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
        const [user, org_locations, org_departments, org_teams, user_teams] = await Promise.all([
        	param.user!=undefined?dbHelper.findOne("user",{'id':param.user}):{},
			dbHelper.findAll("org_location"),
			dbHelper.findAll("org_department"),
			dbHelper.findAll("org_team"),
			dbHelper.queryAll(`select user_team.*, org_team.name from user_team, org_team where user_team.team_id = org_team.id and user_id = '${param.user}'`)
        ]);
		let uploadPath = __config.uploadPath.concat(req.user.id);
		res.render('user/user/edit', { title: 'user: '+user.id, uploadPath, user, org_locations, org_departments, org_teams, user_teams, param });
	}
	catch (err) {
		next(err);
	}
}
exports.userDelete = async function (req, res, next) {
    try
    {
        var param = impleplusHelper.getFunctionParams(req,"delete");
        await Promise.all([
            dbHelper.delete("user",{'id':param.deleteId})
        ]);
        return res.status(200).json({ success: true});
    }
    catch (err) {
        next(err);
    }
}
exports.userSave = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"save");
		if(req.body.password != undefined && req.body.confirmpassword != undefined ){
			if(req.body.password != req.body.confirmpassword){
				return res.status(200).json({ success: false, message: 'Passwords are not the same !!!' })
			}
		}
		var saveData = {			
			user_code: req.body.user_code,
			user_name: req.body.user_name,
			address: req.body.address,
			email: req.body.email,
			location_id: req.body.location_id,
			department_id: req.body.department_id,
			status_id: req.body.status_id,
			remark: req.body.remark
		}
		if (req.files != undefined) {
			if (req.files.picture != undefined ) {
				saveData.picture = req.files.picture.name;
			}			
		}		
		if (param.user != undefined) {
			await Promise.all([
				dbHelper.delete("user_team",{user_id:param.user})
			]);		
			if(req.body.teams_id != '') {
				var teams_id = JSON.parse(req.body.teams_id);
				for(team_id of teams_id){
					let data = {
						id:uuidv4(),
						user_id:param.user,
						team_id:team_id.data_id
					}
					await dbHelper.create("user_team",data);
				}
			}		
		}	
		var redirect = "";
		if (param.user == undefined) { 
			saveData.id = uuidv4(); 
			saveData.password = impleplusHelper.generateHash(req.body.password);
			redirect = `/user/edit?user=${saveData.id}`;
		}                
        param.user!=undefined? await dbHelper.update("user",saveData,{'id':param.user}):await dbHelper.create("user",saveData);
		const uploadPath = __config.uploadPath;
		if (req.files != undefined) {
			await common.uploadFile(req.files.picture, path.join(uploadPath,saveData.id));	
		}			
		return res.status(200).json({ success: true, message: 'Save complete.', param, redirect:redirect })
	}
	catch (err) {
		next(err);
	}
}
exports.roles = async function (req, res, next) {
	try
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
        const [user_roles, user_role_bases] = await Promise.all([
			dbHelper.queryAll(`select * from user_role where user_id = '${param.user}'`),
			dbHelper.queryAll(`select * from user_role_base`)
        ]);
		for(user_role_base of user_role_bases){
			user_role_base.checked = "";
			if(_.find(user_roles,{role_base_id:user_role_base.id}) != undefined) {
				user_role_base.checked = "checked";
			}
		}
		res.render('user/userrole/index', { title: 'roles', user_roles, user_role_bases, param });
	}
	catch (err) {
		next(err);
	}
}
exports.roleSave = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"save");
		await dbHelper.delete("user_role",{user_id:param.user});
		for(let i=0; i<Object.keys(req.body).length; i++){
			let data = {
				id:uuidv4(),
				user_id:param.user,
				role_base_id:Object.keys(req.body)[i]
			};			
			await dbHelper.create("user_role",data);
		}
		return res.status(200).json({ success: true, message: 'Save complete.' })
	}
	catch (err) {
		next(err);
	}
}
exports.password = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
		res.render('user/user/password', { title: 'password', param  });
	}
	catch (err) {
		next(err);
	}
}
exports.passwordSave = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"save");
		if(req.body.password != undefined && req.body.confirmpassword != undefined ){
			if(req.body.password != req.body.confirmpassword){
				return res.status(200).json({ success: false, message: 'Passwords are not the same !!!' })
			}
		}
		await dbHelper.update("user",{password:impleplusHelper.generateHash(req.body.password)},{'id':param.user});
		return res.status(200).json({ success: true, message: 'Save complete.' })
	}
	catch (err) {
		next(err);
	}
}
exports.rolebases = async function (req, res, next) {
	try
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];                
        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }
        
        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }

        const [user_role_bases] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from user_role_base ${sqlWhere}) totalcount from user_role_base ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);
        if (user_role_bases.length > 0) { totalcount = user_role_bases[0].totalcount; } 
		let user_role_basesPagination = common.pagination(req, totalcount, paginationNum, page);

		res.render('user/rolebase/index', { title: 'user role bases', user_role_bases, user_role_basesPagination, param});
	}
	catch (err) {
		next(err);
	}
}
exports.rolebasePage = async function (req, res, next) {
	try
	{	
        var param = impleplusHelper.getFunctionParams(req,"page");
		let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;

        var sqlParam = impleplusHelper.getSqlParam(param);

        var arrWhere = [];                
        if(sqlParam != ""){
            arrWhere.push(sqlParam);
        }
        
        var sqlWhere = "";
        if(arrWhere.length>0){
            sqlWhere = ` where ${arrWhere.join(" and ")??""}`;
        }

        const [user_role_bases] = await Promise.all([
            dbHelper.queryAll(`select *, (select count(id) from user_role_base ${sqlWhere}) totalcount from user_role_base ${sqlWhere} limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);
        if (user_role_bases.length > 0) { totalcount = user_role_bases[0].totalcount; } 
		let user_role_basesPagination = common.pagination(req, totalcount, paginationNum, page);
		return res.status(200).json({ success: true, user_role_bases, user_role_basesPagination, param });
	}
	catch (err) {
		next(err);
	}
}
exports.rolebaseEdit = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
        const [user_role_base] = await Promise.all([
        	param.role!=undefined?dbHelper.findOne("user_role_base",{'id':param.role}):{}
        ]);
		res.render('user/rolebase/edit', { title: 'rolebase: '+user_role_base.id, user_role_base, param });
	}
	catch (err) {
		next(err);
	}
}
exports.rolebaseDelete = async function (req, res, next) {
    try
    {		
        var param = impleplusHelper.getFunctionParams(req,"delete");

		const [user_roles] = await Promise.all([
        	dbHelper.findAll("user_role",{'role_base_id':param.deleteId})
        ]);
		if(user_roles.length > 0){
			return res.status(200).json({ success: false, message:"Can't delete because have someone user uses this role base !!! "});			
		}
		else {
			await Promise.all([
				dbHelper.delete("user_role_base_access",{'role_base_id':param.deleteId}),
				dbHelper.delete("user_role_base_department",{'role_base_id':param.deleteId}),
				dbHelper.delete("user_role_base_location",{'role_base_id':param.deleteId}),
				dbHelper.delete("user_role_base_team",{'role_base_id':param.deleteId}),
				dbHelper.delete("user_role_base",{'id':param.deleteId})
			]);
			return res.status(200).json({ success: true});
		}

    }
    catch (err) {
        next(err);
    }
}
exports.rolebaseSave = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"save");  
		var saveData = {
			name: req.body.name,
			default_url: req.body.default_url,
			remark: req.body.remark
		}
		var redirect = "";
		if (param.role == undefined) { saveData.id = uuidv4(); redirect = `/user/rolebase/edit?role=${saveData.id}` }                
        param.role!=undefined? await dbHelper.update("user_role_base",saveData,{'id':param.role}):await dbHelper.create("user_role_base",saveData);
		return res.status(200).json({ success: true, message: 'Save complete.', param, redirect:redirect })
	}
	catch (err) {
		next(err);
	}
}
exports.rolebaseAccess = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
        var [user_access_bases, user_role_base_accesss] = await Promise.all([
            dbHelper.findAll("user_access_base"),
			dbHelper.findAll("user_role_base_access",{"role_base_id":param.role})
        ]);
		res.render('user/rolebaseaccess/index', { title: 'Users', user_access_bases, user_role_base_accesss, param,_:_});
	}
	catch (err) {
		next(err);
	}
}
exports.rolebaseAccessSave = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"save");
		await dbHelper.delete("user_role_base_access",{role_base_id:param.role});
		for(let i=0; i<Object.keys(req.body).length; i++){			
			var keyVals = Object.keys(req.body)[i].split(":");

			let data = {
				id:uuidv4(),
				role_base_id:param.role,
				nav_id:keyVals[0],
				access_base_id:keyVals[1]						
			};					
			await dbHelper.create("user_role_base_access",data);
		}

		return res.status(200).json({ success: true, message: 'Save complete.' })
	}
	catch (err) {
		next(err);
	}
}
exports.rolebaseOrganization = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"get");
        var [org_teams, org_locations, org_departments, user_role_base_departments, user_role_base_locations, user_role_base_teams] = await Promise.all([
			dbHelper.queryAll("select org_team.*, (select name from org_location where org_location.id = org_team.location_id) locationName from org_team"),
			dbHelper.findAll("org_location"),			
			dbHelper.queryAll("select org_department.*, (select name from org_location where org_location.id = org_department.location_id) locationName from org_department"),			
			dbHelper.queryAll(`select user_role_base_department.*, 
			(select name from org_department where org_department.id = user_role_base_department.department_id) departmentName,
			(select name from org_location where org_location.id = org_department.location_id) locationName
			from user_role_base_department, org_department
			where user_role_base_department.department_id = org_department.id and role_base_id = '${param.role}'`),
			dbHelper.queryAll(`select user_role_base_location.*, (select name from org_location where org_location.id = user_role_base_location.location_id) locationName 
			from user_role_base_location where role_base_id = '${param.role}'`),
			dbHelper.queryAll(`select user_role_base_team.*, 
			(select name from org_team where org_team.id = user_role_base_team.team_id) teamName,
			(select name from org_location where org_location.id = org_team.location_id) locationName
			from user_role_base_team, org_team
			where user_role_base_team.team_id = org_team.id and role_base_id = '${param.role}'`)
        ]);
		res.render('user/rolebaseorganization/edit', { title: 'user role bases', org_teams, org_locations, org_departments,user_role_base_departments,user_role_base_locations,user_role_base_teams, param});
	}
	catch (err) {
		next(err);
	}
}
exports.rolebaseOrganizationSave = async function (req, res, next) {
	try 
	{
        var param = impleplusHelper.getFunctionParams(req,"save");
		await Promise.all([
			dbHelper.delete("user_role_base_location",{role_base_id:param.role}),
			dbHelper.delete("user_role_base_department",{role_base_id:param.role}),
			dbHelper.delete("user_role_base_team",{role_base_id:param.role}),
		]);
		if(req.body.locations_id != '') {
			var locations_id = JSON.parse(req.body.locations_id);
			for(location_id of locations_id){
				let data = {
					id:uuidv4(),
					role_base_id:param.role,
					location_id:location_id.data_id
				}
				await dbHelper.create("user_role_base_location",data);
			}
		}
		if(req.body.departments_id != ''){
			var departments_id = JSON.parse(req.body.departments_id);
			for(department_id of departments_id){
				let data = {
					id:uuidv4(),
					role_base_id:param.role,
					department_id:department_id.data_id
				}
				await dbHelper.create("user_role_base_department",data);
			}		
		}
		if(req.body.teams_id != '') {
			var teams_id = JSON.parse(req.body.teams_id);
			for(team_id of teams_id){
				let data = {
					id:uuidv4(),
					role_base_id:param.role,
					team_id:team_id.data_id
				}
				await dbHelper.create("user_role_base_team",data);
			}
		}
		return res.status(200).json({ success: true, message: 'Save complete.', param })
	}
	catch (err) {
		next(err);
	}
}
exports.import_dataPage = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req,"page");
		let paginationNum = __config.paginationNum;
		let page = Number(req.body.page) || 1;
		let totalcount = 0;
        const [import_datas] = await Promise.all([
			dbHelper.queryAll(`select *, (select user.user_name from user where user.id = import_by) import_by_name, (select count(id) from import_data where table_name like '%${param.qimport_datas??""}%' ) totalcount  from import_data where table_name like '%${param.qimport_datas??""}%'  limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);
        if (import_datas.length > 0) { totalcount = import_datas[0].totalcount; }
		let import_datasPagination = common.pagination(req, totalcount, paginationNum, page);
        return res.status(200).json({ success: true, message:'', param , import_datas, import_datasPagination });
    }
    catch (err) {
        next(err);
    }
}
exports.import_datas = async function (req, res, next) {
    try 
    {
		const uploadPath = __config.uploadPath;
		
        var param = impleplusHelper.getFunctionParams(req,"get");
		let paginationNum = __config.paginationNum;
		let page = Number(req.body.page) || 1;
		let totalcount = 0;
        const [import_datas] = await Promise.all([
			dbHelper.queryAll(`select *, (select user.user_name from user where user.id = import_by) import_by_name, (select count(id) from import_data where table_name like '%${param.qimport_datas??""}%' ) totalcount  from import_data where table_name like '%${param.qimport_datas??""}%'  limit ${((page - 1) * paginationNum) + "," + paginationNum} `)
        ]);
        if (import_datas.length > 0) { totalcount = import_datas[0].totalcount; }
		let import_datasPagination = common.pagination(req, totalcount, paginationNum, page);
        res.render('import_data/list', { title: 'Imports', uploadPath:uploadPath, param, import_datas, import_datasPagination } );
    }
    catch (err) {
        next(err);
    }
}
exports.import_dataEdit = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req,"get");
        const importTables = __config.importTables;
        var sqlWhere = importTables.map(item => `table_name='${item}'`).join(" or ");
        const [table_columns] = await Promise.all([
			dbHelper.queryAll(`select table_name, column_name from information_schema.columns where table_schema = '${__config.database.database}' and (${sqlWhere}) `)
        ]);       
        const uploadPath = __config.uploadPath;
        res.render('import_data/edit', { title: 'Imports', uploadPath, param, importTables, table_columns} );
    }
    catch (err) {
        next(err);
    }
}
exports.import_dataTemplate = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req,"get");
        var sql = `select * from #grave#${param.tableName}#grave# limit ${__config.exportRecord}`.replace(/#grave#/ig,"`");
        var [dataTemplates] = await Promise.all([
            dbHelper.queryAll(sql)
        ]);
        res.writeHead(200, {
            'Content-Disposition': `attachment; filename="import-tempate-${param.tableName}.xlsx"`,
            'Transfer-Encoding': 'chunked',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const workbook = new Excel.stream.xlsx.WorkbookWriter({ stream: res });
        const worksheet = workbook.addWorksheet(param.tableName);
        let worksheet_header = [];
        if (dataTemplates.length > 0) {
            let record = dataTemplates[0];
            for(let i=0; i< Object.keys(record).length; i++){
                var findIngoreColumn = __config.ignore.exportColumns.find((el) => el == Object.keys(record)[i]);
                if(findIngoreColumn == undefined ) {
                    worksheet_header.push({ header: Object.keys(record)[i], key: Object.keys(record)[i] });                
                }
            }
        }
        worksheet.columns = worksheet_header;
        dataTemplates.forEach(record => {
            let row = {};
            for(let i=0; i< Object.keys(record).length; i++){
                var findIngoreColumn = __config.ignore.exportColumns.find((el) => el == Object.keys(record)[i]);
                if(findIngoreColumn == undefined ) {
                    row[Object.keys(record)[i]] = Object.values(record)[i];             
                }
            }
            worksheet.addRow(row).commit();
        });
        worksheet.commit();
        workbook.commit();	     
		
    }
    catch (err) {
        next(err);
    }
}
exports.import_dataSave = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req,"save");
        var tableName = req.body.importTable;
        var tempTableName = common.randomText();
        const [columns] = await Promise.all([
			dbHelper.queryAll(`SHOW COLUMNS FROM ${tableName}`)
        ]);   
        if (req.files != undefined && req.body.importTable != "") {
            const uploadPath = __config.uploadPath;
            if (req.files != undefined) {
				await common.uploadFile(req.files.fileupload, path.join(uploadPath,req.user.id));
            }            
			const fileName = `${__basedir}/app/public/${uploadPath.concat("/",req.user.id,"/",req.files.fileupload.name)}`;
            const wb = new Excel.Workbook();
            var fieldNames = [];            
            var fieldRowValues = [];
            await wb.xlsx.readFile(fileName).then(() => {
                var sheet = wb.getWorksheet(wb.worksheets[0].name);
                rowTotal = sheet.actualRowCount-1;
                for (var i = 1; i <= sheet.actualRowCount; i++) {
                    var fieldValues = [];
                    for (var j = 1; j <= sheet.actualColumnCount; j++) {
                        data = sheet.getRow(i).getCell(j).toString();
                        if(i==1) {
                            fieldNames.push(data);
                        }
                        else {
                            const findColumn = _.find(columns, {Field:fieldNames[j-1].toLowerCase()});
                            if(findColumn!= undefined){
                                if(findColumn.Type.includes("varchar(36)")){
                                    if(data == "UUID()"){
                                        fieldValues.push(`${data}`);
                                    }
                                    else {
                                        fieldValues.push(`'${data}'`);
                                    }                                    
                                }
                                else if(findColumn.Type.includes("varchar")){
                                    fieldValues.push(`'${data}'`);
                                }
                                else if(findColumn.Type.includes("text")){
                                    fieldValues.push(`'${data}'`);
                                }                                
                                else if(findColumn.Type.includes("datetime")){
                                    if(moment(data).isValid())
                                    {                                        
                                        var dateValue = moment(data).format('YYYY-MM-DD');
                                        fieldValues.push(`'${dateValue}'`);
                                    }
                                    else {
                                        fieldValues.push(`null`);
                                    }
                                }
                                else if(findColumn.Type.includes("int")){
                                    fieldValues.push(`${data}`);
                                }
                                else {
                                    fieldValues.push(`null`);
                                }
                            }
                        }
                    }
                    if(i!= 1){
                        fieldValues.push("UUID()");
                        fieldValues.push(`'${req.user.id}'`);
                        fieldValues.push(`'${req.user.id}'`);
                        fieldValues.push(`'${moment(new Date()).format('YYYY-MM-DD')}'`);
                    }


                    if(fieldValues.length != 0){
                        fieldRowValues.push("("+fieldValues.join(",")+")");
                    }
                }
            });
            fieldNames.push("id");
            fieldNames.push("owner_id");
            fieldNames.push("create_by");
            fieldNames.push("create_date");
            var sqlNameInsertTemp = `(${fieldNames.join(",")})`;
            var sqlValueInsertTemp = `${fieldRowValues.join(",")}`;
            var checkDupColumns = "";
            if(req.body.checkDupColumns != ""){
                checkDupColumns = JSON.parse(req.body.checkDupColumns).map(item=>item.value).join(",");
            }
            var sqlcheckDup = "";
            if(checkDupColumns != ""){
                sqlcheckDup = ` where (${checkDupColumns}) not in (select ${checkDupColumns} from ${tableName})`;
            }
            await dbHelper.execute(`CREATE TEMPORARY TABLE IF NOT EXISTS ${tempTableName} select * from ${tableName} limit 0`);
            await dbHelper.execute(`insert into ${tempTableName} ${sqlNameInsertTemp} values ${sqlValueInsertTemp}`); 
            await dbHelper.execute(`insert into ${tableName} select * from ${tempTableName} ${sqlcheckDup}`);
            await dbHelper.execute(`DROP TEMPORARY TABLE IF EXISTS ${tempTableName}`);
            var importData = {
                id:uuidv4(),
                table_name:tableName,
                import_by:req.user.id,
                import_date:new Date(),
                import_status:0,
                message:"Sucess"
            };
            await dbHelper.create("import_data",importData);
            fs.unlinkSync(fileName);
        }
        return res.status(200).json({ success: true, refresh:true, message:'Save complete.', param });
    }
    catch (err) {
            var importData = {
				id:uuidv4(),
                table_name:tableName,
                import_by:req.user.id,
                import_date:new Date(),
                import_status:1,
                message:err.message
            };
            await dbHelper.create("import_data",importData);        
        next(err);
    }
}

exports.import_dataExport = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req,"get");
        const [import_datas] = await Promise.all([
			dbHelper.queryAll(`select * from import_data where table_name like '%${param.qimport_datas}%' `)
        ]);
        res.writeHead(200, {
            'Content-Disposition': 'attachment; filename="import_datas-'+common.stampTime+'.xlsx"',
            'Transfer-Encoding': 'chunked',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const workbook = new Excel.stream.xlsx.WorkbookWriter({ stream: res });
        const worksheet = workbook.addWorksheet('Sheet1');
        let worksheet_header = [];			
        if (import_datas.length > 0) {
            let record = import_datas[0];
            for(let i=0; i< Object.keys(record).length; i++){
                worksheet_header.push({ header: Object.keys(record)[i], key: Object.keys(record)[i] });
            }
        }
        worksheet.columns = worksheet_header;
        import_datas.forEach(record => {
            let row = {};
            for(let i=0; i< Object.keys(record).length; i++){
                row[Object.keys(record)[i]] = Object.values(record)[i];
            }            
            worksheet.addRow(row).commit();
        });
        worksheet.commit();
        workbook.commit();	        
    }
    catch (err) {
        next(err);
    }
}


exports.province_electricity_branchDelete = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [province_electricity_branchRecord] = await Promise.all([
			dbHelper.delete("province_electricity_branch",{'id':param.deleteId}) 
		]);

        res.status(200).json({ success: true, message:'', param   });
    }
    catch (err) {
        next(err);
    }
}

exports.province_electricity_branchExport = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWhereprovince_electricity_branchRecords = [];                
        
        if(sqlParam != ""){
            arrWhereprovince_electricity_branchRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWhereprovince_electricity_branchRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWhereprovince_electricity_branchRecords = "";
        if(arrWhereprovince_electricity_branchRecords.length>0){
            sqlWhereprovince_electricity_branchRecords = `  where  ${arrWhereprovince_electricity_branchRecords.join(" and ")??""}`;
        }
    

		var [province_electricity_branchRecords] = await Promise.all([
			dbHelper.queryAll(`select * from province_electricity_branch ${sqlWhereprovince_electricity_branchRecords}`) 
		]);

        common.exportXls(res, "province_electricity_branchRecords-"+common.stampTime, "Sheet1", province_electricity_branchRecords);
    }
    catch (err) {
        next(err);
    }
}

exports.province_electricity_branchPage = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWhereprovince_electricity_branchRecords = [];                
        
        if(sqlParam != ""){
            arrWhereprovince_electricity_branchRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWhereprovince_electricity_branchRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWhereprovince_electricity_branchRecords = "";
        if(arrWhereprovince_electricity_branchRecords.length>0){
            sqlWhereprovince_electricity_branchRecords = `  where  ${arrWhereprovince_electricity_branchRecords.join(" and ")??""}`;
        }
    

		var [province_electricity_branchRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from province_electricity_branch ${sqlWhereprovince_electricity_branchRecords}) totalcount  from province_electricity_branch ${sqlWhereprovince_electricity_branchRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (province_electricity_branchRecords.length > 0) { totalcount = province_electricity_branchRecords[0].totalcount; }
        let province_electricity_branchRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.status(200).json({ success: true, message:'', param ,province_electricity_branchRecords,province_electricity_branchRecordsPagination  });
    }
    catch (err) {
        next(err);
    }
}

exports.province_electricity_branchAll = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWhereprovince_electricity_branchRecords = [];                
        
        if(sqlParam != ""){
            arrWhereprovince_electricity_branchRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWhereprovince_electricity_branchRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWhereprovince_electricity_branchRecords = "";
        if(arrWhereprovince_electricity_branchRecords.length>0){
            sqlWhereprovince_electricity_branchRecords = `  where  ${arrWhereprovince_electricity_branchRecords.join(" and ")??""}`;
        }
    

		var [province_electricity_branchRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from province_electricity_branch ${sqlWhereprovince_electricity_branchRecords}) totalcount  from province_electricity_branch ${sqlWhereprovince_electricity_branchRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (province_electricity_branchRecords.length > 0) { totalcount = province_electricity_branchRecords[0].totalcount; }
        let province_electricity_branchRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.render('master/province_electricity_branch/list', { title: `ค่าไฟฟ้า`, param ,province_electricity_branchRecords,province_electricity_branchRecordsPagination });
    }
    catch (err) {
        next(err);
    }
}

exports.province_waterwork_branchEdit = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [province_waterwork_branchRecord] = await Promise.all([
			param.id!=undefined?dbHelper.findOne("province_waterwork_branch",{"id":param.id??""},[]):{} 
		]);

        res.render('master/province_waterwork_branch/edit', { title: `รหัส กปภ.: ${province_waterwork_branchRecord.id??""}`, param ,province_waterwork_branchRecord });
    }
    catch (err) {
        next(err);
    }
}

exports.province_waterwork_branchSave = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var province_waterwork_branchData = {
			code: req.body.code||null,
			name: req.body.name||null,
			country_name: req.body.country_name||null 
		};
                
		var newprovince_waterwork_branchId = uuidv4(); 
        if (param.id == undefined) {
            province_waterwork_branchData.id = newprovince_waterwork_branchId;
            province_waterwork_branchData.owner_id = req.user.id;
            province_waterwork_branchData.create_by = req.user.id;
            province_waterwork_branchData.create_date = common.toMySqlDateTimeFormat(new Date());
        }
        else {
            province_waterwork_branchData.update_by = req.user.id;
            province_waterwork_branchData.update_date = common.toMySqlDateTimeFormat(new Date());
        };

		var redirectParam = common.getRedirectAllParam(req);  
            var redirect = "" ;
            if (param.id == undefined) {             
                redirect = `/master/province_waterwork_branch/edit?id=${newprovince_waterwork_branchId}${redirectParam!=""?`&${redirectParam}`:""}`;
            }
            

		var [province_waterwork_branchRecord] = await Promise.all([
			param.id!=undefined?dbHelper.update("province_waterwork_branch",province_waterwork_branchData,{"id":param.id??""}):dbHelper.create("province_waterwork_branch",province_waterwork_branchData) 
		]);

        res.status(200).json({ success: true, message:'Save complete.', param  ,redirect });
    }
    catch (err) {
        next(err);
    }
}

exports.water_userDelete = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [water_userRecord] = await Promise.all([
			dbHelper.delete("water_user",{'id':param.deleteId}) 
		]);

        res.status(200).json({ success: true, message:'', param   });
    }
    catch (err) {
        next(err);
    }
}

exports.water_userExport = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWherewater_userRecords = [];                
        
        if(sqlParam != ""){
            arrWherewater_userRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWherewater_userRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherewater_userRecords = "";
        if(arrWherewater_userRecords.length>0){
            sqlWherewater_userRecords = `  where  ${arrWherewater_userRecords.join(" and ")??""}`;
        }
    

		var [water_userRecords] = await Promise.all([
			dbHelper.queryAll(`select * from water_user ${sqlWherewater_userRecords}`) 
		]);

        common.exportXls(res, "water_userRecords-"+common.stampTime, "Sheet1", water_userRecords);
    }
    catch (err) {
        next(err);
    }
}

exports.water_userPage = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWherewater_userRecords = [];                
        
        if(sqlParam != ""){
            arrWherewater_userRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWherewater_userRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherewater_userRecords = "";
        if(arrWherewater_userRecords.length>0){
            sqlWherewater_userRecords = `  where  ${arrWherewater_userRecords.join(" and ")??""}`;
        }
    

		var [water_userRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from water_user ${sqlWherewater_userRecords}) totalcount  from water_user ${sqlWherewater_userRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (water_userRecords.length > 0) { totalcount = water_userRecords[0].totalcount; }
        let water_userRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.status(200).json({ success: true, message:'', param ,water_userRecords,water_userRecordsPagination  });
    }
    catch (err) {
        next(err);
    }
}

exports.water_userAll = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWherewater_userRecords = [];                
        
        if(sqlParam != ""){
            arrWherewater_userRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWherewater_userRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherewater_userRecords = "";
        if(arrWherewater_userRecords.length>0){
            sqlWherewater_userRecords = `  where  ${arrWherewater_userRecords.join(" and ")??""}`;
        }
    

		var [water_userRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from water_user ${sqlWherewater_userRecords}) totalcount  from water_user ${sqlWherewater_userRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (water_userRecords.length > 0) { totalcount = water_userRecords[0].totalcount; }
        let water_userRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.render('water_user/list', { title: `Water User`, param ,water_userRecords,water_userRecordsPagination });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_electricityEdit = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [bill_electricityRecord] = await Promise.all([
			param.id!=undefined?dbHelper.queryOne(`select bill_electricity.*, electricity_user.electricity_user_name, province_electricity_branch.name province_electricity_branch_name 
from bill_electricity, electricity_user, province_electricity_branch
where 
	bill_electricity.electricity_user_id = electricity_user.id
    and bill_electricity.province_electricity_branch_id = province_electricity_branch.id
and bill_electricity.id='${param.id??""}'
`,{},{}):{} 
		]);

        res.render('bill_electricity/edit', { title: `Bill Electric: ${bill_electricityRecord.id??""}`, param ,bill_electricityRecord });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_electricitySave = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var bill_electricityData = {
			province_electricity_branch_id: req.body.province_electricity_branch_id||null,
			electricity_user_id: req.body.electricity_user_id||null,
			month: req.body.month||null,
			amount: req.body.amount||0,
			payment_status: req.body.payment_status||0,
			payment_receipt_number: req.body.payment_receipt_number||null,
			remark: req.body.remark||null,
			year: req.body.year||null 
		};
                
		var newbill_electricityId = uuidv4(); 
        if (param.id == undefined) {
            bill_electricityData.id = newbill_electricityId;
            bill_electricityData.owner_id = req.user.id;
            bill_electricityData.create_by = req.user.id;
            bill_electricityData.create_date = common.toMySqlDateTimeFormat(new Date());
        }
        else {
            bill_electricityData.update_by = req.user.id;
            bill_electricityData.update_date = common.toMySqlDateTimeFormat(new Date());
        };

		var redirectParam = common.getRedirectAllParam(req);  
            var redirect = "" ;
            if (param.id == undefined) {             
                redirect = `/bill_electricity/edit?id=${newbill_electricityId}${redirectParam!=""?`&${redirectParam}`:""}`;
            }
            

		var [bill_electricityRecord] = await Promise.all([
			param.id!=undefined?dbHelper.update("bill_electricity",bill_electricityData,{"id":param.id??""}):dbHelper.create("bill_electricity",bill_electricityData) 
		]);

        res.status(200).json({ success: true, message:'Save complete.', param  ,redirect });
    }
    catch (err) {
        next(err);
    }
}

exports.electricity_userEdit = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [electricity_userRecord] = await Promise.all([
			param.id!=undefined?dbHelper.findOne("electricity_user",{"id":param.id??""},[]):{} 
		]);

        res.render('electricity_user/edit', { title: `ผู้ใช้ไฟฟ้า: ${electricity_userRecord.id??""}`, param ,electricity_userRecord });
    }
    catch (err) {
        next(err);
    }
}

exports.electricity_userSave = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var electricity_userData = {
			electricity_user_number: req.body.electricity_user_number||null,
			electricity_user_name: req.body.electricity_user_name||null,
			address: req.body.address||null,
			phone: req.body.phone||null,
			social: req.body.social||null 
		};
                
		var newelectricity_userId = uuidv4(); 
        if (param.id == undefined) {
            electricity_userData.id = newelectricity_userId;
            electricity_userData.owner_id = req.user.id;
            electricity_userData.create_by = req.user.id;
            electricity_userData.create_date = common.toMySqlDateTimeFormat(new Date());
        }
        else {
            electricity_userData.update_by = req.user.id;
            electricity_userData.update_date = common.toMySqlDateTimeFormat(new Date());
        };

		var redirectParam = common.getRedirectAllParam(req);  
            var redirect = "" ;
            if (param.id == undefined) {             
                redirect = `/electricity_user/edit?id=${newelectricity_userId}${redirectParam!=""?`&${redirectParam}`:""}`;
            }
            

		var [electricity_userRecord] = await Promise.all([
			param.id!=undefined?dbHelper.update("electricity_user",electricity_userData,{"id":param.id??""}):dbHelper.create("electricity_user",electricity_userData) 
		]);

        res.status(200).json({ success: true, message:'Save complete.', param  ,redirect });
    }
    catch (err) {
        next(err);
    }
}

exports.province_waterwork_branchDelete = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [province_waterwork_branchRecord] = await Promise.all([
			dbHelper.delete("province_waterwork_branch",{'id':param.deleteId}) 
		]);

        res.status(200).json({ success: true, message:'', param   });
    }
    catch (err) {
        next(err);
    }
}

exports.province_waterwork_branchExport = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWhereprovince_waterwork_branchRecords = [];                
        
        if(sqlParam != ""){
            arrWhereprovince_waterwork_branchRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWhereprovince_waterwork_branchRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWhereprovince_waterwork_branchRecords = "";
        if(arrWhereprovince_waterwork_branchRecords.length>0){
            sqlWhereprovince_waterwork_branchRecords = `  where  ${arrWhereprovince_waterwork_branchRecords.join(" and ")??""}`;
        }
    

		var [province_waterwork_branchRecords] = await Promise.all([
			dbHelper.queryAll(`select * from province_waterwork_branch ${sqlWhereprovince_waterwork_branchRecords}`) 
		]);

        common.exportXls(res, "province_waterwork_branchRecords-"+common.stampTime, "Sheet1", province_waterwork_branchRecords);
    }
    catch (err) {
        next(err);
    }
}

exports.province_waterwork_branchPage = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWhereprovince_waterwork_branchRecords = [];                
        
        if(sqlParam != ""){
            arrWhereprovince_waterwork_branchRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWhereprovince_waterwork_branchRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWhereprovince_waterwork_branchRecords = "";
        if(arrWhereprovince_waterwork_branchRecords.length>0){
            sqlWhereprovince_waterwork_branchRecords = `  where  ${arrWhereprovince_waterwork_branchRecords.join(" and ")??""}`;
        }
    

		var [province_waterwork_branchRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from province_waterwork_branch ${sqlWhereprovince_waterwork_branchRecords}) totalcount  from province_waterwork_branch ${sqlWhereprovince_waterwork_branchRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (province_waterwork_branchRecords.length > 0) { totalcount = province_waterwork_branchRecords[0].totalcount; }
        let province_waterwork_branchRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.status(200).json({ success: true, message:'', param ,province_waterwork_branchRecords,province_waterwork_branchRecordsPagination  });
    }
    catch (err) {
        next(err);
    }
}

exports.province_waterwork_branchAll = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWhereprovince_waterwork_branchRecords = [];                
        
        if(sqlParam != ""){
            arrWhereprovince_waterwork_branchRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWhereprovince_waterwork_branchRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWhereprovince_waterwork_branchRecords = "";
        if(arrWhereprovince_waterwork_branchRecords.length>0){
            sqlWhereprovince_waterwork_branchRecords = `  where  ${arrWhereprovince_waterwork_branchRecords.join(" and ")??""}`;
        }
    

		var [province_waterwork_branchRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from province_waterwork_branch ${sqlWhereprovince_waterwork_branchRecords}) totalcount  from province_waterwork_branch ${sqlWhereprovince_waterwork_branchRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (province_waterwork_branchRecords.length > 0) { totalcount = province_waterwork_branchRecords[0].totalcount; }
        let province_waterwork_branchRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.render('master/province_waterwork_branch/list', { title: `รหัส กปภ.`, param ,province_waterwork_branchRecords,province_waterwork_branchRecordsPagination });
    }
    catch (err) {
        next(err);
    }
}

exports.electricity_userDelete = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [electricity_userRecord] = await Promise.all([
			dbHelper.delete("electricity_user",{'id':param.deleteId}) 
		]);

        res.status(200).json({ success: true, message:'', param   });
    }
    catch (err) {
        next(err);
    }
}

exports.electricity_userExport = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWhereelectricity_userRecords = [];                
        
        if(sqlParam != ""){
            arrWhereelectricity_userRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWhereelectricity_userRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWhereelectricity_userRecords = "";
        if(arrWhereelectricity_userRecords.length>0){
            sqlWhereelectricity_userRecords = `  where  ${arrWhereelectricity_userRecords.join(" and ")??""}`;
        }
    

		var [electricity_userRecords] = await Promise.all([
			dbHelper.queryAll(`select * from electricity_user ${sqlWhereelectricity_userRecords}`) 
		]);

        common.exportXls(res, "electricity_userRecords-"+common.stampTime, "Sheet1", electricity_userRecords);
    }
    catch (err) {
        next(err);
    }
}

exports.electricity_userPage = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWhereelectricity_userRecords = [];                
        
        if(sqlParam != ""){
            arrWhereelectricity_userRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWhereelectricity_userRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWhereelectricity_userRecords = "";
        if(arrWhereelectricity_userRecords.length>0){
            sqlWhereelectricity_userRecords = `  where  ${arrWhereelectricity_userRecords.join(" and ")??""}`;
        }
    

		var [electricity_userRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from electricity_user ${sqlWhereelectricity_userRecords}) totalcount  from electricity_user ${sqlWhereelectricity_userRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (electricity_userRecords.length > 0) { totalcount = electricity_userRecords[0].totalcount; }
        let electricity_userRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.status(200).json({ success: true, message:'', param ,electricity_userRecords,electricity_userRecordsPagination  });
    }
    catch (err) {
        next(err);
    }
}

exports.electricity_userAll = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWhereelectricity_userRecords = [];                
        
        if(sqlParam != ""){
            arrWhereelectricity_userRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWhereelectricity_userRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWhereelectricity_userRecords = "";
        if(arrWhereelectricity_userRecords.length>0){
            sqlWhereelectricity_userRecords = `  where  ${arrWhereelectricity_userRecords.join(" and ")??""}`;
        }
    

		var [electricity_userRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from electricity_user ${sqlWhereelectricity_userRecords}) totalcount  from electricity_user ${sqlWhereelectricity_userRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (electricity_userRecords.length > 0) { totalcount = electricity_userRecords[0].totalcount; }
        let electricity_userRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.render('electricity_user/list', { title: `ผู้ใช้ไฟฟ้า`, param ,electricity_userRecords,electricity_userRecordsPagination });
    }
    catch (err) {
        next(err);
    }
}

exports.water_userEdit = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [water_userRecord] = await Promise.all([
			param.id!=undefined?dbHelper.findOne("water_user",{"id":param.id??""},[]):{} 
		]);

        res.render('water_user/edit', { title: `Water User : ${water_userRecord.id??""}`, param ,water_userRecord });
    }
    catch (err) {
        next(err);
    }
}

exports.water_userSave = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var water_userData = {
			water_user_number: req.body.water_user_number||null,
			water_user_name: req.body.water_user_name||null,
			address: req.body.address||null,
			phone: req.body.phone||null,
			social: req.body.social||null 
		};
                
		var newwater_userId = uuidv4(); 
        if (param.id == undefined) {
            water_userData.id = newwater_userId;
            water_userData.owner_id = req.user.id;
            water_userData.create_by = req.user.id;
            water_userData.create_date = common.toMySqlDateTimeFormat(new Date());
        }
        else {
            water_userData.update_by = req.user.id;
            water_userData.update_date = common.toMySqlDateTimeFormat(new Date());
        };

		var redirectParam = common.getRedirectAllParam(req);  
            var redirect = "" ;
            if (param.id == undefined) {             
                redirect = `/water_user/edit?id=${newwater_userId}${redirectParam!=""?`&${redirectParam}`:""}`;
            }
            

		var [water_userRecord] = await Promise.all([
			param.id!=undefined?dbHelper.update("water_user",water_userData,{"id":param.id??""}):dbHelper.create("water_user",water_userData) 
		]);

        res.status(200).json({ success: true, message:'Save complete.', param  ,redirect });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_electricityDelete = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [bill_electricityRecord] = await Promise.all([
			dbHelper.delete("bill_electricity",{'id':param.deleteId}) 
		]);

        res.status(200).json({ success: true, message:'', param   });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_electricityExport = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        
        var arrWherebill_electricityRecords = [];                
        
        
        if(sqlWhereDataPrivilege != ''){
            arrWherebill_electricityRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherebill_electricityRecords = "";
        if(arrWherebill_electricityRecords.length>0){
            sqlWherebill_electricityRecords = `  and  ${arrWherebill_electricityRecords.join(" and ")??""}`;
        }
    

		var [bill_electricityRecords] = await Promise.all([
			dbHelper.queryAll(`select *, case payment_status when 0 then 'ยังไม่ชำระ' else 'ชำระแล้ว' end payment_status_text, 
            (select electricity_user.electricity_user_name from electricity_user where electricity_user.id = electricity_user_id) electricity_user_name 
             from bill_electricity  
             where 
                (
                    electricity_user_id in (
                        select electricity_user.id from electricity_user where electricity_user.electricity_user_name like '%${param.electricity_user_name??""}%'                    
                    )
                    and payment_status like '%${param.payment_status??""}%'
                )${sqlWherebill_electricityRecords?`and ${sqlWherebill_electricityRecords}`:""}  ${sqlWherebill_electricityRecords}`) 
		]);

        common.exportXls(res, "bill_electricityRecords-"+common.stampTime, "Sheet1", bill_electricityRecords);
    }
    catch (err) {
        next(err);
    }
}

exports.bill_electricityPage = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        
        var arrWherebill_electricityRecords = [];                
        
        
        if(sqlWhereDataPrivilege != ''){
            arrWherebill_electricityRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherebill_electricityRecords = "";
        if(arrWherebill_electricityRecords.length>0){
            sqlWherebill_electricityRecords = `  and  ${arrWherebill_electricityRecords.join(" and ")??""}`;
        }
    

		var [bill_electricityRecords] = await Promise.all([
			dbHelper.queryAll(`select *, case payment_status when 0 then 'ยังไม่ชำระ' else 'ชำระแล้ว' end payment_status_text, 
            (select electricity_user.electricity_user_name from electricity_user where electricity_user.id = electricity_user_id) electricity_user_name ,(select count(id) from bill_electricity where (
                    payment_status like '%${param.payment_status??""}%' 
                    and electricity_user_id in (
                        select id from electricity_user 
                        where electricity_user_name like '%${param.electricity_user_name??""}%' 
                        
                    )
                )
                ${sqlWherebill_electricityRecords?`and ${sqlWherebill_electricityRecords}`:""} ) totalcount 
             from bill_electricity  
             where 
                (
                    electricity_user_id in (
                        select electricity_user.id from electricity_user where electricity_user.electricity_user_name like '%${param.electricity_user_name??""}%'                    
                    )
                    and payment_status like '%${param.payment_status??""}%'
                )${sqlWherebill_electricityRecords?`and ${sqlWherebill_electricityRecords}`:""}  ${sqlWherebill_electricityRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (bill_electricityRecords.length > 0) { totalcount = bill_electricityRecords[0].totalcount; }
        let bill_electricityRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.status(200).json({ success: true, message:'', param ,bill_electricityRecords,bill_electricityRecordsPagination  });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_electricityAll = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        
        var arrWherebill_electricityRecords = [];                
        
        
        if(sqlWhereDataPrivilege != ''){
            arrWherebill_electricityRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherebill_electricityRecords = "";
        if(arrWherebill_electricityRecords.length>0){
            sqlWherebill_electricityRecords = `  and  ${arrWherebill_electricityRecords.join(" and ")??""}`;
        }
    

		var [bill_electricityRecords] = await Promise.all([
			dbHelper.queryAll(`select *, case payment_status when 0 then 'ยังไม่ชำระ' else 'ชำระแล้ว' end payment_status_text, 
            (select electricity_user.electricity_user_name from electricity_user where electricity_user.id = electricity_user_id) electricity_user_name ,(select count(id) from bill_electricity where (
                    payment_status like '%${param.payment_status??""}%' 
                    and electricity_user_id in (
                        select id from electricity_user 
                        where electricity_user_name like '%${param.electricity_user_name??""}%' 
                        
                    )
                )
                ${sqlWherebill_electricityRecords?`and ${sqlWherebill_electricityRecords}`:""} ) totalcount 
             from bill_electricity  
             where 
                (
                    electricity_user_id in (
                        select electricity_user.id from electricity_user where electricity_user.electricity_user_name like '%${param.electricity_user_name??""}%'                    
                    )
                    and payment_status like '%${param.payment_status??""}%'
                )${sqlWherebill_electricityRecords?`and ${sqlWherebill_electricityRecords}`:""}  ${sqlWherebill_electricityRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (bill_electricityRecords.length > 0) { totalcount = bill_electricityRecords[0].totalcount; }
        let bill_electricityRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.render('bill_electricity/list', { title: `Bill Electric`, param ,bill_electricityRecords,bill_electricityRecordsPagination });
    }
    catch (err) {
        next(err);
    }
}

exports.province_electricity_branchEdit = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [province_electricity_branchRecord] = await Promise.all([
			param.id!=undefined?dbHelper.findOne("province_electricity_branch",{"id":param.id??""},[]):{} 
		]);

        res.render('master/province_electricity_branch/edit', { title: `ค่าไฟฟ้า: ${province_electricity_branchRecord.id??""}`, param ,province_electricity_branchRecord });
    }
    catch (err) {
        next(err);
    }
}

exports.province_electricity_branchSave = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var province_electricity_branchData = {
			code: req.body.code||null,
			name: req.body.name||null,
			country_name: req.body.country_name||null 
		};
                
		var newprovince_electricity_branchId = uuidv4(); 
        if (param.id == undefined) {
            province_electricity_branchData.id = newprovince_electricity_branchId;
            province_electricity_branchData.owner_id = req.user.id;
            province_electricity_branchData.create_by = req.user.id;
            province_electricity_branchData.create_date = common.toMySqlDateTimeFormat(new Date());
        }
        else {
            province_electricity_branchData.update_by = req.user.id;
            province_electricity_branchData.update_date = common.toMySqlDateTimeFormat(new Date());
        };

		var redirectParam = common.getRedirectAllParam(req);  
            var redirect = "" ;
            if (param.id == undefined) {             
                redirect = `/master/province_electricity_branch/edit?id=${newprovince_electricity_branchId}${redirectParam!=""?`&${redirectParam}`:""}`;
            }
            

		var [province_electricity_branchRecord] = await Promise.all([
			param.id!=undefined?dbHelper.update("province_electricity_branch",province_electricity_branchData,{"id":param.id??""}):dbHelper.create("province_electricity_branch",province_electricity_branchData) 
		]);

        res.status(200).json({ success: true, message:'Save complete.', param  ,redirect });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_waterDelete = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [bill_waterRecord] = await Promise.all([
			dbHelper.delete("bill_water",{'id':param.deleteId}) 
		]);

        res.status(200).json({ success: true, message:'', param   });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_waterExport = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        
        var arrWherebill_waterRecords = [];                
        
        
        if(sqlWhereDataPrivilege != ''){
            arrWherebill_waterRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherebill_waterRecords = "";
        if(arrWherebill_waterRecords.length>0){
            sqlWherebill_waterRecords = `  and  ${arrWherebill_waterRecords.join(" and ")??""}`;
        }
    

		var [bill_waterRecords] = await Promise.all([
			dbHelper.queryAll(`select *, case payment_status when 0 then 'ยังไม่ชำระ' else 'ชำระแล้ว' end payment_status_text,             (select water_user_name from water_user where id = water_user_id) water_user_name              from bill_water               where                 (                    water_user_id in (                        select water_user.id from water_user where water_user_name like '%${param.water_user_name??""}%'                                        )                    and payment_status like '%${param.payment_status??""}%'                ) ${sqlWherebill_waterRecords}`) 
		]);

        common.exportXls(res, "bill_waterRecords-"+common.stampTime, "Sheet1", bill_waterRecords);
    }
    catch (err) {
        next(err);
    }
}

exports.bill_waterPage = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        
        var arrWherebill_waterRecords = [];                
        
        
        if(sqlWhereDataPrivilege != ''){
            arrWherebill_waterRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherebill_waterRecords = "";
        if(arrWherebill_waterRecords.length>0){
            sqlWherebill_waterRecords = `  and  ${arrWherebill_waterRecords.join(" and ")??""}`;
        }
    

		var [bill_waterRecords] = await Promise.all([
			dbHelper.queryAll(`select *, case payment_status when 0 then 'ยังไม่ชำระ' else 'ชำระแล้ว' end payment_status_text,             (select water_user_name from water_user where id = water_user_id) water_user_name ,(select count(id) from bill_water where (                    payment_status like '%${param.payment_status??""}%'                     and water_user_id in (                        select id from water_user                         where water_user_name like '%${param.water_user_name??""}%'                                             )                )   ) totalcount              from bill_water               where                 (                    water_user_id in (                        select water_user.id from water_user where water_user_name like '%${param.water_user_name??""}%'                                        )                    and payment_status like '%${param.payment_status??""}%'                ) ${sqlWherebill_waterRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (bill_waterRecords.length > 0) { totalcount = bill_waterRecords[0].totalcount; }
        let bill_waterRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.status(200).json({ success: true, message:'', param ,bill_waterRecords,bill_waterRecordsPagination  });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_waterAll = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        
        var arrWherebill_waterRecords = [];                
        
        
        if(sqlWhereDataPrivilege != ''){
            arrWherebill_waterRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherebill_waterRecords = "";
        if(arrWherebill_waterRecords.length>0){
            sqlWherebill_waterRecords = `  and  ${arrWherebill_waterRecords.join(" and ")??""}`;
        }
    

		var [bill_waterRecords] = await Promise.all([
			dbHelper.queryAll(`select *, case payment_status when 0 then 'ยังไม่ชำระ' else 'ชำระแล้ว' end payment_status_text,             (select water_user_name from water_user where id = water_user_id) water_user_name ,(select count(id) from bill_water where (                    payment_status like '%${param.payment_status??""}%'                     and water_user_id in (                        select id from water_user                         where water_user_name like '%${param.water_user_name??""}%'                                             )                )   ) totalcount              from bill_water               where                 (                    water_user_id in (                        select water_user.id from water_user where water_user_name like '%${param.water_user_name??""}%'                                        )                    and payment_status like '%${param.payment_status??""}%'                ) ${sqlWherebill_waterRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (bill_waterRecords.length > 0) { totalcount = bill_waterRecords[0].totalcount; }
        let bill_waterRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.render('bill_water/list', { title: `จัดเก็บค่าน้ำ`, param ,bill_waterRecords,bill_waterRecordsPagination });
    }
    catch (err) {
        next(err);
    }
}

exports.settingEdit = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [settingRecord] = await Promise.all([
			dbHelper.findOne("setting",{},[]) 
		]);

        res.render('setting/edit', { title: `ตั้งค่า: ${settingRecord.id??""}`, param ,settingRecord });
    }
    catch (err) {
        next(err);
    }
}

exports.settingSave = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var settingData = {
			institution: req.body.institution||null 
		};
                

		var [settingRecord] = await Promise.all([
			dbHelper.update("setting",settingData,{}) 
		]);

        res.status(200).json({ success: true, message:'Save complete.', param   });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_waterEdit = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var [bill_waterRecord] = await Promise.all([
			param.id!=undefined?dbHelper.queryOne(`select bill_water.*, water_user.water_user_name, province_waterwork_branch.name province_waterwork_branch_name from bill_water, water_user, province_waterwork_branch where 	bill_water.water_user_id = water_user.id    and bill_water.province_waterwork_branch_id = province_waterwork_branch.id and bill_water.id='${param.id??""}'`,{},{}):{} 
		]);

        res.render('bill_water/edit', { title: `ฃำระค่าน้ำปะปา: ${bill_waterRecord.id??""}`, param ,bill_waterRecord });
    }
    catch (err) {
        next(err);
    }
}

exports.bill_waterSave = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var bill_waterData = {
			province_waterwork_branch_id: req.body.province_waterwork_branch_id||null,
			water_user_id: req.body.water_user_id||null,
			month: req.body.month||null,
			amount: req.body.amount||0,
			payment_status: req.body.payment_status||0,
			payment_receipt_number: req.body.payment_receipt_number||null,
			year: req.body.year||null 
		};
                
		var newbill_waterId = uuidv4(); 
        if (param.id == undefined) {
            bill_waterData.id = newbill_waterId;
            bill_waterData.owner_id = req.user.id;
            bill_waterData.create_by = req.user.id;
            bill_waterData.create_date = common.toMySqlDateTimeFormat(new Date());
        }
        else {
            bill_waterData.update_by = req.user.id;
            bill_waterData.update_date = common.toMySqlDateTimeFormat(new Date());
        };

		var redirectParam = common.getRedirectAllParam(req);  
            var redirect = "" ;
            if (param.id == undefined) {             
                redirect = `/bill_water/edit?id=${newbill_waterId}${redirectParam!=""?`&${redirectParam}`:""}`;
            }
            

		var [bill_waterRecord] = await Promise.all([
			param.id!=undefined?dbHelper.update("bill_water",bill_waterData,{"id":param.id??""}):dbHelper.create("bill_water",bill_waterData) 
		]);

        res.status(200).json({ success: true, message:'Save complete.', param  ,redirect });
    }
    catch (err) {
        next(err);
    }
}

exports.reportBill_electricityExport = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWherebill_electricityRecords = [];                
        
        if(sqlParam != ""){
            arrWherebill_electricityRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWherebill_electricityRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherebill_electricityRecords = "";
        if(arrWherebill_electricityRecords.length>0){
            sqlWherebill_electricityRecords = `  where  ${arrWherebill_electricityRecords.join(" and ")??""}`;
        }
    

		var [bill_electricityRecords] = await Promise.all([
			dbHelper.queryAll(`select * from bill_electricity ${sqlWherebill_electricityRecords}`) 
		]);

        common.exportXls(res, "bill_electricityRecords-"+common.stampTime, "Sheet1", bill_electricityRecords);
    }
    catch (err) {
        next(err);
    }
}

exports.reportBill_electricityPage = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWherebill_electricityRecords = [];                
        
        if(sqlParam != ""){
            arrWherebill_electricityRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWherebill_electricityRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherebill_electricityRecords = "";
        if(arrWherebill_electricityRecords.length>0){
            sqlWherebill_electricityRecords = `  where  ${arrWherebill_electricityRecords.join(" and ")??""}`;
        }
    

		var [bill_electricityRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from bill_electricity ${sqlWherebill_electricityRecords}) totalcount  from bill_electricity ${sqlWherebill_electricityRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (bill_electricityRecords.length > 0) { totalcount = bill_electricityRecords[0].totalcount; }
        let bill_electricityRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.status(200).json({ success: true, message:'', param ,bill_electricityRecords,bill_electricityRecordsPagination  });
    }
    catch (err) {
        next(err);
    }
}

exports.reportBill_electricityAll = async function (req, res, next) {
    try 
    {
        var param = impleplusHelper.getFunctionParams(req);

        let paginationNum = __config.paginationNum;
        let page = param.page||1;
        let totalcount = 0;
        
		var sqlWhereDataPrivilege = impleplusHelper.sqlDataPrivilege(req);

        var sqlParam = impleplusHelper.getSqlParam(param);
        var arrWherebill_electricityRecords = [];                
        
        if(sqlParam != ""){
            arrWherebill_electricityRecords.push(sqlParam);
        }
        
        if(sqlWhereDataPrivilege != ''){
            arrWherebill_electricityRecords.push(sqlWhereDataPrivilege);
        }
        var sqlWherebill_electricityRecords = "";
        if(arrWherebill_electricityRecords.length>0){
            sqlWherebill_electricityRecords = `  where  ${arrWherebill_electricityRecords.join(" and ")??""}`;
        }
    

		var [bill_electricityRecords] = await Promise.all([
			dbHelper.queryAll(`select * ,(select count(id) from bill_electricity ${sqlWherebill_electricityRecords}) totalcount  from bill_electricity ${sqlWherebill_electricityRecords} limit ${((page - 1) * paginationNum) + "," + paginationNum}`) 
		]);
		if (bill_electricityRecords.length > 0) { totalcount = bill_electricityRecords[0].totalcount; }
        let bill_electricityRecordsPagination = common.pagination(req, totalcount, paginationNum, page);

        res.render('bill_electricity/report', { title: `Report Bill Electric`, param ,bill_electricityRecords,bill_electricityRecordsPagination });
    }
    catch (err) {
        next(err);
    }
}