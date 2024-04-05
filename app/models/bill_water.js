
/*! 
* Builded by Impleplus application builder (https://builder.impleplus.com) 
* Version 2.0.0 
* Link https://www.impleplus.com 
* Copyright impleplus.com 
* Licensed under MIT (https://mit-license.org) 
*/ 

module.exports = function(sequelize, DataTypes) {
  var bill_water = sequelize.define('bill_water', {
		id: { type: DataTypes.STRING(36), allowNull: false, primaryKey: true },
		province_waterwork_branch_id: {type: DataTypes.STRING(36), allowNull: true },
		water_user_id: {type: DataTypes.STRING(36), allowNull: true },
		month: {type: DataTypes.STRING(2), allowNull: true },
		amount: {type: DataTypes.INTEGER,allowNull: true},
		payment_status: {type: DataTypes.SMALLINT,allowNull: true},
		payment_receipt_number: {type: DataTypes.STRING(30), allowNull: true },
		remark: {type: DataTypes.STRING(300), allowNull: true },
		create_by: {type: DataTypes.STRING(36), allowNull: true },
		create_date: {type: DataTypes.DATE,allowNull: true},
		year: {type: DataTypes.STRING(4), allowNull: true },
		owner_id: {type: DataTypes.STRING(36), allowNull: true },
		assign: {type: DataTypes.TEXT('medium'),allowNull: true},
		update_by: {type: DataTypes.STRING(36), allowNull: true },
		update_date: {type: DataTypes.DATE,allowNull: true}
  },{
    sequelize, tableName: 'bill_water', timestamps: false, indexes: [{name: "PRIMARY",unique: true,using: "BTREE",fields: [{ name: "id" }]}]
  });
  return bill_water;
};