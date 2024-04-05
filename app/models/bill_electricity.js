
/*! 
* Builded by Impleplus application builder (https://builder.impleplus.com) 
* Version 2.0.0 
* Link https://www.impleplus.com 
* Copyright impleplus.com 
* Licensed under MIT (https://mit-license.org) 
*/ 

module.exports = function(sequelize, DataTypes) {
  var bill_electricity = sequelize.define('bill_electricity', {
		id: { type: DataTypes.STRING(36), allowNull: false, primaryKey: true },
		province_electricity_branch_id: {type: DataTypes.STRING(36), allowNull: true },
		electricity_user_id: {type: DataTypes.STRING(36), allowNull: true },
		month: {type: DataTypes.STRING(2), allowNull: true },
		amount: {type: DataTypes.INTEGER,allowNull: true},
		payment_status: {type: DataTypes.SMALLINT,allowNull: true},
		payment_receipt_number: {type: DataTypes.STRING(20), allowNull: true },
		remark: {type: DataTypes.STRING(300), allowNull: true },
		create_by: {type: DataTypes.STRING(36), allowNull: true },
		create_date: {type: DataTypes.DATE,allowNull: true},
		year: {type: DataTypes.STRING(4), allowNull: true },
		owner_id: {type: DataTypes.STRING(36), allowNull: true },
		assign: {type: DataTypes.TEXT('medium'),allowNull: true},
		update_by: {type: DataTypes.STRING(36), allowNull: true },
		update_date: {type: DataTypes.DATE,allowNull: true}
  },{
    sequelize, tableName: 'bill_electricity', timestamps: false, indexes: [{name: "PRIMARY",unique: true,using: "BTREE",fields: [{ name: "id" }]}]
  });
  return bill_electricity;
};