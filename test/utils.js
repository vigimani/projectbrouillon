const { default: axios } = require("axios");
const { ADDRESS } = require("./config");

const getAbi = async(address) => {
    const url = `https://api.arbiscan.io/api?module=contract&action=getabi&address=${address}&apikey=`
    const res = await axios.get(url); 
    return JSON.parse(res.data.result);
}

module.exports = {
    getAbi
};