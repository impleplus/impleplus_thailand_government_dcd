
/*! 
* Builded by Impleplus application builder (https://builder.impleplus.com) 
* Version 2.0.0 
* Link https://www.impleplus.com 
* Copyright impleplus.com 
* Licensed under MIT (https://mit-license.org) 
*/ 

module.exports = function(sequelize, DataTypes) {
  var water_user = sequelize.define('water_user', {
		id: { type: DataTypes.STRING(36), allowNull: false, primaryKey: true },
		water_user_number: {type: DataTypes.STRING(30), allowNull: true },
		water_user_name: {type: DataTypes.STRING(50), allowNull: true },
		address: {type: DataTypes.STRING(100), allowNull: true },
		phone: {type: DataTypes.STRING(30), allowNull: true },
		social: {type: DataTypes.STRING(100), allowNull: true },
		owner_id: {type: DataTypes.STRING(36), allowNull: true },
		assign: {type: DataTypes.TEXT('medium'),allowNull: true},
		create_by: {type: DataTypes.STRING(36), allowNull: true },
		create_date: {type: DataTypes.DATE,allowNull: true},
		update_by: {type: DataTypes.STRING(36), allowNull: true },
		update_date: {type: DataTypes.DATE,allowNull: true}
  },{
    sequelize, tableName: 'water_user', timestamps: false, indexes: [{name: "PRIMARY",unique: true,using: "BTREE",fields: [{ name: "id" }]}]
  });
  return water_user;
};