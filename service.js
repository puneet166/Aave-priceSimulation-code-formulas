
const userAccountDataSchema = require('./model');

module.exports = {

    createData: async (data) => {
        const dbResponse = await userAccountDataSchema.create(data);
        return dbResponse;
    },

    listData: async (filter, projection) => {
        const dbResponse = await userAccountDataSchema.find(filter, projection);
        return dbResponse;
    },

    updateData: async (query, data) => {
        const dbResponse = await userAccountDataSchema.findByIdAndUpdate(query, { $set: data }, { new: true });
        return dbResponse;
    },

    getUserData: async (query) => {
        const dbResponse = await userAccountDataSchema.findOne(query);
        return dbResponse;
    },

   

}